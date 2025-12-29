import fetch from 'node-fetch'

const GEMINI_API_KEY = `${global.APIKeys.google}`
const insultiUsati = new Set()

const handler = async (m, { conn, args, command, text }) => {
  let parolaChiave = ''
  if (args.length > 1) {
    parolaChiave = args.slice(1).join(' ').trim()
  }
  let target
  let mention = []
  if (m.mentionedJid && m.mentionedJid.length > 0) {
    target = m.mentionedJid[0]
    mention = [target]
  } else if (m.quoted && m.quoted.sender) {
    target = m.quoted.sender
    mention = [target]
  } else {
    return conn.reply(m.chat, 'Tagga qualcuno o rispondi a un messaggio per insultarlo!', m)
  }
  let ownerList = []
  if (global.owner) {
    if (Array.isArray(global.owner)) {
      ownerList = global.owner.map(o => typeof o === 'object' ? o[0] : o)
    } else if (typeof global.owner === 'string') {
      ownerList = [global.owner]
    }
  }
  const targetNum = String(target).replace(/[^0-9]/g, '')
  const isOwner = ownerList.some(o => String(o).replace(/[^0-9]/g, '') === targetNum)
  async function generaInsultoUnico(parolaChiave = '') {
    let tentativi = 0
    let insulto = ''
    while (tentativi < 5) {
      let prompt = parolaChiave 
        ? `genera un insulto creativo in italiano usando la parola "${parolaChiave}", massimo 4 righe, mai ripetuto prima. Non usare emoji, sii creativo e divertente.`
        : `genera un insulto pesante in italiano, massimo 4 righe, mai ripetuto prima. Non usare emoji, e sii cattivo e volgare`;
      
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      })
      const data = await res.json()
      insulto = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
      if (!insulto) break
      if (!insultiUsati.has(insulto)) {
        insultiUsati.add(insulto)
        return insulto
      }
      tentativi++
    }
    return insulto || `Oppa, ti sei salvato @${m.sender.replace(/@.+/, '')}`
  }

  if (isOwner) {
    const insulto = await generaInsultoUnico(parolaChiave)
    return conn.reply(m.chat, `Insulto te invece, @${m.sender.replace(/@.+/, '')} ${insulto}`, m, { mentions: [m.sender] })
  }
  const insulto = await generaInsultoUnico(parolaChiave)
  if (!insulto) {
    return conn.reply(m.chat, 'Errore AI: nessuna risposta valida. Riprova più tardi.', m)
  }
  await conn.reply(m.chat, `@${target.replace(/@.+/, '')} ${insulto}`, m, { mentions: mention })
}

handler.help = ['insulta @tag']
handler.tags = ['giochi']
handler.command = /^insulta$/i
handler.register = true
export default handler