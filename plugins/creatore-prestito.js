let handler = async(m, { conn, command, text }) => {
  if (!text) return m.reply(`*🌠 Inserisci il motivo del prestito*`);
  if (text.length < 11) return m.reply(`*令 Inserisci almeno 11 caratteri*`);

let texto = `*_🌠 L'Owner @${m.sender.split`@`[0]} ha bisogno di denaro e ha richiesto un prestito al suo staff tramite varebot._*\n*➪ Motivo*: ${text}*`;
m.reply('*_🚀 Inviando messaggio di prestito a tutti gli owner di varebot._*');
for (let [jid] of global.owner.filter(([number, _, isDeveloper]) => isDeveloper && number)) {
    let data = (await conn.onWhatsApp(jid))[0] || {};
    if (data.exists)
        conn.sendPayment(data.jid, '999999999', texto, m);
}
};
handler.tags = ['creatore'];
handler.command = handler.help = ['prestito', 'richiediprestito'];
handler.owner = true;

export default handler;