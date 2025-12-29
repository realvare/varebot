import { createCanvas, loadImage } from 'canvas';

const DEFAULT_AVATAR_URL = 'https://i.ibb.co/jH0VpAv/default-avatar-profile-icon-of-social-media-user-vector.jpg';

function drawStrokedText(ctx, text, x, y) {
    ctx.save();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 8;
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(text, x, y);
    ctx.restore();
}

function generateThemedBackground(ctx, width, height, colors) {
    const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 1.5);
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(1, colors[1]);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Aggiunge delle "stelle" per un effetto più dinamico
    for (let i = 0; i < 100; i++) {
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.2})`;
        ctx.beginPath();
        ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 3 + 1, 0, Math.PI * 2);
        ctx.fill();
    }
}


async function generateMeterImage({ title, percentage, avatarUrl, description, themeColors }) {
    const width = 1080;
    const height = 1080;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Genera lo sfondo a tema
    generateThemedBackground(ctx, width, height, themeColors);

    // Carica solo l'avatar
    const avatar = await loadImage(avatarUrl).catch(() => loadImage(DEFAULT_AVATAR_URL));

    // Overlay scuro per leggibilità
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, width, height);

    // 2. Disegna il titolo
    ctx.font = 'bold 120px Impact, "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    drawStrokedText(ctx, title, width / 2, 50);

    // 3. Disegna l'avatar
    const avatarSize = 400;
    const avatarX = (width - avatarSize) / 2;
    const avatarY = 220;
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 10;
    ctx.stroke();

    // 4. Barra di progresso
    const barWidth = 800;
    const barHeight = 80;
    const barX = (width - barWidth) / 2;
    const barY = 700;

    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, 40);
    ctx.fill();

    if (percentage > 0) {
        const gradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
        gradient.addColorStop(0, themeColors[0]);
        gradient.addColorStop(1, themeColors[1]);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(barX, barY, (barWidth * percentage) / 100, barHeight, 40);
        ctx.fill();
    }

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, 40);
    ctx.stroke();

    ctx.font = 'bold 100px Impact, "Arial Black", sans-serif';
    drawStrokedText(ctx, `${percentage}%`, width / 2, 820);

    // 5. Descrizione
    ctx.font = 'normal 50px Arial, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(description, width / 2, 950);

    return canvas.toBuffer('image/jpeg');
}

const commandConfig = {
    gaymetro: {
        title: 'GAYMETRO',
        themeColors: ['#FF00FF', '#4a004a'],
        getDescription: (p) => {
            if (p < 50) return 'Sei più simpatico che gay!';
            if (p > 90) return 'Livelli di gayosità stratosferici!';
            return 'Ce lo aspettavamo tutti!';
        },
    },
    lesbiometro: {
        title: 'LESBIOMETRO',
        themeColors: ['#FF69B4', '#c71585'],
        getDescription: (p) => {
            if (p < 50) return 'Forse non hai visto abbastanza film romantici.';
            if (p > 90) return 'Un amore smisurato per le ragazze!';
            return 'Assolutamente confermato!';
        },
    },
    masturbometro: {
        title: 'MASTURBOMETRO',
        themeColors: ['#8E44AD', '#E74C3C'],
        getDescription: (p) => {
            if (p < 50) return 'Hai bisogno di più hobby, amico.';
            if (p > 90) return 'Una resistenza da vero campione!';
            return 'Continua così (in solitaria)!';
        },
    },
    fortunometro: {
        title: 'FORTUNOMETRO',
        themeColors: ['#2ECC71', '#006400'],
        getDescription: (p) => {
            if (p < 50) return 'Oggi la fortuna non è dalla tua parte.';
            if (p > 90) return 'Sei stato baciato dalla dea bendata!';
            return 'Potrebbe essere il tuo giorno fortunato!';
        },
    },
    intelligiometro: {
        title: 'INTELLIGIOMETRO',
        themeColors: ['#3498DB', '#00008b'],
        getDescription: (p) => {
            if (p < 50) return 'C\'è ancora margine di miglioramento...';
            if (p > 90) return 'Sei un genio assoluto!';
            return 'Un\'intelligenza sopra la media!';
        },
    },
    bellometro: {
        title: 'BELLOMETRO',
        themeColors: ['#E74C3C', '#f39c12'],
        getDescription: (p) => {
            if (p < 50) return 'La bellezza è soggettiva, ricorda!';
            if (p > 90) return 'Una bellezza da copertina!';
            return 'Sei quasi come sam!';
        },
    },
};

const handler = async (m, { conn, command, text }) => {
    const config = commandConfig[command];
    if (!config) return;

    const targetUser = m.mentionedJid?.[0] || m.quoted?.sender || m.sender;
    const targetName = text.trim() || conn.getName(targetUser);
    
    if (!targetName) {
        return conn.reply(m.chat, `💜 Per usare il comando, menziona un utente, rispondi a un messaggio o scrivi un nome.`, m);
    }

    const percentage = Math.floor(Math.random() * 101);
    const description = config.getDescription(percentage);

    try {
        await conn.reply(m.chat, `\`Calcolo in corso per ${targetName}...\``, m);

        const avatar = await conn.profilePictureUrl(targetUser, 'image').catch(() => DEFAULT_AVATAR_URL);

        const imageBuffer = await generateMeterImage({
            title: config.title,
            percentage: percentage,
            avatarUrl: avatar,
            description: description,
            themeColors: config.themeColors,
        });

        const caption = `💫 *Ecco il risultato per ${targetName}!*`;

        await conn.sendMessage(m.chat, {
            image: imageBuffer,
            caption: caption,
            mentions: [targetUser]
        }, { quoted: m });

    } catch (e) {
        console.error(e);
        await conn.reply(m.chat, `${global.errore}`, m);
    }
};

handler.help = Object.keys(commandConfig).map(cmd => `${cmd} <@tag/nome>`);//o forse era meglio fare tutto a mano
handler.tags = ['giochi'];
handler.register = true;
handler.group = true;
handler.command = Object.keys(commandConfig);

export default handler;