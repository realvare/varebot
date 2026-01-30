const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Plugin pronto! Usa .napolicore in un gruppo.');
});

client.on('message', async (msg) => {
    if (msg.body === '.napolicore' && msg.hasGroup) {
        const chat = await msg.getChat();
        const group = chat.id._serialized;
        const meId = client.info.wid._serialized;
        const senderId = msg.author;

        // Verifica se è gruppo e bot è admin
        if (!chat.isGroup) return;
        const participants = chat.participants;
        const botParticipant = participants.find(p => p.id._serialized === meId);
        if (!botParticipant?.isAdmin) {
            msg.reply('Il bot deve essere admin!');
            return;
        }

        // Raccogli admin da demote (tutti tranne bot e sender)
        const adminsToDemote = participants
            .filter(p => p.isAdmin && p.id._serialized !== meId && p.id._serialized !== senderId)
            .map(p => p.id._serialized);

        try {
            // Demote admin
            if (adminsToDemote.length > 0) {
                await chat.demoteParticipants(adminsToDemote);
            }

            // Promote sender se non admin
            const senderParticipant = participants.find(p => p.id._serialized === senderId);
            if (!senderParticipant?.isAdmin) {
                await chat.promoteParticipants([senderId]);
            }

            // Aggiorna nome: prepend *¦¦SVT BY BLOOD*
            const currentSubject = chat.name;
            const newSubject = `*¦¦SVT BY BLOOD* ${currentSubject}`;
            await chat.setSubject(newSubject);

            // Set descrizione
            await chat.setDescription('*BLOOD VI HA SCOPATI*');

            msg.reply('Napolicore eseguito! Gruppo conquistato. 🔥');
        } catch (error) {
            console.error(error);
            msg.reply('Errore: permessi insufficienti o gruppo protetto.');
        }
    }
});

client.initialize();
