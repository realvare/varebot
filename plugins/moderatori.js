const fs = require("fs");
const path = require("path");

const modsPath = path.join(__dirname, "../data/mods.json");

function getMods() {
    return JSON.parse(fs.readFileSync(modsPath));
}

function saveMods(mods) {
    fs.writeFileSync(modsPath, JSON.stringify(mods, null, 2));
}

module.exports = {
    commands: [".addmod", ".removemod"],

    async execute(sock, msg, args, isAdmin) {
        const jid = msg.key.remoteJid;

        // solo admin veri possono aggiungere/rimuovere mod
        if (!isAdmin) {
            return sock.sendMessage(jid, { text: "❌ Solo gli admin possono usare questo comando." });
        }

        const mentioned =
            msg.message.extendedTextMessage?.contextInfo?.mentionedJid;

        if (!mentioned || mentioned.length === 0) {
            return sock.sendMessage(jid, { text: "❌ Tagga una persona." });
        }

        const target = mentioned[0];
        const mods = getMods();

        // ADD MOD
        if (msg.text.startsWith(".addmod")) {
            if (mods.includes(target)) {
                return sock.sendMessage(jid, { text: "⚠️ Questo utente è già mod." });
            }

            mods.push(target);
            saveMods(mods);

            return sock.sendMessage(jid, {
                text: "✅ Utente promosso a MOD (permessi admin del bot)."
            });
        }

        // REMOVE MOD
        if (msg.text.startsWith(".removemod")) {
            const index = mods.indexOf(target);
            if (index === -1) {
                return sock.sendMessage(jid, { text: "⚠️ Questo utente non è mod." });
            }

            mods.splice(index, 1);
            saveMods(mods);

            return sock.sendMessage(jid, {
                text: "❌ Permessi MOD rimossi."
            });
        }
    }
};
