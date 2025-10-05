var handler = async (m, { conn, text }) => {
  let number;
  if (text && !isNaN(text)) {
    number = text;
  } else if (text && text.match(/@/g)) {
    number = text.split('@')[1];
  } else if (m.quoted && m.quoted.sender) {
    number = m.quoted.sender.split('@')[0];
  } else if (m.mentionedJid && m.mentionedJid[0]) {
    number = m.mentionedJid[0].split('@')[0];
  } else {
    return conn.reply(m.chat, `『 👤 』 \`A chi vuoi togliere amministratore?\``, m, rcanal);
  }
  if (!number || number.length < 10 || number.length > 15) {
    return conn.reply(m.chat, `『 🩼 』 \`Menziona un numero valido.\``, m, rcanal);
  }

  try {
    let user = number + '@s.whatsapp.net';
    await conn.groupParticipantsUpdate(m.chat, [user], 'demote');
    conn.reply(m.chat, `『 ✅ 』 \`È stato retrocesso dal ruolo di amministratore.\``, m, fake);
  } catch (e) {
    conn.reply(m.chat, `『 ❌ 』 \`Errore nel retrocedere l'utente.\``, m, rcanal);
  }
};

handler.help = ['retrocedi', 'r'];
handler.tags = ['gruppo'];
handler.command = ['demote', 'retrocedi', 'r'];
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;