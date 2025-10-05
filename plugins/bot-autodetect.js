import fetch from 'node-fetch';

export async function before(m, { conn, groupMetadata }) {
  if (!m.messageStubType && !m.message?.protocolMessage?.type) return;
  if (!m.isGroup) return;

  let decodedSender = m.sender ? conn.decodeJid(m.sender) : null;
  let decodedParam0 = typeof m.messageStubParameters?.[0] === 'string' ? conn.decodeJid(m.messageStubParameters[0]) : null;

  let senderNumber = decodedSender ? decodedSender.split('@')[0].split(':')[0] : '?';
  let param0Number = decodedParam0 ? decodedParam0.split('@')[0].split(':')[0] : 'sconosciuto';

  const utente = formatPhoneNumber(senderNumber, true);
  const formattedParam0 = formatPhoneNumber(param0Number, true);

  const type = m.messageStubType;
  let ppUrl = null;
  let ppBuffer;
  const vareb0t = 'https://i.ibb.co/hJW7WwxV/varebot.jpg';

  try {
    ppUrl = await conn.profilePictureUrl(m.chat, 'image');
    const finalUrl = ppUrl + (ppUrl.includes('?') ? '&' : '?') + 'v=' + Date.now();
    const response = await fetch(finalUrl);
    ppBuffer = await response.buffer();
  } catch (e) {
    try {
      const defaultResponse = await fetch(vareb0t);
      ppBuffer = await defaultResponse.buffer();
      ppUrl = vareb0t;
    } catch (err) {
      ppBuffer = Buffer.alloc(0);
    }
  }
  const nomegp = groupMetadata.subject || 'vare ✧ bot';
  const am = {
    21: 'NOME GRUPPO MODIFICATO',
    22: 'IMMAGINE GRUPPO MODIFICATA',
    23: 'LINK GRUPPO REIMPOSTATO',
    25: 'PERMESSI GRUPPO MODIFICATI',
    26: 'STATO GRUPPO MODIFICATO',
    29: 'NUOVO ADMIN PROMOSSO',
    30: 'ADMIN RETROCESSO'
  };

  const varebot = {
    21: `ㅤㅤ⋆｡˚『 ╭ \`NOME GRUPPO\` ╯ 』˚｡⋆\n╭  \n│ 『 👤 』 \`Da:\` *${utente}*\n│ 『 🏷️ 』 \`Nuovo nome:\` *${nomegp || 'sconosciuto'}*\n*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`,
    22: `ㅤㅤ⋆｡˚『 ╭ \`IMMAGINE GRUPPO\` ╯ 』˚｡⋆\n╭  \n│ 『 👤 』 \`Da:\` *${utente}*\n*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`,
    23: `ㅤㅤ⋆｡˚『 ╭ \`LINK REIMPOSTATO\` ╯ 』˚｡⋆\n╭  \n│ 『 👤 』 \`Da:\` *${utente}*\n│ 『 📎 』 \`Stato:\` *Il link del gruppo aggiornato*\n*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`,
    25: `ㅤㅤ⋆｡˚『 ╭ \`MODIFICA PERMESSI\` ╯ 』˚｡⋆\n╭  \n│ 『 👤 』 \`Da:\` *${utente}*\n│ 『 ✏️ 』 \`Permessi:\` *${m.messageStubParameters[0] === 'on' ? 'solo gli admin' : 'tutti'} possono modificare le impostazioni*\n*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`,
    26: `ㅤㅤ⋆｡˚『 ╭ \`STATO GRUPPO\` ╯ 』˚｡⋆\n╭  \n│ 『 👤 』 \`Da:\` *${utente}*\n│ 『 📌 』 \`Stato gruppo:\` *${m.messageStubParameters[0] === 'on' ? 'chiuso' : 'aperto'}*\n│ 『 💬 』 \`Messaggi:\` *${m.messageStubParameters[0] === 'on' ? 'solo admin' : 'tutti'}*\n*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`,
    29: `ㅤㅤ⋆｡˚『 ╭ \`NUOVO ADMIN\` ╯ 』˚｡⋆\n╭  \n│ 『 👤 』 \`A:\` *${formattedParam0}*\n│ 『 🛠️ 』 \`Da:\` *${utente}*\n*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`,
    30: `ㅤㅤ⋆｡˚『 ╭ \`ADMIN RETROCESSO\` ╯ 』˚｡⋆\n╭  \n│ 『 👤 』 \`A:\` *${formattedParam0}*\n│ 『 🛠️ 』 \`Da:\` *${utente}*\n*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`
  };

  if (global.db.data.chats[m.chat].rileva && varebot[type]) {
    const azione = am[type] || 'EVENTO GRUPPO';
    const contextInfo = { ...global.fake.contextInfo,
      externalAdReply: {
        ...global.fake.contextInfo,
        title: nomegp,
        body: azione,
        thumbnail: ppBuffer,
        mediaType: 1,
        renderLargerThumbnail: false,
        sourceUrl: null
      },
      mentionedJid: []
    };

    const mentions = [];
    if (decodedSender && decodedSender !== 's.whatsapp.net') mentions.push(decodedSender);
    if (decodedParam0 && decodedParam0 !== 's.whatsapp.net') mentions.push(decodedParam0);
    contextInfo.mentionedJid = mentions;

    await conn.sendMessage(m.chat, {
      text: varebot[type],
      contextInfo
    });
  }
}

function formatPhoneNumber(number, includeAt = false) {
  if (!number || number === '?' || number === 'sconosciuto') return includeAt ? '@Sconosciuto' : 'Sconosciuto';
  return includeAt ? '@' + number : number;
}