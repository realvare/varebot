import { generateWAMessageFromContent } from '@realvare/based';
import { createCanvas, loadImage } from 'canvas';
import axios from 'axios';

// --- DATI DEL GIOCO ---
const gameData = [
    { name: "YouTube", searches: 2200000000, category: "ricerche mensili", emoji: "📺" },
    { name: "Facebook", searches: 1800000000, category: "ricerche mensili", emoji: "📘" },
    { name: "Instagram", searches: 1500000000, category: "ricerche mensili", emoji: "📷" },
    { name: "TikTok", searches: 1000000000, category: "ricerche mensili", emoji: "🎵" },
    { name: "Twitter", searches: 800000000, category: "ricerche mensili", emoji: "🐦" },
    { name: "Netflix", searches: 700000000, category: "ricerche mensili", emoji: "🎬" },
    { name: "Amazon", searches: 600000000, category: "ricerche mensili", emoji: "📦" },
    { name: "WhatsApp", searches: 500000000, category: "ricerche mensili", emoji: "💬" },
    { name: "Spotify", searches: 400000000, category: "ricerche mensili", emoji: "🎧" },
    { name: "Reddit", searches: 300000000, category: "ricerche mensili", emoji: "🤖" },
    { name: "Telegram", searches: 250000000, category: "ricerche mensili", emoji: "✈️" },
    { name: "Discord", searches: 200000000, category: "ricerche mensili", emoji: "🎮" },
    { name: "Twitch", searches: 150000000, category: "ricerche mensili", emoji: "🎪" },
    { name: "LinkedIn", searches: 100000000, category: "ricerche mensili", emoji: "💼" },
    { name: "Pinterest", searches: 80000000, category: "ricerche mensili", emoji: "📌" },
    { name: "Snapchat", searches: 180000000, category: "ricerche mensili", emoji: "👻" },
    { name: "Google", searches: 2500000000, category: "ricerche mensili", emoji: "🇬" },
    { name: "Apple", searches: 1200000000, category: "ricerche mensili", emoji: "🍏" },
    { name: "Microsoft", searches: 900000000, category: "ricerche mensili", emoji: "🪟" },
    { name: "Wikipedia", searches: 2000000000, category: "ricerche mensili", emoji: "🌐" },
    { name: "Yahoo", searches: 350000000, category: "ricerche mensili", emoji: "Y" },
    { name: "eBay", searches: 280000000, category: "ricerche mensili", emoji: "🛒" },
    { name: "Vinted", searches: 50000000, category: "ricerche mensili", emoji: "👚" },
    { name: "Subito", searches: 70000000, category: "ricerche mensili", emoji: "🗞️" },
    { name: "Tinder", searches: 120000000, category: "ricerche mensili", emoji: "🔥" },
    { name: "PayPal", searches: 160000000, category: "ricerche mensili", emoji: "💳" },
    { name: "Shein", searches: 190000000, category: "ricerche mensili", emoji: "🛍️" },
    { name: "Temu", searches: 210000000, category: "ricerche mensili", emoji: "🧡" },
];

// --- GESTIONE PARTITE E CACHE ---
global.hlGame = global.hlGame || {};
global.hlGame.sessions = global.hlGame.sessions || {};
global.hlGame.imageCache = global.hlGame.imageCache || {};
global.hlGame.rateLimitTimestamps = global.hlGame.rateLimitTimestamps || {};

// --- FUNZIONI HELPER ---
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Cerca un'immagine su Google con gestione del rate limiting e cache.
 * @param {string} query La stringa da cercare.
 * @returns {Promise<string>} L'URL dell'immagine o un URL di fallback.
 */
async function getGoogleImage(query, retries = 3, backoff = 1000) {
    // Controlla nella cache
    const cacheKey = `google_${query.toLowerCase()}`;
    if (global.hlGame.imageCache[cacheKey]) {
        console.log(`Cache hit per: ${query}`);
        return global.hlGame.imageCache[cacheKey];
    }

    // Controlla se siamo in rate limit
    const now = Date.now();
    if (global.hlGame.rateLimitTimestamps[cacheKey] && now - global.hlGame.rateLimitTimestamps[cacheKey] < 60000) {
        console.log(`Rate limit attivo per: ${query}`);
        return 'RATE_LIMITED';
    }

    try {
        console.log(`Ricerca Google Images per: ${query}`);
        
        const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
            params: {
                key: global.APIKeys.google,
                cx: global.APIKeys.googleCX,
                q: `${query} logo`,
                searchType: 'image',
                num: 5,
                safe: 'active',
                lr: 'lang_it',
                imgSize: 'medium',
                imgType: 'photo'
            },
            timeout: 8000
        });

        const data = response.data;

        if (data.items && data.items.length > 0) {
            // Cerca la prima immagine valida
            for (const item of data.items) {
                const imageUrl = item.link;
                // Verifica che l'URL sia valido e non sia un placeholder
                if (imageUrl && 
                    !imageUrl.includes('placeholder') && 
                    !imageUrl.includes('placehold') &&
                    imageUrl.match(/\.(jpeg|jpg|png|webp)(\?|$)/i)) {
                    
                    // Salva nella cache con timestamp per gestire l'invalidazione
                    global.hlGame.imageCache[cacheKey] = {
                        url: imageUrl,
                        timestamp: now,
                        title: item.title || query
                    };
                    
                    console.log(`Immagine trovata e cached per: ${query}`);
                    return imageUrl;
                }
            }
        }

        console.log(`Nessuna immagine valida trovata per: ${query}`);
        return 'https://placehold.co/400x400/151515/FFF?text=Not+Found';

    } catch (error) {
        console.error(`Errore Google Images API per "${query}":`, error.message);
        
        if (error.response) {
            const status = error.response.status;
            if (status === 429 && retries > 0) {
                // Rate limit: imposta timestamp e riprova con backoff
                global.hlGame.rateLimitTimestamps[cacheKey] = now;
                console.log(`Rate limit Google API, attesa di ${backoff}ms prima di riprovare...`);
                await delay(backoff);
                return getGoogleImage(query, retries - 1, backoff * 2);
            } else if (status === 403) {
                console.error('API Key non valida o quota esaurita');
                return 'API_ERROR_403';
            } else if (status === 400) {
                console.error('Richiesta non valida');
                return 'API_ERROR_400';
            }
        }
        
        return 'https://placehold.co/400x400/FF0000/FFF?text=API+Error';
    }
}

/**
 * Pulisce la cache delle immagini rimuovendo quelle più vecchie di 1 ora
 */
function cleanImageCache() {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 ora
    
    Object.keys(global.hlGame.imageCache).forEach(key => {
        const cached = global.hlGame.imageCache[key];
        if (cached && cached.timestamp && (now - cached.timestamp > maxAge)) {
            delete global.hlGame.imageCache[key];
            console.log(`Cache invalidata per: ${key}`);
        }
    });
}

function getRandomItem() {
    return { ...gameData[Math.floor(Math.random() * gameData.length)] };
}

function formatNumber(num) {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace('.0', '') + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace('.0', '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace('.0', '') + 'K';
    return num.toLocaleString('it-IT');
}

const formatLongName = (name) => name.length > 11 ? `${name} ↘` : name;

async function createVsImage(item1, item2) {
    const canvasWidth = 800;
    const canvasHeight = 400;
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const loadImageWithFallback = async (url) => {
        try {
            return await loadImage(url);
        } catch (err) {
            console.error(`Errore nel caricare l'immagine ${url} su canvas:`, err.message);
            return await loadImage('https://placehold.co/200x200/FF0000/FFF?text=Load+Error');
        }
    };

    const [img1, img2] = await Promise.all([
        loadImageWithFallback(item1.image),
        loadImageWithFallback(item2.image)
    ]);

    const imgSize = canvasHeight * 0.45;
    const margin = 70;
    const yPos = (canvasHeight - imgSize) / 2 - 20;
    
    // Disegna le immagini con bordi arrotondati
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(margin, yPos, imgSize, imgSize, 20);
    ctx.clip();
    ctx.drawImage(img1, margin, yPos, imgSize, imgSize);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(canvasWidth - imgSize - margin, yPos, imgSize, imgSize, 20);
    ctx.clip();
    ctx.drawImage(img2, canvasWidth - imgSize - margin, yPos, imgSize, imgSize);
    ctx.restore();

    // Testo VS con effetto glow
    ctx.fillStyle = '#FF6B6B';
    ctx.shadowColor = '#FF6B6B';
    ctx.shadowBlur = 20;
    ctx.font = 'bold 80px "Impact", Arial Black, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VS', canvasWidth / 2, canvasHeight / 2);
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Nomi con background semi-trasparente
    ctx.font = 'bold 28px "Arial", sans-serif';
    const nameYPos = yPos + imgSize + 25;
    
    // Nome 1
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    const name1Width = ctx.measureText(item1.name).width + 20;
    ctx.fillRect(margin + imgSize / 2 - name1Width / 2, nameYPos - 15, name1Width, 30);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(item1.name, margin + imgSize / 2, nameYPos);

    // Nome 2
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    const name2Width = ctx.measureText(item2.name).width + 20;
    ctx.fillRect(canvasWidth - margin - imgSize / 2 - name2Width / 2, nameYPos - 15, name2Width, 30);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(item2.name, canvasWidth - margin - imgSize / 2, nameYPos);

    return canvas.toBuffer('image/png');
}

// --- HANDLER PRINCIPALE ---
async function handler(m, { conn, usedPrefix, command, text }) {
    const userId = m.sender;
    const action = text ? text.split(' ')[0].toLowerCase() : null;

    if (action === 'higher' || action === 'lower') {
        return await handleGameAction(m, { conn, usedPrefix, command, action });
    }

    if (!global.hlGame.sessions[userId] || action === 'newgame' || !global.hlGame.sessions[userId].gameActive) {
        await m.reply('🎮 Inizio una nuova partita... Sto cercando i loghi su Google Images, attendi un momento!');
        
        // Pulisci la cache periodicamente
        cleanImageCache();
        
        let currentItem, nextItem;
        let attempts = 0;
        const MAX_ATTEMPTS = 5;

        do {
            if (attempts > 0) {
                console.log(`Tentativo ${attempts}: una delle immagini non era valida o API limitata. Attendo...`);
                await delay(1000 + (attempts * 1000));
            }
            
            currentItem = getRandomItem();
            nextItem = getRandomItem();
            while (currentItem.name === nextItem.name) {
                nextItem = getRandomItem();
            }

            console.log(`Cercando immagini per: ${currentItem.name} e ${nextItem.name}`);
            
            const [currentImage, nextImage] = await Promise.all([
                getGoogleImage(currentItem.name),
                getGoogleImage(nextItem.name)
            ]);
            
            currentItem.image = currentImage;
            nextItem.image = nextImage;
            
            attempts++;
            if (attempts >= MAX_ATTEMPTS) {
                return m.reply(`❌ Impossibile trovare immagini valide dopo ${MAX_ATTEMPTS} tentativi.
                
🔧 **Possibili cause:**
• Quota API Google esaurita
• Chiavi API non valide
• Problemi di connessione

💡 **Soluzioni:**
• Controlla le tue API Keys Google
• Verifica la configurazione su https://console.developers.google.com
• Riprova più tardi`);
            }
        } while (
            currentItem.image.includes('placehold.co') || 
            nextItem.image.includes('placehold.co') || 
            currentItem.image === 'RATE_LIMITED' || 
            nextItem.image === 'RATE_LIMITED' ||
            currentItem.image === 'API_ERROR_403' ||
            nextItem.image === 'API_ERROR_403' ||
            currentItem.image === 'API_ERROR_400' ||
            nextItem.image === 'API_ERROR_400'
        );

        global.hlGame.sessions[userId] = {
            score: 0,
            bestScore: global.hlGame.sessions[userId]?.bestScore || 0,
            currentItem,
            nextItem,
            gameActive: true,
        };

        console.log(`Partita iniziata per ${userId} con immagini: ${currentItem.image} e ${nextImage}`);
    }

    const game = global.hlGame.sessions[userId];

    try {
        const imageBuffer = await createVsImage(game.currentItem, game.nextItem);
        const captionText = `ㅤㅤ⋆｡˚『 ╭ \`HIGHER OR LOWER\` ╯ 』˚｡⋆
╭
│ 『 ${game.currentItem.emoji} 』 \`${formatLongName(game.currentItem.name)}:\` *${formatNumber(game.currentItem.searches)} ${game.currentItem.category}*
│
│ ✨ *${formatLongName(game.nextItem.name)}* (${game.nextItem.emoji}) ha più o meno ricerche?
│
├─ 🏆 Punteggio: *${game.score}*
├─ 📈 Record: *${game.bestScore}*
├─ 🔍 Immagini da Google
╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─`;

        const buttons = [
            { buttonId: `${usedPrefix}${command} higher`, buttonText: { displayText: '📈 PIÙ ALTO' }, type: 1 },
            { buttonId: `${usedPrefix}${command} lower`, buttonText: { displayText: '📉 PIÙ BASSO' }, type: 1 }
        ];

        await conn.sendMessage(m.chat, {
            image: imageBuffer,
            caption: captionText,
            footer: 'Fai la tua scelta! 🎯',
            buttons: buttons,
            headerType: 4
        }, { quoted: m });

    } catch (error) {
        console.error('Errore nella creazione dell\'immagine VS:', error);
        return m.reply(`❌ Errore nella creazione dell'immagine di gioco. Riprova con *${usedPrefix}${command}*`);
    }
}

// --- GESTIONE AZIONE DI GIOCO ---
async function handleGameAction(m, { conn, usedPrefix, command, action }) {
    const userId = m.sender;
    const game = global.hlGame.sessions[userId];

    if (!game || !game.gameActive) {
        return m.reply(`❌ Nessuna partita attiva! Usa *${usedPrefix}${command}* per iniziare.`);
    }

    const { currentItem, nextItem } = game;
    const correct = (action === 'higher' && nextItem.searches >= currentItem.searches) ||
                      (action === 'lower' && nextItem.searches <= currentItem.searches);

    if (correct) {
        game.score++;
        if (game.score > game.bestScore) game.bestScore = game.score;

        await m.reply(`✅ *Corretto!* Il numero di ricerche per *${nextItem.name}* è *${formatNumber(nextItem.searches)}*.
Il tuo punteggio è ora *${game.score}*. Preparando il prossimo round... 🔄`);

        game.currentItem = nextItem;
        let newNextItem;
        let attempts = 0;
        const MAX_ATTEMPTS = 5;
        
        do {
            if (attempts > 0) {
                console.log(`Tentativo ${attempts}: immagine non valida o API limitata. Attendo...`);
                await delay(1000 + (attempts * 1000));
            }
            
            newNextItem = getRandomItem();
            while (game.currentItem.name === newNextItem.name) {
                newNextItem = getRandomItem();
            }
            
            newNextItem.image = await getGoogleImage(newNextItem.name);
            
            attempts++;
            if (attempts >= MAX_ATTEMPTS) {
                game.gameActive = false;
                return m.reply(`❌ Impossibile trovare un'immagine valida per il prossimo round.

🔧 **Causa probabile:** Quota API Google esaurita
💡 **Soluzione:** Controlla le tue API Keys Google su https://console.developers.google.com

Usa *${usedPrefix}${command}* per ricominciare quando l'API sarà disponibile.`);
            }
        } while (
            newNextItem.image.includes('placehold.co') || 
            newNextItem.image === 'RATE_LIMITED' ||
            newNextItem.image === 'API_ERROR_403' ||
            newNextItem.image === 'API_ERROR_400'
        );
        
        game.nextItem = newNextItem;
        
        return handler(m, { conn, usedPrefix, command, text: '' });

    } else {
        game.gameActive = false;
        const gameOverText = `ㅤㅤ⋆｡˚『 ╭ \`GAME OVER\` ╯ 』˚｡⋆
╭
│ 『 💥 』 \`Risposta sbagliata!\`
│
│ 『 ${currentItem.emoji} 』 *${formatLongName(currentItem.name)}*: ${formatNumber(currentItem.searches)}
│ 『 ${nextItem.emoji} 』 *${formatLongName(nextItem.name)}*: ${formatNumber(nextItem.searches)}
│
├─ 🏆 Punteggio Finale: *${game.score}*
├─ 📈 Record Personale: *${game.bestScore}*
├─ 🔍 Powered by Google Images
╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─

Usa *${usedPrefix}${command}* per giocare ancora! 🎮`;

        await m.reply(gameOverText);
    }
}

handler.command = ["higherlower", "hl2"];
handler.tags = ["giochi"];
handler.help = ["higherlower"];
handler.register = true;
handler.disabled = true;
export default handler;