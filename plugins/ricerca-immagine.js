import axios from 'axios';

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) {
    return m.reply(`╭━━⊱「 ❌ *ERRORE* 」
┃ Inserisci il testo per cercare un'immagine
┃
┃ 📝 *Esempio:*
┃ ${usedPrefix + command} conad city
╰━━━━━━━━━━━━━━⊱`);
  }

  try {
    await m.react('🔍');

    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: global.APIKeys.google,
        cx: global.APIKeys.googleCX,
        q: text,
        searchType: 'image',
        num: 10,
        safe: 'active',
        lr: 'lang_it'
      }
    });

    const data = response.data;

    if (!data.items || data.items.length === 0) {
      await m.react('❌');
      return m.reply(`╭━━⊱「 ❌ *NESSUN RISULTATO* 」
┃ Nessuna immagine trovata per: *${text}*
┃
┃ 💡 *Suggerimento:*
┃ Prova con termini di ricerca diversi
╰━━━━━━━━━━━━━━⊱`);
    }
    const maxCards = Math.min(data.items.length, 10);
    const cards = [];

    for (let i = 0; i < maxCards; i++) {
      const item = data.items[i];
      const imageUrl = item.link;
      const imageTitle = item.title || `Immagine ${i + 1}`;
      const contextLink = item.image?.contextLink || item.displayLink || imageUrl;
      const shortTitle = imageTitle.length > 35 ? 
        imageTitle.substring(0, 35) + '...' : imageTitle;

      cards.push({
        image: { url: imageUrl },
        title: `『 🔍 』 \`Ricerca:\` ${text}`,
        body: shortTitle,
        footer: `『 🖼️ 』 Immagine ${i + 1}`,
        buttons: [
          {
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
              display_text: '『 🌐 』- Sito Origine',
              url: contextLink
            })
          }
        ]
      });
    }

    const jid = m.chat;

    await conn.sendMessage(
      jid,
      {
        text: `- *\`${text}\`*`,
        title: '『 🖼️ 』 Immagini Google',
        footer: '⭒━━✦☾⋆⁺₊✧ 𝓿𝓪𝓻𝓮𝓫𝓸𝓽 ✧₊⁺⋆☽✦━━⭒',
        cards: cards
      },
      { quoted: m }
    );

    await m.react('✅');

  } catch (error) {
    console.error('Errore durante la ricerca di immagini:', error);
    await m.react('❌');
    let errorMessage = `${global.errore}`;
    
    if (error.response) {
      if (error.response.status === 403) {
        errorMessage = `╭━━⊱「 ❌ *API ERROR* 」
┃ Quota API esaurita o chiave non valida
┃ 
┃ 🔧 *Soluzione:*
┃ Controlla le tue API Keys Google
╰━━━━━━━━━━━━━━⊱`;
      }
    }
    
    return m.reply(errorMessage);
  }
};
const handleCardButtons = async (m, { conn, text }) => {
  if (text.startsWith('sendimg_')) {
    const imageUrl = text.replace('sendimg_', '');
    try {
      await conn.sendMessage(m.chat, {
        image: { url: imageUrl },
        caption: '『 🖼️ 』 Ecco la tua immagine!'
      }, { quoted: m });
    } catch (e) {
      console.error('Errore invio immagine:', e);
      m.reply('❌ Errore nel caricare l\'immagine');
    }
  } else if (text.startsWith('newsearch_')) {
    const searchTerm = text.replace('newsearch_', '');
    m.reply(`🔄 Prova a cercare con termini diversi per "${searchTerm}" o usa il comando di nuovo con parole chiave più specifiche!`);
  }
};

handler.help = ['immagine <testo>'];
handler.tags = ['ricerca'];
handler.command = ['immagine', 'img', 'image'];
handler.register = true;

export default handler;