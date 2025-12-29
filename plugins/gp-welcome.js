
import { WAMessageStubType } from '@realvare/based';
import axios from 'axios';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const groupBackgroundCache = new Map();
const profilePicCache = new Map();
const DEFAULT_AVATAR_URL = 'https://i.ibb.co/BKHtdBNp/default-avatar-profile-icon-1280x1280.jpg';

let defaultAvatarBuffer = null;
let puppeteer = null;
let browser = null;
let isPuppeteerAvailable = false;

const initPuppeteer = async () => {
    try {
        puppeteer = await import('puppeteer');
        isPuppeteerAvailable = true;
        return true;
    } catch (error) {
        console.error('⚠️ Puppeteer non disponibile, userò Browserless come fallback:', error.message);
        isPuppeteerAvailable = false;
        return false;
    }
};

const initBrowser = async () => {
    if (!puppeteer || !isPuppeteerAvailable) return false;
    try {
        if (!browser) {
            browser = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
                    '--disable-gpu', '--no-first-run', '--no-zygote', '--single-process',
                    '--disable-features=VizDisplayCompositor'
                ]
            });
        }
        return true;
    } catch (error) {
        console.error('❌ Errore inizializzazione browser Puppeteer:', error);
        isPuppeteerAvailable = false;
        return false;
    }
};

const createFallbackAvatar = async () => {
    const svgAvatar = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg"><circle cx="200" cy="200" r="200" fill="#6B7280"/><circle cx="200" cy="160" r="60" fill="#F3F4F6"/><ellipse cx="200" cy="300" rx="100" ry="80" fill="#F3F4F6"/></svg>`;
    return Buffer.from(svgAvatar);
};

const preloadDefaultAvatar = async () => {
    if (defaultAvatarBuffer) return;
    try {
        const res = await axios.get(DEFAULT_AVATAR_URL, {
            responseType: 'arraybuffer',
            timeout: 5000,
            headers: { 'User-Agent': 'varebot/2.5' }
        });
        defaultAvatarBuffer = res.status === 200 ? Buffer.from(res.data) : await createFallbackAvatar();
    } catch (error) {
        defaultAvatarBuffer = await createFallbackAvatar();
    }
};

async function getUserName(conn, jid, pushNameFromStub = '') {
    if (pushNameFromStub === 'created' || pushNameFromStub === 'Created' || !pushNameFromStub) {
        pushNameFromStub = '';
    }
    
    const isValid = str => str && typeof str === 'string' && str.length > 1 && str.length < 26 && !/^\d+$/.test(str) && !str.includes('@');
    if (isValid(pushNameFromStub)) return pushNameFromStub;

    const contact = conn.contacts?.[jid];
    if (contact) {
        if (isValid(contact.notify)) return contact.notify;
        if (isValid(contact.name)) return contact.name;
        if (isValid(contact.pushName)) return contact.pushName;
        if (isValid(contact.verifiedName)) return contact.verifiedName;
    }
    try {
        const nameFromApi = await Promise.race([
            conn.getName(jid),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout getName')), 1000))
        ]);
        if (isValid(nameFromApi)) return nameFromApi;
    } catch (e) {
        // Silenzia l'errore di timeout, è previsto
    }
    return `Utente ${jid.split('@')[0].replace(/:\d+/, '')}`;
}

async function getUserProfilePic(conn, jid) {
    if (profilePicCache.has(jid)) return profilePicCache.get(jid);
    let url;
    try {
        url = await Promise.race([
            conn.profilePictureUrl(jid, 'image'),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout profile pic URL')), 1500))
        ]);
    } catch (e) {
        url = null;
    }

    if (url) {
        try {
            const res = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 5000,
                headers: { 'User-Agent': 'varebot/2.5' }
            });
            if (res.status === 200) {
                const buffer = Buffer.from(res.data);
                profilePicCache.set(jid, buffer);
                return buffer;
            }
        } catch (e) {
            console.error(`❌ Errore download immagine profilo per ${jid}:`, e.message);
        }
    }

    if (!defaultAvatarBuffer) await preloadDefaultAvatar();
    if (defaultAvatarBuffer) profilePicCache.set(jid, defaultAvatarBuffer);
    return defaultAvatarBuffer || null;
}

const createDefaultBackground = async () => {
    const generateDots = () => Array.from({ length: 150 }).map(() => {
        const x = Math.random() * 1600;
        const y = Math.random() * 900;
        const size = Math.random() * 1.5 + 0.5;
        const opacity = Math.random() * 0.5 + 0.3;
        return `<circle cx="${x}" cy="${y}" r="${size}" fill="white" opacity="${opacity}"/>`;
    }).join('');

    const svgBackground = `<svg width="1600" height="900" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#667eea;stop-opacity:1" /><stop offset="50%" style="stop-color:#764ba2;stop-opacity:1" /><stop offset="100%" style="stop-color:#f093fb;stop-opacity:1" /></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="1.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><rect width="100%" height="100%" fill="url(#grad1)" /><g filter="url(#glow)">${generateDots()}</g></svg>`;
    return Buffer.from(svgBackground);
};

async function getGroupBackgroundImage(groupJid, conn) {
    if (groupBackgroundCache.has(groupJid)) return groupBackgroundCache.get(groupJid);
    let buffer = null;
    try {
        const url = await Promise.race([
            conn.profilePictureUrl(groupJid, 'image'),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout group pic URL')), 2000))
        ]);
        if (url) {
            const res = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 4000,
                headers: { 'User-Agent': 'varebot/2.5' }
            });
            if (res.status === 200) buffer = Buffer.from(res.data);
        }
    } catch (e) {
        console.error(`❌ Errore recupero immagine gruppo ${groupJid}:`, e.message);
    }

    if (!buffer) {
        try {
            const fallback = path.join(__dirname, '..', 'media', 'benvenuto-addio.jpg');
            buffer = await fs.readFile(fallback);
        } catch (e) {
            console.error('❌ Errore lettura immagine di fallback:', e.message);
            buffer = await createDefaultBackground();
        }
    }
    if (buffer) groupBackgroundCache.set(groupJid, buffer);
    return buffer;
}

const WelcomeCard = ({ backgroundUrl, pfpUrl, isGoodbye, username, groupName }) => {
    const styles = `
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@700&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        html, body {
            margin: 0;
            padding: 0;
            width: 1600px;
            height: 900px;
            font-family: 'Poppins', Arial, sans-serif;
            background: #1a1a1a;
            overflow: hidden;
        }
        
        .container {
            width: 100%;
            height: 100%;
            position: relative;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        
        .background {
            position: absolute;
            width: 100%;
            height: 100%;
            background: url('${backgroundUrl || ''}') center/cover;
            filter: blur(30px) brightness(0.7);
            opacity: 0.7;
        }
        
        .overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
        }
        
        .decorative-dots {
            position: absolute;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1;
            overflow: hidden;
        }
        
        .dot {
            position: absolute;
            border-radius: 50%;
            background-color: rgba(255, 255, 255, 0.7);
            animation: twinkle 5s ease-in-out infinite alternate;
            box-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
            font-size: 0;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        
        .star-four-point {
            position: absolute;
            color: rgba(255, 255, 255, 0.8);
            font-size: 24px;
            animation: twinkleStar 6s ease-in-out infinite alternate;
            text-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
            pointer-events: none;
        }
        
        @keyframes twinkle {
            0% { opacity: 0.2; transform: scale(0.8); }
            50% { opacity: 0.8; transform: scale(1.1); }
            100% { opacity: 0.4; transform: scale(0.9); }
        }
        
        @keyframes twinkleStar {
            0%, 100% { opacity: 0.7; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.2); }
        }
        
        .card {
            position: relative;
            width: 90%;
            height: 85%;
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(20px) saturate(180%);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 50px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: white;
            padding: 45px;
            box-sizing: border-box;
            box-shadow: 0 20px 50px rgba(0,0,0,0.4);
            z-index: 2;
        }
        
        .pfp-container { margin-bottom: 30px; position: relative; }
        
        .pfp-glow {
            position: absolute;
            top: -12px; left: -12px; right: -12px; bottom: -12px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, transparent 70%);
            animation: pulse 3s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.7; }
            50% { transform: scale(1.05); opacity: 1; }
        }
        
        .pfp {
            width: 280px;
            height: 280px;
            border-radius: 50%;
            border: 8px solid #FFF;
            box-shadow: 0 0 30px rgba(255, 255, 255, 0.7);
            object-fit: cover;
            position: relative;
            z-index: 1;
        }
        
        .text-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 10px;
            max-width: 95%;
            position: relative;
        }
        
        .title {
            font-size: 100px;
            font-weight: 700;
            text-shadow: 0 2px 4px rgba(0,0,0,0.5), 0 0 12px rgba(255,255,255,0.7);
            line-height: 1;
            color: #FFF;
        }
        
        .username {
            font-size: 72px;
            font-weight: 700;
            text-shadow: 0 2px 3px rgba(0,0,0,0.4), 0 0 8px rgba(255,255,255,0.5);
            line-height: 1.1;
            word-break: break-all;
        }
        
        .group-name {
            font-size: 56px;
            font-weight: 700;
            color: #ccc;
            text-shadow: 0 1px 2px rgba(0,0,0,0.5), 0 0 5px rgba(255,255,255,0.4);
            line-height: 1.2;
            word-break: break-all;
        }
        
        .footer {
            position: absolute;
            bottom: 35px;
            font-size: 42px;
            text-shadow: 0 1px 3px rgba(0,0,0,0.5), 0 0 6px rgba(255,255,255,0.5);
            color: #fff;
            font-family: 'Poppins', sans-serif;
        }
        
        .scattered-stars {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 150px;
            pointer-events: none;
            z-index: 0;
            overflow: hidden;
        }
        
        .scattered-star-item {
            position: absolute;
            color: rgba(255, 255, 255, 0.9);
            font-size: 20px;
            text-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
            opacity: 0;
            animation: fadeInOut 5s ease-in-out infinite alternate forwards;
        }
        
        @keyframes fadeInOut {
            0% { opacity: 0; transform: scale(0.5) translateY(20px); }
            50% { opacity: 0.9; transform: scale(1) translateY(0); }
            100% { opacity: 0; transform: scale(0.7) translateY(10px); }
        }
    `;

    const decorativeElements = Array.from({ length: 100 }).map((_, i) => {
        const isFourPointStar = Math.random() < 0.3;
        const size = isFourPointStar ? Math.random() * 8 + 16 : Math.random() * 4 + 4;
        const opacity = Math.random() * 0.5 + 0.5;
        const delay = Math.random() * 5;
        return React.createElement(isFourPointStar ? 'span' : 'div', {
            key: `dot-${i}`,
            className: isFourPointStar ? 'star-four-point' : 'dot',
            style: {
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: isFourPointStar ? 'auto' : `${size}px`,
                height: isFourPointStar ? 'auto' : `${size}px`,
                animationDelay: `${delay}s`,
                opacity: isFourPointStar ? '1' : `${opacity}`,
                zIndex: isFourPointStar ? '3' : '1',
                fontSize: isFourPointStar ? `${size}px` : '0',
            }
        }, isFourPointStar ? '✧' : '');
    });

    const scatteredStars = Array.from({ length: 50 }).map((_, i) => {
        const size = Math.random() * 10 + 10;
        const delay = Math.random() * 5;
        const left = Math.random() * 100;
        const bottom = Math.random() * 100;
        return React.createElement('span', {
            key: `scattered-star-${i}`,
            className: 'scattered-star-item',
            style: {
                left: `${left}%`,
                bottom: `${bottom}%`,
                fontSize: `${size}px`,
                animationDelay: `${delay}s`,
                animationDuration: `${Math.random() * 3 + 4}s`,
            }
        }, '✧');
    });

    return React.createElement('html', { lang: 'it' },
        React.createElement('head', null,
            React.createElement('meta', { charSet: 'utf-8' }),
            React.createElement('meta', { name: 'viewport', content: 'width=1600,height=900' }),
            React.createElement('style', { dangerouslySetInnerHTML: { __html: styles } })
        ),
        React.createElement('body', null,
            React.createElement('div', { className: 'container' },
                React.createElement('div', { className: 'background' }),
                React.createElement('div', { className: 'overlay' }),
                React.createElement('div', { className: 'decorative-dots' }, ...decorativeElements),
                React.createElement('div', { className: 'scattered-stars' }, ...scatteredStars),
                React.createElement('div', { className: 'card' },
                    React.createElement('div', { className: 'pfp-container' },
                        React.createElement('div', { className: 'pfp-glow' }),
                        React.createElement('img', { src: pfpUrl, className: 'pfp', alt: 'Profile Picture' })
                    ),
                    React.createElement('div', { className: 'text-container' },
                        React.createElement('h1', { className: 'title' }, isGoodbye ? 'ADDIO!' : 'BENVENUTO!'),
                        React.createElement('h2', { className: 'username' }, username || 'Utente'),
                        React.createElement('p', { className: 'group-name' }, groupName || 'Gruppo')
                    ),
                    React.createElement('div', { className: 'footer' }, '✦ ⋆ ✧ ⭒ 𝓿𝓪𝓻𝓮𝓫𝓸𝓽 ⭒ ✧ ⋆ ✦')
                )
            )
        )
    );
};

async function createImageWithPuppeteer(htmlContent) {
    try {
        if (!browser && !(await initBrowser())) throw new Error('Browser Puppeteer non inizializzato');
        const page = await browser.newPage();
        await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
        await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 15000 });
        await page.waitForTimeout(500);
        const screenshot = await page.screenshot({ type: 'jpeg', quality: 90, clip: { x: 0, y: 0, width: 1600, height: 900 } });
        await page.close();
        return Buffer.from(screenshot);
    } catch (error) {
        console.error('❌ Errore Puppeteer:', error.message);
        throw error;
    }
}

async function createImageWithBrowserless(htmlContent) {
    const browserlessApiKey = global.APIKeys?.browserless;
    if (!browserlessApiKey) throw new Error("API key Browserless non trovata");

    try {
        const res = await axios.post(`https://production-sfo.browserless.io/screenshot?token=${browserlessApiKey}`, {
            html: htmlContent,
            gotoOptions: { waitUntil: 'networkidle0', timeout: 30000 },
            options: { type: 'jpeg', quality: 90, clip: { x: 0, y: 0, width: 1600, height: 900 } },
            viewport: { width: 1600, height: 900, deviceScaleFactor: 1 },
            bestAttempt: true
        }, {
            responseType: 'arraybuffer',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'varebot/2.5' },
            timeout: 60000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        if (res.status === 200 && res.data?.byteLength > 0) return Buffer.from(res.data);
        throw new Error(`Risposta Browserless non valida: status ${res.status}, size ${res.data?.byteLength || 0}`);
    } catch (error) {
        if (error.response) console.error(`❌ Errore Browserless: ${error.response.status} - ${error.response.statusText}`);
        else console.error('❌ Errore completo Browserless:', error.message);
        throw error;
    }
}

async function createImage(username, groupName, profilePicBuffer, isGoodbye, groupJid, conn) {
    const [backgroundBuffer] = await Promise.all([
        getGroupBackgroundImage(groupJid, conn),
        defaultAvatarBuffer || preloadDefaultAvatar()
    ]);

    const toBase64 = (buffer, type) => `data:image/${type};base64,${buffer.toString('base64')}`;
    const backgroundUrl = backgroundBuffer ? toBase64(backgroundBuffer, backgroundBuffer.toString().startsWith('<svg') ? 'svg+xml' : 'jpeg') : '';
    const pfpBuffer = profilePicBuffer || defaultAvatarBuffer;
    const pfpUrl = pfpBuffer ? toBase64(pfpBuffer, pfpBuffer.toString().startsWith('<svg') ? 'svg+xml' : 'jpeg') : '';

    const element = React.createElement(WelcomeCard, { backgroundUrl, pfpUrl, isGoodbye, username, groupName });
    const htmlContent = `<!DOCTYPE html>${ReactDOMServer.renderToStaticMarkup(element)}`;

    if (isPuppeteerAvailable && browser) {
        try { return await createImageWithPuppeteer(htmlContent); } catch (e) { console.error('❌ Puppeteer fallito, fallback a Browserless...'); }
    }

    try { return await createImageWithBrowserless(htmlContent); } catch (e) {
        throw new Error(`Creazione immagine fallita con entrambi i metodi. Errore: ${e.message}`);
    }
}

const requestCounter = { count: 0, lastReset: Date.now(), isBlocked: false, blockUntil: 0 };

function checkAntiSpam() {
    const now = Date.now();
    if (requestCounter.isBlocked) {
        if (now < requestCounter.blockUntil) return false;
        requestCounter.isBlocked = false;
        requestCounter.count = 0;
    }
    if (now - requestCounter.lastReset > 30000) {
        requestCounter.count = 0;
        requestCounter.lastReset = now;
    }
    requestCounter.count++;
    if (requestCounter.count > 6) {
        requestCounter.isBlocked = true;
        requestCounter.blockUntil = now + 45000;
        console.warn('⚠️ Anti-spam: troppe richieste di immagini. Bloccato per 45 secondi.');
        return false;
    }
    return true;
}

initPuppeteer().then(preloadDefaultAvatar);

export async function before(m, { conn, groupMetadata }) {
    if (!m.isGroup || !m.messageStubType) return true;

    const chat = global.db?.data?.chats?.[m.chat];
    if (!chat || (!chat.welcome && !chat.goodbye)) return true;

    const who = m.messageStubParameters?.[0];
    const pushNameFromStub = m.messageStubParameters?.[1];
    if (!who || typeof who !== 'string' || !who.includes('@')) return true;
    const jid = conn.decodeJid(who);
    const cleanUserId = jid.split('@')[0].replace(/:\d+$/, '');

    const isAdd = m.messageStubType === WAMessageStubType.GROUP_PARTICIPANT_ADD || m.messageStubType === WAMessageStubType.GROUP_PARTICIPANT_INVITE;
    const isPromote = m.messageStubType === WAMessageStubType.GROUP_PARTICIPANT_PROMOTE;
    const isDemote = m.messageStubType === WAMessageStubType.GROUP_PARTICIPANT_DEMOTE;
    const isRemove = m.messageStubType === WAMessageStubType.GROUP_PARTICIPANT_LEAVE || m.messageStubType === WAMessageStubType.GROUP_PARTICIPANT_KICK;

    if (((isAdd || isPromote) && !chat.welcome) || ((isRemove || isDemote) && !chat.goodbye)) return true;

    if (!checkAntiSpam()) return true;

    const [username, profilePic] = await Promise.all([
        getUserName(conn, jid, pushNameFromStub),
        getUserProfilePic(conn, jid)
    ]);

    const groupName = groupMetadata?.subject || 'Gruppo';
    const memberCount = groupMetadata?.participants?.length || 0;
    const displayName = (username.startsWith('Utente ') || username === '𝐍𝐮𝐨𝐯𝐨 𝐌𝐞𝐦𝐛𝐫𝐨') ? cleanUserId : username;
    const isGoodbye = isRemove || isDemote;

    const caption = isGoodbye ?
        `*\`Addio\`* @${cleanUserId} 👋\n┊ _Ha abbandonato il gruppo_\n╰► *\`Membri\`* ${memberCount}` :
        `*\`Benvenuto/a\`* @${cleanUserId} *✧*\n┊ *\`In\`* *${groupName}*\n*╰►* *\`Membri:\`* ${memberCount}`;

    try {
        const image = await Promise.race([
            createImage(displayName, groupName, profilePic, isGoodbye, m.chat, conn),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout creazione immagine')), 35000))
        ]);

        if (image && image.length > 0) {
            await conn.sendMessage(m.chat, {
                image,
                caption,
                mentions: [jid],
                contextInfo: { ...(global.fake?.contextInfo || {}) } //idea di cicco 🥰
            });
        } else {
            console.warn('⚠️ Immagine non generata, invio solo testo.');
            await conn.sendMessage(m.chat, {
                text: caption,
                mentions: [jid],
                contextInfo: { ...(global.fake?.contextInfo || {}) }
            });
        }
    } catch (error) {
        console.error('❌ Errore critico durante la creazione/invio dell\'immagine:', error.message);
        try {
            await conn.sendMessage(m.chat, {
                text: caption,
                mentions: [jid],
                contextInfo: { ...(global.fake?.contextInfo || {}) }
            });
        } catch (fallbackError) {
            console.error('❌ Errore anche nell\'invio del messaggio di fallback:', fallbackError);
        }
    }
    return true;
}
