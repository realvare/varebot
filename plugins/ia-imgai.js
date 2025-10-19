import axios from "axios";

// La funzione updateLoadingMessage e l'array loadingFrames sono stati rimossi 
// perché non più necessari.

async function generateImage(prompt) {
    try {
        let attempts = 0;
        while (attempts < 3) {
            try {
                const encodedPrompt = encodeURIComponent(
                    `${prompt}, professional photography, 8k uhd, highly detailed, photorealistic, sharp focus, masterpiece`
                );
                
                const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;

                const response = await axios.get(imageUrl, {
                    responseType: 'arraybuffer',
                    timeout: 45000 // Timeout di 45 secondi
                });

                return Buffer.from(response.data).toString('base64');
            } catch (error) {
                attempts++;
                if (attempts === 3) throw error;
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
    } catch (error) {
        console.error('Errore generazione:', error);
        throw new Error('Errore nella generazione dell\'immagine');
    }
}

let handler = async (m, { conn, text, usedPrefix, command, isOwner }) => {
    if (!text) {
        return m.reply(`╭─『 🎨 *Generatore Immagini AI* 』
├ Usa: ${usedPrefix + command} <descrizione>
├ Esempio: ${usedPrefix + command} gatto persiano
│
├ *Limiti:*
├ • Free: 5 generazioni
├ • Premium: ∞ generazioni
╰───────────◈`);
    }
    if (!global.db.data.users[m.sender].imgaiUses) {
        global.db.data.users[m.sender].imgaiUses = 0;
    }
    const isPremium = global.db.data.users[m.sender].premium;
    if (!isOwner && !isPremium && global.db.data.users[m.sender].imgaiUses >= 5) {
        return m.reply(`╭─『 ❌ *Limite Raggiunto* 』
├ Hai utilizzato tutti i tentativi gratuiti!
├ 
├ *✨ Passa a Premium per avere:*
├ • Generazioni illimitate
├ • Risultati prioritari
├ • Qualità migliore
╰───────────◈`);
    }

    try {
        // 1. Aggiungi una reazione di attesa '⏳' al messaggio dell'utente
        await conn.sendMessage(m.chat, {
            react: {
                text: '⏳',
                key: m.key,
            }
        });

        const startTime = Date.now(); // Registra il tempo di inizio

        const enhancedPrompt = `${text}, masterpiece, professional photography, 8k uhd, highly detailed, photorealistic, sharp focus, dramatic lighting, artstation trending`;

        const imageBase64 = await Promise.race([
            generateImage(enhancedPrompt),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('⌛ Timeout: la generazione ha impiegato troppo tempo')), 45000)
            )
        ]);
        
        const endTime = Date.now(); // Registra il tempo di fine
        const timeElapsed = ((endTime - startTime) / 1000).toFixed(1); // Calcola la durata in secondi

        if (!isOwner && !isPremium) {
            global.db.data.users[m.sender].imgaiUses++;
        }

        const usesLeft = isPremium ? '∞' : (5 - global.db.data.users[m.sender].imgaiUses);

        await conn.sendMessage(
            m.chat,
            {
                image: Buffer.from(imageBase64, 'base64'),
                caption: `╭─『 🎨 *Immagine Generata* 』
├ ✨ *Prompt:* ${text}
├ ⏱️ *Tempo:* ${timeElapsed}s
├ 💫 *Generazioni:* ${usesLeft} rimaste
├ 👑 *Status:* ${isPremium ? 'Premium' : 'Free'}
╰───────────◈

◈ ━━ *vare ✧ bot* ━━ ◈`,
                fileName: 'generated_image.png'
            },
            { quoted: m }
        );

        // 2. Aggiungi una reazione di completamento '✅'
        await conn.sendMessage(m.chat, {
            react: {
                text: '✅',
                key: m.key,
            }
        });

    } catch (error) {
        console.error('Errore:', error);
        
        // 3. In caso di errore, aggiungi una reazione '❌'
        await conn.sendMessage(m.chat, {
            react: {
                text: '❌',
                key: m.key,
            }
        });

        m.reply(`╭─『 ❌ *Errore Generazione* 』
├ • ${error.message}
├ • Riprova tra qualche minuto
├ • Usa un prompt diverso
╰──────────────────◈`);
    }
};
handler.help = ['imgai (testo)'];
handler.tags = ['strumenti', 'premium', 'ia', 'iaimmagini'];
handler.command = ['imgai', 'immagina'];
handler.register = true

export default handler;