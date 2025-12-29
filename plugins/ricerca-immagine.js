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
    const apiUrl = `https://www.googleapis.com/customsearch/v1?key=${global.APIKeys.google}&cx=${global.APIKeys.googleCX}&q=${encodeURIComponent(text)}&searchType=image&num=10&lr=lang_it`;
    const response = await axios.get(apiUrl);
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
    const maxImages = Math.min(data.items.length, 10);
    const albumItems = [];

    for (let i = 0; i < maxImages; i++) {
      const item = data.items[i];
      const imageUrl = item.link;
      const imageTitle = item.title || `Immagine ${i + 1}`;
      const contextLink = item.image?.contextLink || item.displayLink || imageUrl;
      const shortTitle = imageTitle.length > 35 ?
        imageTitle.substring(0, 35) + '...' : imageTitle;

      try {
        const imageResponse = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
          headers: {
            'User-Agent': 'Varebot/2.5 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });

        const caption = i === 0 ? `『 🔍 』 Ricerca: ${text}\n> \`vare ✧ bot\`` : `『 🌐 』 Sito Origine: ${contextLink}`;

        albumItems.push({
          image: Buffer.from(imageResponse.data),
          caption: caption
        });
      } catch (imageError) {
        console.error('Errore nel caricamento dell\'immagine:', imageError);
        let thumbnailUrl = item.image?.thumbnailLink || imageUrl;
        if (thumbnailUrl.includes('encrypted-tbn') || thumbnailUrl.includes('s=')) {
          thumbnailUrl = thumbnailUrl.replace(/s=\d+/, 's=1024');
        }
        try {
          const thumbResponse = await axios.get(thumbnailUrl, {
            responseType: 'arraybuffer',
            headers: {
              'User-Agent': 'Varebot/2.5 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });

          const caption = i === 0 ? `『 🔍 』 Ricerca: ${text}\n> \`vare ✧ bot\`` : `『 🌐 』 Sito Origine: ${contextLink}`;

          albumItems.push({
            image: Buffer.from(thumbResponse.data),
            caption: caption
          });
        } catch (thumbError) {
          console.error('Errore nel caricamento del thumbnail:', thumbError);
        }
      }
    }

    if (albumItems.length > 0) {
      await conn.sendMessage(m.chat, {
        album: albumItems
      }, { quoted: m });
    } else {
      await m.reply('❌ Nessuna immagine valida trovata');
    }

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
