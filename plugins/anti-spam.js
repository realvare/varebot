// todo: fix a volte impazzisce a random
const userSpamData = new Map();
const handler = m => m;
handler.before = async function (m, { conn, isAdmin, isBotAdmin, isOwner, isROwner }) {
    if (!m.isGroup) return;
    const chat = global.db.data.chats[m.chat] || {};
    if (!chat.antispam || chat.modoadmin || isOwner || isROwner || isAdmin || !isBotAdmin) {
        return;
    }
    if (m.message?.viewOnceMessage) return;
    const sender = m.sender;
    let decodedSender = conn.decodeJid(sender);
    let senderNumber = decodedSender.split('@')[0].split(':')[0];
    let domain = decodedSender.split('@')[1];
    if (domain === 'lid') return;
    const currentTime = Date.now();
    const CONFIG = {
        timeWindow: 15000,
        removeThreshold: 9,
        timeThreshold: 1200,
        cleanupInterval: 300000,
        duplicateWindow: 30000
    };
    cleanupOldData(CONFIG.cleanupInterval);

    let userData = userSpamData.get(decodedSender);

    if (!userData) {
        userData = {
            timestamps: [],
            messages: [],
            contentHistory: new Map()
        };
        userSpamData.set(decodedSender, userData);
    }
    const messageContent = getMessageContent(m);
    const contentHash = hashContent(messageContent);
    
    userData.timestamps.push(currentTime);
    userData.messages.push({
        time: currentTime,
        content: messageContent,
        hash: contentHash
    });
    userData.timestamps = userData.timestamps.filter(timestamp => 
        currentTime - timestamp < CONFIG.timeWindow
    );
    userData.messages = userData.messages.filter(msg => 
        currentTime - msg.time < CONFIG.timeWindow
    );
    const duplicateCount = userData.messages.filter(msg => 
        msg.hash === contentHash && msg.time !== currentTime
    ).length;
    let effectiveRemoveThreshold = CONFIG.removeThreshold;
    
    if (duplicateCount > 0) {
        effectiveRemoveThreshold = Math.max(6, CONFIG.removeThreshold - duplicateCount * 2);
    }

    const messageCount = userData.timestamps.length;
    if (messageCount >= effectiveRemoveThreshold) {
        const totalDuration = userData.timestamps[userData.timestamps.length - 1] - userData.timestamps[0];
        const averageTime = totalDuration / (userData.timestamps.length - 1);

        if (averageTime < CONFIG.timeThreshold || duplicateCount >= 3) {
            try {
                const reason = duplicateCount >= 3 ? 
                    `contenuto ripetuto (${duplicateCount + 1} volte)` : 
                    `messaggi troppo frequenti (${averageTime.toFixed(0)}ms di media)`;
                
                const utente = formatPhoneNumber(senderNumber, true);
                const botMessage = `🔇 ${utente} è stato rimosso per spam: ${reason}`;
                await conn.reply(m.chat, botMessage, m, { mentions: [decodedSender] });
                await conn.groupParticipantsUpdate(m.chat, [decodedSender], 'remove');
            } catch (e) {
                console.error(`[AntiSpam] Errore nel rimuovere l'utente ${decodedSender}: ${e.message}`);
                const utente = formatPhoneNumber(senderNumber, true);
                await conn.reply(m.chat, `⚠️ Non ho i permessi per rimuovere ${utente} che sta spammando.`, m, { mentions: [decodedSender] });
            }
            userSpamData.delete(decodedSender);
            return;
        }
    }
    
    userSpamData.set(decodedSender, userData);
};
function getMessageContent(m) {
    try {
        if (m.message?.conversation) return m.message.conversation;
        if (m.message?.extendedTextMessage?.text) return m.message.extendedTextMessage.text;
        if (m.message?.imageMessage?.caption) return `image:${m.message.imageMessage.caption || 'no_caption'}`;
        if (m.message?.videoMessage?.caption) return `video:${m.message.videoMessage.caption || 'no_caption'}`;
        if (m.message?.documentMessage?.caption) return `document:${m.message.documentMessage.caption || 'no_caption'}`;
        if (m.message?.audioMessage) return 'audio_message';
        if (m.message?.stickerMessage) return `sticker:${m.message.stickerMessage.fileSha256 || 'unknown'}`;
        if (m.message?.contactMessage) return `contact:${m.message.contactMessage.displayName || 'unknown'}`;
        if (m.message?.locationMessage) return 'location_message';
        if (m.key?.participant?.includes('@meta') || m.key?.participant?.includes('ai')) {
            return 'meta_ai_message';
        }
        if (m.message?.groupedMessages) return 'grouped_messages';
        
        return 'unknown_message_type';
    } catch (e) {
        return 'error_parsing_message';
    }
}
function hashContent(content) {
    if (!content) return 'empty';
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString();
}
function cleanupOldData(interval) {
    const now = Date.now();
    for (const [key, data] of userSpamData.entries()) {
        if (data.timestamps.length > 0 && now - data.timestamps[data.timestamps.length - 1] > interval) {
            userSpamData.delete(key);
        } else if (data.timestamps.length === 0) {
            userSpamData.delete(key);
        }
    }
}

function formatPhoneNumber(number, includeAt = false) {
    if (!number || number === '?' || number === 'sconosciuto') return includeAt ? '@Sconosciuto' : 'Sconosciuto';
    if (number.startsWith('lid_')) return includeAt ? '@[ID nascosto]' : '[ID nascosto]';
    return includeAt ? '@' + number : number;
}

export default handler;