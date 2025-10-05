import fetch from 'node-fetch'
import * as cheerio from 'cheerio'

const fixSpacing = (text) => {
    return text
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/([.!?,:;])([A-Za-z])/g, '$1 $2')
        .replace(/([a-zA-Z])(\d)/g, '$1 $2')
        .replace(/(\d)([a-zA-Z])/g, '$1 $2')
        .replace(/\b(for|to|in|on|at|by|with|from|the|and|or|but|so|yet|nor)([A-Z][a-z])/g, '$1 $2')
        .replace(/\s+/g, ' ')
        .trim();
};

const cleanLyrics = (text) => {
    return text
        .replace(/^.*?Lyrics\s*/is, '')
        .replace(/^(?:[^\n]*\n)*?.*?\.{3}\s*Read More\s*/gim, '')
        .replace(/“[^”]+”\s+[^.]+\.{3}\s*Read More\s*/gis, '')
        .replace(/“[^”]+”\s+[^.]+\.{3}\s*Leer Más\s*/gis, '')
        .replace(/“[^”]+”\s+[^.]+\.{3}\s*Saiba Mais\s*/gis, '')
        .replace(/^[^\n]*\.{3}\s*Read More\s*/gim, '')
        .replace(/^[^\n]*\.{3}\s*Leer Más\s*/gim, '')
        .replace(/^[^\n]*\.{3}\s*Saiba Mais\s*/gim, '')
        .replace(/<img[^>]*>/gi, '')
        .replace(/Translations.*?(?=\n- |[A-Za-z])/is, '')
        .replace(/\[[^\]]+\]/gi, '\n\n- ')
        .replace(/(lyrics trovati|ricerca:|testo di|you might also like|see.*live|get tickets as low as \$\d+|embed|advertisement)/gi, '')
        .replace(/\.\.\.\s*\[Testo troppo lungo, visualizza completo su Genius\]/gi, '')
        .replace(/(\n\s*){2,}/g, '\n')
        .replace(/\s{2,}/g, ' ')
        .replace(/^\s+|\s+$/g, '')
        .replace(/\n\s*\n- /g, '\n')
        .replace(/^\s*\n/g, '\n')
        .trim();
};

function formatDateIT(dateString) {
    if (!dateString) return 'N/D';
    const mesi = [
        'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
        'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'
    ];
    const [monthEn, day, year] = dateString.replace(',', '').split(' ');
    const idx = [
        'January','February','March','April','May','June','July','August','September','October','November','December'
    ].indexOf(monthEn);
    if (idx === -1) return dateString;
    return `${day} ${mesi[idx]} ${year}`;
}

const formatMessage = (song, lyrics) => {
    const releaseDate = formatDateIT(song.release_date_for_display);
    const views = song.stats?.pageviews ? `${song.stats.pageviews.toLocaleString()}` : 'N/D';
    const album = song.album?.name || 'Singolo';
    const producer = song.producer_artists?.length > 0 ? song.producer_artists[0].name : 'N/D';

    let header = `🎶 ${song.title.toUpperCase()}
👤 Artista: ${song.primary_artist.name}
💿 Album: ${album}
📅 Anno: ${releaseDate}
🎛 Produttore: ${producer}
👁 Visualizzazioni: ${views}

⭑⭒━✦⁺₊✧ 𝓿𝓪𝓻𝓮𝓫𝓸𝓽 ✧₊⁺✦━⭒⭑

`;

    return header + lyrics + ``;
};

async function getImage(song) {
    if (song.song_art_image_url) return song.song_art_image_url;
    if (song.header_image_url) return song.header_image_url;
    if (song.album && song.album.cover_art_url) return song.album.cover_art_url;
    return null;
}

const checkIsOwner = (m) => {
    const owners = global.owner || [];
    const userJid = m.sender;
    return owners.some(owner => {
        if (typeof owner === 'string') {
            return owner === userJid;
        } else if (Array.isArray(owner)) {
            return owner[0] === userJid;
        }
        return false;
    });
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let handler = async (m, { text, usedPrefix, command, conn }) => {
    if (!global.APIKeys?.genius) {
        const isOwner = checkIsOwner(m);
        if (isOwner) {
            return m.reply(
                `🔑 *API KEY MANCANTE*

❌ La Genius API Key non è configurata

📋 *Come ottenerla:*
1. Vai su https://genius.com/api-clients
2. Crea un nuovo client
3. Copia il token di accesso
4. Aggiungilo alla configurazione`
            );
        } else {
            return m.reply(
                `❌ *SERVIZIO NON DISPONIBILE*

⚠️ Il servizio lyrics è temporaneamente non disponibile.
🔧 Contatta il creatore del bot.`
            );
        }
    }

    if (!text) {
        return m.reply(`\n-  - *LYRICS*

📝 *Come usare:*
${usedPrefix + command} <titolo> [artista]

💡 *Esempi:*
• ${usedPrefix + command} Play for Keeps La Capone
• ${usedPrefix + command} Charge Me Future

🎯 *Suggerimenti:*
• Più dettagli = risultati migliori
• Usa il nome completo dell'artista
• Controlla l'ortografia`);
    }

    if (text.length < 2) {
        return m.reply(`❌ *RICERCA TROPPO BREVE*\n\n🔍 Inserisci almeno 2 caratteri per la ricerca.`);
    }

    if (text.length > 100) {
        return m.reply(`❌ *RICERCA TROPPO LUNGA*\n\n🔍 Massimo 100 caratteri per la ricerca.`);
    }

    const loadingMsg = await m.reply(`⏳ *Ricerca in corso per ${text}*`);

    try {
        const searchRes = await fetch(`https://api.genius.com/search?q=${encodeURIComponent(text)}&per_page=5`, {
            headers: {
                'Authorization': `Bearer ${global.APIKeys.genius}`,
                'User-Agent': 'varebot/2.5',
                'Accept': 'application/json'
            },
            timeout: 10000
        });

        if (!searchRes.ok) {
            throw new Error(`HTTP ${searchRes.status}: ${searchRes.statusText}`);
        }

        const data = await searchRes.json();

        if (!data.response?.hits?.length) {
            return conn.sendMessage(m.chat, {
                text: `🔍 Nessun lyrics trovato per: "*${text}*"

💡 *Suggerimenti:*
• Controlla l'ortografia
• Aggiungi il nome dell'artista
• Usa parole chiave diverse
• Prova con il titolo originale (inglese)

\n-  *Esempio:* \`${usedPrefix + command} play for keeps la capone\``,
                edit: loadingMsg.key
            });
        }

        const song = data.response.hits[0].result;

        await conn.sendMessage(m.chat, {
            text: `✅ *CANZONE TROVATA*

🎶 *Titolo:* ${song.title}
👤 *Artista:* ${song.primary_artist.name}
💿 *Album:* ${song.album?.name || 'Singolo'}

⏳ *Recuperando il testo*...`,
            edit: loadingMsg.key
        });

        await delay(1000);

        const lyricsRes = await fetch(song.url, {
            headers: {
                'User-Agent': 'VareBot/2.5',
            },
            timeout: 10000
        });

        if (!lyricsRes.ok) {
            throw new Error(`HTTP ${lyricsRes.status}: ${lyricsRes.statusText}`);
        }

        const html = await lyricsRes.text();

        const $ = cheerio.load(html);

        let lyrics = $('div[data-lyrics-container="true"]').text() || 
                     $('div.lyrics').text() ||
                     $('section[class^="Lyrics__Container"]').text() || '';

        lyrics = cleanLyrics(lyrics);
        lyrics = fixSpacing(lyrics);

        if (!lyrics) {
            lyrics = `⚠️ Lyrics non disponibili o protetti da copyright.`;
        }

        const finalMessage = formatMessage(song, lyrics);
        const buttons = [
            { buttonId: `.playaudio ${song.title}`, buttonText: { displayText: '▶️ Audio' }, type: 1 },
            { buttonId: `.playvideo ${song.title}`, buttonText: { displayText: '🎬 Video' }, type: 1 }
        ];

        const buttonMessage = {
            text: finalMessage,
            footer: '𝓿𝓪𝓻𝓮𝓫𝓸𝓽',
            buttons: buttons,
            headerType: 1
        };
        try {
            const imageUrl = await getImage(song);

            if (imageUrl) {
                const imageResponse = await fetch(imageUrl, {
                    timeout: 10000,
                    headers: { 'User-Agent': 'VareBot/2.5' }
                });

                if (imageResponse.ok) {
                    const imageBuffer = await imageResponse.buffer();

                    await conn.sendMessage(m.chat, {
                        image: imageBuffer,
                        caption: finalMessage + '',
                        footer: `${testobot}`,
                        buttons: buttons,
                        headerType: 4
                    });

                    await conn.sendMessage(m.chat, { delete: loadingMsg.key });
                    return;
                }
            }
        } catch (imageError) {
            console.error('Errore caricamento immagine:', imageError);
        }
        await conn.sendMessage(m.chat, buttonMessage);
        await conn.sendMessage(m.chat, { delete: loadingMsg.key });

    } catch (e) {
        console.error(e);
        await conn.sendMessage(m.chat, {
            text: `❌ Si è verificato un errore durante la ricerca:

${e.message}

🔧 Riprova più tardi o contatta il creatore.`,
            edit: loadingMsg.key
        });
    }
};

handler.help = ['lyrics <titolo> [artista]'];
handler.tags = ['strumenti'];
handler.command = ['lyrics', 'testo', 'lyric'];
handler.register = true;

export default handler;