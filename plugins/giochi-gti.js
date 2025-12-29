import fetch from 'node-fetch'
import { createCanvas, loadImage } from 'canvas'

function drawHeart(ctx, x, y, width, height) {
  const topCurveHeight = height * 0.3;

  ctx.beginPath();
  ctx.moveTo(x, y + topCurveHeight);
  ctx.bezierCurveTo(
    x, y,
    x - width / 2, y,
    x - width / 2, y + topCurveHeight
  );
  ctx.bezierCurveTo(
    x - width / 2, y + (height + topCurveHeight) / 2,
    x, y + (height + topCurveHeight) / 2,
    x, y + height
  );
  ctx.bezierCurveTo(
    x, y + (height + topCurveHeight) / 2,
    x + width / 2, y + (height + topCurveHeight) / 2,
    x + width / 2, y + topCurveHeight
  );

  ctx.bezierCurveTo(
    x + width / 2, y,
    x, y,
    x, y + topCurveHeight
  );

  ctx.closePath();
}

async function createILoveImage(name) {
    const width = 1080;
    const height = 1080;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    const fontFace = '"Arial Rounded MT Bold", "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const firstLineY = height * 0.35;
    const heartSize = 350;

    ctx.fillStyle = 'black';
    ctx.font = `bold 300px ${fontFace}`;
    const iWidth = ctx.measureText('I').width;
    const iX = width / 2 - iWidth / 2 - heartSize / 1.5;
    ctx.fillText('I', iX, firstLineY);

    const heartX = iX + iWidth + heartSize / 1.5;
    const heartY = firstLineY - heartSize / 2;
    drawHeart(ctx, heartX, heartY, heartSize, heartSize);
    ctx.fillStyle = '#FF0000';
    ctx.fill();
    ctx.fillStyle = 'black';
    let fontSize = 280;
    ctx.font = `bold ${fontSize}px ${fontFace}`;
    const maxTextWidth = width * 0.9;
    
    while (ctx.measureText(name.toUpperCase()).width > maxTextWidth && fontSize > 40) {
        fontSize -= 10;
        ctx.font = `bold ${fontSize}px ${fontFace}`;
    }
    
    ctx.fillText(name.toUpperCase(), width / 2, height * 0.75);

    return canvas.toBuffer('image/jpeg');
}

const applicaEffetto = async (m, conn, tipoEffetto, usedPrefix, command) => {
    let who = m.quoted ? m.quoted.sender : m.mentionedJid?.[0] ? m.mentionedJid[0] : m.sender
    
    const messaggiHelp = {
        gay: `『 🏳️‍🌈 』 \`Rendi gay qualcuno\`\n\n*Esempio:* ${usedPrefix + command} @utente o quota un'immagine`,
        trans: `『 🏳️‍⚧️ 』 \`Rendi trans qualcuno\`\n\n*Esempio:* ${usedPrefix + command} @utente o quota un'immagine`,
        sborra: `『 💦 』 \`Sborricchia su qualcuno\`\n\n*Esempio:* ${usedPrefix + command} @utente o quota un'immagine`
    }
    
    if (!m.quoted && !who) return m.reply(messaggiHelp[tipoEffetto])

    try {
        let nomeUtente, bufferImmagine
        
        if (m.quoted?.mtype === 'imageMessage') {
            bufferImmagine = await m.quoted.download()
            if (!bufferImmagine || bufferImmagine.length === 0) throw new Error('Impossibile scaricare l\'immagine quotata')
            nomeUtente = await conn.getName(m.quoted.sender) || ''
        } else {
            let pp = await conn.profilePictureUrl(who, 'image').catch(() => { throw new Error('L\'utente non ha una foto profilo! ') })
            nomeUtente = await conn.getName(who) || ''
            let rispostaImmagine = await fetch(pp)
            if (!rispostaImmagine.ok) throw new Error(`Errore nel recupero della foto profilo: ${rispostaImmagine.statusText}`)
            bufferImmagine = await rispostaImmagine.arrayBuffer()
            if (!bufferImmagine || bufferImmagine.length === 0) throw new Error('Foto profilo non valida o vuota')
        }
        
        let bufferFinale = await applicaEffettiPride(bufferImmagine, tipoEffetto)
        
        const messaggi = { 
            gay: [
                `${nomeUtente} è diventato gay`,
                `${nomeUtente} è diventato gay o forse lo era gia`
            ],
            trans: [
                `${nomeUtente} ha cambiato più genere che Netflix categorie. E ogni volta meglio.`,
                `${nomeUtente} è così trans che pure mauro rosiello prende appunti.`
            ],
            sborra: [
                `${nomeUtente} è stato battezzato da un geyser... e non era acqua.`,
                `${nomeUtente} è più bagnato/a di una piscina pubblica in agosto. Ma con meno cloro e più figli...`,
                `${nomeUtente} ha preso uno schizzo così potente che ora ha bisogno di tergicristalli per gli occhi.`
            ]
        }

        let messaggioCasuale = messaggi[tipoEffetto][Math.floor(Math.random() * messaggi[tipoEffetto].length)]
        let didascalia = `*\`${messaggioCasuale}\`*`

        let retries = 3
        let delay = 1000
        while (retries > 0) {
            try {
                await conn.sendFile(m.chat, bufferFinale, `${tipoEffetto}.jpeg`, didascalia, m, false, { mentions: [who] })
                return
            } catch (sendError) {
                if (sendError.message.includes('rate-overlimit') && retries > 0) {
                    await new Promise(resolve => setTimeout(resolve, delay))
                    delay *= 2
                    retries--
                } else {
                    throw sendError
                }
            }
        }
        throw new Error('Superato il limite di richieste, riprova più tardi')
    } catch (e) {
        console.error(e);
        await m.reply(e.message || `${global.errore}`);
    }
}

async function applicaEffettiPride(bufferImmagine, tipoEffetto) {
    let img = await loadImage(bufferImmagine)
    
    let maxSize = 800
    if (img.width > maxSize || img.height > maxSize) {
        let scala = Math.min(maxSize / img.width, maxSize / img.height)
        let canvasTemp = createCanvas(img.width * scala, img.height * scala)
        let ctxTemp = canvasTemp.getContext('2d')
        ctxTemp.drawImage(img, 0, 0, img.width * scala, img.height * scala)
        img = await loadImage(canvasTemp.toBuffer())
    }
    
    let canvas = createCanvas(img.width, img.height)
    let ctx = canvas.getContext('2d')
    
    ctx.drawImage(img, 0, 0)
    
    const coloriPride = {
        gay: ['#E40303', '#FF8C00', '#FFED00', '#008563', '#409CFF', '#955ABE'],
        trans: ['#5BCEFA', '#F5A9B8', '#FFFFFF', '#F5A9B8', '#5BCEFA'],
        sborra: ['#FFFFFF', '#E6F3FF', '#F0F8FF']
    }
    
    let colori = coloriPride[tipoEffetto]
    
    if (tipoEffetto === 'sborra') {
        ctx.shadowColor = '#FFFFFF'
        ctx.shadowBlur = 15
        let numeroGocce = Math.min(25, Math.floor((img.width * img.height) / 15000) + 12)
        for (let i = 0; i < numeroGocce; i++) {
            let x = gaussianRandom(img.width / 2, img.width / 3.5)
            let y = gaussianRandom(img.height / 2, img.height / 3.5)
            let dimensione = Math.random() * 40 + 20
            disegnaGoccia(ctx, x, y, dimensione, colori)
        }
    } else if (tipoEffetto === 'gay' || tipoEffetto === 'trans') {
        ctx.globalAlpha = 0.45
        const stripeHeight = img.height / colori.length
        let gradient = ctx.createLinearGradient(0, 0, 0, img.height)
        colori.forEach((colore, index) => {
            gradient.addColorStop(index / colori.length, colore)
            gradient.addColorStop((index + 1) / colori.length, colore)
        })
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, img.width, img.height)
        ctx.globalCompositeOperation = 'overlay'
        ctx.drawImage(img, 0, 0)
    }
    
    ctx.globalAlpha = 1.0
    ctx.shadowBlur = 0
    ctx.globalCompositeOperation = 'source-over'
    return canvas.toBuffer('image/jpeg')
}

function gaussianRandom(mean, sigma) {
    let u = Math.random()
    let v = Math.random()
    let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
    return z * sigma + mean
}

function disegnaGoccia(ctx, x, y, dimensione, colori) {
    ctx.save()
    ctx.translate(x, y)
    
    let rotazione = (Math.random() - 0.5) * Math.PI / 3
    let scalaX = 1 + (Math.random() - 0.5) * 0.4
    let scalaY = 1 + (Math.random() - 0.5) * 0.4
    ctx.rotate(rotazione)
    ctx.scale(scalaX, scalaY)
    
    let raggioHalo = dimensione * 1.8
    let gradienteHalo = ctx.createRadialGradient(0, 0, dimensione * 0.3, 0, 0, raggioHalo)
    gradienteHalo.addColorStop(0, colori[0] + '99')
    gradienteHalo.addColorStop(0.5, colori[1] + '55')
    gradienteHalo.addColorStop(1, colori[0] + '00')
    ctx.globalAlpha = 0.4
    ctx.beginPath()
    ctx.arc(0, 0, raggioHalo, 0, Math.PI * 2)
    ctx.fillStyle = gradienteHalo
    ctx.fill()
    
    ctx.globalAlpha = 0.6
    ctx.beginPath()
    ctx.moveTo(0, -dimensione * 0.9)
    ctx.bezierCurveTo(dimensione * 0.7, -dimensione * 0.5, dimensione * 0.8, dimensione * 0.6, 0, dimensione * 0.9)
    ctx.bezierCurveTo(-dimensione * 0.8, dimensione * 0.6, -dimensione * 0.7, -dimensione * 0.5, 0, -dimensione * 0.9)
    ctx.closePath()
    
    let gradienteGoccia = ctx.createLinearGradient(0, -dimensione * 0.9, dimensione * 0.4, dimensione * 0.9)
    gradienteGoccia.addColorStop(0, colori[0] + 'FF')
    gradienteGoccia.addColorStop(0.5, colori[1] + 'DD')
    gradienteGoccia.addColorStop(1, colori[2] + 'BB')
    ctx.fillStyle = gradienteGoccia
    ctx.fill()
    
    ctx.globalAlpha = 0.5
    ctx.shadowBlur = 8
    let numeroGocceSecondarie = Math.floor(Math.random() * 8) + 10
    for (let i = 0; i < numeroGocceSecondarie; i++) {
        let angolo = Math.random() * Math.PI * 2
        let distanza = Math.random() * dimensione + dimensione * 0.7
        let dx = Math.cos(angolo) * distanza
        let dy = Math.sin(angolo) * distanza
        let raggio = Math.random() * 8 + 4
        let scalaEllisse = 1 + (Math.random() - 0.5) * 0.7
        
        ctx.save()
        ctx.translate(dx, dy)
        ctx.scale(scalaEllisse, 1 / scalaEllisse)
        ctx.beginPath()
        ctx.arc(0, 0, raggio, 0, Math.PI * 2)
        ctx.fillStyle = colori[1] + 'DD'
        ctx.fill()
        ctx.restore()
        
        if (Math.random() > 0.1) {
            let microDx = dx + (Math.random() * distanza * 0.6 - distanza * 0.3)
            let microDy = dy + (Math.random() * distanza * 0.6 - distanza * 0.3)
            let microRaggio = Math.random() * 5 + 1
            ctx.beginPath()
            ctx.arc(microDx, microDy, microRaggio, 0, Math.PI * 2)
            ctx.fill()
        }
    }
    
    if (Math.random() > 0.25) {
        ctx.globalAlpha = 0.4
        ctx.beginPath()
        let lunghezzaCoda = dimensione * (Math.random() * 1.5 + 0.9)
        let offsetX = (Math.random() - 0.5) * dimensione * 0.6
        let offsetY = -dimensione * 0.9 - lunghezzaCoda * 0.5
        ctx.moveTo(0, -dimensione * 0.9)
        ctx.bezierCurveTo(offsetX * 0.6, -dimensione * 0.9 - lunghezzaCoda * 0.3, offsetX, offsetY + Math.sin(Math.random() * Math.PI) * lunghezzaCoda * 0.25, offsetX * 0.9, -dimensione * 0.9 - lunghezzaCoda)
        ctx.lineWidth = dimensione * 0.3
        let gradienteCoda = ctx.createLinearGradient(0, -dimensione * 0.9, 0, -dimensione * 0.9 - lunghezzaCoda)
        gradienteCoda.addColorStop(0, colori[1] + 'DD')
        gradienteCoda.addColorStop(1, colori[2] + '22')
        ctx.strokeStyle = gradienteCoda
        ctx.stroke()
    }
    
    ctx.restore()
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
    const tipoEffetto = command.toLowerCase();

    if (['il', 'ilove'].includes(tipoEffetto)) {
        let name = '';
        
        if (m.mentionedJid && m.mentionedJid[0]) {
            name = await conn.getName(m.mentionedJid[0]);
        } else if (text) {
            name = text.trim();
        }

        if (!name) {
            return m.reply(`*Esempio:* ${usedPrefix + command} <nome> o @utente`);
        }

        try {
            const imageBuffer = await createILoveImage(name);
            await conn.sendFile(m.chat, imageBuffer, 'ilove.jpeg', ``, m);
        } catch (e) {
            console.error(e);
            await m.reply(`❌ Si è verificato un errore durante la creazione dell'immagine.`);
        }
    } else {
        await applicaEffetto(m, conn, tipoEffetto, usedPrefix, command);
    }
};

handler.help = ['gay', 'trans', 'sborra', 'ilove', 'il'];
handler.tags = ['giochi'];
handler.command = /^(gay|trans|sborra|il|ilove)$/i;

export default handler;