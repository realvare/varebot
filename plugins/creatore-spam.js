const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const MAX_POLLING_TIME = 3600000; // 1 ora (in ms)
const CHECK_INTERVAL = 60000; // 1 minuto (in ms)

let spamProcesses = {}; // Oggetto per salvare lo stato dei processi di spam

let handler = async (m, { conn, text, usedPrefix, command }) => {
  const args = text.split('|').map(v => v.trim());

  if (args.length < 3) {
    return m.reply(`> 🍡 *Formato corretto:*\nLink gruppo | Messaggio | Quantità\n\n*Esempio:*\n${usedPrefix + command} https://chat.whatsapp.com/Link | Ciao | 5`);
  }

  const [groupLink, message, countStr] = args;
  const count = parseInt(countStr, 10);
  if (!groupLink.includes('chat.whatsapp.com/')) {
    return m.reply('🚫 *Link del gruppo non valido*');
  }
  if (isNaN(count) || count <= 0 || count > 50) {
    return m.reply('🔢 *Inserisci un numero valido tra 1 e 50*');
  }

  const code = groupLink.split('chat.whatsapp.com/')[1];
  let waitingMsg;
  let groupId;

  try {
    const sentMsg = await conn.sendMessage(m.chat, { text: '🔄 *Analisi gruppo in corso...*' }, { quoted: m });
    waitingMsg = sentMsg.key; // Salva la key del messaggio
    try {
      const groupInfo = await conn.groupGetInviteInfo(code).catch(() => null);
      if (!groupInfo) throw new Error('invalid_group');
      
      groupId = groupInfo.id;
      console.log('groupId:', groupId); // Aggiunto log
      await conn.sendMessage(m.chat, { text: '🚀 *Tentativo di accesso...*', edit: waitingMsg }, { quoted: m });
      try {
        console.log('Tentativo di accesso al gruppo...'); // Aggiunto log
        await conn.groupAcceptInvite(code);
      } catch (err) {
        if (err.message.includes('already-exists')) {
          console.warn('Bot già presente nel gruppo');
        } else if (err.message.includes('conflict')) {
          console.warn('Conflitto durante l\'accesso, potrebbe essere già nel gruppo');
        } else {
          console.error('Errore durante l\'accesso:', err);
          throw err; // Rilancia l'errore per essere gestito nel catch esterno
        }
      }
      let processId = Date.now(); // ID univoco per il processo
      spamProcesses[processId] = {
        groupId: groupId,
        isAccepted: false,
        waitingMsg: waitingMsg,
        message: message,
        count: count,
        startTime: Date.now(),
        code: code,
        conn: conn
      };
      startPolling(processId, m, message); // Passa m e message come parametro

    } catch (e) {
      console.error('Errore durante la verifica del gruppo:', e);
      return m.reply('❌ *Errore durante l\'analisi del gruppo*');
    }

  } catch (error) {
    console.error('Errore spam:', error);
    m.reply(`⚠️ *Errore durante l'operazione*\n${error.message}`);
  }
};

async function startPolling(processId, m, message) { // Aggiunto m e message come parametro
  let processData = spamProcesses[processId];
  if (!processData) return; // Processo non trovato

  let { groupId, isAccepted, waitingMsg, count, startTime, code, conn } = processData;

  if (isAccepted) {
    console.log('Inizio spam (dopo polling)...');
    await executeSpam(processId, m, message); // Passa m e message come parametro
    return;
  }

  if (Date.now() - startTime > MAX_POLLING_TIME) {
    console.log('Tempo massimo di polling raggiunto');
    delete spamProcesses[processId];
    console.log('⌛ Tempo massimo di attesa raggiunto. Riprova più tardi');
    return;
  }

  try {
    const groupMetadata = await conn.groupMetadata(groupId).catch(() => null);
    if (groupMetadata && groupMetadata.participants.some(p => p.id === conn.user.jid)) {
      console.log('Bot trovato nella lista partecipanti (dopo polling)');
      spamProcesses[processId].isAccepted = true;
      await executeSpam(processId, m, message); // Passa m e message come parametro
      return;
    } else {
      console.log('Bot non ancora trovato nel gruppo (dopo polling)');
    }
  } catch (err) {
    console.warn('Errore durante il tentativo di ottenere i partecipanti (dopo polling):', err);
  }
  setTimeout(() => {
    startPolling(processId, m, message); // Passa m e message come parametro
  }, CHECK_INTERVAL);
}

async function executeSpam(processId, m, message) { // Aggiunto m e message come parametro
  let processData = spamProcesses[processId];
  if (!processData) return;

  let { groupId, waitingMsg, count, conn } = processData;

  try {
    await conn.sendMessage(m.chat, { text: '✨ *Iniziando spam...*', edit: waitingMsg }, { quoted: m });
    const messages = Array(count).fill(message); // messages è definito qui
    const batchSize = 10; // Aumenta la dimensione del batch
    let successCount = 0;

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(msg => 
          conn.sendMessage(groupId, { text: msg })
        )
      );
      
      successCount += results.filter(r => r.status === 'fulfilled').length;
      await delay(1000); // Riduci il delay
    }

    await conn.sendMessage(m.chat, { text: `✅ *Spam completato!*\n📨 Inviati: ${successCount}/${count}`, edit: waitingMsg }, { quoted: m });
  } catch (err) {
    console.error('Errore durante lo spam:', err);
    return m.reply('❌ *Errore durante l\'invio dei messaggi*');
  } finally {
    try {
      await conn.groupLeave(groupId);
    } catch {}
    delete spamProcesses[processId]; // Rimuovi il processo completato
  }
}

handler.help = ['spam'];
handler.tags = ['creatore'];
handler.command = ['spam'];
handler.mods = true;
handler.premium = true;

export default handler;