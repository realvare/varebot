import { tmpdir } from 'os'
import path, { join } from 'path'
import {
  readdirSync,
  statSync,
  unlinkSync,
  existsSync,
  readFileSync,
  watch
} from 'fs'

let handler = async (m, { conn, usedPrefix: _p, __dirname, args }) => {
  let statusMsg = await conn.reply(m.chat, '*🗑️ Eliminazione database in corso...*', m)

  try {
    const tmp = [tmpdir(), join(__dirname, '../database.json')]
    const filename = []
    
    tmp.forEach(dirname => readdirSync(dirname).forEach(file => filename.push(join(dirname, file))))
    
    let filesDeleted = 0
    filename.map(file => {
      const stats = statSync(file)
      unlinkSync(file)
      filesDeleted++
    })

    await conn.sendMessage(m.chat, {
      text: `*✨ Database eliminato con successo!*\n*🗑️ File eliminati:* ${filesDeleted}`,
      edit: statusMsg.key
    })

  } catch (err) {
    console.error('Errore durante l\'eliminazione del database:', err)
    await conn.sendMessage(m.chat, {
      text: '❌ *Si è verificato un errore durante l\'eliminazione*',
      edit: statusMsg.key
    })
  }
}
handler.help = ['cleardb']
handler.tags = ['creatore']
handler.command = /^(cleardb|cleardatabase|cancelladb|eliminadb|cancelladatabase)$/i
handler.exp = 500
handler.rowner = true

export default handler