let handler = async (m, { conn, args, text, usedPrefix, command, participants }) => {
    if (!text) throw `🌸 Inserisci il numero a cui vuoi inviare un invito al gruppo\n\n令 Esempio:\n*${usedPrefix + command}* 393476686131`;

    let numeroPulito = text.replace(/[^0-9]/g, '');
    if (!numeroPulito) throw '🌸 Inserisci solo numeri con il prefisso internazionale.';
    participants = participants || [];
    let jid = numeroPulito + '@s.whatsapp.net';
    if (participants.some(p => p.id === jid)) {
        throw '🌸 Questo numero è già presente nel gruppo!';
    }

    let group = m.chat;
    let link = 'https://chat.whatsapp.com/' + await conn.groupInviteCode(group);
    await conn.reply(jid, `🌸 *INVITO AL GRUPPO*\n\nUn utente ti ha invitato a unirti a questo gruppo\n\n${link}`, m, { mentions: [m.sender] });
    m.reply(`🌸 È stato inviato un link di invito all'utente.`);
};

handler.help = ['invita *<numero>*'];
handler.tags = ['gruppo'];
handler.command = ['invite', 'invita'];
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;
