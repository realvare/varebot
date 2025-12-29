const emojicategoria = {
  info: '⁉️',
  main: '🦋'
}

let tags = {
  'main': '╭ *`𝐌𝐀𝐈𝐍`* ╯',
  'info': '╭ *`𝐈𝐍𝐅𝐎`* ╯'
}

const defaultMenu = {
  before: `╭⭒─ׄ─⊱ *𝐌𝐄𝐍𝐔 - 𝐁𝐎𝐓* ⊰
✦ 👤 \`Utente:\` *%name*
✧ 🪐 \`Attivo da:\` *%uptime*
✦ 💫 \`Utenti:\` *%totalreg*
╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒\n
`.trimStart(),
  header: '      ⋆｡˚『 %category 』˚｡⋆\n╭',
  body: '*│ ➤* 『%emoji』%cmd',
  footer: '*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*\n',
  after: ``,
}
const MENU_IMAGE_URL = 'https://i.ibb.co/hJW7WwxV/varebot.jpg';

function detectDevice(msgID) {
  if (!msgID) {
    return 'unknown';
  } else if (/^[a-zA-Z]+-[a-fA-F0-9]+$/.test(msgID)) {
    return 'bot';
  } else if (msgID.startsWith('false_') || msgID.startsWith('true_')) {
    return 'web';
  } else if (msgID.startsWith('3EB0') && /^[A-Z0-9]+$/.test(msgID)) {
    return 'web';
  } else if (msgID.includes(':')) {
    return 'desktop';
  } else if (/^[A-F0-9]{32}$/i.test(msgID)) {
    return 'android';
  } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(msgID)) {
    return 'ios';
  } else if (/^[A-Z0-9]{20,25}$/i.test(msgID) && !msgID.startsWith('3EB0')) {
    return 'ios';
  } else {
    return 'unknown';
  }
}

function getRandomMenus() {
  const allMenus = [
    { title: "🤖 Menu IA", description: "Intelligenza Artificiale", command: "menuia" },
    { title: "⭐ Menu Premium", description: "Funzionalità Premium", command: "menupremium" },
    { title: "🛠️ Menu Strumenti", description: "Utilità e tools", command: "menustrumenti" },
    { title: "💰 Menu Euro", description: "Sistema economico", command: "menueuro" },
    { title: "🎮 Menu Giochi", description: "Games e divertimento", command: "menugiochi" },
    { title: "👥 Menu Gruppo", description: "Gestione gruppi", command: "menugruppo" },
    { title: "🔍 Menu Ricerche", description: "Ricerca online", command: "menuricerche" },
    { title: "📥 Menu Download", description: "Scarica contenuti", command: "menudownload" },
    { title: "👨‍💻 Menu Creatore", description: "Comandi owner", command: "menucreatore" }
  ];
  const shuffled = allMenus.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 5);
}

let handler = async (m, { conn, usedPrefix: _p, __dirname }) => {
  try {
    let name = await conn.getName(m.sender) || 'Utente';
    let _uptime = process.uptime() * 1000;
    let uptime = clockString(_uptime);
    let totalreg = Object.keys(global.db.data.users).length;
    
    let help = Object.values(global.plugins).filter(plugin => !plugin.disabled).map(plugin => {
      return {
        help: Array.isArray(plugin.tags) ? plugin.help : [plugin.help],
        tags: Array.isArray(plugin.tags) ? plugin.tags : [plugin.tags],
        prefix: 'customPrefix' in plugin,
      };
    });
    
    let menuTags = Object.keys(tags);
    let _text = [
      defaultMenu.before,
      ...menuTags.map(tag => {
        return defaultMenu.header.replace(/%category/g, tags[tag]) + '\n' + [
          ...help.filter(menu => menu.tags && menu.tags.includes(tag) && menu.help).map(menu => {
            return menu.help.map(help => {
              return defaultMenu.body
                .replace(/%cmd/g, menu.prefix ? help : '%p' + help)
                .replace(/%emoji/g, emojicategoria[tag] || '❔')
                .trim();
            }).join('\n');
          }),
          defaultMenu.footer
        ].join('\n');
      }),
      defaultMenu.after
    ].join('\n');
    
    let replace = {
      '%': '%',
      p: _p,
      uptime: uptime,
      name: name,
      totalreg: totalreg,
    };
    
    let text = _text.replace(new RegExp(`%(${Object.keys(replace).sort((a, b) => b.length - a.length).join`|`})`, 'g'), (_, name) => '' + replace[name]);
    const msgID = m.id || m.key?.id;
    const deviceType = detectDevice(msgID);
    const isGroup = m.chat.endsWith('@g.us');
    
    if (deviceType === 'ios') {
      const randomMenus = getRandomMenus();
      const buttons = randomMenus.map(menu => ({
        buttonId: _p + menu.command,
        buttonText: { displayText: menu.title },
        type: 1
      }));

      const buttonMessage = {
        image: { url: MENU_IMAGE_URL },
        caption: text.trim(),
        footer: "",
        buttons: buttons,
        headerType: 4
      };

      await conn.sendMessage(m.chat, buttonMessage, { quoted: m });
      
    } else {
      if (isGroup) {
        const sections = [
          {
            title: "⭐ Menu Consigliati ⭐",
            highlight_label: "CONSIGLIATO",
            rows: [
              {
                header: "『 🤖 』",
                title: "Menu IA",
                description: "Intelligenza Artificiale",
                id: _p + "menuia"
              },
              {
                header: "『 ⭐』",
                title: "Menu Premium",
                description: "Funzionalità Premium",
                id: _p + "menupremium"
              }
            ]
          },
          {
            title: "Menu Standard",
            highlight_label: "STANDARD",
            rows: [
              {
                header: "『 🛠️ 』",
                title: "Menu Strumenti",
                description: "Utilità e tools",
                id: _p + "menustrumenti"
              },
              {
                header: "『 💰 』",
                title: "Menu Euro",
                description: "Sistema economico",
                id: _p + "menueuro"
              },
              {
                header: "『 🎮 』",
                title: "Menu Giochi",
                description: "Games e divertimento",
                id: _p + "menugiochi"
              },
              {
                header: "『 👥 』",
                title: "Menu Gruppo",
                description: "Gestione gruppi",
                id: _p + "menugruppo"
              },
              {
                header: "『 🔍 』",
                title: "Menu Ricerche",
                description: "Ricerca online",
                id: _p + "menuricerche"
              },
              {
                header: "『 📥 』",
                title: "Menu Download",
                description: "Scarica contenuti",
                id: _p + "menudownload"
              },
              {
                header: "『 👨‍💻 』",
                title: "Menu Creatore",
                description: "Comandi owner",
                id: _p + "menucreatore"
              }
            ]
          }
        ];
        await conn.sendList(
          m.chat, 
          ``,
          text.trim(),
          "📋 Menu disponibili",
          MENU_IMAGE_URL,
          sections,
          m
        );
        
      } else {
        const sections = [
          {
            title: "⭐ Menu Consigliati ⭐",
            rows: [
              { title: "🤖 Menu IA", description: "Intelligenza Artificiale", rowId: _p + "menuia", highlight: true },
              { title: "⭐ Menu Premium", description: "Funzionalità Premium", rowId: _p + "menupremium", highlight: true }
            ]
          },
          {
            title: "Menu Standard",
            rows: [
              { title: "🛠️ Menu Strumenti", description: "Utilità e tools", rowId: _p + "menustrumenti" },
              { title: "💰 Menu Euro", description: "Sistema economico", rowId: _p + "menueuro" },
              { title: "🎮 Menu Giochi", description: "Giochi e divertimento", rowId: _p + "menugiochi" },
              { title: "👥 Menu Gruppo", description: "Gestione gruppi", rowId: _p + "menugruppo" },
              { title: "🔍 Menu Ricerche", description: "Ricerca online", rowId: _p + "menuricerche" },
              { title: "📥 Menu Download", description: "Scarica contenuti", rowId: _p + "menudownload" },
              { title: "👨‍💻 Menu Creatore", description: "Comandi owner", rowId: _p + "menucreatore" }
            ]
          }
        ];
        const sendListSections = sections.map(section => ({
          title: section.title,
          rows: section.rows.map(row => ({
            header: row.title.split(' ')[0],
            title: row.title,
            description: row.description,
            id: row.rowId
          }))
        }));
        await conn.sendList(
          m.chat, 
          ``,
          text.trim(),
          "📋 Menu disponibili",
          MENU_IMAGE_URL,
          sendListSections,
          m
        );
      }
    }

  } catch (e) {
    console.error(e)
    conn.reply(m.chat, `${global.errore}`, m)
  }
};

handler.help = ['menu'];
handler.command = ['menu', 'menuall', 'menucompleto', 'funzioni','comandi', 'help'];
export default handler;

function clockString(ms) {
  let h = Math.floor(ms / 3600000);
  let m = Math.floor(ms / 60000) % 60;
  let s = Math.floor(ms / 1000) % 60;
  return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':');
}