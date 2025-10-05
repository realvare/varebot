let handler = async (m, { conn }) => {
  try {
    await conn.sendMessage(m.chat, { 
      text: 'Ecco come installare VareBot!',
      title: '',
      footer: '',
      cards: [
        {
          image: { url: 'https://i.ibb.co/hJW7WwxV/varebot.jpg' },
          title: 'VareBot',
          body: 'Repository su GitHub',
          footer: 'by sam aka vare',
          buttons: [
            { name: 'cta_copy', buttonParamsJson: JSON.stringify({ display_text: 'Copia URL', copy_code: 'https://github.com/realvare/varebot' }) },
            { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: 'Visita GitHub', url: 'https://github.com/realvare/varebot' }) },
          ],
        },
      ],
    }, { quoted: m });
  } catch (err) {
    console.error(err);
    await m.reply('❌ Errore nell\'invio della card.');
  }
};

handler.help = ['script'];
handler.tags = ['main'];
handler.command = ['script', 'installa'];

export default handler;