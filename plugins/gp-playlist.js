import fs from 'fs/promises';
import SpotifyWebApi from 'spotify-web-api-node';
import { createServer } from 'http';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 8888;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`;
const DB_DIR = join(__dirname, '../media/database');
const PLAYLIST_FILE = join(DB_DIR, 'group_playlists.json');
const SPOTIFY_TOKENS_FILE = join(DB_DIR, 'spotify_tokens.json');
const FALLBACK_IMAGE_URL = 'https://i.ibb.co/hJW7WwxV/varebot.jpg';

const SCOPES = ['playlist-modify-public', 'playlist-modify-private', 'ugc-image-upload'];
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

let spotifyApi;
let server;
let playlists = {};
let spotifyTokens = {};

async function loadDatabase(filePath, defaultValue) {
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            await saveDatabase(filePath, defaultValue);
        }
        return defaultValue;
    }
}

async function saveDatabase(filePath, data) {
    await fs.mkdir(dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

async function initializeSpotify() {
    try {
        if (!global.APIKeys?.spotifyclientid || !global.APIKeys?.spotifysecret) {
            console.error('❌ Credenziali Spotify (spotifyclientid, spotifysecret) mancanti in global.APIKeys');
            return;
        }

        spotifyApi = new SpotifyWebApi({
            clientId: global.APIKeys.spotifyclientid,
            clientSecret: global.APIKeys.spotifysecret,
            redirectUri: REDIRECT_URI,
        });

        playlists = await loadDatabase(PLAYLIST_FILE, {});
        spotifyTokens = await loadDatabase(SPOTIFY_TOKENS_FILE, { accessToken: null, refreshToken: null, expiresAt: null });

        if (spotifyTokens.accessToken) spotifyApi.setAccessToken(spotifyTokens.accessToken);
        if (spotifyTokens.refreshToken) spotifyApi.setRefreshToken(spotifyTokens.refreshToken);

        initAuthServer();
    } catch (error) {
        console.error('❌ Errore durante l\'inizializzazione di Spotify:', error);
    }
}

async function retryOperation(operation) {
    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            return await operation();
        } catch (error) {
            console.warn(`⚠️ Tentativo ${i + 1}/${MAX_RETRIES} fallito:`, error.message);
            if (i === MAX_RETRIES - 1 || ![500, 502, 503, 504].includes(error.statusCode)) {
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
    }
}

function initAuthServer() {
    if (server || !spotifyApi) return;
    server = createServer(async (req, res) => {
        if (req.url.startsWith('/callback')) {
            const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
            const code = url.searchParams.get('code');
            if (!code) {
                res.writeHead(400).end('Codice di autorizzazione mancante.');
                return;
            }
            try {
                const data = await spotifyApi.authorizationCodeGrant(code);
                spotifyTokens = {
                    accessToken: data.body.access_token,
                    refreshToken: data.body.refresh_token,
                    expiresAt: Date.now() + (data.body.expires_in * 1000),
                };
                spotifyApi.setAccessToken(spotifyTokens.accessToken);
                spotifyApi.setRefreshToken(spotifyTokens.refreshToken);
                await saveDatabase(SPOTIFY_TOKENS_FILE, spotifyTokens);

                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end('<h1>✅ Autorizzazione Spotify completata!</h1><p>Puoi chiudere questa finestra e tornare su WhatsApp.</p>');
            } catch (error) {
                console.error('❌ Errore durante l\'autorizzazione Spotify:', error);
                res.writeHead(500).end('Errore interno durante l\'autorizzazione.');
            }
        }
    }).listen(PORT, '127.0.0.1', () => {
    });
    server.on('error', (err) => {
        if (err.code !== 'EADDRINUSE') {
             console.error('❌ Errore server di autenticazione:', err);
        }
    });
}

async function refreshToken() {
    if (!spotifyTokens?.refreshToken) return false;
    try {
        const data = await spotifyApi.refreshAccessToken();
        spotifyTokens.accessToken = data.body.access_token;
        spotifyTokens.expiresAt = Date.now() + (data.body.expires_in * 1000);
        spotifyApi.setAccessToken(spotifyTokens.accessToken);
        await saveDatabase(SPOTIFY_TOKENS_FILE, spotifyTokens);
        console.log('✅ Token Spotify aggiornato con successo.');
        return true;
    } catch (error) {
        console.error('❌ Errore durante il refresh del token:', error);
        spotifyTokens = { accessToken: null, refreshToken: null, expiresAt: null };
        await saveDatabase(SPOTIFY_TOKENS_FILE, spotifyTokens);
        return false;
    }
}

async function checkSpotifyAuth() {
    if (!spotifyApi || !spotifyTokens?.accessToken) return false;
    if (Date.now() >= spotifyTokens.expiresAt) {
        console.log('🔄 Token Spotify scaduto, tentativo di refresh...');
        return await refreshToken();
    }
    try {
        await spotifyApi.getMe();
        return true;
    } catch (error) {
        console.warn('⚠️ Il token di accesso non è valido, tento il refresh:', error.message);
        return await refreshToken();
    }
}

async function getPlaylistImageBase64(conn, groupId) {
    let imageBuffer;
    try {
        const ppUrl = await conn.profilePictureUrl(groupId, 'image');
        const response = await fetch(ppUrl);
        if (!response.ok) throw new Error(`Status: ${response.status}`);
        imageBuffer = await response.arrayBuffer();
        console.log('📸 Ottenuta immagine del gruppo.');
    } catch (error) {
        console.warn(`⚠️ Impossibile ottenere l'immagine del gruppo ${groupId}. Uso l'URL di fallback.`);
        try {
            const fallbackResponse = await fetch(FALLBACK_IMAGE_URL);
            if (!fallbackResponse.ok) throw new Error(`Status: ${fallbackResponse.status}`);
            imageBuffer = await fallbackResponse.arrayBuffer();
            console.log('🖼️ Ottenuta immagine di fallback.');
        } catch (fallbackError) {
            console.error(`❌ Impossibile ottenere anche l'immagine di fallback: ${fallbackError}`);
            return null;
        }
    }

    try {
        const jpegBuffer = await sharp(Buffer.from(imageBuffer)).jpeg().toBuffer();
        return jpegBuffer.toString('base64');
    } catch (conversionError) {
        console.error(`❌ Errore durante la conversione dell'immagine in JPEG: ${conversionError}`);
        return null;
    }
}

async function syncTracksInBatches(playlistId, trackUris) {
    if (!trackUris || trackUris.length === 0) {
        await spotifyApi.replaceTracksInPlaylist(playlistId, []);
        return;
    }
    
    const firstBatch = trackUris.slice(0, 100);
    await retryOperation(() => spotifyApi.replaceTracksInPlaylist(playlistId, firstBatch));

    for (let i = 100; i < trackUris.length; i += 100) {
        const batch = trackUris.slice(i, i + 100);
        await new Promise(resolve => setTimeout(resolve, 500)); 
        await retryOperation(() => spotifyApi.addTracksToPlaylist(playlistId, batch));
    }
}

initializeSpotify();

let handler = async (m, { conn, args, text, usedPrefix, command }) => {
    const aestheticHeader = '•.¸¸♪✧ SPOTIFY ✧♪¸¸.•';
    const aestheticFooter = '╰─•';

    if (!spotifyApi || !m.isGroup) {
        return m.reply(global.errore);
    }

    const groupId = m.chat;
    const userId = m.sender;
    const subCommand = args[0]?.toLowerCase();

    if (!playlists[groupId]) {
        const groupMetadata = await conn.groupMetadata(groupId);
        playlists[groupId] = {
            name: groupMetadata.subject,
            spotifyId: null,
            songs: [],
            createdAt: Date.now(),
            lastUpdated: Date.now()
        };
        await saveDatabase(PLAYLIST_FILE, playlists);
    }
    const playlist = playlists[groupId];
    const groupMetadata = await conn.groupMetadata(groupId);
    const memberName = (await conn.getName(userId)) || userId.split('@')[0];

    switch (subCommand) {
        case 'add':
        case 'aggiungi': {
            const songTitle = args.slice(1).join(' ').trim();
            if (!songTitle) {
                return m.reply(global.errore);
            }

            playlist.songs.push({
                title: songTitle,
                addedBy: userId,
                addedByName: memberName,
                addedAt: Date.now(),
            });
            playlist.lastUpdated = Date.now();
            await saveDatabase(PLAYLIST_FILE, playlists);
            
            const replyText = `${aestheticHeader}\n\n╭─• \`AGGIUNTA ✅\`\n│  *${songTitle}*\n│  _Da: ${memberName}_\n${aestheticFooter}`;
            
            const isAuth = await checkSpotifyAuth();
            if (!isAuth) return conn.reply(m.chat, replyText, m);

            try {
                const search = await spotifyApi.searchTracks(songTitle, { limit: 1 });
                const track = search.body.tracks?.items[0];
                if (track && track.album.images.length > 0) {
                    const image = track.album.images[0].url;
                    const artist = track.artists.map(a => a.name).join(', ');
                    
                    conn.sendMessage(m.chat, {
                        text: replyText,
                        contextInfo: {
                            mentionedJid: [userId],
                            externalAdReply: {
                                title: track.name,
                                body: artist,
                                thumbnailUrl: image,
                                sourceUrl: track.external_urls.spotify,
                                mediaType: 1,
                                showAdAttribution: false,
                                renderLargerThumbnail: true
                            }
                        }
                    }, { quoted: m });
                } else {
                    conn.reply(m.chat, replyText, m);
                }
            } catch {
                conn.reply(m.chat, replyText, m);
            }
            break;
        }

        case 'list':
        case 'lista': {
            if (!playlist.songs.length) {
                return m.reply(global.errore);
            }

            const mentions = [];
            let listContent = playlist.songs.map((song, i) => {
                if (!mentions.includes(song.addedBy)) mentions.push(song.addedBy);
                return `│ ${i + 1}. *${song.title}*\n│  └ _Da: @${song.addedBy.split('@')[0]}_`;
            }).join('\n\n');

            let listText = `${aestheticHeader}\n╭\n│『 🎶 』 \`Playlist:\` *${playlist.name}*\n│\n${listContent}\n│\n│『 🔢 』 \`Totale:\` *${playlist.songs.length} canzoni*\n`;
            if (playlist.spotifyId) {
                listText += `│『 🔗 』 \`Link:\` https://open.spotify.com/playlist/${playlist.spotifyId}\n`;
            }
            listText += `${aestheticFooter}`;

            conn.reply(m.chat, listText, m, { mentions });
            break;
        }
        
        case 'remove':
        case 'rimuovi': {
            const index = parseInt(args[1]) - 1;
            if (isNaN(index) || index < 0 || index >= playlist.songs.length) {
                return m.reply(global.errore);
            }

            const song = playlist.songs[index];
            const isAdmin = groupMetadata.participants.find(p => p.id === userId)?.admin;

            if (song.addedBy !== userId && !isAdmin) {
                return m.reply(global.errore);
            }
            
            const removedSongTitle = song.title;
            playlist.songs.splice(index, 1);
            await saveDatabase(PLAYLIST_FILE, playlists);
            
            m.reply(`${aestheticHeader}\n\n╭─• \`RIMOSSA 🗑️\`\n│  *${removedSongTitle}*\n${aestheticFooter}`);
            break;
        }
        
        case 'sync':
        case 'sincronizza':
        case 'sinc':
        case 'spotify': {
            if (!playlist.songs.length) {
                return m.reply(global.errore);
            }
            
            const isAuthorized = await checkSpotifyAuth();
            if (!isAuthorized) {
                const ownerJids = (global.creatorebot || []).map(owner => `${owner}@s.whatsapp.net`);
                if (ownerJids.length === 0) {
                       return m.reply(global.errore);
                }

                const groupNotification = `${aestheticHeader}\n\n╭─• \`AUTORIZZAZIONE\`\n│  Il bot deve essere collegato\n│  a Spotify. Ho avvisato il creatore.\n${aestheticFooter}`;
                await m.reply(groupNotification);

                const authorizeURL = spotifyApi.createAuthorizeURL(SCOPES, 'auth-state');
                const ownerMessage = `*⚠️ Autorizzazione Spotify Richiesta ⚠️*\n\nPer favore, clicca su questo link per autorizzare il bot:\n${authorizeURL}\n\nDopo aver autorizzato, le funzioni saranno disponibili.`;
                
                for (const jid of ownerJids) {
                    await conn.sendMessage(jid, { text: ownerMessage });
                }
                return;
            }
            
            await m.reply(`${aestheticHeader}\n\n╭─• \`SINCRONIZZAZIONE\`\n│  Sincronizzazione con\n│  Spotify in corso... 🔄\n${aestheticFooter}`);

            try {
                const sanitizedPlaylistName = playlist.name.replace(/[^\x00-\x7F]/g, "").trim() || "Playlist Gruppo";
                const contributors = [...new Set(playlist.songs.map(song => song.addedByName))].join(', ');
                const playlistDescription = `Playlist del gruppo "${playlist.name}". Contributori: ${contributors}. Creato da VareBot.`;

                if (!playlist.spotifyId) {
                    console.log(`🎵 Creazione nuova playlist per il gruppo: ${playlist.name}`);
                    const newPlaylist = await retryOperation(() => spotifyApi.createPlaylist(sanitizedPlaylistName, {
                        description: playlistDescription,
                        public: true,
                    }));
                    playlist.spotifyId = newPlaylist.body.id;
                    await saveDatabase(PLAYLIST_FILE, playlists);
                    console.log(`✅ Playlist creata con ID: ${playlist.spotifyId}`);
                }
                
                await retryOperation(() => spotifyApi.changePlaylistDetails(playlist.spotifyId, {
                    name: sanitizedPlaylistName,
                    description: playlistDescription
                }));

                const imageBase64 = await getPlaylistImageBase64(conn, groupId);
                if (imageBase64) {
                   await retryOperation(() => spotifyApi.uploadCustomPlaylistCoverImage(playlist.spotifyId, imageBase64));
                   console.log('🖼️ Immagine di copertina aggiornata.');
                }
                
                console.log(`🔍 Ricerca di ${playlist.songs.length} tracce su Spotify...`);
                const trackUris = (await Promise.all(playlist.songs.map(async (song) => {
                    try {
                        const search = await spotifyApi.searchTracks(song.title, { limit: 1 });
                        return search.body.tracks?.items[0]?.uri;
                    } catch {
                        return null; 
                    }
                }))).filter(Boolean); 
                
                console.log(`🎶 Trovate ${trackUris.length}/${playlist.songs.length} tracce. Sincronizzazione in corso...`);
                
                await syncTracksInBatches(playlist.spotifyId, trackUris);

                const successMsg = `${aestheticHeader}\n\n╭─• \`SUCCESSO ✅\`\n│  Sincronizzazione completata!\n│  *${trackUris.length}/${playlist.songs.length}* brani aggiunti.\n│  \n│  🔗 *Link Spotify:*\n│  https://open.spotify.com/playlist/${playlist.spotifyId}\n${aestheticFooter}`;
                m.reply(successMsg);

            } catch (error) {
                console.error('❌ Errore critico durante la sincronizzazione con Spotify:', error);
                m.reply(global.errore);
            }
            break;
        }

        default:
            const helpMsg = `${aestheticHeader}\n\n╭─• \`COMANDI PLAYLIST\`\n│  \`${usedPrefix+command} aggiungi <canzone>\`\n│  \`${usedPrefix+command} rimuovi <numero>\`\n│  \`${usedPrefix+command} lista\`\n│  \`${usedPrefix+command} sincronizza\`\n${aestheticFooter}`;
            m.reply(helpMsg);
            break;
    }
};

handler.help = ['playlist <aggiungi|rimuovi|lista|sincronizza>'];
handler.tags = ['gruppo'];
handler.command = /^(playlist|pl)$/i;
handler.group = true;
handler.register = true;
export default handler;