module.exports = {
    command: "tiamo",
    async execute(sock, msg) {
        const jid = msg.key.remoteJid;

        const risposta = "puoi amare tutti tranne blood. lui appartiene a velith.😈";

        await sock.sendMessage(jid, { text: risposta });
    }
};
