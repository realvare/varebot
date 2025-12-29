const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

var handler = async (m, { conn, participants }) => {
  try {
    const owners = new Set(
      (global.owner || [])
        .flatMap(v => {
          if (typeof v === 'string') return [v]
          if (Array.isArray(v)) return v.filter(x => typeof x === 'string')
          return []
        })
        .map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net')
    )

    const botJid = conn.user.jid
    const botParticipant = participants.find(p => p.id === botJid)
    const isBotAdmin = botParticipant?.admin === 'admin' || botParticipant?.admin === 'superadmin'

    if (!isBotAdmin) {
      return m.reply('❌ Il bot non è admin, quindi non può smontare nessuno.')
    }
    if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = {}
    global.db.data.chats[m.chat].detect = false
    const toDemote = participants
      .filter(p => p.admin && !owners.has(p.id) && p.id !== botJid)
      .map(p => p.id)

    if (toDemote.length === 0) {
      return m.reply('✅ Nessun admin da smontare.')
    }
    await conn.groupParticipantsUpdate(m.chat, toDemote, 'demote').catch(() => {})
    await delay(1000)

    m.reply(`✅ Smontati ${toDemote.length} adminz.`)
    
  } catch (e) {
    console.error(e)
    m.reply('❌ Errore durante lo smontaggio degli admin.')
  }
}

handler.command = /^smonta$/i
handler.group = true
handler.rowner = true
export default handler