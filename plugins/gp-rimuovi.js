var handler = async (m, { conn, participants }) => {
    try {
        if (m.text && m.text.toLowerCase().trim() === 'abdul') {
            const groupAdmins = participants.filter(p => p.admin).map(p => p.id)
            if (!groupAdmins.includes(m.sender) && !m.fromMe) {
                return
            }
            
            if (!m.mentionedJid[0] && !m.quoted) {
                let errorMsg = `*chi vuoi rimuovere?*`
                return m.reply(errorMsg)
            }
            
            let user = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted.sender
            const groupInfo = await conn.groupMetadata(m.chat)
            const ownerGroup = groupInfo.owner || m.chat.split`-`[0] + '@s.whatsapp.net'
            const ownerBot = global.owner[0] && global.owner[0][0] ? global.owner[0][0] + '@s.whatsapp.net' : ''
            const isTargetAdmin = groupAdmins.includes(user)
            
            if (user === conn.user.jid) {
                return conn.reply(m.chat, '『 🤨 』 `Non posso rimuovermi da solo`', m);
            }
            if (user === ownerGroup) {
                return conn.reply(m.chat, '『 🍥 』 `Non posso rimuovere il proprietario del gruppo`', m);
            }
            if (user === ownerBot) {
                return conn.reply(m.chat, '『 ⁉️ 』 `A chi vuoi togliere????`', m);
            }
            if (isTargetAdmin) {
                return conn.reply(m.chat, '『 🤒 』 `Non posso rimuovere un altro admin`', m);
            }
            
            await conn.groupParticipantsUpdate(m.chat, [user], 'remove');
            await conn.sendMessage(m.chat, { sticker: { url: './media/sticker/bann.webp' } }, { quoted: m });
            return
        }
        const isOwner = m.fromMe || global.owner
            .map(v => typeof v === 'string' ? v : Array.isArray(v) ? v[0] : v.toString())
            .map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net')
            .includes(m.sender)
           
        const isROwner = isOwner || (global.owner[0] && global.owner[0][0] + '@s.whatsapp.net' === m.sender)
       
        if (!m.mentionedJid[0] && !m.quoted) {
            let errorMsg = `*chi vuoi rimuovere?*`
            return m.reply(errorMsg)
        }
        let user = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted.sender
        const groupInfo = await conn.groupMetadata(m.chat)
        const ownerGroup = groupInfo.owner || m.chat.split`-`[0] + '@s.whatsapp.net'
        const ownerBot = global.owner[0] && global.owner[0][0] ? global.owner[0][0] + '@s.whatsapp.net' : ''
        const groupAdmins = participants.filter(p => p.admin).map(p => p.id)
        const isTargetAdmin = groupAdmins.includes(user)
        if (user === conn.user.jid) {
            return conn.reply(m.chat, '『 🤨 』 `Non posso rimuovermi da solo`', m);
        }
        if (user === ownerGroup) {
            return conn.reply(m.chat, '『 🍥 』 `Non posso rimuovere il proprietario del gruppo`', m);
        }
        if (user === ownerBot) {
            return conn.reply(m.chat, '『 ⁉️ 』 `A chi vuoi togliere????`', m);
        }
        if (isTargetAdmin) {
            return conn.reply(m.chat, '『 🤒 』 `Non posso rimuovere un altro admin`', m);
        }
        await conn.groupParticipantsUpdate(m.chat, [user], 'remove');
        await conn.sendMessage(m.chat, { sticker: { url: './media/sticker/bann.webp' } }, { quoted: m });
    } catch (e) {
        console.error(e)
        return m.reply(`${global.errore}`)
    }
}
handler.help = ['rimuovi']
handler.tags = ['gruppo']
handler.command = /^(kick|rimuovi|paki|ban)$/i
handler.group = true
handler.admin = true
handler.botAdmin = true
export default handler