let handler = async (m, { conn, text, usedPrefix }) => {
    let user = global.db.data.users[m.sender]
    
    // Create dynamic fkontak with user's name
    let userName = user?.name || 'Utente'
    let fkontak = {
        key: {
            participant: "0@s.whatsapp.net",
            remoteJid: "status@broadcast",
            fromMe: false,
            id: "Halo"
        },
        message: {
            contactMessage: {
                vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;${userName};;;\nFN:${userName}\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
            }
        },
        participant: "0@s.whatsapp.net"
    }
    
    if (!user.registered) {
        return conn.sendMessage(m.chat, {
            text: `
『 ⚠️ 』 *\`Non sei registrato!\`*
『 📝 』 \`Usa ${usedPrefix}reg per registrarti.\``
        }, { quoted: fkontak })
    }
    
    if (!text || text.toLowerCase() !== 'conferma') {
        return conn.sendMessage(m.chat, {
            text: `
ㅤㅤ⋆｡˚『 ╭ \`ATTENZIONE\` ╯ 』˚｡⋆\n╭\n│
│『 ❗ 』 *Questa azione resetterà*
│『 📊 』 *I tuoi dati attuali:*
│  • \`Nome:\` *${user.name || 'Non impostato'}*
│  • \`Età:\` *${user.age || 0}*
│  • \`Livello:\` *${user.level || 0}*
│  • \`EXP:\` *${user.exp || 0}*
│  • \`Euro:\` *${user.euro || 0}*
│  • \`Registrato il:\` *${user.regTime ? new Date(user.regTime).toLocaleDateString('it-IT') : 'Data non disponibile'}*
│
│『 ⁉️ 』 *Per confermare scrivi:*
│              *${usedPrefix}unreg conferma*
│
*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`
        }, { quoted: fkontak })
    }
    
    // Create backup with safe property access
    let backup = {
        name: user.name || 'Non impostato',
        age: user.age || 0,
        regTime: user.regTime || 0,
        exp: user.exp || 0,
        level: user.level || 0,
        euro: user.euro || 0,
        banned: user.banned || false
    }
    
    let regDate = backup.regTime ? new Date(backup.regTime).toLocaleDateString('it-IT', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }) : 'Data non disponibile'
    
    // Reset user data
    user.registered = false
    user.name = ''
    user.age = 0
    user.regTime = 0
    user.exp = 0
    user.level = 0
    user.euro = 0
    
    await global.db.write();  // Salvataggio persistente

    return conn.sendMessage(m.chat, {
        text: `ㅤㅤ⋆｡˚『 ╭ \`RESETTATO\` ╯ 』˚｡⋆\n╭\n│
│ 『 📊 』 *Riepilogo dati eliminati:*
│ 『 👤 』 *Profilo:*
│   • \`Nome:\` *${backup.name}*
│   • \`Età:\` *${backup.age} anni*
│   • \`Registrato:\` *${regDate}*
│
│ 『 🎮 』 *Statistiche:*
│   • \`Livello:\` *${backup.level}*
│   • \`Esperienza:\` *${backup.exp.toLocaleString()} XP*
│   • \`Euro:\` *${backup.euro.toLocaleString()}* 💶
*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*
> Usa *${usedPrefix}reg* per registrarti di nuovo
> *Data eliminazione: ${new Date().toLocaleString('it-IT')}*`
    }, { quoted: fkontak })
}

handler.help = ['unreg']
handler.tags = ['profilo']
handler.command = /^unreg(ister)?$/i
handler.register = true

export default handler