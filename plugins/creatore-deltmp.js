import { tmpdir } from 'os'
import path, { join } from 'path'
import {
    readdirSync,
    statSync,
    unlinkSync,
    existsSync,
    rmdirSync,
    promises as fs
} from 'fs'

let handler = async (m, { conn, usedPrefix: _p, __dirname, args }) => {
    const wait = await conn.reply(m.chat, `
╭━━━━━━━━━━━
┃ *🗑️ PULIZIA CACHE*
┃ Eliminazione in corso...
╰━━━━━━━━━━━`, m)

    try {
        const directories = [
            join(__dirname, '../tmp'), // Prima la cartella del bot
            tmpdir() // Poi temp di sistema
        ]

        const filename = []
        let filesDeleted = 0
        let filesSkipped = 0
        let totalSize = 0
        let errorFiles = []
        for (const dirname of directories) {
            if (existsSync(dirname)) {
                const files = readdirSync(dirname)
                for (const file of files) {
                    const filePath = join(dirname, file)
                    if (!shouldSkipFile(filePath)) {
                        filename.push(filePath)
                    }
                }
            }
        }
        for (const file of filename) {
            try {
                const stats = statSync(file)
                
                if (stats.isDirectory()) {
                    await deleteDirectoryWithRetry(file)
                    filesDeleted++
                } else {
                    await deleteFileWithRetry(file)
                    totalSize += stats.size
                    filesDeleted++
                }
                await conn.sendMessage(m.chat, {
                    edit: wait.key,
                    text: `
╭━━━━━━━━━━━
┃ *🗑️ PULIZIA CACHE*
┃ Cartelle: ${directories.length}
┃ Eliminati: ${filesDeleted}
┃ Saltati: ${filesSkipped}
┃ Spazio: ${formatSize(totalSize)}
╰━━━━━━━━━━━`
                })
            } catch (e) {
                console.error('Errore con:', file, e.code)
                filesSkipped++
                errorFiles.push(`${path.basename(file)} (${e.code})`)
            }
        }
        await conn.sendMessage(m.chat, {
            edit: wait.key,
            text: `
╭━━━━━━━━━━━
┃ *✅ CACHE PULITA*
┃ Cartelle: tmp, temp
┃ Eliminati: ${filesDeleted}
┃ Saltati: ${filesSkipped}
┃ Spazio: ${formatSize(totalSize)}
${errorFiles.length > 0 ? `┃\n┃ File non eliminati:\n┃ ${errorFiles.slice(0,5).join('\n┃ ')}${errorFiles.length > 5 ? '\n┃ ...' : ''}` : ''}
╰━━━━━━━━━━━`
        })

    } catch (error) {
        console.error(error)
        await conn.sendMessage(m.chat, {
            edit: wait.key,
            text: `
╭━━━━━━━━━━━
┃ *❌ ERRORE*
┃ ${error.message}
╰━━━━━━━━━━━`
        })
    }
}
async function deleteFileWithRetry(filePath, maxRetries = 3) {
    if (!existsSync(filePath)) {
        return true;
    }
    try {
        const fd = await fs.open(filePath, 'r+');
        await fd.close();
    } catch (e) {
        if (e.code === 'EBUSY' || e.code === 'EPERM') {
            console.log(`File in uso: ${path.basename(filePath)}`);
            return false;
        }
    }

    for (let i = 0; i < maxRetries; i++) {
        try {
            await fs.unlink(filePath);
            return true;
        } catch (e) {
            if (e.code === 'EBUSY' || e.code === 'EPERM') {
                console.log(`Tentativo ${i + 1}/${maxRetries} per: ${path.basename(filePath)}`);
                await new Promise(resolve => setTimeout(resolve, 1500 * (i + 1))); // Attesa incrementale
                continue;
            }
            if (e.code === 'ENOENT') {
                return true; // File già eliminato
            }
            console.error(`Errore eliminazione ${path.basename(filePath)}:`, e.code);
            return false;
        }
    }
    return false;
}
async function deleteDirectoryWithRetry(dirPath, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            await fs.rm(dirPath, { recursive: true, force: true })
            return true
        } catch (e) {
            if (e.code === 'EBUSY' || e.code === 'EPERM') {
                await new Promise(resolve => setTimeout(resolve, 1000))
                continue
            }
            throw e
        }
    }
    throw new Error(`Non posso eliminare la directory dopo ${maxRetries} tentativi`)
}
function isTempFile(filePath) {
    const fileName = path.basename(filePath);
    return /\.(tmp|temp|log|TMP)$/.test(fileName) || 
           /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(fileName) ||
           /^is-[A-Za-z0-9]{5,}/.test(fileName);
}
function shouldSkipFile(filePath) {
    const fileName = path.basename(filePath);
    const stat = statSync(filePath);
    if (Date.now() - stat.mtime.getTime() < 3600000) {
        return true;
    }
    if (skipList.some(skip => fileName.includes(skip))) {
        return true;
    }
    if (fileName.includes('Setup Log') && stat.size > 0) {
        return true;
    }

    return false;
}
const skipList = [
    'vscode-', 'steam', 'Ubisoft', 'WinRAR', 'WinGet',
    'Microsoft', 'Windows', 'System32', 'Program Files',
    'AppData', 'ProgramData', '$Recycle.Bin',
    'msedge_', 'chrome_', 'node_',
    'npm-', 'yarn-', '.vscode',
    'desktop.ini', 'thumbs.db'
]
function formatSize(bytes) {
    if (bytes === 0) return '0 B'
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
}

handler.help = ['cleartmp']
handler.tags = ['owner']
handler.command = /^(cleartmp|cleartemp|deltmp|puliscitmp)$/i
handler.rowner = true

export default handler