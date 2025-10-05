import fetch from 'node-fetch';

const chatHistory = new Map();
const personalityTraits = {
    umorismo: 0.8,
    informalità: 0.9,
    empatia: 0.7
};
const createBasePrompt = (mentionName) => `Sei varebot, un assistente IA creato da sam. (+393476686131) 
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
    if (history.length === 0) return '';
    
    const lastMessages = history.slice(-5);
    return '\n\n💭 Cronologia recente:\n' + 
           lastMessages.map((msg, i) => `${i + 1}. ${msg}`).join('\n');
};
async function callHuggingFaceAPI(prompt, text, historyText) {
    try {
        const fullPrompt = `[INST] ${prompt}${historyText}\n\nDomanda utente: ${text} [/INST]`;

        const response = await fetch(
            'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    inputs: fullPrompt,
                    parameters: {
                        max_new_tokens: 150,
                        temperature: 0.9,
                        top_p: 0.8,
                        top_k: 40,
                        return_full_text: false
                    }
                })
            }
        );

        if (!response.ok) {
            throw new Error(`Errore API: ${response.status}`);
        }

        const data = await response.json();
        return data[0]?.generated_text?.trim();
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
        const wait = await m.reply('🤔 *fammi pensare...*');

        const risposta = await callHuggingFaceAPI(basePrompt, text, historyText);

        if (!risposta) {
            throw new Error('Risposta non valida dall\'IA');
        }
        const formattedRisposta = formatKeywords(risposta);

        history.push(`${mentionName}: ${text}\nvarebot: ${formattedRisposta}`);
        chatHistory.set(chatId, history);
        await conn.sendMessage(m.chat, { 
            text: formattedRisposta,
            edit: wait.key,
            mentions: [m.sender]
        });

    } catch (error) {
        console.error('Errore handler:', error);
        m.reply(`❌ *Errore*\n\n${error.message}`);
    }
};

handler.help = ['gpt (testo)'];
handler.tags = ['strumenti', 'ia', 'iatesto'];
handler.command = ["chatgpt", "gpt"];

export default handler;