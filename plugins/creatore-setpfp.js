import sharp from 'sharp';

let handler = async (m, { conn, isOwner, isROwner, usedPrefix, command }) => {
    if (!isOwner && !isROwner) return m.reply('❌ Solo il proprietario può usare questo comando!');
    if (!m.quoted || !m.quoted.mimetype || !m.quoted.mimetype.startsWith('image/')) {
        return m.reply(
`╭─🖼️ [ CAMBIA FOTO BOT ] 🖼️─╮
│ Rispondi a un messaggio che contiene un'immagine!
│
│ Esempio:
│ ${usedPrefix + command}
╰──────────────────────────╯`
        );
    }

    try {
        let user = conn.user.jid;
        let imageBuffer = await m.quoted.download();
        let resizedImage = await processImage(imageBuffer);

        await conn.updateProfilePicture(user, resizedImage);

        m.reply(
`╭─📸 [ FOTO BOT CAMBIATA ] 📸─╮
│ foto profilo aggiornata con successo!
╰─────────────────╯`
        );
    } catch (error) {
        console.error(error);
        return m.reply(
`╭─🖼️ [ ERRORE ] 🖼️─╮
│ Si è verificato un errore. Assicurati di rispondere a un'immagine valida e che il bot abbia i permessi.
╰────────────────────╯`
        );
    }
};

const processImage = async (buffer) => {
    const size = 720;
    
    // Usa Sharp per ridimensionare e croppare l'immagine
    const resizedBuffer = await sharp(buffer)
        .resize(size, size, {
            fit: 'cover',  // Equivale al cover() di Jimp
            position: 'center'  // Crop centrale
        })
        .jpeg({ quality: 85 })  // Converti in JPEG con qualità 85
        .toBuffer();
    
    return resizedBuffer;
};

handler.tags = ['creatore'];
handler.help = ['setpfp *<img>*'];
handler.command = ['setpfp', 'cambiafotobot'];
handler.owner = true;

export default handler;