const handler = async (m, { conn }) => {
  const jid = m.chat

  await conn.sendMessage(
    jid,
    {
      text: `〖 🌸 〗 \`Benvenuto in VareBot!\``,
      title: '',
      footer: ``,
      cards: [
        {
          image: { url: 'https://i.ibb.co/hJW7WwxV/varebot.jpg' },
          title: `\`by sam aka vare\``,
          body: `〖 💫 〗 *Esplora tutte le funzionalità*\n〖 🚀 〗 *Bot sempre aggiornato*`,
          footer: '˗ˏˋ ☾ 𝚟𝚊𝚛𝚎𝚋𝚘𝚝 ☽ ˎˊ˗',
          buttons: [
            {
              name: 'cta_url',
              buttonParamsJson: JSON.stringify({
                display_text: 'Sito - VareBot',
                url: 'https://varebot.com'
              })
            },
            {
              name: 'cta_url',
              buttonParamsJson: JSON.stringify({
                display_text: '💻 GitHub',
                url: 'https://github.com/realvare'
              })
            },
            {
              name: 'cta_url',
              buttonParamsJson: JSON.stringify({
                display_text: '💬 WhatsApp',
                url: 'https://wa.me/393476686131'
              })
            },
            {
              name: 'cta_url',
              buttonParamsJson: JSON.stringify({
                display_text: '📸 Instagram',
                url: 'https://instagram.com/samakavare'
              })
            },
            {
              name: 'cta_url',
              buttonParamsJson: JSON.stringify({
                display_text: '📧 Email',
                url: 'mailto:samakavare1@gmail.com'
              })
            }
          ]
        }
      ]
    },
  { quoted: m }
  )
}

handler.command = ['sito']
handler.tags = ['main']
handler.help = ['sito']
export default handler
