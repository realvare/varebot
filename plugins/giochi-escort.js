import { readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
const ESCORTS_FILE = join(process.cwd(), 'media', 'database', 'escorts.json')
let escorts = []
try {
    escorts = JSON.parse(readFileSync(ESCORTS_FILE))
} catch {
    writeFileSync(ESCORTS_FILE, '[]')
}

let handler = async (m, { conn, text, command }) => {
    try {
        switch (command) {
            case 'escort':
                if (!escorts.length) return m.reply('❌ *Nessuna escort disponibile*')
                
                let list = escorts.map((escort, i) => {
                    return `${i + 1}. @${escort.split('@')[0]}`
                }).join('\n')

                return conn.reply(m.chat, `
📋 *LISTA ESCORT*

${list}
                `.trim(), m, { mentions: escorts })
                break

            case 'addescort':
                if (!m.isGroup) return m.reply('⚠️ Solo nei gruppi')
                let isAdmin = m.isGroup ? (await conn.groupMetadata(m.chat)).participants.find(p => p.id === m.sender)?.admin : false
                if (!isAdmin) return m.reply('⚠️ Solo gli admin possono aggiungere escort')
                let user = m.quoted ? m.quoted.sender : text.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
                if (!user) return m.reply('❌ Tagga qualcuno o rispondi a un messaggio')
                if (escorts.includes(user)) return m.reply('⚠️ Questa escort è già in lista')
                escorts.push(user)
                writeFileSync(ESCORTS_FILE, JSON.stringify(escorts))

                m.reply(`✅ @${user.split('@')[0]} aggiunta alla lista escort!`, null, {
                    mentions: [user]
                })
                break

            case 'delescort':
                if (!m.isGroup) return m.reply('⚠️ Solo nei gruppi')
                let isAdminDel = m.isGroup ? (await conn.groupMetadata(m.chat)).participants.find(p => p.id === m.sender)?.admin : false
                if (!isAdminDel) return m.reply('⚠️ Solo gli admin possono rimuovere escort')
                let userToDel = m.quoted ? m.quoted.sender : text.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
                if (!userToDel) return m.reply('❌ Tagga qualcuno o rispondi a un messaggio')
                if (!escorts.includes(userToDel)) return m.reply('⚠️ Questa persona non è nella lista escort')
                escorts = escorts.filter(e => e !== userToDel)
                writeFileSync(ESCORTS_FILE, JSON.stringify(escorts))

                m.reply(`✅ @${userToDel.split('@')[0]} rimossa dalla lista escort!`, null, {
                    mentions: [userToDel]
                })
                break
        }
    } catch (e) {
        console.error('Errore escort:', e)
        m.reply('❌ Errore durante l\'operazione')
    }
}

handler.help = [
    'escort - Mostra la lista escort',
    'addescort <numero/tag> - Aggiunge un\'escort alla lista',
    'delescort <numero/tag> - Rimuove un\'escort dalla lista'
]
handler.tags = ['divertimento']
handler.command = /^(escort|addescort|delescort)$/i

export default handler