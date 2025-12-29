// todo: fix fix and fix again shiii
import { downloadContentFromMessage } from '@realvare/based';
import ffmpeg from 'fluent-ffmpeg';
import { createWriteStream, readFile } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { unlink } from 'fs/promises';
import Jimp from 'jimp';
import jsQR from 'jsqr';
import fetch from 'node-fetch';
import { FormData } from 'formdata-node';

const WHATSAPP_GROUP_REGEX = /\bchat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/i;
const WHATSAPP_CHANNEL_REGEX = /whatsapp\.com\/channel\/([0-9A-Za-z]{20,24})/i;
const GENERAL_URL_REGEX = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&=]*)/gi;

const SHORT_URL_DOMAINS = [
    'bit.ly', 'tinyurl.com', 't.co', 'short.link', 'shorturl.at',
    'is.gd', 'v.gd', 'goo.gl', 'ow.ly', 'buff.ly',
    'tiny.cc', 'shorte.st', 'adf.ly', 'linktr.ee', 'rebrand.ly',
    'bitly.com', 'cutt.ly', 'short.io', 'links.new', 'link.ly',
    'ur.ly', 'shrinkme.io', 'clck.ru', 'short.gy', 'lnk.to',
    'sh.st', 'ouo.io', 'bc.vc', 'adfoc.us', 'linkvertise.com',
    'exe.io', 'linkbucks.com', 'adfly.com', 'shrink-service.it',
    'cur.lv', 'gestyy.com', 'shrinkarn.com', 'za.gl', 'clicksfly.com',
    '6url.com', 'shortlink.sh', 'short.tn', 'rotator.ninja',
    'shrtco.de', 'ulvis.net', 'chilp.it', 'clicky.me',
    'budurl.com', 'po.st', 'shr.lc', 'dub.co'
];

const SHORT_URL_REGEX = new RegExp(
    `https?:\\/\\/(?:www\\.)?(?:${SHORT_URL_DOMAINS.map(d => d.replace('.', '\\.')).join('|')})\\/[\\w\\-._~:/?#[\\]@!$&'()*+,;=]*`,
    'gi'
);

const redirectCache = new Map();
const CACHE_DURATION = 10 * 60 * 1000;
const FETCH_TIMEOUT = 10000;
const MAX_REDIRECTS = 5;
const MAX_URLS_TO_CHECK = 3;
const HIDDEN_LINK_PATTERNS = [
    /chat[^\w]*whatsapp[^\w]*com/i,
    /whatsapp[^\w]*com[^\w]*(invite|channel)/i,
];

const INVISIBLE_CHARS_REGEX = /[\u200b\u200c\u200d\uFEFF]/;
const BASE64_REGEX = /(?:[A-Za-z0-9+/]{4}){5,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?/g;
const URL_ENCODED_REGEX = /%[0-9a-fA-F]{2}/;
const REQUEST_HEADERS = {
    'User-Agent': 'varebot/2.5',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
};

function isWhatsAppLink(url) {
    return WHATSAPP_GROUP_REGEX.test(url) || WHATSAPP_CHANNEL_REGEX.test(url);
}
function resolveRedirectUrl(currentUrl, location) {
    try {
        if (location.startsWith('/')) {
            const urlObj = new URL(currentUrl);
            return `${urlObj.protocol}//${urlObj.host}${location}`;
        }
        if (location.startsWith('http')) {
            return location;
        }
        const urlObj = new URL(currentUrl);
        return new URL(location, urlObj.href).href;
    } catch {
        return location;
    }
}

async function checkUrlRedirect(url, maxRedirects = MAX_REDIRECTS) {
    const cacheKey = url.toLowerCase();
    const cached = redirectCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.result;
    }

    let currentUrl = url;
    let redirectCount = 0;
    
    try {
        while (redirectCount < maxRedirects) {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
            
            try {
                const response = await fetch(currentUrl, {
                    method: 'HEAD',
                    redirect: 'manual',
                    signal: controller.signal,
                    headers: REQUEST_HEADERS
                });
                
                clearTimeout(timeout);
                
                if (isWhatsAppLink(currentUrl)) {
                    const result = true;
                    redirectCache.set(cacheKey, { result, timestamp: Date.now() });
                    return result;
                }
                
                if (response.status < 300 || response.status >= 400) {
                    if (response.status === 405 && redirectCount === 0) {
                        try {
                            const getResponse = await fetch(currentUrl, {
                                method: 'GET',
                                redirect: 'manual',
                                signal: controller.signal,
                                headers: { 'User-Agent': REQUEST_HEADERS['User-Agent'] }
                            });
                            
                            if (getResponse.status >= 300 && getResponse.status < 400) {
                                const location = getResponse.headers.get('location');
                                if (location) {
                                    currentUrl = resolveRedirectUrl(currentUrl, location);
                                    redirectCount++;
                                    continue;
                                }
                            }
                        } catch {}
                    }
                    break;
                }
                
                const location = response.headers.get('location');
                if (!location) break;
                
                currentUrl = resolveRedirectUrl(currentUrl, location);
                redirectCount++;
                
            } catch (fetchError) {
                clearTimeout(timeout);
                break;
            }
        }
        
        const result = isWhatsAppLink(currentUrl);
        redirectCache.set(cacheKey, { result, timestamp: Date.now() });
        return result;
        
    } catch {
        const result = false;
        redirectCache.set(cacheKey, { result, timestamp: Date.now() });
        return result;
    }
}

async function checkUrlsForRedirects(text) {
    if (!text) return false;
    
    const urls = text.match(GENERAL_URL_REGEX) || [];
    const urlsToCheck = urls.filter(url => !isWhatsAppLink(url));
    
    if (urlsToCheck.length === 0) return false;
    
    const urlsToProcess = urlsToCheck.slice(0, MAX_URLS_TO_CHECK);
    
    const promises = urlsToProcess.map(async (url) => {
        try {
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 15000)
            );
            
            return await Promise.race([checkUrlRedirect(url), timeoutPromise]);
        } catch {
            return false;
        }
    });
    
    try {
        const results = await Promise.all(promises);
        return results.some(result => result === true);
    } catch {
        return false;
    }
}

function cleanupCache() {
    const now = Date.now();
    for (const [key, value] of redirectCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
            redirectCache.delete(key);
        }
    }
}

setInterval(cleanupCache, CACHE_DURATION);

async function getMediaBuffer(message) {
    try {
        const msg = message.message?.imageMessage ||
            message.message?.videoMessage ||
            message.message?.stickerMessage ||
            message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage ||
            message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage ||
            message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage;
            
        if (!msg) return null;
        
        let type;
        if (msg.mimetype.includes('video')) {
            type = 'video';
        } else if (msg.mimetype.includes('sticker')) {
            type = 'sticker';
        } else if (msg.mimetype.includes('image')) {
            type = 'image';
        } else {
            return null;
        }
        
        const stream = await downloadContentFromMessage(msg, type);
        let buffer = Buffer.from([]);
        
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        
        return buffer;
    } catch {
        return null;
    }
}

async function extractFrameFromVideo(videoBuffer) {
    const tempVideoPath = join(tmpdir(), `video-${Date.now()}.mp4`);
    const tempImagePath = join(tmpdir(), `frame-${Date.now()}.jpg`);
    
    try {
        await new Promise((resolve, reject) => {
            createWriteStream(tempVideoPath)
                .on('finish', resolve)
                .on('error', reject)
                .end(videoBuffer);
        });
        
        await new Promise((resolve, reject) => {
            ffmpeg(tempVideoPath)
                .frames(1)
                .seekInput('00:00:01')
                .outputOptions('-q:v 2')
                .output(tempImagePath)
                .on('end', resolve)
                .on('error', reject)
                .run();
        });
        
        return new Promise((resolve, reject) => {
            readFile(tempImagePath, (err, data) => 
                err ? reject(err) : resolve(data)
            );
        });
    } catch {
        return null;
    } finally {
        unlink(tempVideoPath).catch(() => {});
        unlink(tempImagePath).catch(() => {});
    }
}

async function preprocessImageForQR(imageBuffer) {
    try {
        const image = await Jimp.read(imageBuffer);
        image.normalize();
        image.convolute([[0,-1,0],[-1,5,-1],[0,-1,0]]);
        return await image.getBufferAsync(Jimp.MIME_PNG);
    } catch {
        return imageBuffer;
    }
}

async function readQRCodeWithJsqr(imageBuffer) {
    if (!imageBuffer) return null;

    try {
        const processedBuffer = await preprocessImageForQR(imageBuffer);
        const image = await Jimp.read(processedBuffer);
        const { data, width, height } = image.bitmap;
        const imageData = new Uint8ClampedArray(data);
        const code = jsQR(imageData, width, height, {
            inversionAttempts: "dontInvert",
        });

        return code ? code.data : null;
    } catch {
        return null;
    }
}

async function readQRCodeWithExternalApi(imageBuffer) {
    if (!imageBuffer) return null;
    
    try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 8000);
        
        const formData = new FormData();
        const processedBuffer = await preprocessImageForQR(imageBuffer);
        formData.append('file', processedBuffer, 'image.png');
        
        const response = await fetch('https://api.qrserver.com/v1/read-qr-code/', {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });
        
        if (!response.ok) return null;
        
        const data = await response.json();
        return data?.[0]?.symbol?.[0]?.data || null;
    } catch {
        return null;
    }
}

async function readQRCode(imageBuffer) {
    const jsqrResult = await readQRCodeWithJsqr(imageBuffer);
    return jsqrResult || await readQRCodeWithExternalApi(imageBuffer);
}

async function checkForShortUrls(text) {
    if (!text) return false;
    return SHORT_URL_REGEX.test(text);
}

async function containsSuspiciousLink(text) {
    if (!text) return false;
    
    if (isWhatsAppLink(text)) return true;
    
    if (await checkForShortUrls(text)) return true;
    
    const hasRedirectingUrls = await checkUrlsForRedirects(text);
    if (hasRedirectingUrls) return true;
    
    if (HIDDEN_LINK_PATTERNS.some(pattern => pattern.test(text))) return true;
    
    if (INVISIBLE_CHARS_REGEX.test(text)) return true;
    
    const base64Matches = text.match(BASE64_REGEX);
    if (base64Matches) {
        for (const match of base64Matches) {
            try {
                const decoded = Buffer.from(match, 'base64').toString('utf-8');
                if (await containsSuspiciousLink(decoded)) return true;
            } catch {}
        }
    }
    
    if (URL_ENCODED_REGEX.test(text)) {
        try {
            const decoded = decodeURIComponent(text);
            if (decoded !== text && await containsSuspiciousLink(decoded)) return true;
        } catch {}
    }
    
    return false;
}

function extractTextFromMessage(m, excludeQuoted = false) {
    const texts = [];
    const addText = (text) => text && texts.push(text);
    
    addText(m.text);
    addText(m.message?.extendedTextMessage?.text);
    addText(m.message?.imageMessage?.caption);
    addText(m.message?.videoMessage?.caption);
    addText(m.message?.audioMessage?.caption);
    addText(m.message?.documentMessage?.caption);
    addText(m.message?.stickerMessage?.caption);
    
    const contact = m.message?.contactMessage;
    if (contact) {
        addText(contact.displayName);
        addText(contact.vcard);
    }
    
    const location = m.message?.locationMessage;
    if (location) {
        addText(location.name);
        addText(location.address);
        addText(location.comment);
        addText(location.url);
    }
    
    addText(m.message?.liveLocationMessage?.caption);
    
    const buttonMsg = m.message?.buttonMessage;
    if (buttonMsg) {
        addText(buttonMsg.text);
        addText(buttonMsg.footer);
        buttonMsg.buttons?.forEach(button => 
            addText(button.buttonText?.displayText)
        );
    }
    
    const template = m.message?.templateMessage?.hydratedTemplate;
    if (template) {
        addText(template.hydratedContentText);
        addText(template.hydratedFooterText);
        template.hydratedButtons?.forEach(button => {
            addText(button.quickReplyButton?.displayText);
            addText(button.urlButton?.displayText);
            addText(button.urlButton?.url);
        });
    }
    
    const listMsg = m.message?.listMessage;
    if (listMsg) {
        addText(listMsg.title);
        addText(listMsg.description);
        addText(listMsg.buttonText);
        addText(listMsg.footerText);
        listMsg.sections?.forEach(section => {
            addText(section.title);
            section.rows?.forEach(row => {
                addText(row.title);
                addText(row.description);
                addText(row.rowId);
            });
        });
    }
    
    const interactive = m.message?.interactiveMessage;
    if (interactive) {
        addText(interactive.header?.title);
        addText(interactive.header?.subtitle);
        addText(interactive.body?.text);
        addText(interactive.footer?.text);
        interactive.nativeFlowMessage?.buttons?.forEach(button => {
            addText(button.name);
            addText(button.buttonParamsJson);
        });
    }
    
    if (!excludeQuoted && m.message?.extendedTextMessage?.contextInfo) {
        const contextInfo = m.message.extendedTextMessage.contextInfo;
        
        const adReply = contextInfo.externalAdReply;
        if (adReply) {
            addText(adReply.title);
            addText(adReply.body);
            addText(adReply.mediaUrl);
            addText(adReply.sourceUrl);
            addText(adReply.previewType);
            addText(adReply.thumbnailUrl);
        }
        
        const quoted = contextInfo.quotedMessage;
        if (quoted) {
            addText(quoted.conversation);
            addText(quoted.extendedTextMessage?.text);
            addText(quoted.imageMessage?.caption);
            addText(quoted.videoMessage?.caption);
            addText(quoted.documentMessage?.caption);
            addText(quoted.audioMessage?.caption);
            addText(quoted.contactMessage?.displayName);
            addText(quoted.contactMessage?.vcard);
        }
        
        contextInfo.mentionedJid?.forEach(jid => addText(jid));
    }
    
    const pollV3 = m.message?.pollCreationMessageV3;
    if (pollV3) {
        addText(pollV3.name);
        pollV3.options?.forEach(opt => addText(opt.optionName));
    }
    
    const poll = m.message?.pollCreationMessage;
    if (poll) {
        addText(poll.name);
        addText(poll.title);
        poll.options?.forEach(option => addText(option.optionName));
    }
    
    const product = m.message?.productMessage?.product;
    if (product) {
        addText(product.title);
        addText(product.description);
        addText(product.retailerId);
        addText(product.url);
    }
    
    const order = m.message?.orderMessage;
    if (order) {
        addText(order.itemCount?.toString());
        addText(order.message);
    }
    
    const invoice = m.message?.invoiceMessage;
    if (invoice) {
        addText(invoice.note);
        addText(invoice.token);
    }
    
    addText(m.message?.reactionMessage?.text);
    
    const ephemeral = m.message?.ephemeralMessage?.message;
    if (ephemeral) {
        addText(ephemeral.extendedTextMessage?.text);
        addText(ephemeral.imageMessage?.caption);
    }
    
    const viewOnce = m.message?.viewOnceMessage?.message;
    if (viewOnce) {
        addText(viewOnce.imageMessage?.caption);
        addText(viewOnce.videoMessage?.caption);
    }
    
    return texts
        .filter(Boolean)
        .join(' ')
        .replace(/[\s\u200b\u200c\u200d\uFEFF]+/g, ' ')
        .trim();
}

async function handleViolation(conn, m, reasonMessage, isBotAdmin) {
    const username = m.sender.split('@')[0];
    const fullMessage = `> ${reasonMessage}\n> L'utente @${username} è stato rimosso.\n\n> \`vare ✧ bot\``;
    
    if (!isBotAdmin) {
        await conn.sendMessage(m.chat, {
            text: `> 『 ℹ️ 』 \`Non sono un admin.\`\n> Per rimuovere l'utente, rendimi un amministratore.\n\n> \`vare ✧ bot\``
        }, { quoted: m });
        return;
    }
    
    try {
        await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove');
        await new Promise(resolve => setTimeout(resolve, 100));
        await conn.sendMessage(m.chat, { delete: m.key });
        await new Promise(resolve => setTimeout(resolve, 1000));
        await conn.sendMessage(m.chat, {
            text: fullMessage,
            mentions: [m.sender]
        });
    } catch {
        await conn.sendMessage(m.chat, {
            text: fullMessage,
            mentions: [m.sender]
        });
    }
}

async function scanMediaForQrCode(mediaBuffer, mimeType, isAnimated = false) {
    try {
        let bufferToScan = mediaBuffer;
        
        if (isAnimated || mimeType.startsWith('video')) {
            const frameBuffer = await extractFrameFromVideo(mediaBuffer);
            if (!frameBuffer) return false;
            bufferToScan = frameBuffer;
        }
        
        if (mimeType.startsWith('image') || 
            mimeType.startsWith('sticker') || 
            mimeType.startsWith('video')) {
            const qrData = await readQRCode(bufferToScan);
            return qrData && await containsSuspiciousLink(qrData);
        }
    } catch {}
    return false;
}

function isQuoteOnlyMessage(m) {
    const hasQuote = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const hasOwnText = m.text && m.text.trim().length > 0;
    const hasOwnMedia = m.message?.imageMessage || 
                       m.message?.videoMessage || 
                       m.message?.stickerMessage;
    
    return hasQuote && !hasOwnText && !hasOwnMedia;
}

function getViolationReason(text) {
    if (isWhatsAppLink(text)) {
        return 'Link di gruppo/canale WhatsApp rilevato nel testo.';
    }
    if (SHORT_URL_REGEX.test(text)) {
        return 'Short URL sospetto rilevato nel testo.';
    }
    return 'Link sospetto rilevato nel testo.';
}

function getMediaName(mimeType) {
    if (mimeType.includes('sticker')) return 'sticker';
    if (mimeType.includes('video')) return 'video';
    return 'immagine';
}

export async function before(m, { conn, isAdmin, isBotAdmin, isOwner, isROwner }) {
    if (!m.isGroup || isAdmin || isOwner || isROwner || m.fromMe) {
        return false;
    }

    const chat = global.db.data.chats[m.chat];
    if (!chat?.antiLink) {
        return false;
    }

    if (isQuoteOnlyMessage(m)) {
        return false;
    }

    try {
        let groupMetadata = global.groupCache.get(m.chat);
        if (!groupMetadata) {
            groupMetadata = await conn.groupMetadata(m.chat);
            if (groupMetadata) {
                global.groupCache.set(m.chat, groupMetadata, { ttl: 300 });
            }
        }

        let currentIsBotAdmin = isBotAdmin;
        if (groupMetadata) {
            const participants = groupMetadata.participants;
            const normalizedParticipants = participants.map(u => {
                const normalizedId = conn.decodeJid(u.id);
                return { ...u, id: normalizedId, jid: u.jid || normalizedId };
            });

            const normalizedBot = conn.decodeJid(conn.user.jid);
            const normalizedOwner = groupMetadata.owner ? conn.decodeJid(groupMetadata.owner) : null;
            const normalizedOwnerLid = groupMetadata.ownerLid ? conn.decodeJid(groupMetadata.ownerLid) : null;

            currentIsBotAdmin = participants.some(u => {
                const participantIds = [
                    conn.decodeJid(u.id),
                    u.jid ? conn.decodeJid(u.jid) : null,
                    u.lid ? conn.decodeJid(u.lid) : null
                ].filter(Boolean);
                const isMatch = participantIds.includes(normalizedBot);
                return isMatch && (u.admin === 'admin' || u.admin === 'superadmin' || u.isAdmin === true || u.admin === true);
            }) || (normalizedBot === normalizedOwner || normalizedBot === normalizedOwnerLid);
        }

        let linkFound = false;
        let reason = '';

        const extractedText = extractTextFromMessage(m, true);

        if (await containsSuspiciousLink(extractedText)) {
            reason = getViolationReason(extractedText);
            linkFound = true;
        }

        const msgType = m.message?.imageMessage ||
                       m.message?.videoMessage ||
                       m.message?.stickerMessage;

        if (!linkFound && msgType) {
            const mediaBuffer = await getMediaBuffer(m);
            const isAnimated = msgType.mimetype?.includes('sticker') &&
                             msgType.isAnimated === true;

            if (mediaBuffer && await scanMediaForQrCode(mediaBuffer, msgType.mimetype, isAnimated)) {
                linkFound = true;
                const mediaName = getMediaName(msgType.mimetype);
                reason = `QR code con link di gruppo/canale WhatsApp rilevato in ${mediaName}.`;
            }
        }

        if (linkFound) {
            const reasonMessage = `『 🚫 』 \`${reason}\``;
            await handleViolation(conn, m, reasonMessage, currentIsBotAdmin);
            return true;
        }
    } catch (err) {
        console.error('Errore nel sistema anti-link:', err);
    }

    return false;
}