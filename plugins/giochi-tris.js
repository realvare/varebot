import { createCanvas, loadImage } from 'canvas';

class TrisGame {
    constructor(p1, p2) {
        this.p1 = p1;
        this.p2 = p2;
        this.board = Array(9).fill(null);
        this.turn = p1;
        this.isFinished = false;
        this.winningLine = null;
    }

    move(pos) {
        if (pos < 0 || pos > 8 || this.board[pos] || this.isFinished) {
            return false;
        }
        this.board[pos] = this.turn === this.p1 ? 'X' : 'O';
        this.turn = this.turn === this.p1 ? this.p2 : this.p1;
        return true;
    }

    checkWin() {
        const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];
        for (let pattern of winPatterns) {
            const [a, b, c] = pattern;
            if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
                return { winner: this.board[a], line: pattern };
            }
        }
        if (!this.board.includes(null)) {
            return { winner: 'draw', line: null };
        }
        return null;
    }
}

const games = new Map();
const timeoutMap = new Map();
const playerStats = new Map();

const getNameFromJid = jid => jid.split('@')[0];

const getSafeName = async (conn, jid) => {
    try {
        const name = await Promise.resolve(conn.getName ? conn.getName(jid) : null);
        if (typeof name === 'string' && name) return name;
    } catch {}
    return getNameFromJid(jid);
};

const updatePlayerStats = (jid, won = false, played = true) => {
    if (!playerStats.has(jid)) {
        playerStats.set(jid, { wins: 0, games: 0, streak: 0 });
    }
    const stats = playerStats.get(jid);
    if (played) stats.games++;
    if (won) {
        stats.wins++;
        stats.streak++;
    } else if (played) {
        stats.streak = 0;
    }
};

const getPlayerStats = (jid) => {
    return playerStats.get(jid) || { wins: 0, games: 0, streak: 0 };
};

const getVictoryMessage = (winner, loser) => {
    const messages = [
        `🏆 ${winner} ha distrutto ${loser}!`,
    ];
    return messages[Math.floor(Math.random() * messages.length)];
};

const createPlaceholderImage = (size) => {
    const placeholder = createCanvas(size, size);
    const ctx = placeholder.getContext('2d');
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, '#667eea');
    grad.addColorStop(1, '#764ba2');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, size, size);
    ctx.fillStyle = '#ffffff';
    ctx.font = `${size / 3}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👤', size / 2, size / 2);
    return placeholder;
};

const countRemainingPositions = (board) => {
    return board.filter(cell => !cell).length;
};

const drawX = (ctx, x, y, size, color) => {
    const padding = size * 0.25;
    const lineWidth = size * 0.12;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.beginPath();
    ctx.moveTo(x + padding, y + padding);
    ctx.lineTo(x + size - padding, y + size - padding);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + size - padding, y + padding);
    ctx.lineTo(x + padding, y + size - padding);
    ctx.stroke();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
};
const drawO = (ctx, x, y, size, color) => {
    const radius = size * 0.35;
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    const lineWidth = size * 0.12;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
};
async function renderBoard(title, p1, p2, game, status, p1PicUrl, p2PicUrl, showHelp = false) {
    const canvas = createCanvas(600, 600);
    const ctx = canvas.getContext('2d');
    const boardArr = game.board;
    const turn = game.turn;
    const bgGrad = ctx.createLinearGradient(0, 0, 600, 600);
    bgGrad.addColorStop(0, '#0f0f23');
    bgGrad.addColorStop(0.3, '#1a1a2e');
    bgGrad.addColorStop(0.7, '#16213e');
    bgGrad.addColorStop(1, '#0f3460');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let i = 0; i < 20; i++) {
        for (let j = 0; j < 20; j++) {
            if ((i + j) % 2 === 0) {
                ctx.fillRect(i * 30, j * 30, 15, 15);
            }
        }
    }

    const fallbackPic = 'https://i.ibb.co/BKHtdBNp/default-avatar-profile-icon-1280x1280.jpg';
    let p1Img, p2Img;
    try {
        p1Img = await loadImage(p1PicUrl || fallbackPic);
    } catch (e) {
        p1Img = createPlaceholderImage(100);
    }
    try {
        p2Img = await loadImage(p2PicUrl || fallbackPic);
    } catch (e) {
        p2Img = createPlaceholderImage(100);
    }

    const p1Color = '#ff4757';
    const p2Color = '#3742fa';
    const vsContainerY = 20;
    const vsContainerHeight = 140;
    const vsContainerX = 30;
    const vsContainerWidth = canvas.width - 60;

    ctx.save();
    ctx.filter = 'blur(4px)';
    const grad = ctx.createLinearGradient(0, vsContainerY, 0, vsContainerY + vsContainerHeight);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(vsContainerX, vsContainerY, vsContainerWidth, vsContainerHeight, 25);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(vsContainerX, vsContainerY, vsContainerWidth, vsContainerHeight, 25);
    ctx.stroke();

    const drawCircularImageWithSymbol = (img, x, y, r, color, isTurn, symbol) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r / 2, 0, Math.PI * 2, true);
        ctx.clip();
        ctx.drawImage(img, x - r / 2, y - r / 2, r, r);
        ctx.restore();
        ctx.beginPath();
        ctx.arc(x, y, r / 2 + 2, 0, Math.PI * 2, true);
        if (isTurn && !game.isFinished) {
            ctx.strokeStyle = color;
            ctx.lineWidth = 4;
            ctx.shadowColor = color;
            ctx.shadowBlur = 20;
            ctx.stroke();
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
        } else {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
        const nameY = vsContainerY + vsContainerHeight - 15;
        if (symbol === 'X') {
            drawX(ctx, x - 15, nameY - 10, 25, color);
        } else {
            drawO(ctx, x - 15, nameY - 10, 25, color);
        }
    };

    const p1ImgX = vsContainerX + 90;
    const p1ImgY = vsContainerY + vsContainerHeight / 2 - 10;
    drawCircularImageWithSymbol(p1Img, p1ImgX, p1ImgY, 80, p1Color, turn === game.p1, 'X');

    const p2ImgX = vsContainerX + vsContainerWidth - 90;
    const p2ImgY = vsContainerY + vsContainerHeight / 2 - 10;
    drawCircularImageWithSymbol(p2Img, p2ImgX, p2ImgY, 80, p2Color, turn === game.p2, 'O');
    ctx.font = 'bold 48px "Bungee", "Impact", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 10;
    ctx.fillText('CONTRO', canvas.width / 2, vsContainerY + vsContainerHeight / 2 - 15);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.font = 'bold 18px "Orbitron", "Arial", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(p1.substring(0, 12) + (p1.length > 12 ? '...' : ''), p1ImgX, vsContainerY + vsContainerHeight - 15);
    ctx.fillText(p2.substring(0, 12) + (p2.length > 12 ? '...' : ''), p2ImgX, vsContainerY + vsContainerHeight - 15);
    const cellSize = 120;
    const boardWidth = cellSize * 3;
    const offsetX = (canvas.width - boardWidth) / 2;
    const offsetY = 200;
    const boardGradient = ctx.createRadialGradient(
        offsetX + cellSize * 1.5, offsetY + cellSize * 1.5, 0,
        offsetX + cellSize * 1.5, offsetY + cellSize * 1.5, cellSize * 2
    );
    boardGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    boardGradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
    ctx.fillStyle = boardGradient;
    ctx.beginPath();
    ctx.roundRect(offsetX - 20, offsetY - 20, cellSize * 3 + 40, cellSize * 3 + 40, 25);
    ctx.fill();
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 20;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(offsetX - 20, offsetY - 20, cellSize * 3 + 40, cellSize * 3 + 40, 25);
    ctx.stroke();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    for (let i = 1; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(offsetX + i * cellSize, offsetY);
        ctx.lineTo(offsetX + i * cellSize, offsetY + 3 * cellSize);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY + i * cellSize);
        ctx.lineTo(offsetX + 3 * cellSize, offsetY + i * cellSize);
        ctx.stroke();
    }

    const remainingPositions = countRemainingPositions(boardArr);
    const showButtons = remainingPositions <= 5 && remainingPositions > 0 && !game.isFinished;

    const drawButton = (number, centerX, centerY) => {
        const buttonSize = 50;
        const btnGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, buttonSize / 2);
        btnGrad.addColorStop(0, 'rgba(102, 126, 234, 0.8)');
        btnGrad.addColorStop(1, 'rgba(118, 75, 162, 0.8)');
        ctx.fillStyle = btnGrad;
        ctx.beginPath();
        ctx.roundRect(centerX - buttonSize / 2, centerY - buttonSize / 2, buttonSize, buttonSize, 15);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#667eea';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.roundRect(centerX - buttonSize / 2, centerY - buttonSize / 2, buttonSize, buttonSize, 15);
        ctx.stroke();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 5;
        ctx.fillText(number.toString(), centerX, centerY);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        return { number, x: centerX - buttonSize / 2, y: centerY - buttonSize / 2, width: buttonSize, height: buttonSize };
    };

    let buttons = [];
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 9; i++) {
        const symbol = boardArr[i];
        const x = i % 3;
        const y = Math.floor(i / 3);
        const centerX = offsetX + x * cellSize + cellSize / 2;
        const centerY = offsetY + y * cellSize + cellSize / 2;
        if (symbol) {
            if (symbol === 'X') {
                drawX(ctx, offsetX + x * cellSize, offsetY + y * cellSize, cellSize, p1Color);
            } else {
                drawO(ctx, offsetX + x * cellSize, offsetY + y * cellSize, cellSize, p2Color);
            }
        } else if (showButtons) {
            buttons.push(drawButton(i + 1, centerX, centerY));
        } else if (showHelp) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.font = 'bold 28px Arial';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
            ctx.shadowBlur = 5;
            ctx.fillText((i + 1).toString(), centerX, centerY);
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
        }
    }
    if (game.isFinished && game.winningLine) {
        const line = game.winningLine;
        const startCell = line[0];
        const endCell = line[2];
        const startX = offsetX + (startCell % 3) * cellSize + cellSize / 2;
        const startY = offsetY + Math.floor(startCell / 3) * cellSize + cellSize / 2;
        const endX = offsetX + (endCell % 3) * cellSize + cellSize / 2;
        const endY = offsetY + Math.floor(endCell / 3) * cellSize + cellSize / 2;
        const winnerSymbol = boardArr[startCell];
        const winnerColor = winnerSymbol === 'X' ? p1Color : p2Color;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = winnerColor;
        ctx.lineWidth = 30;
        ctx.lineCap = 'round';
        ctx.shadowColor = winnerColor;
        ctx.shadowBlur = 40;
        ctx.globalAlpha = 0.4;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 12;
        ctx.globalAlpha = 0.9;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = winnerColor;
        ctx.lineWidth = 6;
        ctx.globalAlpha = 1;
        ctx.stroke();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }

    return { buffer: canvas.toBuffer(), buttons: showButtons ? buttons : [] };
}

const sendGameMessage = async (conn, chat, game, status, isFirstMessage = false) => {
    const p1Name = await getSafeName(conn, game.p1);
    const p2Name = await getSafeName(conn, game.p2);
    const p1Pic = await conn.profilePictureUrl(game.p1, 'image').catch(() => null);
    const p2Pic = await conn.profilePictureUrl(game.p2, 'image').catch(() => null);

    const { buffer, buttons } = await renderBoard(
        game.isFinished ? '🏆 PARTITA TERMINATA' : '🎮 PARTITA IN CORSO',
        p1Name,
        p2Name,
        game,
        status,
        p1Pic,
        p2Pic,
        isFirstMessage
    );

    let movesGuide = '';
    if (isFirstMessage) {
        movesGuide += `『 🎯 』 *\`Rispondi con un numero da 1 a 9\`*\n`;
    }

    if (!game.isFinished) {
        const currentPlayerName = await getSafeName(conn, game.turn);
        const remainingMoves = countRemainingPositions(game.board);
        movesGuide += `『 🔄 』 *\`Turno di:\`* *${currentPlayerName}*\n`;
        movesGuide += `『 ⏱️ 』 *\`Mosse rimanenti:\`* *${remainingMoves}*\n\n`;
        if (buttons.length > 0) {
            movesGuide += `『 🖱️ 』 *Usa i bottoni o rispondi con un numero!*\n`;
        }
    }

    movesGuide += `『 👥 』 *Giocatori:*\n` +
        `- ❌ *${p1Name} (Rosso)*\n` +
        `- ⭕ *${p2Name} (Blu)*\n\n` +
        `『 ⏰ 』 \`Hai 45 secondi per mossa\``;

    if (buttons.length > 0) {
        const interactiveButtons = buttons.map(btn => ({
            buttonId: `tris_move_${btn.number}`,
            buttonText: { displayText: btn.number.toString() },
            type: 1
        }));
        await conn.sendMessage(chat, {
            image: buffer,
            caption: movesGuide,
            mentions: [game.p1, game.p2],
            footer: '\`vare ✧ bot\`',
            buttons: interactiveButtons,
            headerType: 4
        });
    } else {
        await conn.sendMessage(chat, {
            image: buffer,
            caption: movesGuide,
            mentions: [game.p1, game.p2]
        });
    }
};

let handler = async (m, { conn }) => {
    const { chat, sender, mentionedJid, quoted } = m;
    let opponent;
    if (mentionedJid?.length > 0) {
        opponent = mentionedJid[0];
    } else if (quoted) {
        opponent = quoted.sender;
    } else {
        return m.reply('❌ *Nessun avversario trovato!*\n\n💡 *Come si gioca:*\n• *.tris @utente* (menziona un avversario)\n• *.tris* (rispondendo a un messaggio)');
    }

    if (opponent === sender) return m.reply('『 ❌ 』 \`Non puoi sfidare te stesso!\`');
    if (opponent === conn.user.jid) return m.reply('『 ❌ 』 *\`Il bot non può giocare!\`*\n> One day potrai farlo');
    if (games.has(chat)) return m.reply('『 ⚠️ 』 \`Partita già in corso!, aspetta che finisca la partita corrente!\`');

    const game = new TrisGame(sender, opponent);
    games.set(chat, game);
    await sendGameMessage(conn, chat, game, `🔄 È il turno di: ${await getSafeName(conn, sender)}`, true);

    clearTimeout(timeoutMap.get(chat));
    timeoutMap.set(chat, setTimeout(async () => {
        if (games.has(chat) && !games.get(chat).isFinished) {
            const currentGame = games.get(chat);
            const loser = currentGame.turn;
            const winner = loser === currentGame.p1 ? currentGame.p2 : currentGame.p1;
            updatePlayerStats(loser, false, true);
            updatePlayerStats(winner, true, true);
            games.delete(chat);
            conn.sendMessage(chat, {
                text: `『 ⏰ 』 *TEMPO SCADUTO!*\n\n` +
                    `『 💥 』 ${await getSafeName(conn, loser)} ha perso per forfait!\n` +
                    `『 🏆 』 Vittoria per ${await getSafeName(conn, winner)}!\n\n`,
                mentions: [loser, winner]
            });
        }
    }, 45000));
};

handler.before = async (m, { conn }) => {
    const { chat, sender, text, isButtonResponse } = m;
    if (!games.has(chat)) return;

    const game = games.get(chat);
    if (sender !== game.turn || game.isFinished) return;

    let pos;
    if (isButtonResponse) {
        const buttonId = m.buttonId;
        if (buttonId && buttonId.startsWith('tris_move_')) {
            pos = parseInt(buttonId.replace('tris_move_', '')) - 1;
        }
    } else if (/^[1-9]$/.test(text)) {
        pos = parseInt(text) - 1;
    } else {
        return;
    }

    if (!game.move(pos)) return m.reply('❌ *Mossa non valida!*\n\n🎯 Casella occupata o posizione errata!');

    let result = game.checkWin();
    let status = '';

    if (result) {
        game.isFinished = true;
        if (result.winner === 'draw') {
            status = '🤝 PAREGGIO! Partita finita in parità!';
            updatePlayerStats(game.p1, false, true);
            updatePlayerStats(game.p2, false, true);
        } else {
            const winner = result.winner === 'X' ? game.p1 : game.p2;
            const loser = result.winner === 'X' ? game.p2 : game.p1;
            const winnerName = await getSafeName(conn, winner);
            const loserName = await getSafeName(conn, loser);
            status = getVictoryMessage(winnerName, loserName);
            game.winningLine = result.line;
            updatePlayerStats(winner, true, true);
            updatePlayerStats(loser, false, true);
        }
    } else {
        const currentPlayerName = await getSafeName(conn, game.turn);
        const remainingMoves = countRemainingPositions(game.board);
        status = `🔄 Turno di: ${currentPlayerName} - ${remainingMoves} mosse rimanenti`;
    }

    await sendGameMessage(conn, chat, game, status);
    clearTimeout(timeoutMap.get(chat));

    if (game.isFinished) {
        games.delete(chat);
        if (result && result.winner !== 'draw') {
            const winner = result.winner === 'X' ? game.p1 : game.p2;
            const loser = result.winner === 'X' ? game.p2 : game.p1;
            const winnerStats = getPlayerStats(winner);
            const loserStats = getPlayerStats(loser);
            setTimeout(async () => {
                await conn.sendMessage(chat, {
                    text: `🎉 *\`STATISTICHE FINALI\`* 🎉\n\n` +
                        `『 🏆 』 *\`Vincitore:\`* *${await getSafeName(conn, winner)}*\n` +
                        `- 📊 ${winnerStats.wins}/${winnerStats.games} vittorie (${Math.round((winnerStats.wins/winnerStats.games)*100)}%)\n` +
                        `- 🔥 Streak: ${winnerStats.streak}\n\n` +
                        `『 😔 』 *\`Sconfitto:\`* *${await getSafeName(conn, loser)}*\n` +
                        `- 📊 ${loserStats.wins}/${loserStats.games} vittorie (${Math.round((loserStats.wins/loserStats.games)*100)}%)\n` +
                        `- 🔥 Streak: ${loserStats.streak}\n\n`,
                    mentions: [winner, loser]
                });
            }, 2000);
        }
    } else {
        timeoutMap.set(chat, setTimeout(async () => {
            if (games.has(chat) && !games.get(chat).isFinished) {
                const currentGame = games.get(chat);
                const loser = currentGame.turn;
                const winner = loser === currentGame.p1 ? currentGame.p2 : currentGame.p1;
                updatePlayerStats(loser, false, true);
                updatePlayerStats(winner, true, true);
                games.delete(chat);
                conn.sendMessage(chat, {
                text: `『 ⏰ 』 *TEMPO SCADUTO!*\n\n` +
                    `『 💥 』 ${await getSafeName(conn, loser)} ha perso per forfait!\n` +
                    `『 🏆 』 Vittoria per ${await getSafeName(conn, winner)}!\n\n`,
                mentions: [loser, winner]
                });
            }
        }, 45000));
    }
};

handler.command = ['tris'];
handler.help = ['tris @tag'];
handler.tags = ['giochi'];
handler.group = true;
handler.register = true;

export default handler;