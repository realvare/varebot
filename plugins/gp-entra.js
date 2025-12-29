let linkRegex = /chat.whatsapp.com\/([0-9A-Za-z]{20,24})/i;

let handler = async (m, { conn, text, usedPrefix, command }) => {
    // Verifica che sia stato fornito un link
    if (!text) {
        return m.reply(`🤖 *Inserisci il link del gruppo WhatsApp*\n\n` +
                      `📋 *Esempio:* ${usedPrefix + command} https://chat.whatsapp.com/xxxxx\n\n` +
                      `⚡ *Requisiti:*\n` +
                      `• Gruppo con almeno 40 membri\n` +
                      `• Link di invito valido\n` +
                      `• Inviti non limitati agli admin`);
    }
    
    // Estrai il codice di invito dal link
    let [_, code] = text.match(linkRegex) || [];
    if (!code) {
        return m.reply('『 ❌ 』 **Link non valido**\n\n' +
                      '✅ Formato corretto: `https://chat.whatsapp.com/xxxxxxxxx`');
    }
    
    // Messaggio di elaborazione
    let processingMsg = await m.reply('🔄 *Analizzando il gruppo...*\n⏳ Controllo requisiti in corso...');
    
    try {
        // Ottieni informazioni sul gruppo senza entrare
        let groupInfo;
        try {
            groupInfo = await conn.groupGetInviteInfo(code);
        } catch (error) {
            return m.reply('『 ❌ 』 **Errore nell\'ottenere informazioni sul gruppo**\n\n' +
                          '💡 *Possibili cause:*\n' +
                          '• Link scaduto o revocato\n' +
                          '• Link non valido\n' +
                          '• Gruppo eliminato');
        }
        
        // Controlla il numero di membri (deve essere almeno 40)
        const MIN_MEMBERS = 40;
        if (groupInfo.size < MIN_MEMBERS) {
            return m.reply(`『 ❌ 』 **Gruppo troppo piccolo**\n\n` +
                          `📊 *Membri attuali:* ${groupInfo.size}\n` +
                          `📋 *Minimo richiesto:* ${MIN_MEMBERS} membri\n\n` +
                          `💡 Torna quando il gruppo avrà più membri!`);
        }
        
        // Controlla se gli inviti sono limitati agli amministratori
        if (groupInfo.restrict) {
            return m.reply('『 ❌ 』 **Accesso limitato**\n\n' +
                          '🔒 Solo gli amministratori possono invitare membri in questo gruppo.\n' +
                          '💡 Chiedi a un admin di aggiungermi manualmente.');
        }
        
        // Controlla se il bot è già nel gruppo
        try {
            let groupData = await conn.groupMetadata(groupInfo.id).catch(() => null);
            if (groupData) {
                return m.reply('『 ⚠️ 』 **Sono già in questo gruppo!**\n\n' +
                              `📝 Nome: ${groupData.subject}\n` +
                              `👥 Membri: ${groupData.participants.length}`);
            }
        } catch (e) {
        }
        await conn.sendMessage(m.chat, {
            text: '✅ *Requisiti soddisfatti!*\n🚀 Ingresso nel gruppo in corso...',
            edit: processingMsg.key
        });
        let joinResult = await conn.groupAcceptInvite(code);
        console.log('Bot entrato nel gruppo:', joinResult);
        let chats = global.db.data.chats[joinResult];
        if (!chats) {
            chats = global.db.data.chats[joinResult] = {};
        }
        const EXPIRY_DAYS = 3;
        let expiredTime = EXPIRY_DAYS * 24 * 60 * 60 * 1000;
        let expiryDate = new Date(Date.now() + expiredTime);
        
        chats.expired = Date.now() + expiredTime;
        chats.joinedBy = m.sender;
        chats.joinedAt = Date.now();
        let successMessage = `✅ **Ingresso completato con successo!**\n\n` +
                            `🏷️ *Gruppo:* ${groupInfo.subject || 'Nome non disponibile'}\n` +
                            `👥 *Membri:* ${groupInfo.size}\n` +
                            `📅 *Data ingresso:* ${new Date().toLocaleString('it-IT')}\n` +
                            `⏰ *Scadenza:* ${expiryDate.toLocaleString('it-IT')}\n` +
                            `🕐 *Durata permanenza:* ${EXPIRY_DAYS} giorni\n\n` +
                            `💡 *Per estendere il tempo, contatta:* wa.me/393476686131`;
        
        await m.reply(successMessage);
        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            await conn.sendMessage(joinResult, {
                text: `👋 **Ciao a tutti!**\n\n` +
                     `🤖 Sono un bot e rimarrò qui per **${EXPIRY_DAYS} giorni**\n` +
                     `📅 Scadenza: ${expiryDate.toLocaleString('it-IT')}\n\n` +
                     `💡 Per assistenza o per estendere la permanenza:\n` +
                     `📱 Contatta: wa.me/393476686131\n\n` +
                     `🚀 Buona giornata a tutti!`
            });
        } catch (welcomeError) {
            console.log('Errore invio messaggio di benvenuto:', welcomeError);
        }
        setTimeout(async () => {
            try {
                console.log(`Uscita automatica programmata per il gruppo: ${joinResult}`);
                await conn.sendMessage(joinResult, {
                    text: `👋 **Tempo scaduto!**\n\n` +
                         `⏰ La mia permanenza di ${EXPIRY_DAYS} giorni è terminata.\n` +
                         `🚪 Sto per lasciare il gruppo automaticamente.\n\n` +
                         `💡 **Per riavermi nel gruppo:**\n` +
                         `📱 Contatta il creatore: wa.me/393476686131\n\n` +
                         `👋 Arrivederci a tutti!`
                });
                await new Promise(resolve => setTimeout(resolve, 5000));
                await conn.groupLeave(joinResult);
                console.log(`Bot uscito automaticamente dal gruppo: ${joinResult}`);
                if (global.db.data.chats[joinResult]) {
                    delete global.db.data.chats[joinResult];
                    console.log(`Dati gruppo rimossi dal database: ${joinResult}`);
                }
                
            } catch (exitError) {
                console.error('Errore durante l\'uscita automatica:', exitError);
                try {
                    if (global.db.data.chats[joinResult]) {
                        delete global.db.data.chats[joinResult];
                    }
                } catch (dbError) {
                    console.error('Errore rimozione dati database:', dbError);
                }
            }
        }, expiredTime);
        console.log(`Bot entrato nel gruppo ${joinResult}, uscita programmata per:`, expiryDate);
        
    } catch (error) {
        console.error('Errore nel comando entra:', error);
        
        let errorMessage = '『 ❌ 』 **Errore durante l\'ingresso nel gruppo**\n\n';
        if (error.message.includes('forbidden')) {
            errorMessage += '🔒 Accesso negato. Il gruppo potrebbe aver limitazioni.';
        } else if (error.message.includes('not-found')) {
            errorMessage += '🔍 Gruppo non trovato. Il link potrebbe essere scaduto.';
        } else if (error.message.includes('conflict')) {
            errorMessage += '⚠️ Sono già nel gruppo o c\'è un conflitto.';
        } else {
            errorMessage += '💡 Riprova tra qualche minuto o verifica il link.';
        }
        
        errorMessage += '\n\n📧 Se il problema persiste, contatta: wa.me/393476686131';
        
        return m.reply(errorMessage);
    }
};
handler.help = ['entra *<link>*'];
handler.tags = ['gruppo'];
handler.command = ['entra', 'joingroup'];
handler.private = true;

export default handler;