let whitelist = [];

function rilevaDispositivoCheck(msgID = '') {
  if (!msgID) return 'sconosciuto';
  if (/^[a-zA-Z]+-[a-fA-F0-9]+$/.test(msgID)) return 'bot';
  if (msgID.startsWith('false_') || msgID.startsWith('true_')) return 'web';
  if (msgID.startsWith('3EB0') && /^[A-Z0-9]+$/.test(msgID)) return 'webbot';
  if (msgID.includes(':')) return 'desktop';
  if (/^[A-F0-9]{32}$/i.test(msgID)) return 'android';
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(msgID)) return 'ios';
  if (/^[A-Z0-9]{20,25}$/i.test(msgID) && !msgID.startsWith('3EB0')) return 'ios';
  if (msgID.startsWith('3EB0')) return 'android_old';
  return 'sconosciuto';
}

export async function before(m, { conn }) {
  const chat = global.db.data.chats[m.chat];
  if (!chat?.antiBot) return;
  if (!m.isGroup || !m.sender || !m.key?.id) return;
  const msgID = m.key?.id;
  const device = rilevaDispositivoCheck(msgID);
  const sospettiDispositivi = ['bot', 'web', 'webbot'];
  if (!sospettiDispositivi.includes(device)) return;
  const metadata = await conn.groupMetadata(m.chat);
  const botNumber = conn.user.jid;
  const autorizzati = [botNumber, metadata.owner, ...whitelist];
  if (autorizzati.includes(m.sender)) return;
  const currentAdmins = metadata.participants.filter(p => p.admin).map(p => p.id);
  const èAdmin = currentAdmins.includes(m.sender);
  if (èAdmin) {
    await conn.groupParticipantsUpdate(m.chat, [m.sender], 'demote');
    await conn.sendMessage(m.chat, {
      text: `> 𝐑𝐈𝐋𝐄𝐕𝐀𝐓𝐎 𝐁𝐎𝐓 ⚠️\n @${m.sender.split('@')[0]} 𝐞̀ 𝐬𝐭𝐚𝐭𝐨 𝐫𝐞𝐭𝐫𝐨𝐜𝐞𝐬𝐬𝐨.\n𝑫𝒊𝒔𝒑𝒐𝒔𝒊𝒕𝒊𝒗𝒐: *${device.toUpperCase()}*`,
      mentions: [m.sender]
    });
  }
  await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove');
  await conn.sendMessage(m.chat, {
    text: `> 𝐑𝐈𝐋𝐄𝐕𝐀𝐓𝐎 𝐁𝐎𝐓 ⚠️\n@${m.sender.split('@')[0]} 𝐞̀ 𝐬𝐭𝐚𝐭𝐨 𝐫𝐢𝐦𝐨𝐬𝐬𝐨.\n𝑫𝒊𝒔𝒑𝒐𝒔𝒊𝒕𝒊𝒗𝒐: *${device.toUpperCase()}*`,
    mentions: [m.sender]
  });
}
