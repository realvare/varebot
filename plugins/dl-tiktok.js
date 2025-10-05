import fetch from 'node-fetch'

var handler = async (m, { conn, args, usedPrefix, command }) => {
    const url = (args[0] || '').trim()
    const tiktokPattern = /(tiktok\.com|vm\.tiktok\.com|tiktokcdn\.com)/i

    if (!url || !tiktokPattern.test(url)) {
        await conn.reply(m.chat, `*『 ⛓️‍💥 』 inserisci un link di TikTok valido.*\n*\`Esempio:\`*\n- ${usedPrefix + command} https://www.tiktok.com/@kurti_alessandro/video/7538849237786725655`, m)
        return
    }

    try {

        const tiktokData = await tiktokdl(url)
        if (!tiktokData || !tiktokData.data) {
            await conn.reply(m.chat, "❌ Errore API o risposta inattesa.", m)
            return
        }

        // Prova più campi possibili per trovare l'URL del video
        const data = tiktokData.data
        const videoURL = data.play || data.wmplay || data.playAddr || data.videoUrl || data.url || data.download_addr

        if (!videoURL) {
            console.error('dl-tiktok: nessun videoURL trovato nella risposta', data)
            await conn.reply(m.chat, "*Impossibile trovare l'URL del video nella risposta API.*", m)
            return
        }

        const infonya_gan = `*📖 Descriz꯭ione:*\n> ${data.title || 'Nessuna descrizione'}\n╭─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ\n┊ ✧ *Mi piace:* ${data.digg_count || 0}\n┊ ✧ *Commenti:* ${data.comment_count || 0}\n┊ ✧ *Condivisioni:* ${data.share_count || 0}\n┊ ✧ *Visualizzazioni:* ${data.play_count || 0}\n┊ ✧ *Download:* ${data.download_count || 0}\n╰─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ\n*👤 Utent꯭e:*\n·˚₊· ͟͟͞͞➤ ${data.author?.nickname || "Nessuna info"}\n(https://www.tiktok.com/@${data.author?.unique_id || 'unknown'})\n\n> vare ✧ bot`

        // prepara i bottoni per scaricare l'audio
        const buttons = [
            {
                buttonId: `${usedPrefix}ttaudio ${url}`,
                buttonText: { displayText: '🎵 Scarica Audio' },
                type: 1
            }
        ]
        const resVideo = await conn.sendMessage(m.chat, {
            video: { url: videoURL },
            caption: "```◜TiTok - Download◞```" + `\n\n${infonya_gan}`,
            footer: '',
            buttons: buttons,
            contextInfo: {
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363418582531215@newsletter',
                    newsletterName: "☾⋆⁺₊✧ 𝓿𝓪𝓻𝓮𝓫𝓸𝓽 ✧₊⁺⋆☽",
                    serverMessageId: -1
                }
            }
        }, { quoted: m })

    } catch (error1) {
        console.error('Errore dl-tiktok:', error1)
        await conn.reply(m.chat, `Errore: ${String(error1)}`, m)
    }
}

handler.help = ['tiktok']
handler.tags = ['download']
handler.command = /^(tiktok|tt|ttdl)$/i

export default handler

async function tiktokdl(url) {
    try {
        const api = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`
        const res = await fetch(api, { timeout: 20000 })
        if (!res.ok) return null
        const json = await res.json()
        return json
    } catch (e) {
        console.error('tiktokdl error:', e)
        return null
    }
}
