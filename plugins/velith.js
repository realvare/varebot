module.exports = {
    command: ".velith",
    async execute(sock, msg) {
        const jid = msg.key.remoteJid;

        const testo = "velith è la moglie di blood, intoccabile impossibile avvicinarsi. parlagli male e blood ti fara il peggio.";

        await sock.sendMessage(jid, { text: testo });
    }
};
