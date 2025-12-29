// tbh non so se va bene ma dovrebbe
let handler = m => m
handler.before = async function (m, {conn, isAdmin, isBotAdmin}) {
if (!m.isGroup) return false
let chat = global.db.data.chats[m.chat]
if (isBotAdmin && chat.antivoip) {
let decodedSender = conn.decodeJid(m.sender)
let senderNumber = decodedSender.split('@')[0].split(':')[0]
let domain = decodedSender.split('@')[1]
let decodedBotJid = conn.decodeJid(conn.user.jid)
if (decodedSender === decodedBotJid) return
if (domain === 'lid') return
if (!senderNumber.startsWith('39')) {
let utente = formatPhoneNumber(senderNumber, true)
let nuhuh = `⚠️ Hey ${utente},\n- Solo numeri italiani sono permessi in questo gruppo.`
await conn.sendMessage(m.chat, { text: nuhuh, contextInfo: { mentionedJid: [decodedSender] }}, { quoted: m })
await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove')}}}
function formatPhoneNumber(number, includeAt = false) {
if (!number || number === '?' || number === 'sconosciuto') return includeAt ? '@Sconosciuto' : 'Sconosciuto';
if (number.startsWith('lid_')) return includeAt ? '@[ID nascosto]' : '[ID nascosto]';
return includeAt ? '@' + number : number;
}
export default handler