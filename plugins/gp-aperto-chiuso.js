var handler = async (m, { conn, args, usedPrefix, command }) => {
    // Determina quale comando è stato usato
    let rawCommand;
    
    // Se c'è un argomento, usa quello (per .gruppo aperto/chiuso)
    if (args[0]) {
        rawCommand = args[0].toLowerCase();
    } else {
        rawCommand = command.toLowerCase();
    }
    const actionCommand = {
        'chiudi': 'chiuso',
        'apri': 'aperto',
        'chiuso': 'chiuso',
        'aperto': 'aperto'
    }[rawCommand];
    
    const isClose = {
        'aperto': 'not_announcement',
        'chiuso': 'announcement',
        'apri': 'not_announcement',
        'chiudi': 'announcement',
    }[actionCommand];

    if (isClose === undefined) {
        const buttons = [
            {
                buttonId: `${usedPrefix}apri`,
                buttonText: { displayText: '🔓 APRI GRUPPO' },
                type: 1
            },
            {
                buttonId: `${usedPrefix}chiudi`,
                buttonText: { displayText: '🔒 CHIUDI GRUPPO' },
                type: 1
            }
        ];

        const buttonMessage = {
            text: `⚙️ *Gestione Gruppo*\n\n` +
                  `*Comandi disponibili:*\n` +
                  `○ *${usedPrefix}aperto* - Apri il gruppo\n` +
                  `○ *${usedPrefix}chiuso* - Chiudi il gruppo\n` +
                  `○ *${usedPrefix}apri* - Apri il gruppo\n` +
                  `○ *${usedPrefix}chiudi* - Chiudi il gruppo\n\n` +
                  `*Oppure usa i bottoni qui sotto:*`,
            buttons: buttons,
            headerType: 1
        };

        return conn.sendMessage(m.chat, buttonMessage, { quoted: m });
    }

    // Esegui l'azione
    await conn.groupSettingUpdate(m.chat, isClose);
    
    // Messaggio di conferma con bottoni per cambiare stato
    const oppositeCommand = actionCommand === 'aperto' || actionCommand === 'apri' ? 'chiudi' : 'apri';
    
    const toggleButtons = [
        {
            buttonId: `${usedPrefix}${oppositeCommand}`,
            buttonText: { 
                displayText: oppositeCommand === 'apri' ? '🔓 APRI GRUPPO' : '🔒 CHIUDI GRUPPO' 
            },
            type: 1
        }
    ];

    const confirmMessage = {
        text: `✅ *Il gruppo è stato ${actionCommand} con successo.*\n\n` +
              `*Stato attuale:* ${actionCommand === 'aperto' || actionCommand === 'apri' ? '🔓 Aperto' : '🔒 Chiuso'}`,
        buttons: toggleButtons,
        headerType: 1,
        contextInfo: global.fake
    };

    conn.sendMessage(m.chat, confirmMessage, { quoted: m });
};

handler.help = ['aperto/chiuso', 'apri/chiudi'];
handler.tags = ['gruppo'];
handler.command = /^(aperto|chiuso|apri|chiudi)$/i;
handler.admin = true;
handler.botAdmin = true;

export default handler;