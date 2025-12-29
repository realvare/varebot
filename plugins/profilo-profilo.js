import PhoneNumber from 'awesome-phonenumber'
import fs from 'fs'
import path from 'path'

const loadMarriages = () => {
    const marriagesFile = path.resolve('media/database/sposi.json');
    if (fs.existsSync(marriagesFile)) {
        return JSON.parse(fs.readFileSync(marriagesFile, 'utf-8'))
    } else {
        return {}
    }
}

const calculateLevel = (exp) => {
    return Math.floor(Math.sqrt(exp / 100)) + 1
}

const getGroupMessageRank = (chatId, userId) => {
    try {
        const groupUsers = []
        const chatData = global.db?.data?.chats?.[chatId]
        
        if (!chatData?.users) {
            return { rank: 0, total: 0, messages: 0 }
        }
        
        for (const [id, userData] of Object.entries(chatData.users)) {
            const messages = userData.messages || 0
            if (messages > 0) {
                groupUsers.push({ id, messages })
            }
        }
        
        groupUsers.sort((a, b) => b.messages - a.messages)
        
        const userIndex = groupUsers.findIndex(user => user.id === userId)
        const userMessages = groupUsers[userIndex]?.messages || 0
        
        return {
            rank: userIndex >= 0 ? userIndex + 1 : 0,
            total: groupUsers.length,
            messages: userMessages
        }
    } catch (error) {
        return { rank: 0, total: 0, messages: 0 }
    }
}

const getGlobalMessageRank = (userId) => {
    try {
        const allUsers = []
        
        if (global.db?.data?.chats) {
            const userTotals = {}
            
            for (const [chatId, chatData] of Object.entries(global.db.data.chats)) {
                if (chatData?.users) {
                    for (const [id, userData] of Object.entries(chatData.users)) {
                        const messages = userData.messages || 0
                        if (messages > 0) {
                            userTotals[id] = (userTotals[id] || 0) + messages
                        }
                    }
                }
            }
            
            for (const [id, totalMessages] of Object.entries(userTotals)) {
                allUsers.push({ id, messages: totalMessages })
            }
        }
        
        allUsers.sort((a, b) => b.messages - a.messages)
        
        const userIndex = allUsers.findIndex(user => user.id === userId)
        const userMessages = allUsers[userIndex]?.messages || 0
        
        return {
            rank: userIndex >= 0 ? userIndex + 1 : 0,
            total: allUsers.length,
            messages: userMessages
        }
    } catch (error) {
        return { rank: 0, total: 0, messages: 0 }
    }
}

const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
}
const normalizeDateForBirthday = (dateStr) => {
    if (!dateStr) return null
    dateStr = dateStr.trim()
    const patterns = [
        /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/,
        /^(\d{1,2})[\/\-\.](\d{1,2})$/,
        /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/,
    ]
    
    for (const pattern of patterns) {
        const match = dateStr.match(pattern)
        if (match) {
            let day, month, year
            
            if (match[3]) {
                if (match[0].startsWith(match[1]) && match[1].length <= 2) {
                    day = match[1].padStart(2, '0')
                    month = match[2].padStart(2, '0')
                    year = match[3]
                } else {
                    year = match[1]
                    month = match[2].padStart(2, '0')
                    day = match[3].padStart(2, '0')
                }
            } else {
                day = match[1].padStart(2, '0')
                month = match[2].padStart(2, '0')
                year = null
            }
            
            return { day, month, year }
        }
    }
    
    return null
}

const isBirthday = (birthdayStr) => {
    const today = new Date()
    const todayDay = today.getDate().toString().padStart(2, '0')
    const todayMonth = (today.getMonth() + 1).toString().padStart(2, '0')
    
    const birthday = normalizeDateForBirthday(birthdayStr)
    
    if (!birthday) return false
    
    return birthday.day === todayDay && birthday.month === todayMonth
}

const shouldSendBirthdayMessage = (userId) => {
    const today = new Date().toDateString()
    if (!global.birthdayMessages) {
        global.birthdayMessages = {}
    }
    if (global.birthdayMessages[userId] === today) {
        return false
    }
    global.birthdayMessages[userId] = today
    return true
}

let handler = async (m, { conn, args, usedPrefix }) => {
    let who = m.quoted?.sender || m.mentionedJid?.[0] || m.sender
    let user = global.db.data.users[who]
    
    if (!user.profile) user.profile = {}
    if (!user.firstTime) user.firstTime = Date.now()
    
    let pp = await conn.profilePictureUrl(who, 'image').catch(_ => 'https://i.ibb.co/BKHtdBNp/default-avatar-profile-icon-1280x1280.jpg')

    let currentLevel = user.level || calculateLevel(user.exp || 0)

    const groupRank = getGroupMessageRank(m.chat, who)
    const globalRank = getGlobalMessageRank(who)

    const marriages = loadMarriages()
    
    let partnerMention = 'Nessuno'
    let mentions = [who]

    if (marriages[who]) {
        let partnerJid = marriages[who]
        partnerMention = `@${partnerJid.split('@')[0]}`
        mentions.push(partnerJid)
    }

    let profileBox = `ㅤㅤ⋆｡˚『 ╭ \`STATISTICHE\` ╯ 』˚｡⋆
╭
│  『 🪙 』 \`Euro:\` *${formatNumber(user.euro || 0)} 💰*
│  『 🏅 』 \`Livello:\` *${currentLevel}*
│  『 ✨』  \`Exp:\` *${formatNumber(user.exp || 0)} XP*
│  『 💎 』 \`Premium:\` *${user.premium ? '✅' : '❌'}*
│  『 💬 』 \`Messaggi gruppo:\` *${formatNumber(groupRank.messages)}*
│  『 🏆 』 \`Rank gruppo:\` *#${groupRank.rank}${groupRank.total > 0 ? '/' + groupRank.total : ''}*
│  『 🌍 』 \`Rank globale:\` *#${globalRank.rank}${globalRank.total > 0 ? '/' + globalRank.total : ''}*
│
*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*

ㅤㅤ⋆｡˚『 ╭ \`INFORMAZIONI\` ╯ 』˚｡⋆
╭
${user.profile?.description ? `│  『 📝 』 \`Bio:\`\n│      *⤷*  *${user.profile.description}*` : `│  『 📝 』 \`Bio:\` ?`}
${user.profile?.gender ? `│  『 ⚧️ 』 \`Genere:\`\n│      *⤷*  *${user.profile.gender}*` : `│  『 ⚧️ 』 \`Genere:\` ?`}
${user.profile?.instagram ? `│  『 📸 』 \`Instagram:\`\n│      *⤷*  instagram.com/${user.profile.instagram}` : `│  『 📸 』 \`Instagram:\` ?`}
${user.profile?.city ? `│  『 🌆 』 \`Città:\`\n│      *⤷*  *${user.profile.city}*` : `│  『 🌆 』 \`Città:\` ?`}
${user.profile?.birthday ? `│  『 🎂 』 \`Compleanno:\`\n│      *⤷*  *${user.profile.birthday}*` : `│  『 🎂 』 \`Compleanno:\` ?`}
${user.profile?.hobby ? `│  『 🎨 』 \`Hobby:\`\n│      *⤷*  *${user.profile.hobby}*` : `│  『 🎨 』 \`Hobby:\` ?`}
${user.profile?.status ? `│  『 💝 』 \`Stato:\`\n│      *⤷*  *${user.profile.status}*` : `│  『 💝 』 \`Stato:\` ?`}
${user.profile?.occupation ? `│  『 💼 』 \`Lavoro:\`\n│      *⤷*  *${user.profile.occupation}*` : `│  『 💼 』 \`Lavoro:\` ?`}
${user.profile?.music ? `│  『 🎵 』 \`Musica:\`\n│      *⤷*  *${user.profile.music}*` : `│  『 🎵 』 \`Musica:\` ?`}
${user.profile?.food ? `│  『 🍕 』 \`Cibo:\`\n│      *⤷*  *${user.profile.food}*` : `│  『 🍕 』 \`Cibo:\` ?`}
${user.profile?.movie ? `│  『 🎬 』 \`Film:\`\n│      *⤷*  *${user.profile.movie}*` : `│  『 🎬 』 \`Film:\` ?`}
${user.profile?.game ? `│  『 🎮 』 \`Gioco:\`\n│      *⤷*  *${user.profile.game}*` : `│  『 🎮 』 \`Gioco:\` ?`}
${user.profile?.sport ? `│  『 🏃 』 \`Sport:\`\n│      *⤷*  *${user.profile.sport}*` : `│  『 🏃 』 \`Sport:\` ?`}
${user.profile?.language ? `│  『 🌍 』 \`Lingua:\`\n│      *⤷*  *${user.profile.language}*` : `│  『 🌍 』 \`Lingua:\` ?`}
${marriages[who] ? `│  『 💕 』 \`Sposato:\`\n│      *⤷*  ${partnerMention}` : `│  『 💕 』 \`Sposato:\` Single`} 
│
*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`

    try {
        await conn.sendMessage(m.chat, {
            text: profileBox,
            mentions,
            contextInfo: {
                ...global.fake.contextInfo,
                externalAdReply: {
                    title: `👤 ${await conn.getName(who)}`,
                    body: `📱 ${PhoneNumber('+' + who.split('@')[0]).getNumber('international')} • Livello ${currentLevel}`,
                    thumbnailUrl: pp,
                    sourceUrl: '',
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: m })
        if (user.profile?.birthday && isBirthday(user.profile.birthday) && shouldSendBirthdayMessage(who)) {
            setTimeout(async () => {
                try {
                    const userName = await conn.getName(who)
                    await conn.sendMessage(m.chat, {
                        text: `🎉─ׄ─⭒『 \`BUON COMPLEANNO\` 』⭒─ׄ─🎂\n\n『 🌟 』- \`Tanti auguri\` *${userName}* \`passa questo giorno al meglio!\``,
                        mentions: [who]
                    })
                } catch (birthdayError) {
                    console.error('Errore nell\'invio del messaggio di compleanno:', birthdayError)
                }
            }, 1000)
        }

    } catch (e) {
        console.error('Errore nel profilo:', e)
        await m.reply(`${global.errore}`)
    }
}

handler.help = ['profilo']
handler.tags = ['info', 'profilo']
handler.command = /^(profilo|profile)$/i
handler.register = true
export default handler