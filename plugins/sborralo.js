// plugin-sborralo.js
// Salva questo come file plugin nel tuo bot WZ e lo carica automaticamente

const fs = require('fs');
const path = require('path');

async function sborralo(conn, m, command) {
    const messages = [
        "*o succhia più forte che sto GODENDO cazzo*🥵",
        "*porcatroia che brava troietta sto vedendo le stelle* 😏",
        "*oddio sto quasi per venire cazzo apri questa fottuta bocca di merda*🫦",
        "*PREPARATI TROIA BLOOD C'È QUASI*",
        "ohh o mio dio madonna sto godendo continua ti prego che Blood ti sta sborrando ovunque ti ha letteralmente sbiancata💦💦"
    ];

    for (let i = 0; i < messages.length; i++) {
        setTimeout(async () => {
            await conn.sendMessage(m.chat, { text: messages[i] }, { quoted: m });
        }, i * 1500); // 1.5 secondi tra ogni messaggio per non floodare troppo
    }

    return; // Non rispondere con altro
}

module.exports = {
    name: 'sborralo',
    command: ['sborralo'],
    execute: sborralo,
    isOwner: false, // Chiunque può usarlo
    isGroup: true, // Funziona solo in gruppi? Cambia in false se vuoi anche in PM
};
