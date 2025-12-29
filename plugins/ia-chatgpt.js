import fetch from 'node-fetch';

const chatHistory = new Map();
const personalityTraits = {
    umorismo: 0.8,
    informalità: 0.9,
    empatia: 0.7
};
const createSystemPrompt = (mentionName) => `Sei varebot, un assistente IA creato da sam.
Ecco le tue caratteristiche principali:
Personalità:
- Sei molto informale e amichevole
- Usi un linguaggio schietto e diretto
- Ti piace scherzare ma sai essere serio quando serve
- Hai una personalità unica e distintiva
Comportamento con ${mentionName}:
- Ti rivolgi sempre usando il suo nome
- Mantieni un tono conversazionale naturale
- Sei empatico e comprensivo
- Ricordi i dettagli delle conversazioni precedenti
Stile di comunicazione:
- Usi principalmente l'italiano
- Il tuo tono è amichevole ma un po' provocatorio
- Cerchi di essere coinvolgente e interessante
Da evitare:
- Risposte troppo formali o robotiche
- Informazioni false o fuorvianti
- Risposte troppo lunghe o verbose
- l'uso di emoji
- frasi da boomer
- essere troppo ironico o sarcastico

Stai parlando con ${mentionName} in una conversazione informale tra amici.`;
const formatHistory = (history) => {
    if (history.length === 0) return [];
    const lastMessages = history.slice(-5);
    return lastMessages.map(msg => {
        const [role, content] = msg.split(': ', 2);
        return { role: role === 'varebot' ? 'assistant' : 'user', content: content };
    });
};
async function callPollinationsAPI(messages) {
    try {
        const response = await fetch('https://text.pollinations.ai/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: messages,
                model: 'openai',
                seed: Math.floor(Math.random() * 1000)
            }),
            timeout: 8000
        });

        if (!response.ok) {
            throw new Error('AI Server Busy');
        }

        const aiResponse = await response.text();
        return aiResponse.trim();
    } catch (error) {
        console.error('Errore chiamata API:', error);
        throw new Error('Errore nella generazione della risposta');
    }
}

const getNomeFormattato = (userId) => {
    try {
        let nome = conn.getName(userId);
        
        if (!nome || nome === 'user') {
            const user = conn.user;
            if (user && user.name) {
                nome = user.name;
            }
            
            if (!nome && global.db.data.users[userId]) {
                nome = global.db.data.users[userId].name;
            }
        }
        
        nome = (nome || '')
            .replace(/@.+/, '')
            .replace(/[0-9]/g, '')
            .replace(/[^\w\s]/gi, '')
            .trim();
            
        return nome || 'amico';
    } catch (e) {
        console.error('Errore nel recupero del nome:', e);
        return 'amico';
    }
};
const formatKeywords = (text) => {
    const keywords = [
        'importante', 'nota', 'attenzione', 'ricorda', 'esempio',
        'consiglio', 'suggerimento', 'avvertimento', 'errore', 'successo',
        'inoltre', 'quindi', 'perché', 'infatti', 'conclusione'
    ];
    let formattedText = text;
    keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        formattedText = formattedText.replace(regex, `*${keyword}*`);
    });
    formattedText = formattedText.replace(/\n(?=[-•])/g, '\n\n');

    return formattedText;
};

let handler = async (m, { conn, text, participants }) => {
    if (!text?.trim()) {
        return m.reply(`╭─⟣ *Chat con varebot* ⟢
│ 
│ ✨ Usa: .ia <messaggio>
│ 📝 Esempio: .ia raccontami una storia
│ 
╰───────────⟢`);
    }

    try {
        const mentionName = getNomeFormattato(m.sender);
        const chatId = m.chat;

        if (!chatHistory.has(chatId)) chatHistory.set(chatId, []);
        const history = chatHistory.get(chatId);

        const basePrompt = createBasePrompt(mentionName);
        const historyText = formatHistory(history);
        const fullPrompt = basePrompt + historyText;
        const wait = await m.reply('🤔 *fammi pensare...*');

        const risposta = await callGeminiAPI(fullPrompt, text);

        if (!risposta) {
            throw new Error('Risposta non valida dall\'IA');
        }
        const formattedRisposta = formatKeywords(risposta);
        const { text: cleanText, buttons, carousel } = parseInteractiveResponse(formattedRisposta);

        history.push(`${mentionName}: ${text}`);
        history.push(`varebot: ${cleanText}`);
        chatHistory.set(chatId, history);

        if (buttons.length > 0) {
            await conn.sendMessage(m.chat, {
                text: cleanText,
                buttons: buttons,
                headerType: 1,
                edit: wait.key,
                mentions: [m.sender]
            });
        } else if (carousel) {
            await conn.sendMessage(m.chat, {
                text: cleanText,
                buttonText: 'Scegli',
                sections: carousel.sections,
                listType: 1,
                edit: wait.key,
                mentions: [m.sender]
            });
        } else {
            await conn.sendMessage(m.chat, {
                text: cleanText,
                edit: wait.key,
                mentions: [m.sender]
            });
        }

    } catch (error) {
        console.error('Errore handler:', error);
        m.reply(`❌ *Errore*\n\n${error.message}`);
    }
};

handler.help = ['gpt (testo)'];
handler.tags = ['strumenti', 'ia', 'iatesto'];
handler.command = ["chatgpt", "gpt"];

export default handler;