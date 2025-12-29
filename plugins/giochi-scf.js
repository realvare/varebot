import { createCanvas, loadImage } from 'canvas';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

let handler = async (m, { conn, text, args, usedPrefix, command }) => {
  let pp = 'https://www.bighero6challenge.com/images/thumbs/Piedra,-papel-o-tijera-0003318_1584.jpeg';
  let wm = 'Sasso Carta Forbici';
  let defaultAvatar = 'https://i.ibb.co/BKHtdBNp/default-avatar-profile-icon-1280x1280.jpg';
  
  // Funzione per creare l'immagine VS
  const createVSImage = async (player1Name, player2Name, avatar1, avatar2) => {
    try {
      const canvas = createCanvas(800, 400);
      const ctx = canvas.getContext('2d');

      // Sfondo gradiente
      const gradient = ctx.createLinearGradient(0, 0, 800, 0);
      gradient.addColorStop(0, '#667eea');
      gradient.addColorStop(0.5, '#764ba2');
      gradient.addColorStop(1, '#f093fb');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 800, 400);

      // Overlay scuro per migliorare leggibilità
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(0, 0, 800, 400);

      // Carica e disegna avatar
      const img1 = await loadImage(avatar1).catch(() => loadImage(defaultAvatar));
      const img2 = await loadImage(avatar2).catch(() => loadImage(defaultAvatar));

      // Avatar circolari
      const drawCircularAvatar = (img, x, y, size) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, x, y, size, size);
        ctx.restore();
        
        // Bordo avatar
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI * 2);
        ctx.stroke();
      };

      drawCircularAvatar(img1, 100, 100, 150);
      drawCircularAvatar(img2, 550, 100, 150);

      // Testo VS centrale
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 60px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('VS', 400, 200);
      
      // Ombra per il testo VS
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillText('VS', 402, 202);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('VS', 400, 200);

      // Nomi giocatori
      ctx.font = 'bold 24px Arial';
      ctx.fillStyle = '#ffffff';
      
      // Nome player 1
      ctx.textAlign = 'center';
      ctx.fillText(player1Name.length > 15 ? player1Name.substring(0, 15) + '...' : player1Name, 175, 300);
      
      // Nome player 2  
      ctx.fillText(player2Name.length > 15 ? player2Name.substring(0, 15) + '...' : player2Name, 625, 300);

      // Decorazioni
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(0, 0, 800, 2);
      ctx.fillRect(0, 398, 800, 2);

      // Emoji decorative
      ctx.font = '30px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('🪨', 50, 50);
      ctx.fillText('📄', 400, 50);
      ctx.fillText('✂️', 750, 50);
      ctx.fillText('🎮', 50, 370);
      ctx.fillText('⚔️', 750, 370);

      const timestamp = Date.now();
      const filename = `vs_${timestamp}.png`;
      const filepath = join('./temp', filename);

      // Crea directory temp se non esiste
      try {
        await import('fs').then(fs => fs.mkdirSync('./temp', { recursive: true }));
      } catch {}

      const buffer = canvas.toBuffer('image/png');
      writeFileSync(filepath, buffer);
      
      return { filepath, filename };
    } catch (error) {
      console.error('Errore creazione immagine VS:', error);
      return null;
    }
  };
  
  if (args[0] === 'stats') {
    let user = global.db.data.users[m.sender];
    let win = user.scf_win || 0;
    let lose = user.scf_lose || 0;
    let draw = user.scf_draw || 0;
    let tot = win + lose + draw;
    let perc = tot ? ((win / tot) * 100).toFixed(1) : 0;
    
    let buttons = [
      { buttonId: `${usedPrefix}scf regole`, buttonText: { displayText: '📜 Regole' }, type: 1 },

    ];
    
    let buttonMessage = {
      text: `ㅤㅤ⋆｡˚『 ╭ \`STATISTICHE SCF\` ╯ 』˚｡⋆\n╭\n` +
            `│ 『 🏆 』 \`Vittorie:\` *${win}*\n` +
            `│ 『 💀 』 \`Sconfitte:\` *${lose}*\n` +
            `│ 『 🤝 』 \`Pareggi:\` *${draw}*\n` +
            `│ 『 🎮 』 \`Totale partite:\` *${tot}*\n` +
            `│ 『 📊 』 \`Percentuale vittorie:\` *${perc}%*\n` +
            `*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`,
      footer: wm,
      buttons: buttons,
      headerType: 1
    };
    return conn.sendMessage(m.chat, buttonMessage, { quoted: m });
  }
  
  if (args[0] === 'regole') {
    let buttons = [
      { buttonId: `${usedPrefix}scf stats`, buttonText: { displayText: '📊 Statistiche' }, type: 1 },

    ];
    
    let buttonMessage = {
      text: `ㅤㅤ⋆｡˚『 ╭ \`REGOLE SCF\` ╯ 』˚｡⋆\n╭\n` +
            `│ 『 🪨 』 \`Sasso batte:\` *Forbici*\n` +
            `│ 『 ✂️』 \`Forbici batte:\` *Carta*\n` +
            `│ 『 📄 』 \`Carta batte:\` *Sasso*\n` +
            `│ 『 🎯 』 \`Uso:\` *.scf @utente*\n` +
            `│ 『 💬 』 \`Alternativa:\` *Quota un messaggio + .scf*\n` +
            `*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`,
      footer: wm,
      buttons: buttons,
      headerType: 1
    };
    return conn.sendMessage(m.chat, buttonMessage, { quoted: m });
  }

  // Controllo se è stato quotato un messaggio
  let player2;
  if (m.quoted && m.quoted.sender) {
    player2 = m.quoted.sender;
  } else if (m.mentionedJid[0]) {
    player2 = m.mentionedJid[0];
  } else {
    let buttons = [
      { buttonId: `${usedPrefix}scf regole`, buttonText: { displayText: '📜 Come Giocare' }, type: 1 },
      { buttonId: `${usedPrefix}scf stats`, buttonText: { displayText: '📊 Le Mie Stats' }, type: 1 }
    ];
    
    let buttonMessage = {
      text: `ㅤㅤ⋆｡˚『 ╭ \`ERRORE\` ╯ 』˚｡⋆\n╭\n` +
            `│ 『 ✂️』 \`Azione richiesta:\` *Tagga o quota un utente*\n` +
            `│ 『 📝 』 \`Esempio 1:\` *${usedPrefix + command} @utente*\n` +
            `│ 『 💬 』 \`Esempio 2:\` *Quota un messaggio e scrivi ${usedPrefix + command}*\n` +
            `*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`,
      footer: wm,
      buttons: buttons,
      headerType: 1
    };
    return conn.sendMessage(m.chat, buttonMessage, { quoted: m });
  }

  let player1 = m.sender;
  
  if (player1 === player2) {
    let buttons = [
      { buttonId: `${usedPrefix}scf regole`, buttonText: { displayText: '📜 Come Giocare' }, type: 1 },

    ];
    
    let buttonMessage = {
      text: `ㅤㅤ⋆｡˚『 ╭ \`ERRORE\` ╯ 』˚｡⋆\n╭\n` +
            `│ 『 ❌ 』 \`Motivo:\` *Non puoi sfidare te stesso!*\n` +
            `*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`,
      footer: wm,
      buttons: buttons,
      headerType: 1
    };
    return conn.sendMessage(m.chat, buttonMessage, { quoted: m });
  }
  
  if (player2 === conn.user.jid) {
    let buttons = [
      { buttonId: `${usedPrefix}scf regole`, buttonText: { displayText: '📜 Come Giocare' }, type: 1 },

    ];
    
    let buttonMessage = {
      text: `ㅤㅤ⋆｡˚『 ╭ \`ERRORE\` ╯ 』˚｡⋆\n╭\n` +
            `│ 『 🤖 』 \`Motivo:\` *Sfida un umano, non il bot!*\n` +
            `*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`,
      footer: wm,
      buttons: buttons,
      headerType: 1
    };
    return conn.sendMessage(m.chat, buttonMessage, { quoted: m });
  }

  // Ottieni avatar e nomi
  let player1Avatar, player2Avatar;
  try {
    player1Avatar = await conn.profilePictureUrl(player1, 'image').catch(() => defaultAvatar);
    player2Avatar = await conn.profilePictureUrl(player2, 'image').catch(() => defaultAvatar);
  } catch {
    player1Avatar = defaultAvatar;
    player2Avatar = defaultAvatar;
  }

  let player1Name = conn.getName(player1);
  let player2Name = conn.getName(player2);

  // Invia i messaggi privati con bottoni per le scelte
  let choiceButtons = [
    { buttonId: `scf_choice_sasso_${Date.now()}`, buttonText: { displayText: '🪨 Sasso' }, type: 1 },
    { buttonId: `scf_choice_carta_${Date.now()}`, buttonText: { displayText: '📄 Carta' }, type: 1 },
    { buttonId: `scf_choice_forbici_${Date.now()}`, buttonText: { displayText: '✂️ Forbici' }, type: 1 }
  ];

  let choiceMessage1 = {
    text: `ㅤㅤ⋆｡˚『 ╭ \`SASSO CARTA FORBICI\` ╯ 』˚｡⋆\n╭\n` +
          `│ 『 🎯 』 \`Fai la tua scelta:\`\n` +
          `│ 『 🪨 』 \`Sasso batte:\` *Forbici*\n` +
          `│ 『 📄 』 \`Carta batte:\` *Sasso*\n` +
          `│ 『 ✂️ 』 \`Forbici batte:\` *Carta*\n` +
          `*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`,
    footer: `${wm} • Hai 60 secondi per scegliere`,
    buttons: choiceButtons,
    headerType: 1
  };

  let choiceMessage2 = {
    text: `ㅤㅤ⋆｡˚『 ╭ \`SASSO CARTA FORBICI\` ╯ 』˚｡⋆\n╭\n` +
          `│ 『 🎯 』 \`Fai la tua scelta:\`\n` +
          `│ 『 🪨 』 \`Sasso batte:\` *Forbici*\n` +
          `│ 『 📄 』 \`Carta batte:\` *Sasso*\n` +
          `│ 『 ✂️ 』 \`Forbici batte:\` *Carta*\n` +
          `*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`,
    footer: `${wm} • Hai 60 secondi per scegliere`,
    buttons: choiceButtons,
    headerType: 1
  };

  await conn.sendMessage(player1, choiceMessage1);
  await conn.sendMessage(player2, choiceMessage2);

  const choices = new Map();
  
  const waitResponse = async (player) => {
    try {
      return await new Promise((resolve, reject) => {
        let timeout = setTimeout(() => {
          conn.ev.off('messages.upsert', messageHandler)
          reject('timeout')
        }, 60000) // 60 secondi timeout
        
        const messageHandler = (m) => {
          const msg = m.messages[0]
          if (msg.key.remoteJid === player && !msg.key.fromMe) {
            let txt = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').toLowerCase().trim()
            
            // Gestione bottoni
            if (msg.message?.buttonsResponseMessage?.selectedButtonId) {
              let buttonId = msg.message.buttonsResponseMessage.selectedButtonId;
              if (buttonId.includes('scf_choice_')) {
                let choice = buttonId.split('_')[2]; // sasso, carta, forbici
                if (['sasso', 'carta', 'forbici'].includes(choice)) {
                  clearTimeout(timeout)
                  conn.ev.off('messages.upsert', messageHandler)
                  choices.set(player, choice)
                  resolve(choice)
                }
              }
            }
            
            // Gestione testo normale
            if(['sasso', 'carta', 'forbici'].includes(txt)) {
              clearTimeout(timeout)
              conn.ev.off('messages.upsert', messageHandler)
              choices.set(player, txt)
              resolve(txt)
            }
          }
        }
        conn.ev.on('messages.upsert', messageHandler)
      })
    } catch (e) {
      console.log('Errore in waitResponse:', e)
      return null
    }
  }

  // Crea immagine VS
  const vsImage = await createVSImage(player1Name, player2Name, player1Avatar, player2Avatar);

  let startButtons = [
    { buttonId: `${usedPrefix}scf regole`, buttonText: { displayText: '📜 Regole' }, type: 1 },
    { buttonId: `${usedPrefix}scf stats`, buttonText: { displayText: '📊 Stats' }, type: 1 }
  ];

  let startMessage = {
    caption: `ㅤㅤ⋆｡˚『 ╭ \`SFIDA INIZIATA\` ╯ 』˚｡⋆\n╭\n` +
             `│ 『 ⚔️ 』 \`Sfidante:\` *@${player1.split('@')[0]}*\n` +
             `│ 『 🎯 』 \`Sfidato:\` *@${player2.split('@')[0]}*\n` +
             `│ 『 📱 』 \`Info:\` *Controlla i messaggi privati!*\n` +
             `│ 『 ⏰ 』 \`Tempo limite:\` *60 secondi*\n` +
             `*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`,
    footer: wm,
    buttons: startButtons,
    headerType: 4,
    mentions: [player1, player2]
  };

  if (vsImage) {
    startMessage.image = { url: vsImage.filepath };
    await conn.sendMessage(m.chat, startMessage);
  } else {
    delete startMessage.image;
    await conn.sendMessage(m.chat, startMessage);
  }

  try {
    const [scelta1, scelta2] = await Promise.all([
      waitResponse(player1),
      waitResponse(player2)
    ])
    
    console.log('Scelte ricevute:', {
      player1: scelta1,
      player2: scelta2,
      choices: Array.from(choices.entries())
    })
    
    if (!scelta1 || !scelta2) {
      let timeoutButtons = [
        { buttonId: `${usedPrefix}scf @${player2.split('@')[0]}`, buttonText: { displayText: '🔄 Riprova' }, type: 1 },
  
      ];
      
      let timeoutMessage = {
        text: `ㅤㅤ⋆｡˚『 ╭ \`TEMPO SCADUTO\` ╯ 』˚｡⋆\n╭\n` +
              `│ 『 ⏰ 』 \`Motivo:\` *Uno o entrambi i giocatori non hanno risposto*\n` +
              `│ 『 👥 』 \`Giocatori:\` *@${player1.split('@')[0]} vs @${player2.split('@')[0]}*\n` +
              `*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`,
        footer: wm,
        buttons: timeoutButtons,
        headerType: 1,
        mentions: [player1, player2]
      };
      
      // Pulisci file temporaneo
      if (vsImage) {
        try { unlinkSync(vsImage.filepath); } catch {}
      }
      
      return conn.sendMessage(m.chat, timeoutMessage);
    }

    const emoji = { sasso: '🪨', carta: '📄', forbici: '✂️' };
    let result = '';
    let winner = null;
    let loser = null;
    let resultButtons = [];

    if (scelta1 === scelta2) {
      result = `ㅤㅤ⋆｡˚『 ╭ \`PAREGGIO\` ╯ 』˚｡⋆\n╭\n` +
               `│ 『 👤 』 \`@${player1.split('@')[0]}:\` *${emoji[scelta1]}*\n` +
               `│ 『 👤 』 \`@${player2.split('@')[0]}:\` *${emoji[scelta2]}*\n` +
               `│ 『 🤝 』 \`Risultato:\` *Entrambi hanno scelto ${emoji[scelta1]}*\n` +
               `*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`;
      
      resultButtons = [
        { buttonId: `${usedPrefix}scf @${player2.split('@')[0]}`, buttonText: { displayText: '🔄 Rivincita' }, type: 1 },
        { buttonId: `${usedPrefix}scf stats`, buttonText: { displayText: '📊 Statistiche' }, type: 1 }
      ];
    } else if (
      (scelta1 === 'carta' && scelta2 === 'sasso') ||
      (scelta1 === 'forbici' && scelta2 === 'carta') ||
      (scelta1 === 'sasso' && scelta2 === 'forbici')
    ) {
      winner = player1;
      loser = player2;
      result = `ㅤㅤ⋆｡˚『 ╭ \`VITTORIA\` ╯ 』˚｡⋆\n╭\n` +
               `│ 『 🏆 』 \`Vincitore:\` *@${player1.split('@')[0]}* ${emoji[scelta1]} 🪙\n` +
               `│ 『 💀 』 \`Perdente:\` *@${player2.split('@')[0]}* ${emoji[scelta2]}\n` +
               `│ 『 ⚡ 』 \`Motivo:\` *${emoji[scelta1]} batte ${emoji[scelta2]}*\n` +
               `*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`;
      
      resultButtons = [
        { buttonId: `${usedPrefix}scf @${player2.split('@')[0]}`, buttonText: { displayText: '🔄 Rivincita' }, type: 1 },
        { buttonId: `${usedPrefix}scf stats`, buttonText: { displayText: '📊 Le Mie Stats' }, type: 1 }
      ];
    } else {
      winner = player2;
      loser = player1;
      result = `ㅤㅤ⋆｡˚『 ╭ \`VITTORIA\` ╯ 』˚｡⋆\n╭\n` +
               `│ 『 🏆 』 \`Vincitore:\` *@${player2.split('@')[0]}* ${emoji[scelta2]} 🪙\n` +
               `│ 『 💀 』 \`Perdente:\` *@${player1.split('@')[0]}* ${emoji[scelta1]}\n` +
               `│ 『 ⚡ 』 \`Motivo:\` *${emoji[scelta2]} batte ${emoji[scelta1]}*\n` +
               `*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`;
      
      resultButtons = [
        { buttonId: `${usedPrefix}scf @${player1.split('@')[0]}`, buttonText: { displayText: '🔄 Rivincita' }, type: 1 },
        { buttonId: `${usedPrefix}scf stats`, buttonText: { displayText: '📊 Le Mie Stats' }, type: 1 }
      ];
    }

    let resultMessage = {
      caption: result,
      footer: wm,
      buttons: resultButtons,
      headerType: 4,
      mentions: [player1, player2]
    };

    if (vsImage) {
      resultMessage.image = { url: vsImage.filepath };
      await conn.sendMessage(m.chat, resultMessage);
      
      // Pulisci file temporaneo dopo l'invio
      setTimeout(() => {
        try { unlinkSync(vsImage.filepath); } catch {}
      }, 5000);
    } else {
      delete resultMessage.image;
      await conn.sendMessage(m.chat, resultMessage);
    }

    let randomXP = Math.floor(Math.random() * 1500) + 1;
    let randomStars = Math.floor(Math.random() * 250) + 1;

    let user1 = global.db.data.users[player1];
    let user2 = global.db.data.users[player2];
    user1.scf_win = user1.scf_win || 0;
    user1.scf_lose = user1.scf_lose || 0;
    user1.scf_draw = user1.scf_draw || 0;
    user2.scf_win = user2.scf_win || 0;
    user2.scf_lose = user2.scf_lose || 0;
    user2.scf_draw = user2.scf_draw || 0;

    if (scelta1 === scelta2) {
      user1.exp = (user1.exp || 0) + randomXP;
      user2.exp = (user2.exp || 0) + randomXP;
      user1.stars = (user1.stars || 0) + randomStars;
      user2.stars = (user2.stars || 0) + randomStars;
      user1.scf_draw++;
      user2.scf_draw++;
    } else if (
      (scelta1 === 'carta' && scelta2 === 'sasso') ||
      (scelta1 === 'forbici' && scelta2 === 'carta') ||
      (scelta1 === 'sasso' && scelta2 === 'forbici')
    ) {
      user1.exp = (user1.exp || 0) + randomXP;
      user1.stars = (user1.stars || 0) + randomStars;
      user2.exp = (user2.exp || 0) - randomXP;
      user2.stars = Math.max((user2.stars || 0) - randomStars, 0);
      user1.scf_win++;
      user2.scf_lose++;
    } else {
      user2.exp = (user2.exp || 0) + randomXP;
      user2.stars = (user2.stars || 0) + randomStars;
      user1.exp = (user1.exp || 0) - randomXP;
      user1.stars = Math.max((user1.stars || 0) - randomStars, 0);
      user2.scf_win++;
      user1.scf_lose++;
    }

  } catch (error) {
    console.error('Errore durante il gioco:', error);
    
    // Pulisci file temporaneo in caso di errore
    if (vsImage) {
      try { unlinkSync(vsImage.filepath); } catch {}
    }
    
    let errorButtons = [
      { buttonId: `${usedPrefix}scf regole`, buttonText: { displayText: '📜 Come Giocare' }, type: 1 },
    ];
    
    let errorMessage = {
      text: `ㅤㅤ⋆｡˚『 ╭ \`ERRORE\` ╯ 』˚｡⋆\n╭\n` +
            `│ 『 ❌ 』 \`Motivo:\` *Si è verificato un errore durante il gioco*\n` +
            `│ 『 🔄 』 \`Azione:\` *Riprova!*\n` +
            `*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`,
      footer: wm,
      buttons: errorButtons,
      headerType: 1
    };
    return conn.sendMessage(m.chat, errorMessage, { quoted: m });
  }
};

handler.help = ['scf @utente'];
handler.tags = ['giochi'];
handler.command = ['sassocartaforbici', 'scf'];
handler.group = true;
handler.register = true;
export default handler;
