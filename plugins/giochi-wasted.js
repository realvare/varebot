import fetch from 'node-fetch';
let dailyUsage = {};

let handler = async (m, { conn, text, usedPrefix, command }) => {
    let who = m.quoted ? m.quoted.sender : m.mentionedJid?.[0] ? m.mentionedJid[0] : m.sender;
    
    let msg = `⭔ \`Tagga qualcuno o rispondi a un messaggio\`\n\n*\`Esempio:\`* *${usedPrefix + command} @user*`;
    if (!who) return m.reply(msg);

    let today = new Date().toDateString();
    let userId = m.sender;
    
    if (!dailyUsage[today]) dailyUsage[today] = {};
    if (!dailyUsage[today][userId]) dailyUsage[today][userId] = 0;
    
    if (dailyUsage[today][userId] >= 2) {
        return m.reply('🤕 Nuh uh, niente piu wasted per te, torna domani.');
    }

    try {
        let pp;
        let hasProfilePicture = true;
        
        try {
            pp = await conn.profilePictureUrl(who, 'image');
            if (!pp) throw 'Nessuna foto profilo trovata';
        } catch {
            hasProfilePicture = false;
        }

        if (!hasProfilePicture) {
            let notification = who === m.sender ? 
                'non hai una foto profilo 🤕' : 
                `@${who.split('@')[0]} non ha una foto profilo 🤕`;
            
            return m.reply(notification, null, { mentions: [who] });
        }

        let apiUrl = `https://some-random-api.com/canvas/${command.toLowerCase()}?avatar=${encodeURIComponent(pp)}`;
        
        let res = await fetch(apiUrl);
        
        if (!res.ok) {
            let error = await res.text();
            throw `Errore API: ${res.status} - ${error}`;
        }
        
        let buffer = await res.buffer();
        if (!buffer || buffer.length < 100) throw 'Immagine non valida';

        let caption = ``;

        await conn.sendFile(m.chat, buffer, 'gta.jpg', caption, m, false, { mentions: [m.sender] });

    } catch (e) {
        console.error('Errore GTA effect:', e);
        if (e.message.includes('fetch failed')) {
            return m.reply(`${global.errore}`);
        }
        m.reply(`${global.errore}`);
    }
};

handler.help = ['wasted'];
handler.tags = ['giochi'];
handler.command = /^(wasted)$/i;
handler.limit = true;

export default handler;