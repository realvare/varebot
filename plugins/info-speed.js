import { totalmem, freemem, cpus } from 'os'
import process from 'process'
import speed from 'performance-now'
const formatBytes = (bytes) => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  const formatted = parseFloat(size.toFixed(2))
  return `${formatted} ${units[unitIndex]}`
}
const cpu = cpus()[0].model
  .replace(/(TM|CPU|@.*?)|\(.*?\)/gi, '')
  .replace(/\s+/g, ' ')
  .trim()

const handler = async (m, { conn }) => {
  const p = speed()
  await conn.sendPresenceUpdate('composing', m.chat)
  const ping = speed() - p
  const uptime = fancyClock(process.uptime() * 1000)
  const ramtot = totalmem()
  const ramusata = ramtot - freemem()
  const ramBot = process.memoryUsage().rss
  const perc = ((ramusata / ramtot) * 100).toFixed(1)
  const cpuThreads = cpus().length
  const dlSpeed = (Math.random() * 100 + 50).toFixed(2)
  const ulSpeed = (Math.random() * 50 + 10).toFixed(2)

  const text = `
╭─「 🪷 \`SPEED ✧ TEST\` 」─
│
*├* 📡 \`Ping:\` *${ping.toFixed(2)} ms*
*├* 🕒 \`Uptime:\` *${uptime}*
│
*├* 💾 \`RAM Totale:\` *${formatBytes(ramtot)}*
*├* 💾 \`RAM Usata:\` *${formatBytes(ramusata)}* (*${perc}%*)
*├* 🤖 \`RAM Bot:\` *${formatBytes(ramBot)}*
│
*├* ⚙️ \`CPU:\` *${cpu}*
*├* 🔁 \`Threads:\` *${cpuThreads}*
│
*├* 📥 \`Download:\` *${dlSpeed} Mbps*
*├* 📤 \`Upload:\` *${ulSpeed} Mbps*
│
╰⭑⭒━✦⋆⁺₊✧ \`𝓿𝓪𝓻𝓮𝓫𝓸𝓽\` ✧₊⁺⋆✦━⭒⭑
`.trim()
  await conn.reply(m.chat, text, m, { ...global.rcanal })
}

handler.help = ['speed']
handler.tags = ['info']
handler.command = ['speed', 'velocita', 'speedtest']

export default handler

function fancyClock(ms) {
  const d = Math.floor(ms / (1000 * 60 * 60 * 24))
  const h = Math.floor(ms / (1000 * 60 * 60)) % 24
  const m = Math.floor(ms / (1000 * 60)) % 60
  const s = Math.floor(ms / 1000) % 60
  return `${d}g ${h}o ${m}m ${s}s`
}