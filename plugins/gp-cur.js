import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import yts from 'yt-search'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const databasePath = path.join(__dirname, '../media/database/lastfm_users.json')

if (!fs.existsSync(path.dirname(databasePath))) fs.mkdirSync(path.dirname(databasePath), { recursive: true })
const getDB = () => fs.existsSync(databasePath) ? JSON.parse(fs.readFileSync(databasePath, 'utf-8')) : {}
const saveDB = (data) => fs.writeFileSync(databasePath, JSON.stringify(data, null, 2))

const LASTFM_API_KEY = global.APIKeys?.lastfm
const def = 'https://i.ibb.co/hJW7WwxV/varebot.jpg'

async function apiCall(method, params) {
    try {
        const query = new URLSearchParams({ method, api_key: LASTFM_API_KEY, format: 'json', ...params })
        const res = await axios.get(`https://ws.audioscrobbler.com/2.0/?${query}`, { timeout: 5000 })
        return res.data
    } catch (e) {
        console.error('LastFM API Error:', e.message)
        return {}
    }
}

async function fetchCover(lastFmImages, query, isArtist = false) {
    let cover = lastFmImages?.find(i => i.size === 'extralarge')?.['#text']
    if (cover && cover.trim() !== '' && !cover.includes('2a96cbd8b46e442fc41c2b86b821562f')) return cover
    try {
        const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&limit=1&media=music&country=IT`
        const { data } = await axios.get(searchUrl)
        
        if (data.results && data.results.length > 0) {
            const result = data.results[0]
            if (result.artworkUrl100) {
                return result.artworkUrl100.replace('100x100bb', '600x600bb')
            }
        }
    } catch (e) {
    }
    try {
        const ytQuery = isArtist ? `${query} official channel` : `${query} official audio`
        const search = await yts({ query: ytQuery, pages: 1 })
        const video = search.videos.find(v => v.thumbnail && !v.thumbnail.includes('default.jpg'))
        if (video) return video.thumbnail
    } catch (err) {
        console.error('Errore yt-search:', err.message)
    }
    return def
}

const handler = async (m, { conn, usedPrefix, command, text }) => {
    let db = getDB()
    if (command === 'setuser' || command === 'impostauser') {
        const username = text.trim()
        if (!username) return m.reply(`❌ Uso: ${usedPrefix}${command} <user>`)
        db[m.sender] = username
        saveDB(db)
        return m.reply(`『 ✅ 』 Username *${username}* collegato!`)
    }

    let targetUser = m.sender
    if (m.mentionedJid && m.mentionedJid.length > 0) {
        targetUser = m.mentionedJid[0]
    }
    const user = db[targetUser]
    if (!user) return m.reply(`『 ⚠️ 』 ${targetUser === m.sender ? 'Registrati' : 'L\'utente taggato non ha registrato il suo username'} con: *${usedPrefix}setuser <user>*`)

    const browserlessKey = global.APIKeys?.browserless
    if (!browserlessKey) return m.reply('❌ Errore: API Key Browserless mancante nel config.js')
    
    const globalErrore = global.errore
    const validPeriodsMap = {
        sempre: 'overall',
        settimana: '7day',
        mese: '1month',
        '3mesi': '3month',
        '6mesi': '6month',
        anno: '12month'
    }

    if (['cur', 'attuale', 'nowplaying'].includes(command)) {
        try {
            await conn.sendPresenceUpdate('composing', m.chat)
            const res = await apiCall('user.getrecenttracks', { user, limit: 1 })
            const track = res.recenttracks?.track?.[0]
            if (!track) return m.reply('❌ Nessun brano trovato.')

            const info = await apiCall('track.getInfo', { artist: track.artist['#text'], track: track.name, username: user })
            const trackData = info.track || {}
            const queryName = `${track.artist['#text']} ${track.name}`
            const cover = await fetchCover(track.image, queryName, false)
            const isNowPlaying = track['@attr']?.nowplaying === 'true'
            const html = `
            <html>
            <head>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
                    body { margin: 0; padding: 0; width: 1000px; height: 600px; display: flex; align-items: center; justify-content: center; font-family: 'Plus Jakarta Sans', sans-serif; background: #000; overflow: hidden; }
                    .background { position: absolute; width: 100%; height: 100%; background: url('${cover}') center/cover; filter: blur(30px) brightness(0.7); opacity: 0.7; }
                    .glass-card { position: relative; width: 880px; height: 480px; background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(20px) saturate(180%); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 50px; display: flex; align-items: center; padding: 45px; box-sizing: border-box; box-shadow: 0 20px 50px rgba(0,0,0,0.4); }
                    .album-art { width: 340px; height: 340px; border-radius: 35px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); object-fit: cover; }
                    .details { flex: 1; margin-left: 50px; color: white; }
                    .status { font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 3px; color: ${isNowPlaying ? '#32d74b' : '#ff3b30'}; margin-bottom: 15px; display: flex; align-items: center; gap: 10px; }
                    .track-name { font-size: 44px; font-weight: 800; line-height: 1.1; margin-bottom: 10px; letter-spacing: -1.5px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; max-width: 400px; }
                    .artist-name { font-size: 26px; color: rgba(255,255,255,0.6); font-weight: 600; margin-bottom: 30px; }
                    .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
                    .stat-item { background: rgba(255, 255, 255, 0.04); padding: 15px; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.05); }
                    .stat-label { font-size: 10px; color: rgba(255,255,255,0.3); text-transform: uppercase; font-weight: 800; margin-bottom: 4px; }
                    .stat-value { font-size: 20px; font-weight: 700; color: #fff; }
                </style>
            </head>
            <body>
                <div class="background"></div>
                <div class="glass-card">
                    <img src="${cover}" class="album-art" />
                    <div class="details">
                        <div class="status"><span style="width:10px; height:10px; background:currentColor; border-radius:50%; box-shadow: 0 0 1px currentColor;"></span>${isNowPlaying ? 'In Riproduzione' : 'Ultimo Ascoltato'}</div>
                        <div class="track-name">${track.name}</div>
                        <div class="artist-name">${track.artist['#text']}</div>
                        <div class="stats-grid">
                            <div class="stat-item"><div class="stat-label">I Tuoi Ascolti</div><div class="stat-value">${trackData.userplaycount || 0}</div></div>
                            <div class="stat-item"><div class="stat-label">Ascolti Globali</div><div class="stat-value">${parseInt(trackData.playcount || 0).toLocaleString()}</div></div>
                            <div class="stat-item"><div class="stat-label">Utente</div><div class="stat-value" style="color:#0a84ff;">@${user}</div></div>
                            <div class="stat-item"><div class="stat-label">Ascoltatori</div><div class="stat-value">${parseInt(trackData.listeners || 0).toLocaleString()}</div></div>
                        </div>
                    </div>
                </div>
            </body>
            </html>`
            
            const response = await axios.post(`https://chrome.browserless.io/screenshot?token=${browserlessKey}`, {
                html,
                options: { type: 'jpeg', quality: 90 },
                viewport: { width: 1000, height: 600 }
            }, { responseType: 'arraybuffer' })
            const buffer = Buffer.from(response.data)

            const interactiveButtons = [
                {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                        display_text: "🎵 Scarica Audio",
                        id: `${usedPrefix}playaudio ${track.name} ${track.artist['#text']}`
                    })
                },
                {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                        display_text: "📽️ Scarica Video",
                        id: `${usedPrefix}playvideo ${track.name} ${track.artist['#text']}`
                    })
                },
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: "Vedi su Last.fm",
                        url: trackData.url || `https://www.last.fm/music/${encodeURIComponent(track.artist['#text'])}/_/${encodeURIComponent(track.name)}`
                    })
                }
            ]
            return conn.sendMessage(m.chat, {
                text: `『 🎧 』 *@${user} sta ascoltando:*`,
                footer: '',
                cards: [{
                    image: buffer,
                    title: `- 『 🎵 』 ${track.name}`,
                    body: `- 『 👤 』 ${track.artist['#text']}`,
                    footer: '𝐯𝐚𝐫𝐞 ✧ 𝐛𝐨𝐭',
                    buttons: interactiveButtons
                }]
            }, { quoted: m })

        } catch (e) {
            console.error(e)
            return m.reply(globalErrore)
        } finally {
            await conn.sendPresenceUpdate('paused', m.chat)
        }
    }

    if (['topalbums', 'topalbum'].includes(command)) {
        try {
            await conn.sendPresenceUpdate('composing', m.chat)
            const periodInput = text.trim().toLowerCase() || 'mese'
            const period = validPeriodsMap[periodInput]
            if (!period) return m.reply(`❌ Periodo non valido. Usa: ${Object.keys(validPeriodsMap).join(', ')}`)

            const res = await apiCall('user.gettopalbums', { user, limit: 10, period })
            const albums = res.topalbums?.album || []
            if (!albums.length) return m.reply('❌ Nessun album trovato.')

            const cards = await Promise.all(albums.map(async (album, index) => {
                const queryName = `${album.artist.name} ${album.name}`
                const cover = await fetchCover(album.image, queryName, false)
                const playcount = parseInt(album.playcount || 0)
                
                return {
                    image: { url: cover },
                    title: `${index + 1}. ${album.name.substring(0, 50)}${album.name.length > 50 ? '...' : ''}`,
                    body: `👤 ${album.artist.name}\n▶️ ${playcount.toLocaleString()} ascolti`,
                    footer: '𝐯𝐚𝐫𝐞 ✧ 𝐛𝐨𝐭',
                    buttons: [{
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "Cerca su Last.fm",
                            url: album.url
                        })
                    }]
                }
            }))

            await conn.sendMessage(m.chat, {
                text: `『 📀 』 *Top Album per @${user}*`,
                footer: '𝐯𝐚𝐫𝐞 ✧ 𝐛𝐨𝐭',
                cards: cards
            }, { quoted: m })
        } catch (e) {
            console.error(e)
            return m.reply(globalErrore)
        } finally {
            await conn.sendPresenceUpdate('paused', m.chat)
        }
    }

    if (['topartists', 'topartisti'].includes(command)) {
        try {
            await conn.sendPresenceUpdate('composing', m.chat)
            const periodInput = text.trim().toLowerCase() || 'mese'
            const period = validPeriodsMap[periodInput]
            if (!period) return m.reply(`❌ Periodo non valido. Usa: ${Object.keys(validPeriodsMap).join(', ')}`)

            const res = await apiCall('user.gettopartists', { user, limit: 10, period })
            const artists = res.topartists?.artist || []
            if (!artists.length) return m.reply('❌ Nessun artista trovato.')

            const cards = await Promise.all(artists.map(async (artist, index) => {
                const cover = await fetchCover(artist.image, artist.name, true)
                const playcount = parseInt(artist.playcount || 0)

                return {
                    image: { url: cover },
                    title: `${index + 1}. ${artist.name.substring(0, 50)}`,
                    body: `▶️ ${playcount.toLocaleString()} ascolti`,
                    footer: '𝐯𝐚𝐫𝐞 ✧ 𝐛𝐨𝐭',
                    buttons: [{
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "Vedi su Last.fm",
                            url: artist.url
                        })
                    }]
                }
            }))

            await conn.sendMessage(m.chat, {
                text: `『 🎤 』 *Top Artisti per @${user}*`,
                footer: '𝐯𝐚𝐫𝐞 ✧ 𝐛𝐨𝐭',
                cards: cards
            }, { quoted: m })
        } catch (e) {
            console.error(e)
            return m.reply(globalErrore)
        } finally {
            await conn.sendPresenceUpdate('paused', m.chat)
        }
    }

    if (['toptracks', 'topcanzoni'].includes(command)) {
        try {
            await conn.sendPresenceUpdate('composing', m.chat)
            const periodInput = text.trim().toLowerCase() || 'mese'
            const period = validPeriodsMap[periodInput]
            if (!period) return m.reply(`❌ Periodo non valido. Usa: ${Object.keys(validPeriodsMap).join(', ')}`)

            const res = await apiCall('user.gettoptracks', { user, limit: 10, period })
            const tracks = res.toptracks?.track || []
            if (!tracks.length) return m.reply('❌ Nessuna canzone trovata.')

            const cards = await Promise.all(tracks.map(async (track, index) => {
                const queryName = `${track.artist.name} ${track.name}`
                const cover = await fetchCover(track.image, queryName, false)
                const playcount = parseInt(track.playcount || 0)

                return {
                    image: { url: cover },
                    title: `${index + 1}. ${track.name.substring(0, 50)}${track.name.length > 50 ? '...' : ''}`,
                    body: `👤 ${track.artist.name}\n▶️ ${playcount.toLocaleString()} ascolti`,
                    footer: '𝐯𝐚𝐫𝐞 ✧ 𝐛𝐨𝐭',
                    buttons: [{
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "Vedi suLast.fm",
                            url: track.url
                        })
                    }]
                }
            }))

            await conn.sendMessage(m.chat, {
                text: `『 🎵 』 *Top Canzoni per @${user}*`,
                footer: '𝐯𝐚𝐫𝐞 ✧ 𝐛𝐨𝐭',
                cards: cards
            }, { quoted: m })
        } catch (e) {
            console.error(e)
            return m.reply(globalErrore)
        } finally {
            await conn.sendPresenceUpdate('paused', m.chat)
        }
    }
}

handler.command = ['setuser', 'impostauser', 'cur', 'nowplaying', 'topalbums', 'topalbum', 'topartists', 'topartisti', 'toptracks', 'topcanzoni']
handler.register = true

export default handler
