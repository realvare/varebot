import fetch from 'node-fetch'

const repkey = APIKeys?.replicate

const design = {
    header: "╭━•❃『 UPSCALER 』❃•━╮",
    line: "┃",
    footer: "╰━━━•❃°•°❀°•°❃•━━━╯"
}

let handler = async (m, { conn }) => {
    try {
        if (!m) throw 'Messaggio non valido'
        if (!conn) throw 'Connessione non valida'
        const quoted = m.quoted ? m.quoted : m
        const mime = (quoted.msg || quoted).mimetype || ''
        if (!/image\/(jpe?g|png)/.test(mime)) {
            return m.reply(`${design.header}
${design.line} 🚫 Rispondi a un'immagine
${design.line} 📝 Formato: JPG/PNG
${design.footer}`)
        }

        await m.reply(`${design.header}
${design.line} ⚡ Elaborazione in corso
${design.line} 🕒 ~30 secondi
${design.footer}`)

        let media
        try {
            if (quoted.download && typeof quoted.download === 'function') {
                media = await quoted.download()
            } else if (quoted.data?.url) {
                const response = await fetch(quoted.data.url)
                media = await response.buffer()
            } else if (quoted.url) {
                const response = await fetch(quoted.url)
                media = await response.buffer()
            } else {
                throw 'Nessun metodo di download disponibile'
            }
            if (!media || media.length === 0) {
                throw 'Media vuoto o non valido'
            }
        } catch (error) {
            console.error('Errore download:', error)
            throw `Errore nel download dell'immagine`
        }

        const base64Image = media.toString('base64')
        console.log('Base64 length:', base64Image.length)
        
        const startResponse = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
                'Authorization': `Token ${repkey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                version: "42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
                input: { image: `data:${mime};base64,${base64Image}` }
            })
        })

        if (!startResponse.ok) {
            throw `Errore API - ${startResponse.status} ${startResponse.statusText}`
        }

        const jsonStart = await startResponse.json()
        console.log('Start response:', jsonStart)
        
        if (!jsonStart.id) {
            throw `Impossibile avviare l'upscaling - ${JSON.stringify(jsonStart)}`
        }

        let result
        for (let i = 0; i < 30; i++) {
            const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${jsonStart.id}`, {
                headers: {
                    'Authorization': `Token ${repkey}`,
                    'Content-Type': 'application/json'
                }
            })
           
            result = await pollResponse.json()
            console.log(`Poll ${i + 1}/30:`, result.status)
           
            if (result.status === 'succeeded') {
                const imageUrl = result.output
                if (!imageUrl) {
                    throw 'URL immagine non trovato nel risultato'
                }

                const imageResponse = await fetch(imageUrl)
                if (!imageResponse.ok) {
                    throw `Impossibile scaricare immagine risultato - ${imageResponse.status}`
                }
                
                const buffer = await imageResponse.buffer()
                let quotedMessage = null
                if (global?.fake && typeof global.fake === 'object' && global.fake.key) {
                    quotedMessage = global.fake
                } else {
                    quotedMessage = {
                        key: {
                            fromMe: false,
                            participant: '0@s.whatsapp.net',
                            id: 'FAKE_ID_' + Date.now()
                        },
                        message: {
                            conversation: '⭒✦⋆⁺₊🩸 𝓿𝓪𝓻𝓮𝓫𝓸𝓽 🕊️₊⁺⋆✦⭒'
                        }
                    }
                }
                
                console.log('Using quoted message:', JSON.stringify(quotedMessage, null, 2))
                
                try {
                    await conn.sendMessage(m.chat, {
                        image: buffer,
                        caption: `${design.header}
${design.line} ✨ Upscale completato
${design.line} 📈 Risoluzione x4
${design.line} 📦 Dimensione: ${(buffer.length / 1024 / 1024).toFixed(2)}MB
${design.footer}
> \`vare ✧ bot\``
                    }, { quoted: quotedMessage })
                } catch (sendError) {
                    console.error('Errore invio messaggio:', sendError)
                    await conn.sendMessage(m.chat, {
                        image: buffer,
                        caption: `${design.header}
${design.line} ✨ Upscale completato
${design.line} 📈 Risoluzione x4
${design.line} 📦 Dimensione: ${(buffer.length / 1024 / 1024).toFixed(2)}MB
${design.footer}
> \`vare ✧ bot\``
                    })
                }
                return
            }
           
            if (result.status === 'failed') {
                throw `Upscaling fallito'}`
            }
            
            if (result.status === 'canceled') {
                throw 'Upscaling cancellato'
            }
            
            await new Promise(r => setTimeout(r, 2000))
        }
        
        throw 'Timeout - operazione troppo lunga o non riuscita'
        
    } catch (e) {
        console.error('Errore upscaler completo:', e)
        const errorMessage = typeof e === 'string' ? e : e.message || 'Errore sconosciuto'
        
        try {
            await m.reply(`${design.header}
${design.line} ❌ Errore: ${errorMessage}
${design.line} 🔄 Riprova tra qualche minuto
${design.footer}`)
        } catch (replyError) {
            console.error('Errore anche nel reply:', replyError)
        }
    }
}

handler.help = ['upscale']
handler.tags = ['strumenti', 'ia', 'iaimmagini']
handler.command = /^(upscale|hd)$/i
handler.limit = true
handler.register = true

export default handler