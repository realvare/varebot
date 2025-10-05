import youtubedl from 'youtube-dl-exec'
import ffmpeg from 'fluent-ffmpeg'
import { promises as fs } from 'fs'
import { join } from 'path'
import yts from 'yt-search'

async function searchWithMultipleQueries(queries, outputPath, type) {
  for (const query of queries) {
    try {
      const search = await yts(query)
      if (search.videos.length > 0) {
        const filteredVideo = findBestVideo(search.videos, type)
        
        if (filteredVideo) {
          const { title, url } = filteredVideo
          
          await youtubedl(url, {
            extractAudio: true,
            audioFormat: 'mp3',
            audioQuality: 0,
            output: outputPath.replace('.mp3', '.%(ext)s'),
            noWarnings: true,
            noCheckCertificate: true,
            preferFreeFormats: true
          })
          
          return { title, success: true, usedQuery: query }
        }
      }
    } catch (error) {
      console.error(`Errore con query "${query}":`, error.message)
      continue
    }
  }
  
  return { title: queries[0], success: false, error: 'Nessuna query ha prodotto risultati' }
}

function findBestVideo(videos, type) {
  const keywords = getKeywords(type)
  
  for (const video of videos) {
    const title = video.title.toLowerCase()
    
    if (type === 'vocals') {
      if (keywords.some(keyword => title.includes(keyword))) {
        return video
      }
    } else if (type === 'instrumental') {
      if (keywords.some(keyword => title.includes(keyword))) {
        return video
      }
    }
  }
  
  return null
}

function getKeywords(type) {
  if (type === 'vocals') {
    return [
      'vocals', 'acapella', 'a capella', 'vocal', 'voice only', 
      'singing only', 'isolated vocals', 'clean vocals', 'vocal track',
      'vocals only', 'vocal stem', 'without music', 'voice track',
      'vocal version', 'vocal isolated', 'vocal extract'
    ]
  } else if (type === 'instrumental') {
    return [
      'instrumental', 'karaoke', 'backing track', 'minus one',
      'playback', 'without vocals', 'music only', 'beat only',
      'background music', 'no vocals', 'accompaniment', 'inst',
      'minus vocal', 'backing', 'instrumental version', 'instrumental track'
    ]
  }
  return []
}

async function searchAndDownloadAudio(songName, type, outputPath) {
  const queries = generateQueries(songName, type)
  return await searchWithMultipleQueries(queries, outputPath, type)
}

function generateQueries(songName, type) {
  const queries = []
  
  if (type === 'vocals') {
    queries.push(
      `${songName} vocals only`,
      `${songName} acapella`,
      `${songName} vocal track`,
      `${songName} isolated vocals`,
      `${songName} vocals isolated`,
      `${songName} voice only`,
      `${songName} singing only`,
      `${songName} vocal version`,
      `${songName} clean vocals`,
      `${songName} vocal stem`,
      `${songName} a capella`,
      `${songName} vocal isolated track`,
      `${songName} without music`,
      `${songName} voice track only`,
      `${songName} vocal extract`
    )
  } else if (type === 'instrumental') {
    queries.push(
      `${songName} instrumental`,
      `${songName} karaoke`,
      `${songName} instrumental version`,
      `${songName} backing track`,
      `${songName} minus one`,
      `${songName} playback`,
      `${songName} without vocals`,
      `${songName} instrumental track`,
      `${songName} music only`,
      `${songName} beat only`,
      `${songName} instrumental karaoke`,
      `${songName} background music`,
      `${songName} no vocals`,
      `${songName} instrumental stem`,
      `${songName} base musical`,
      `${songName} accompaniment`,
      `${songName} minus vocal`,
      `${songName} inst version`
    )
  }
  
  return queries
}

async function createMashup(vocalPath, instrumentalPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(vocalPath)
      .input(instrumentalPath)
      .complexFilter([
        '[0:a]aformat=channel_layouts=stereo,volume=0.8[vocals]',
        '[1:a]aformat=channel_layouts=stereo,volume=0.6[instrumental]',
        '[vocals][instrumental]amix=inputs=2:duration=first:dropout_transition=2[out]'
      ])
      .map('[out]')
      .audioBitrate('192k')
      .audioCodec('libmp3lame')
      .save(outputPath)
      .on('end', resolve)
      .on('error', reject)
  })
}

async function fileExists(path) {
  try {
    await fs.access(path)
    return true
  } catch {
    return false
  }
}

async function safeUnlink(filePath, maxRetries = 3, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await fs.unlink(filePath)
      return true
    } catch (error) {
      if (error.code === 'ENOENT') {
        return true
      }
      if (error.code === 'EBUSY' && i < maxRetries - 1) {
        console.log(`File ${filePath} occupato, riprovo tra ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      console.error(`Errore eliminazione ${filePath}:`, error.message)
      return false
    }
  }
  return false
}

async function cleanupFiles(filePaths) {
  const cleanupPromises = filePaths.map(async (filePath) => {
    if (await fileExists(filePath)) {
      await safeUnlink(filePath)
    }
  })
  
  await Promise.allSettled(cleanupPromises)
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) return m.reply(`『 ⚠️ 』- \`uso:\` ${usedPrefix + command} *canzone autore* + *canzone autore*`)

  let [song1, song2] = text.split('+').map(v => v.trim())
  if (!song1 || !song2) return m.reply('❌ Devi fornire due canzoni separate dal +')

  const tmpDir = join(process.cwd(), 'tmp')
  await fs.mkdir(tmpDir, { recursive: true }).catch(() => {})
  const timestamp = Date.now()
  const vocals1Path = join(tmpDir, `vocals1_${timestamp}.mp3`)
  const base1Path = join(tmpDir, `base1_${timestamp}.mp3`)
  const vocals2Path = join(tmpDir, `vocals2_${timestamp}.mp3`)
  const base2Path = join(tmpDir, `base2_${timestamp}.mp3`)
  const mashup1Path = join(tmpDir, `mashup1_${timestamp}.mp3`)
  const mashup2Path = join(tmpDir, `mashup2_${timestamp}.mp3`)
  
  try {
    await conn.sendMessage(m.chat, { react: { text: '⌛', key: m.key } })

    const vocalsResult1 = await searchAndDownloadAudio(song1, 'vocals', vocals1Path)
    const baseResult1 = await searchAndDownloadAudio(song1, 'instrumental', base1Path)
    const vocalsResult2 = await searchAndDownloadAudio(song2, 'vocals', vocals2Path)
    const baseResult2 = await searchAndDownloadAudio(song2, 'instrumental', base2Path)

    const files = [
      { path: vocals1Path, name: `${song1} vocals`, result: vocalsResult1 },
      { path: base1Path, name: `${song1} base`, result: baseResult1 },
      { path: vocals2Path, name: `${song2} vocals`, result: vocalsResult2 },
      { path: base2Path, name: `${song2} base`, result: baseResult2 }
    ]

    const missingFiles = []
    for (const file of files) {
      if (!file.result.success || !(await fileExists(file.path))) {
        missingFiles.push(file.name)
      }
    }

    if (missingFiles.length > 0) {
      return m.reply(`『 ❌ 』- Impossibile scaricare: ${missingFiles.join(', ')}\n\n『 💡 』- Prova con termini di ricerca più specifici o canzoni più popolari.`)
    }

    await createMashup(vocals2Path, base1Path, mashup1Path)
    await createMashup(vocals1Path, base2Path, mashup2Path)
    
    const mashup1Exists = await fileExists(mashup1Path)
    const mashup2Exists = await fileExists(mashup2Path)
    
    if (!mashup1Exists || !mashup2Exists) {
      return m.reply(`${global.errore}`)
    }
    
    try {
      await conn.sendMessage(m.chat, {
        audio: await fs.readFile(mashup1Path),
        mimetype: 'audio/mp4',
        ptt: false,
        fileName: `Mashup_1_${song2}_vocals_+_${song1}_instrumental.mp3`
      }, { quoted: m })
      
      await conn.sendMessage(m.chat, {
        audio: await fs.readFile(mashup2Path),
        mimetype: 'audio/mp4',
        ptt: false,
        fileName: `Mashup_2_${song1}_vocals_+_${song2}_instrumental.mp3`
      }, { quoted: m })

      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
      
      await new Promise(resolve => setTimeout(resolve, 2000))
      
    } catch (sendError) {
      console.error('Errore invio mashup:', sendError)
      
      try {
        const audioBuffer1 = await fs.readFile(mashup1Path)
        const audioBuffer2 = await fs.readFile(mashup2Path)
        
        await conn.sendMessage(m.chat, {
          audio: audioBuffer1,
          mimetype: 'audio/ogg; codecs=opus',
          ptt: true
        }, { quoted: m })
        
        await conn.sendMessage(m.chat, {
          audio: audioBuffer2,
          mimetype: 'audio/ogg; codecs=opus',
          ptt: true
        }, { quoted: m })
        
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
        
        await new Promise(resolve => setTimeout(resolve, 2000))
        
      } catch (altError) {
        console.error('Errore anche con PTT:', altError)
        m.reply(`${global.errore}`)
      }
    }

  } catch (e) {
    console.error('Errore durante la creazione del mashup:', e)
    m.reply(`${global.errore}`)
  } finally {
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    const filesToClean = [vocals1Path, base1Path, vocals2Path, base2Path, mashup1Path, mashup2Path]
    await cleanupFiles(filesToClean)
  }
}

handler.help = ['songmix <canzone1 + canzone2>']
handler.tags = ['strumenti']
handler.command = /^(songmix|mashup|mixsong)$/i
handler.premium = true
handler.register = true

export default handler