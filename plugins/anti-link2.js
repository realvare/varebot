// same here penso
import fetch from 'node-fetch'
import { FormData } from 'formdata-node'
import { downloadContentFromMessage } from '@realvare/based'
const sonoilgattoperquestitopi = /(?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&=]*)/gi;
const doms = {
    tiktok: ['tiktok.com', 'vm.tiktok.com', 'tiktok.it', 'tiktok.fr', 'tiktok.de', 'tiktok.es', 'tiktok.co.uk'],
    youtube: ['youtube.com', 'youtu.be', 'm.youtube.com', 'youtube.it', 'youtube.fr', 'youtube.de', 'youtube.es', 'youtube.co.uk'],
    telegram: ['telegram.me', 'telegram.org', 't.me', 'telegram.it', 'telegram.fr', 'telegram.de', 'telegram.es', 'telegram.co.uk'],
    facebook: ['facebook.com', 'fb.com', 'm.facebook.com', 'facebook.it', 'facebook.fr', 'facebook.de', 'facebook.es', 'facebook.co.uk'],
    instagram: ['instagram.com', 'instagr.am', 'instagram.it', 'instagram.fr', 'instagram.de', 'instagram.es', 'instagram.co.uk'],
    twitter: ['twitter.com', 'x.com', 'twitter.it', 'twitter.fr', 'twitter.de', 'twitter.es', 'twitter.co.uk'],
    discord: ['discord.gg', 'discord.com', 'discordapp.com', 'discord.it', 'discord.fr', 'discord.de', 'discord.es', 'discord.co.uk'],
    snapchat: ['snapchat.com', 't.snapchat.com', 'snapchat.it', 'snapchat.fr', 'snapchat.de', 'snapchat.es', 'snapchat.co.uk'],
    linkedin: ['linkedin.com', 'lnkd.in', 'linkedin.it', 'linkedin.fr', 'linkedin.de', 'linkedin.es', 'linkedin.co.uk'],
    twitch: ['twitch.tv', 'm.twitch.tv', 'twitch.it', 'twitch.fr', 'twitch.de', 'twitch.es', 'twitch.co.uk'],
    reddit: ['reddit.com', 'redd.it', 'reddit.it', 'reddit.fr', 'reddit.de', 'reddit.es', 'reddit.co.uk'],
    onlyfans: ['onlyfans.com', 'onlyfans.it', 'onlyfans.fr', 'onlyfans.de', 'onlyfans.es', 'onlyfans.co.uk'],
    github: ['github.com', 'git.io', 'github.it', 'github.fr', 'github.de', 'github.es', 'github.co.uk'],
    bitly: ['bit.ly', 'bitly.com'], 
    tinyurl: ['tinyurl.com']
};

const MESSAGES = {
    detected: {
        'link': (platform, user) => `> 『 🛑 』 \`Link ${platform} rilevato.\` *Ciao ciao* @${user}`,
        'poll': (platform, user) => `> 『 ⚠ 』 \`Sondaggio con link ${platform} rilevato.\` *Ciao ciao* @${user}`,
        'video': (platform, user) => `> 『 🎬 』 \`Video con link ${platform} rilevato.\` *Ciao ciao* @${user}`,
        'image': (platform, user) => `> 『 🖼️ 』 \`Immagine con link ${platform} rilevato.\` *Ciao ciao* @${user}`,
        'qr': (platform, user) => `> 『 🚫 』 \`QR con link ${platform} rilevato.\` *Ciao ciao* @${user}`
    },
    error: '❌ Errore durante il controllo dei link.'
};

async function getMediaBuffer(message) {
    try {
        const msg = message.message && message.message.imageMessage
            || message.message && message.message.videoMessage
            || message.message && message.message.extendedTextMessage && message.message.extendedTextMessage.contextInfo && message.message.extendedTextMessage.contextInfo.quotedMessage && message.message.extendedTextMessage.contextInfo.quotedMessage.imageMessage
            || message.message && message.message.extendedTextMessage && message.message.extendedTextMessage.contextInfo && message.message.extendedTextMessage.contextInfo.quotedMessage && message.message.extendedTextMessage.contextInfo.quotedMessage.videoMessage

        if (!msg) return null

        const type = msg.mimetype && msg.mimetype.startsWith('video') ? 'video' : 'image'
        const stream = await downloadContentFromMessage(msg, type)

        let buffer = Buffer.from([])
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }

        return buffer
    } catch (e) {
        console.error('Errore nel download media:', e)
        return null
    }
}

async function readQRCode(imageBuffer) {
    const apis = [
        {
            name: 'qr-server',
            func: async (buffer) => {
                const controller = new AbortController()
                const timeout = setTimeout(() => controller.abort(), 8000)

                const formData = new FormData()
                formData.append('file', buffer, 'image.jpg')

                const response = await fetch('https://api.qrserver.com/v1/read-qr-code/', {
                    method: 'POST',
                    body: formData,
                    signal: controller.signal
                })

                clearTimeout(timeout)
                
                if (!response.ok) throw new Error(`HTTP ${response.status}`)

                const data = await response.json()
                return data && data[0] && data[0].symbol && data[0].symbol[0] && data[0].symbol[0].data || null
            }
        },
        {
            name: 'qr-api',
            func: async (buffer) => {
                const base64 = buffer.toString('base64')
                const controller = new AbortController()
                const timeout = setTimeout(() => controller.abort(), 8000)

                const response = await fetch('https://qr-api.is/api/scan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: `data:image/jpeg;base64,${base64}` }),
                    signal: controller.signal
                })

                clearTimeout(timeout)
                
                if (!response.ok) throw new Error(`HTTP ${response.status}`)
                
                const data = await response.json()
                return data?.data
            }
        }
    ];

    for (const api of apis) {
        try {
            console.log(`[QR] Tentativo con API: ${api.name}`)
            
            const result = await api.func(imageBuffer)
            
            if (result && typeof result === 'string' && result.trim()) {
                console.log(`[QR] Successo con ${api.name}: ${result.substring(0, 50)}...`)
                return result.trim()
            }
        } catch (error) {
            console.log(`[QR] Errore con ${api.name}: ${error.message}`)
            continue
        }
    }
    
    console.log('[QR] Tutte le API hanno fallito')
    return null
}

function extractPossibleText(m) {
    const texts = []
    if (m.text) texts.push(m.text)
    if (m.message && m.message.extendedTextMessage && m.message.extendedTextMessage.text) {
        texts.push(m.message.extendedTextMessage.text)
    }
    if (m.message && m.message.imageMessage && m.message.imageMessage.caption) {
        texts.push(m.message.imageMessage.caption)
    }
    if (m.message && m.message.videoMessage && m.message.videoMessage.caption) {
        texts.push(m.message.videoMessage.caption)
    }
    if (m.message && m.message.extendedTextMessage && m.message.extendedTextMessage.contextInfo && m.message.extendedTextMessage.contextInfo.quotedMessage) {
        const quoted = m.message.extendedTextMessage.contextInfo.quotedMessage
        if (quoted.imageMessage && quoted.imageMessage.caption) {
            texts.push(quoted.imageMessage.caption)
        }
        if (quoted.videoMessage && quoted.videoMessage.caption) {
            texts.push(quoted.videoMessage.caption)
        }
    }
    const pollV3 = m.message && m.message.pollCreationMessageV3
    if (pollV3) {
        if (pollV3.name) texts.push(pollV3.name)
        if (pollV3.title) texts.push(pollV3.title)
        if (pollV3.options) {
            pollV3.options.forEach(option => {
                if (option.optionName) texts.push(option.optionName)
            })
        }
    }
    const pollLegacy = m.message && m.message.pollCreationMessage
    if (pollLegacy) {
        if (pollLegacy.name) texts.push(pollLegacy.name)
        if (pollLegacy.title) texts.push(pollLegacy.title)
        if (pollLegacy.options) {
            pollLegacy.options.forEach(option => {
                if (option.optionName) texts.push(option.optionName)
            })
        }
    }
    const quotedPollV3 = m.message && m.message.extendedTextMessage && m.message.extendedTextMessage.contextInfo && m.message.extendedTextMessage.contextInfo.quotedMessage && m.message.extendedTextMessage.contextInfo.quotedMessage.pollCreationMessageV3
    if (quotedPollV3) {
        if (quotedPollV3.name) texts.push(quotedPollV3.name)
        if (quotedPollV3.title) texts.push(quotedPollV3.title)
        if (quotedPollV3.options) {
            quotedPollV3.options.forEach(option => {
                if (option.optionName) texts.push(option.optionName)
            })
        }
    }
    const quotedPollLegacy = m.message && m.message.extendedTextMessage && m.message.extendedTextMessage.contextInfo && m.message.extendedTextMessage.contextInfo.quotedMessage && m.message.extendedTextMessage.contextInfo.quotedMessage.pollCreationMessage
    if (quotedPollLegacy) {
        if (quotedPollLegacy.name) texts.push(quotedPollLegacy.name)
        if (quotedPollLegacy.title) texts.push(quotedPollLegacy.title)
        if (quotedPollLegacy.options) {
            quotedPollLegacy.options.forEach(option => {
                if (option.optionName) texts.push(option.optionName)
            })
        }
    }
    
    return texts.join(' ').replace(/[\s\u200b\u200c\u200d\uFEFF\u2060\u00A0]+/g, ' ').trim()
}

function detectSocialLink(url) {
    if (!url) return null

    const lowerUrl = url.toLowerCase()

    for (const [platform, domains] of Object.entries(doms)) {
        if (domains.some(domain => lowerUrl.includes(domain))) {
            return platform
        }
    }
    return null
}
function getMessageType(m) {
    if (m.message && (m.message.pollCreationMessageV3 || m.message.pollCreationMessage)) {
        return 'poll'
    }
    if (m.message && m.message.videoMessage) {
        return 'video'
    }
    if (m.message && m.message.imageMessage) {
        return 'image'
    }
    return 'link'
}
export async function before(m, { conn, isAdmin, isBotAdmin, isOwner, isROwner }) {
    if (!m.isGroup) return false
    if (isAdmin || isOwner || isROwner || m.fromMe) return false
    const chat = global.db.data.chats[m.chat]
    if (!chat?.antiLink2) return false
    try {
        const extractedText = extractPossibleText(m)

        if (extractedText) {
            const urls = extractedText.match(sonoilgattoperquestitopi) || []
            for (const url of urls) {
                const detectedPlatform = detectSocialLink(url)
                if (detectedPlatform) {
                    const user = global.db.data.chats[m.chat].users = global.db.data.chats[m.chat].users || {}
                    user[m.sender] = user[m.sender] || {}
                    user[m.sender].antiLink2Warns = (user[m.sender].antiLink2Warns || 0) + 1
                    await conn.sendMessage(m.chat, {
                        delete: {
                            remoteJid: m.chat,
                            fromMe: false,
                            id: m.key.id,
                            participant: m.key.participant
                        }
                    }).catch(() => {})

                    if (user[m.sender].antiLink2Warns < 3) {
                        await conn.sendMessage(m.chat, {
                            text: `> 『 ⚠️ 』 Avviso ${user[m.sender].antiLink2Warns}/3 per link ${detectedPlatform}. Al terzo avviso verrai rimosso.\n\n> \`vare ✧ bot\``,
                            mentions: [m.sender]
                        })
                    } else {
                        user[m.sender].antiLink2Warns = 0
                        await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove').catch(console.error)
                        const username = m.sender.split('@')[0]
                        await conn.sendMessage(m.chat, {
                            text: `> 『 🛑 』 \`Link ${detectedPlatform} rilevato.\` *Ciao ciao* @${username}\n\n> \`vare ✧ bot\``,
                            mentions: [m.sender]
                        })
                    }
                    return true
                }
            }
        }
        const media = await getMediaBuffer(m)
        if (media) {
            const qrData = await readQRCode(media)
            
            if (qrData) {
                console.log(`[ANTILINK] QR decodificato: ${qrData.substring(0, 100)}...`)
                const detectedPlatform = detectSocialLink(qrData)
                if (detectedPlatform) {
                    const user = global.db.data.chats[m.chat].users = global.db.data.chats[m.chat].users || {}
                    user[m.sender] = user[m.sender] || {}
                    user[m.sender].antiLink2Warns = (user[m.sender].antiLink2Warns || 0) + 1
                    await conn.sendMessage(m.chat, {
                        delete: {
                            remoteJid: m.chat,
                            fromMe: false,
                            id: m.key.id,
                            participant: m.key.participant
                        }
                    }).catch(() => {})

                    if (user[m.sender].antiLink2Warns < 3) {
                        await conn.sendMessage(m.chat, {
                            text: `> 『 ⚠️ 』 Avviso ${user[m.sender].antiLink2Warns}/3 per QR con link ${detectedPlatform}. Al terzo avviso verrai rimosso.\n\n> \`vare ✧ bot\``,
                            mentions: [m.sender]
                        })
                    } else {
                        user[m.sender].antiLink2Warns = 0
                        await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove').catch(console.error)
                        const username = m.sender.split('@')[0]
                        await conn.sendMessage(m.chat, {
                            text: `> 『 🚫 』 \`QR con link ${detectedPlatform} rilevato.\` *Ciao ciao* @${username}\n\n> \`vare ✧ bot\``,
                            mentions: [m.sender]
                        })
                    }
                    return true
                }
            }
        }

    } catch (error) {
        console.error('[ANTILINK] Errore generale:', error)
        await conn.sendMessage(m.chat, { text: MESSAGES.error }, { quoted: m }).catch(() => {})
    }

    return false
}

export { before as handler }
