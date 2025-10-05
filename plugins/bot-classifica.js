import { createCanvas, loadImage } from 'canvas'
let handler = async (m, { conn, args, participants, isOwner }) => {
    const formatNumber = (num) => isFinite(num) ? num.toLocaleString('it-IT') : '∞'
    const filterInfinite = (users) => users.filter(user => 
        isFinite(user.exp || 0) && 
        isFinite(user.euro || 0) && 
        isFinite(user.level || 0)
    )

    let users = Object.entries(global.db.data.users)
        .map(([key, value]) => ({...value, jid: key}))
        .filter(user => user.registered)
    
    users = filterInfinite(users)
    
    let sortedEuro = [...users].sort((a, b) => (b.euro || 0) - (a.euro || 0))
    let sortedExp = [...users].sort((a, b) => (b.exp || 0) - (a.exp || 0))
    let sortedLevel = [...users].sort((a, b) => (b.level || 0) - (a.level || 0))
    
    let playerPos = {
        euro: sortedEuro.findIndex(u => u.jid === m.sender) + 1,
        exp: sortedExp.findIndex(u => u.jid === m.sender) + 1,
        level: sortedLevel.findIndex(u => u.jid === m.sender) + 1
    }
    
    let len = isOwner ? 10 : 5
    if (args[0]) {
        const argLen = parseInt(args[0])
        len = isOwner ? 
            Math.min(20, Math.max(argLen, 5)) : 
            Math.min(5, Math.max(argLen, 1))
    }

    const leaderboardImage = await createLeaderboardImage({
        sortedEuro: sortedEuro.slice(0, len),
        sortedExp: sortedExp.slice(0, len),
        sortedLevel: sortedLevel.slice(0, len),
        playerPos,
        totalUsers: users.length,
        len,
        isOwner,
        conn,
        formatNumber
    })

    const mentions = [...sortedEuro, ...sortedExp, ...sortedLevel]
        .slice(0, len * 3)
        .map(user => user.jid)
        .filter((v, i, a) => a.indexOf(v) === i)

    await conn.sendMessage(m.chat, {
        image: leaderboardImage,
        caption: `🏆 *CLASSIFICA TOP ${len}*\n\n📍 *Le tue posizioni:*\n• 💰 Euro: ${playerPos.euro}/${users.length}\n• ⭐ Exp: ${playerPos.exp}/${users.length}\n• 📈 Livello: ${playerPos.level}/${users.length}\n\n${isOwner ? '> vare ✧ bot' : '> vare ❀ bot'}`,
        mentions
    }, { quoted: m })
}

async function createLeaderboardImage({ sortedEuro, sortedExp, sortedLevel, playerPos, totalUsers, len, isOwner, conn, formatNumber }) {
    
    const padding = 32
    const headerHeight = 120
    const statsHeight = 80
    const sectionSpacing = 24
    const itemHeight = 64
    const sectionTitleHeight = 40
    const footerHeight = 60
    
    const width = 800
    const totalSections = 3
    const totalItems = len * totalSections
    const height = headerHeight + statsHeight + (sectionSpacing * totalSections) + 
                   (itemHeight * totalItems) + (sectionTitleHeight * totalSections) + footerHeight + (padding * 2)
    
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')

    
    const colors = {
        background: '#0a0a0f',
        cardBg: '#1a1a24',
        accent: '#6366f1',
        accentLight: '#8b5cf6',
        text: '#f8fafc',
        textSecondary: '#94a3b8',
        border: '#2d2d3a',
        success: '#22c55e',
        warning: '#f59e0b',
        gold: '#fbbf24',
        silver: '#94a3b8',
        bronze: '#f97316'
    }

    
    ctx.fillStyle = colors.background
    ctx.fillRect(0, 0, width, height)

    
    ctx.globalAlpha = 0.03
    for (let i = 0; i < width; i += 40) {
        for (let j = 0; j < height; j += 40) {
            ctx.fillStyle = colors.text
            ctx.fillRect(i, j, 1, 1)
        }
    }
    ctx.globalAlpha = 1
    const emojis = {}
    try {
        emojis.trophy = await loadEmojiFromUrl('https://twemoji.maxcdn.com/v/latest/72x72/1f3c6.png')
        emojis.location = await loadEmojiFromUrl('https://twemoji.maxcdn.com/v/latest/72x72/1f4cd.png')
        emojis.money = await loadEmojiFromUrl('https://twemoji.maxcdn.com/v/latest/72x72/1f4b0.png')
        emojis.star = await loadEmojiFromUrl('https://twemoji.maxcdn.com/v/latest/72x72/2b50.png')
        emojis.chart = await loadEmojiFromUrl('https://twemoji.maxcdn.com/v/latest/72x72/1f4c8.png')
        emojis.gold = await loadEmojiFromUrl('https://twemoji.maxcdn.com/v/latest/72x72/1f947.png')
        emojis.silver = await loadEmojiFromUrl('https://twemoji.maxcdn.com/v/latest/72x72/1f948.png')
        emojis.bronze = await loadEmojiFromUrl('https://twemoji.maxcdn.com/v/latest/72x72/1f949.png')
    } catch (e) {
    }

    let yOffset = padding

    
    createCard(ctx, padding, yOffset, width - (padding * 2), headerHeight, colors)
    
    
    ctx.fillStyle = colors.text
    ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.textAlign = 'center'
    
    if (emojis.trophy) {
        ctx.drawImage(emojis.trophy, (width / 2) - 80, yOffset + 25, 40, 40)
        ctx.fillText(`CLASSIFICA TOP ${len}`, width / 2 + 10, yOffset + 55)
    } else {
        ctx.fillText(`🏆 CLASSIFICA TOP ${len}`, width / 2, yOffset + 55)
    }

    ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillStyle = colors.textSecondary
    ctx.fillText(`${totalUsers} utenti registrati`, width / 2, yOffset + 85)

    yOffset += headerHeight + sectionSpacing

    
    createCard(ctx, padding, yOffset, width - (padding * 2), statsHeight, colors)
    
    
    ctx.fillStyle = colors.text
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.textAlign = 'center'
    
    if (emojis.location) {
        ctx.drawImage(emojis.location, (width / 2) - 80, yOffset + 15, 20, 20)
        ctx.fillText('Le tue posizioni', width / 2 + 10, yOffset + 30)
    } else {
        ctx.fillText('📍 Le tue posizioni', width / 2, yOffset + 30)
    }

    
    const statsY = yOffset + 55
    const statWidth = (width - (padding * 2)) / 3
    
    
    ctx.textAlign = 'center'
    if (emojis.money) {
        ctx.drawImage(emojis.money, padding + (statWidth * 0) + (statWidth / 2) - 25, statsY - 15, 16, 16)
        drawStatistic(ctx, padding + (statWidth * 0), statsY, statWidth, `${playerPos.euro}°`, 'Euro', colors)
    } else {
        drawStatistic(ctx, padding + (statWidth * 0), statsY, statWidth, `💰 ${playerPos.euro}°`, 'Euro', colors)
    }
    
    
    if (emojis.star) {
        ctx.drawImage(emojis.star, padding + (statWidth * 1) + (statWidth / 2) - 25, statsY - 15, 16, 16)
        drawStatistic(ctx, padding + (statWidth * 1), statsY, statWidth, `${playerPos.exp}°`, 'Exp', colors)
    } else {
        drawStatistic(ctx, padding + (statWidth * 1), statsY, statWidth, `⭐ ${playerPos.exp}°`, 'Exp', colors)
    }
    
    
    if (emojis.chart) {
        ctx.drawImage(emojis.chart, padding + (statWidth * 2) + (statWidth / 2) - 25, statsY - 15, 16, 16)
        drawStatistic(ctx, padding + (statWidth * 2), statsY, statWidth, `${playerPos.level}°`, 'Livello', colors)
    } else {
        drawStatistic(ctx, padding + (statWidth * 2), statsY, statWidth, `📈 ${playerPos.level}°`, 'Livello', colors)
    }

    yOffset += statsHeight + sectionSpacing * 2

    
    const sections = [
        { title: 'Euro', emoji: '💰', users: sortedEuro, valueKey: 'euro', emojiObj: emojis.money },
        { title: 'Esperienza', emoji: '⭐', users: sortedExp, valueKey: 'exp', emojiObj: emojis.star },
        { title: 'Livelli', emoji: '📈', users: sortedLevel, valueKey: 'level', emojiObj: emojis.chart }
    ]

    for (const section of sections) {
        yOffset = await drawLeaderboardSection(ctx, section, yOffset, width, padding, len, conn, formatNumber, colors, emojis)
        yOffset += sectionSpacing
    }

    
    createCard(ctx, padding, yOffset, width - (padding * 2), footerHeight, colors)
    
    ctx.fillStyle = colors.textSecondary
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(isOwner ? '> vare ✧ bot' : '> vare ❀ bot', width / 2, yOffset + 35)

    return canvas.toBuffer('image/png')
}


async function loadEmojiFromUrl(url) {
    try {
        return await loadImage(url)
    } catch (e) {
        return null
    }
}


function createCard(ctx, x, y, width, height, colors) {
    const radius = 16
    
    
    ctx.fillStyle = colors.cardBg
    roundRect(ctx, x, y, width, height, radius)
    ctx.fill()
    
    
    ctx.strokeStyle = colors.border
    ctx.lineWidth = 1
    roundRect(ctx, x, y, width, height, radius)
    ctx.stroke()
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
    ctx.shadowBlur = 10
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 5
    roundRect(ctx, x, y, width, height, radius)
    ctx.stroke()
    ctx.shadowColor = 'transparent'
}


function drawStatistic(ctx, x, y, width, value, label, colors) {
    ctx.textAlign = 'center'
    
    
    ctx.fillStyle = colors.accent
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillText(value, x + width / 2, y)
    
    
    ctx.fillStyle = colors.textSecondary
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillText(label, x + width / 2, y + 20)
}


async function drawLeaderboardSection(ctx, section, yStart, width, padding, len, conn, formatNumber, colors, emojis) {
    const sectionHeight = 40 + (section.users.slice(0, len).length * 64)
    
    
    createCard(ctx, padding, yStart, width - (padding * 2), sectionHeight, colors)
    
    
    ctx.fillStyle = colors.text
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.textAlign = 'left'
    
    if (section.emojiObj) {
        ctx.drawImage(section.emojiObj, padding + 20, yStart + 15, 24, 24)
        ctx.fillText(section.title, padding + 55, yStart + 35)
    } else {
        ctx.fillText(`${section.emoji} ${section.title}`, padding + 20, yStart + 35)
    }

    let itemY = yStart + 60

    for (let i = 0; i < Math.min(section.users.length, len); i++) {
        const user = section.users[i]
        const isTop3 = i < 3
        
        
        const itemBg = isTop3 ? colors.accent + '15' : 'transparent'
        if (isTop3) {
            ctx.fillStyle = itemBg
            roundRect(ctx, padding + 12, itemY - 24, width - (padding * 2) - 24, 48, 8)
            ctx.fill()
        }
        if (i > 0) {
            ctx.strokeStyle = colors.border + '50'
            ctx.lineWidth = 0.5
            ctx.beginPath()
            ctx.moveTo(padding + 12, itemY - 32)
            ctx.lineTo(width - padding - 12, itemY - 32)
            ctx.stroke()
        }
        
        
        await drawAvatar(ctx, user, conn, padding + 30, itemY, colors, isTop3)

        
        let medal = null
        let medalColor = colors.textSecondary
        
        if (i === 0 && emojis.gold) {
            medal = emojis.gold
        } else if (i === 1 && emojis.silver) {
            medal = emojis.silver
        } else if (i === 2 && emojis.bronze) {
            medal = emojis.bronze
        }

        if (medal) {
            ctx.drawImage(medal, padding + 85, itemY - 12, 24, 24)
        } else {
            if (i < 3) medalColor = i === 0 ? colors.gold : i === 1 ? colors.silver : colors.bronze
            ctx.fillStyle = medalColor
            ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            ctx.textAlign = 'center'
            ctx.fillText(`${i + 1}°`, padding + 97, itemY + 5)
        }

        
        let username = user.name || user.jid.split('@')[0]
        const maxNameLength = 20
        const displayName = username.length > maxNameLength ? 
            username.substring(0, maxNameLength - 3) + '...' : username
        
        ctx.fillStyle = colors.text
        ctx.font = isTop3 ? 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : 
                           '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        ctx.textAlign = 'left'
        ctx.fillText(displayName, padding + 125, itemY + 5)

        
        const value = formatNumber(user[section.valueKey] || 0)
        const valueWidth = ctx.measureText(value).width + 16
        
        
        ctx.fillStyle = colors.success + '20'
        roundRect(ctx, width - padding - valueWidth - 20, itemY - 10, valueWidth, 20, 10)
        ctx.fill()
        
        ctx.fillStyle = colors.success
        ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(value, width - padding - 20 - (valueWidth / 2), itemY + 3)

        itemY += 64
    }

    return yStart + sectionHeight
}


async function drawAvatar(ctx, user, conn, x, y, colors, isTop3) {
    const size = isTop3 ? 36 : 32
    const radius = size / 2

    try {
        const profilePic = await conn.profilePictureUrl(user.jid, 'image').catch(() => null)
        if (profilePic) {
            const img = await loadImage(profilePic)
            
            ctx.save()
            ctx.beginPath()
            ctx.arc(x, y, radius, 0, Math.PI * 2)
            ctx.closePath()
            ctx.clip()
            ctx.drawImage(img, x - radius, y - radius, size, size)
            ctx.restore()
            
            
            ctx.strokeStyle = isTop3 ? colors.accent : colors.border
            ctx.lineWidth = isTop3 ? 2 : 1
            ctx.beginPath()
            ctx.arc(x, y, radius, 0, Math.PI * 2)
            ctx.stroke()
        } else {
            drawDefaultAvatar(ctx, x, y, radius, size, colors)
        }
    } catch (e) {
        drawDefaultAvatar(ctx, x, y, radius, size, colors)
    }
}

function drawDefaultAvatar(ctx, x, y, radius, size, colors) {
    ctx.fillStyle = colors.cardBg
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.strokeStyle = colors.border
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.stroke()
    
    ctx.fillStyle = colors.textSecondary
    ctx.font = `${size / 2}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText('👤', x, y + 5)
}

function roundRect(ctx, x, y, width, height, radius) {
    if (width < 2 * radius) radius = width / 2
    if (height < 2 * radius) radius = height / 2
    
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.arcTo(x + width, y, x + width, y + height, radius)
    ctx.arcTo(x + width, y + height, x, y + height, radius)
    ctx.arcTo(x, y + height, x, y, radius)
    ctx.arcTo(x, y, x + width, y, radius)
    ctx.closePath()
}

handler.help = ['classifica']
handler.tags = ['main']
handler.command = ['leaderboard', 'lb', 'classifica'] 
handler.register = true
export default handler