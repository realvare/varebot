// ===== ANTI-NUKE + WHITELIST + ANTI-RUBA =====
// Protezione totale - scatta anche su promote di admin normali

const protectedOwners = [
  '393509110688@s.whatsapp.net', // OWNER PRINCIPALE (il tuo numero)
  '639103443943@s.whatsapp.net'  // BOT (l'ID del bot)
];

const antinukeStatus = {};   // true = attivo (per ogni gruppo, ma disattivato di default)
const antirubaStatus = {};   // true = attivo (solo owner+whitelist possono modificare)
const groupWhitelist = {};   // per gruppo: array di jid autorizzati

// Funzione che aggiunge il footer in ogni messaggio
function addFooter(text) {
  return `${text}\n\n*Anti-Nuke by TQX e Dux Cris*`;
}

export async function before(m, { conn }) {
  const chatId = m.chat;
  const sender = m.sender;
  const actor = m.key.participant || sender;
  const text = (m.text || '').trim();

  // Inizializza se è la prima volta
  if (!groupWhitelist[chatId]) groupWhitelist[chatId] = [...protectedOwners];
  if (antinukeStatus[chatId] === undefined) antinukeStatus[chatId] = false; // Default OFF
  if (antirubaStatus[chatId] === undefined) antirubaStatus[chatId] = true;  // Default ATTIVO

  // ================== COMANDI ==================
  if (text.startsWith('.antinuke') || text.startsWith('.antiruba') || text.startsWith('.whitelist')) {
    const args = text.split(' ');
    const cmd = args[0].toLowerCase();
    const sub = args[1]?.toLowerCase();
    const mentioned = m.mentionedJid || [];
    const isOwner = protectedOwners.includes(sender); // Verifica se il mittente è l'owner

    if (!isOwner) return conn.reply(chatId, 'Solo il vero owner può usare questi comandi.', m);

    // ——— ANTI-NUKE ———
    if (cmd === '.antinuke') {
      if (sub === 'on') {
        antinukeStatus[chatId] = true; // Attiva anti-nuke
        return conn.reply(chatId, addFooter('Anti-nuke attivato!'), m);
      }
      if (sub === 'off') {
        antinukeStatus[chatId] = false; // Disattiva anti-nuke
        return conn.reply(chatId, addFooter('Anti-nuke disattivato.'), m);
      }
      if (sub === 'stato' || !sub) {
        const status = antinukeStatus[chatId] ? 'ATTIVO' : 'DISATTIVO';
        const wl = groupWhitelist[chatId].map(j => '@' + j.split('@')[0]).join(', ') || 'nessuno';
        return conn.sendMessage(chatId, {
          text: addFooter(`*ANTI-NUKE*: ${status}\n*Whitelist*: ${wl}`),
          mentions: groupWhitelist[chatId]
        });
      }
      // ——— Menu di comandi Anti-Nuke ———
      return conn.sendMessage(chatId, {
        text: addFooter(`
*Comandi Anti-Nuke*:
• .antinuke on - Attiva la protezione anti-nuke
• .antinuke off - Disattiva la protezione anti-nuke
• .antinuke stato - Mostra lo stato della protezione
• .whitelist add @user - Aggiungi un utente alla whitelist
• .whitelist remove @user - Rimuovi un utente dalla whitelist
• .whitelist list - Mostra la lista della whitelist
• .whitelist reset - Resetta la whitelist (solo owner + bot)
`),
        mentions: []
      });
    }

    // ——— ANTI-RUBA (solo owner+whitelist possono modificare gruppo) ———
    if (cmd === '.antiruba') {
      if (sub === 'on') {
        antirubaStatus[chatId] = true;
        return conn.reply(chatId, addFooter('Anti-Ruba attivato!\nSolo owner e whitelist possono modificare il gruppo.'), m);
      }
      if (sub === 'off') {
        antirubaStatus[chatId] = false;
        return conn.reply(chatId, addFooter('Anti-Ruba disattivato.'), m);
      }
      if (sub === 'stato' || !sub) {
        const status = antirubaStatus[chatId] ? 'ATTIVO' : 'DISATTIVO';
        return conn.reply(chatId, addFooter(`*ANTI-RUBA*: ${status}`), m);
      }
    }

    // ——— WHITELIST ———
    if (cmd === '.whitelist') {
      if (sub === 'add' && mentioned.length) {
        for (const id of mentioned) {
          if (!groupWhitelist[chatId].includes(id) && !protectedOwners.includes(id)) {
            groupWhitelist[chatId].push(id);
          }
        }
        return conn.sendMessage(chatId, { 
          text: addFooter(`Aggiunti in whitelist:\n${mentioned.map(j => '@' + j.split('@')[0]).join('\n')}`), 
          mentions: mentioned 
        });
      }
      if (sub === 'remove' && mentioned.length) {
        const removable = mentioned.filter(id => !protectedOwners.includes(id));
        groupWhitelist[chatId] = groupWhitelist[chatId].filter(j => !removable.includes(j));
        return conn.sendMessage(chatId, { 
          text: addFooter(`Rimossi dalla whitelist:\n${removable.map(j => '@' + j.split('@')[0]).join('\n') || 'nessuno'}`), 
          mentions: removable 
        });
      }
      if (sub === 'list' || !sub) {
        const list = groupWhitelist[chatId].map(j => '• @' + j.split('@')[0]).join('\n') || 'vuota';
        return conn.sendMessage(chatId, { 
          text: addFooter(`*WHITELIST* (${groupWhitelist[chatId].length} utenti):\n${list}`), 
          mentions: groupWhitelist[chatId] 
        });
      }
      if (sub === 'reset') {
        groupWhitelist[chatId] = [...protectedOwners];
        return conn.reply(chatId, addFooter('Whitelist resettata (solo owner + bot)'), m);
      }
    }

    // Menu rapido se comando sbagliato
    return conn.reply(chatId, addFooter(`
*COMANDI DISPONIBILI (solo owner)*

.antinuke on / off / stato
.antiruba on / off / stato
.whitelist add @user
.whitelist remove @user
.whitelist list
.whitelist reset
    `.trim()), m);
  }

  // ================== SE ANTINUKE OFF → ESCI ==================
  if (!antinukeStatus[chatId]) return;

  // ================== RILEVA SOLO EVENTI ADMIN ==================
  if (![27, 28, 29, 30].includes(m.messageStubType)) return; // kick, promote, demote
  const target = m.messageStubParameters?.[0];
  if (!actor || !target) return;

  // Metadati gruppo
  const metadata = await conn.groupMetadata(chatId).catch(() => null);
  if (!metadata) return;

  const isActorWhitelisted = groupWhitelist[chatId].includes(actor);
  const isTargetWhitelisted = groupWhitelist[chatId].includes(target);

  // ================== PROMOTE (28) - IL PIÙ PERICOLOSO ==================
  if (m.messageStubType === 28) {
    // Blocca se:
    // 1. Chi promuove non è in whitelist OPPURE
    // 2. Chi viene promosso non è in whitelist (tranne bot)
    const isBotTarget = target === protectedOwners[1];
    if (!isActorWhitelisted || (!isTargetWhitelisted && !isBotTarget)) {
      await executeAntinuke(conn, chatId, actor, target, metadata);
    }
    return;
  }

  // ================== DEMOTE / RIMOZIONE ADMIN (29 o 30) ==================
  if ([29, 30].includes(m.messageStubType) && antirubaStatus[chatId]) {
    // Opzionale: blocca anche demote non autorizzati
    if (!isActorWhitelisted) {
      await executeAntinuke(conn, chatId, actor, target, metadata, "ha provato a rimuovere i privilegi admin a");
    }
  }
}

// ================== FUNZIONE ANTINUKE CENTRALIZZATA ==================
async function executeAntinuke(conn, chatId, actor, target, metadata, extraText = "ha provato a promuovere") {
  try {
    // 1. Demuovi TUTTI gli admin tranne owner e bot
    const admins = metadata.participants.filter(p => p.admin).map(p => p.id);
    const toDemote = admins.filter(id => !protectedOwners.includes(id));

    if (toDemote.length) {
      await conn.groupParticipantsUpdate(chatId, toDemote, 'demote');
    }

    // 2. Assicura che owner e bot siano admin
    for (const id of protectedOwners) {
      if (!admins.includes(id)) {
        await conn.groupParticipantsUpdate(chatId, [id], 'promote').catch(() => {});
      }
    }

    // 3. Messaggio di allarme
    await conn.sendMessage(chatId, {
      text: addFooter(`ANTI-NUKE ATTIVATO!\n\n` +
            `@${actor.split('@')[0]} ${extraText} @${target.split('@')[0]}\n\n` +
            `Tutti gli admin non autorizzati sono stati rimossi!\n` +
            `Solo owner e whitelist possono gestire il gruppo.`),
      mentions: [actor, target, ...protectedOwners]
    });

  } catch (e) {
    console.log('Errore antinuke:', e);
  }
}
