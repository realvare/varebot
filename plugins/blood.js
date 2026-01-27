module.exports = {
    command: ".blood",
    async execute(sock, msg) {
        const jid = msg.key.remoteJid;

        const risposta =
            "blood è il catanese più simpatico delle comm, ma non lo irritate seno partono i doxx dove vi prende pure i peli del culo.";

        await sock.sendMessage(jid, { text: risposta });
    }
};
