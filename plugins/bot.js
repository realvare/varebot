/*⭑⭒━━━✦❘༻☾⋆⁺₊✧ Importazioni ✧₊⁺⋆☽༺❘✦━━━⭒⭑*/

import path from 'path'
import { promises as fs } from 'fs'

/*⭑⭒━━━✦❘༻☾⋆⁺₊✧ Handler base ✧₊⁺⋆☽༺❘✦━━━⭒⭑*/

var handler = m => m
handler.all = async function (m) {
  
/*⭑⭒━━━✦❘༻☾⋆⁺₊✧ Dati utente globali ✧₊⁺⋆☽༺❘✦━━━⭒⭑*/

  global.nome = conn.getName(m.sender)
  global.readMore = String.fromCharCode(8206).repeat(4001)
  global.authsticker = global.nome
  global.packsticker = global.nomepack

/*⭑⭒━━━✦❘༻☾⋆⁺₊✧ Immagini ✧₊⁺⋆☽༺❘✦━━━⭒⭑*/

  global.foto = [
    path.join(process.cwd(), 'media', 'sticker', 'banzozzap.webp'),
    path.join(process.cwd(), 'media', 'menu', 'menu.jpg')
  ].getRandom()

/*⭑⭒━━━✦❘༻☾⋆⁺₊✧ Estetica: Thumb + Estilo ✧₊⁺⋆☽༺❘✦━━━⭒⭑*/

 let zwag = await fs.readFile(global.foto)
  global.estilo = {
    key: {
      fromMe: true,
      participant: `0@s.whatsapp.net`,
    },
    message: {
      orderMessage: {
        itemCount: 67,
        status: 0,
        surface: 1,
        message: global.nomepack,
        orderTitle: 'js gimme my moneyyy',
        thumbnail: zwag,
        sellerJid: '0@s.whatsapp.net'
      }
    }
  }

/*⭑⭒━━━✦❘༻☾⋆⁺₊✧ Contatto fake ✧₊⁺⋆☽༺❘✦━━━⭒⭑*/

global.fkontak = {
  key: {
    participant: "0@s.whatsapp.net",
    remoteJid: "status@broadcast",
    fromMe: false,
    id: "Halo"
  },
  message: {
    contactMessage: {
      vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:vare ✧ bot\nitem1.TEL;waid=0:0\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
    }
  },
  participant: "0@s.whatsapp.net"
}

/*⭑⭒━━━✦❘༻☾⋆⁺₊✧ Canali newsletter ✧₊⁺⋆☽༺❘✦━━━⭒⭑*/

  let canale = await getRandomChannel()
  global.canaleRD = canale

  global.fake = {
    contextInfo: {
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: canale.id,
        newsletterName: canale.name,
        serverMessageId: 1
      }
    },
    quoted: m
  }

  global.rcanal = {
    contextInfo: {
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: canale.id,
        serverMessageId: 1,
        newsletterName: canale.name
      },
      externalAdReply: {
        title: testobot,
        body: dev,
        thumbnail: zwag,
        sourceUrl: '',
        mediaType: 1,
        renderLargerThumbnail: false
      }
    }
  }
}

/*⭑⭒━━━✦❘༻☾⋆⁺₊✧ Canali predefiniti ✧₊⁺⋆☽༺❘✦━━━⭒⭑*/

global.IdCanale = ['120363418582531215@newsletter',/*'tuojidcanale@newsletter'*/] // Vietato togliere il jid di Varebot
global.NomeCanale = [
  '⭒━━✧❘༻☾⋆⁺₊🩸 𝓿𝓪𝓻𝓮𝓫𝓸𝓽 🕊️₊⁺⋆☽༺❘✧━━⭒',
  '✧⋆⁺₊❖⭑ 𝓿𝓪𝓻𝓮𝓫𝓸𝓽 ⭑❖₊⁺⋆✧',
  '༺☾⋆⁺₊✧ 𝓿𝓪𝓻𝓮𝓫𝓸𝓽 🕊️ ✧₊⁺⋆☽༻',
  '⋆⁺₊✦⭑彡 𝓿𝓪𝓻𝓮𝓫𝓸𝓽 彡⭑✦₊⁺⋆',
  '⭑⭒━━━✦༻ 𝖛𝖆𝖗𝖊𝖇𝖔𝖙 ༺✦━━━⭒⭑',
  '☁️⋆｡°✩ 𝕧𝕒𝕣𝕖𝕓𝕠𝕥 ✩°｡⋆☁️',
  '⋆⁺₊✧༚ 𝒱𝒶𝓇𝑒𝒷𝑜𝓉 ༚✧₊⁺⋆',
  '🌙⋆⁺₊ 𝙫𝙖𝙧𝙚𝙗𝙤𝙩 ₊⁺⋆🌙',
  '⌜☆⌟ 𝓋𝒶𝓇𝑒𝒷𝑜𝓉 ⌞☆⌝',
  '✧ 彡 𝘷𝘢𝘳𝘦𝘣𝘰𝘵 彡 ✧',
  '✦ ⌈ 𝕍𝔸ℝ𝔼𝔹𝕆𝕋 ⌋ ✦',
  '⋆⭑˚₊ 𝓥𝓪𝓻𝓮𝓫𝓸𝓽 ₊˚⭑⋆',
  '╰⊱♡⊰╮𝓋𝒶𝓇𝑒𝒷𝑜𝓉╭⊱♡⊰╯',
  '✿｡❀ 𓆩 𝖛𝖆𝖗𝖊𝖇𝖔𝖙 𓆪 ❀｡✿',
  '✧･ﾟ: *✧･ﾟ:* 𝓥𝓪𝓻𝓮𝓫𝓸𝓽 *:･ﾟ✧*:･ﾟ✧',
  '✦⭑★⭒ 𝒗𝒂𝒓𝒆𝒃𝒐𝒕 ⭒★⭑✦',
  '˗ˏˋ ☾ 𝚟𝚊𝚛𝚎𝚋𝚘𝚝 ☽ ˎˊ˗',
]

/*⭑⭒━━━✦❘༻☾⋆⁺₊✧ Utility globali ✧₊⁺⋆☽༺❘✦━━━⭒⭑*/

Array.prototype.getRandom = function () {
  return this[Math.floor(Math.random() * this.length)]
}
async function getRandomChannel() {
  if (!Array.isArray(global.IdCanale) || !Array.isArray(global.NomeCanale) || global.IdCanale.length === 0 || global.NomeCanale.length === 0) {
    return {
      id: '120363418582531215@newsletter',
      name: '⭒━━✧❘༻☾⋆⁺₊🩸 𝓿𝓪𝓻𝓮𝓫𝓸𝓽 🕊️₊⁺⋆☽༺❘✧━━⭒'
    }
  }
  let id = global.IdCanale.getRandom()
  let name = global.NomeCanale.getRandom()
  return { id, name }
}

export default handler
