let handler = async (m, { conn, usedPrefix, command }) => {
    try {
        const paypalCard = {
            image: { url: 'https://i.ibb.co/kVdFLyGL/sam.jpg' },
            title: `『 💰 』 *\`PAYPAL\`*`,
            body: `『 🤝 』 \`Supporta il progetto\`\n\nSe vuoi aiutare a mantenere il bot attivo, puoi fare una donazione tramite PayPal. Ogni contributo è molto apprezzato!\n\n💛 Anche piccole donazioni fanno la differenza`,
            footer: '',
            buttons: [
                {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: '💰 Dona con PayPal',
                        url: 'https://www.paypal.me/samakavare'
                    })
                },
                {
                    name: 'cta_copy',
                    buttonParamsJson: JSON.stringify({
                        display_text: '📋 Copia Link PayPal',
                        copy_code: 'https://www.paypal.me/samakavare'
                    })
                }
            ]
        }
        const amazonCard = {
            image: { url: 'https://i.ibb.co/gLL5mXts/death-note.jpg' },
            title: `『 🎁 』 *\`AMAZON GIFT CARD\`*`,
            body: `『 📧 』 \`Contatta su Instagram\`\n\nPuoi anche inviare un buono regalo Amazon contattandomi direttamente su Instagram. Sarò felice di riceverlo!\n\n🌟 Grazie per il tuo supporto`,
            footer: 'Opzione 2 di 2 - Amazon',
            buttons: [
                {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: '📱 Contatta su Instagram',
                        url: 'https://instagram.com/samakavare'
                    })
                },
                {
                    name: 'cta_copy',
                    buttonParamsJson: JSON.stringify({
                        display_text: '📋 Copia Username IG',
                        copy_code: '@samakavare'
                    })
                }
            ]
        }
        await conn.sendMessage(
            m.chat,
            {
                text: `ㅤ⋆｡˚『 ╭ \`𝘿𝙊𝙉𝘼𝙕𝙄𝙊𝙉𝙀\` ╯ 』˚｡⋆\n╭\n│ ➤ 『 🤝 』 \`Supporta il progetto:\` \n│ ➤  _*Aiuta a mantenere il bot attivo*_\n*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`,
                footer: 'vare ✧ bot',
                cards: [paypalCard, amazonCard]
            },
            { quoted: m }
        )
        await conn.reply(m.sender, '💛 Grazie per aver richiesto le info per supportare il bot! Conta tanto anche il pensiero, prometto di non spenderli tutti subito.', m);

    } catch (error) {
        console.error('Errore invio messaggio donazione:', error);
        let don = `
╭─━━━━━━━━━━─╮
         *🤝 DONAZIONE 🤝*
╰─━━━━━━━━━━─╯

\`Se vuoi supportare il progetto e aiutare a mantenere il bot attivo, puoi fare una donazione. Ogni contributo è molto apprezzato!\` 💛

▢ *PayPal*
- Link: *https://www.paypal.me/samakavare*

▢ *Amazon Buono Regalo*
- Invia il codice a instagram.com/samakavare 

> ogni donazione è ben accetta, anche se piccola
> Grazie per il tuo supporto!
`;

        try {
            await conn.sendMessage(m.chat, {
                image: { url: 'https://i.ibb.co/kVdFLyGL/sam.jpg' },
                caption: don.trim()
            }, { quoted: m });
            
            await conn.reply(m.sender, '💛 Grazie per aver richiesto le info per supportare il bot! Conta tanto anche il pensiero, prometto di non spenderli tutti subito.', m);
        } catch (fallbackError) {
            console.error('Errore anche nel fallback:', fallbackError);
            await conn.reply(m.chat, don + '\n\n💛 Grazie per aver richiesto le info per supportare il bot!', m);
        }
    }
}

handler.help = ['donare'];
handler.tags = ['main'];
handler.command = ['supportare', 'donare', 'donazione', 'paypal'];

export default handler;