const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

var handler = async (m, { conn }) => {
  try {
    if (!m.isGroup) return

    // 📌 Recupero metadata sempre affidabile
    const metadata = await conn.groupMetadata(m.chat)
    const participants = metadata.participants

    // 📌 Owner (compatibile con tutti i formati)
    const owners = new Set(
      (global.owner || [])
        .flatMap(v => {
          if (typeof v === 'string') return [v]
          if (Array.isArray(v)) return v.filter(x => typeof x === 'string')
          return []
        })
        .map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net')
    )

    // 📌 JID bot normalizzato
    const botJid = conn.user.id.split(':')[0] + '@s.whatsapp.net'
    const botParticipant = participants.find(p => p.id === botJid)

    // 📌 Controllo admin bot
    const isBotAdmin = ['admin', 'superadmin'].includes(botParticipant?.admin)
    if (!isBotAdmin) {
      return m.reply('❌ Il bot non è admin, quindi non può smontare nessuno.')
    }

    // 📌 Smonta tutti gli admin tranne owner e bot
    const toDemote = participants
      .filter(p =>
        p.admin &&
        p.id !== botJid &&
        !owners.has(p.id)
      )
      .map(p => p.id)

    if (!toDemote.length) {
      return m.reply('✅ Nessun admin da smontare.')
    }

    // 📌 Demote
    await conn.groupParticipantsUpdate(m.chat, toDemote, 'demote')
    await delay(1000)

    m.reply(`✅ Smontati ${toDemote.length} admin.`)

  } catch (e) {
    console.error(e)
    m.reply('❌ Errore durante lo smontaggio degli admin.')
  }
}

handler.command = /^smonta$/i
handler.group = true
handler.owner = true
handler.botAdmin = true

export default handler