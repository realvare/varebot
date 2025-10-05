import { smsg } from './lib/simple.js'
import { format } from 'util'
import { fileURLToPath } from 'url'
import path, { join } from 'path'
import { unwatchFile, watchFile } from 'fs'
import chalk from 'chalk'
import { handleEventParticipation } from './plugins/gp-sorteggio.js'
import NodeCache from 'node-cache'
import debounce from 'lodash.debounce'
import { getAggregateVotesInPollMessage, getSenderLid, toJid, validateJid } from '@realvare/based'
global.ignoredUsersGlobal = new Set()
global.ignoredUsersGroup = {}
global.groupSpam = {}
if (!global.groupCache) {
    global.groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false })
}
if (!global.jidCache) {
    global.jidCache = new NodeCache({ stdTTL: 600, useClones: false })
}
export async function fetchGroupMetadataWithRetry(conn, chatId, retries = 3, initialDelayMs = 100) {
    let delayMs = initialDelayMs
    for (let i = 0; i < retries; i++) {
        try {
            const metadata = await conn.groupMetadata(chatId)
            return metadata
        } catch (e) {
            console.error(`[ERRORE] Tentativo ${i + 1} fallito nel recuperare i metadati per ${chatId}:`, e)
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, delayMs))
                delayMs *= 2
            }
        }
    }
    console.error(`[ERRORE] Impossibile recuperare i metadati per ${chatId} dopo ${retries} tentativi`)
    return null
}
export const debouncedFetchMetadata = debounce(fetchGroupMetadataWithRetry, 1000)

if (!global.cacheListenersSet) {
    const conn = global.conn
    if (conn) {
        conn.ev.on('groups.update', async (updates) => {
            for (const update of updates) {
                try {
                    const metadata = await debouncedFetchMetadata(conn, update.id)
                    if (!metadata) continue
                    global.groupCache.set(update.id, metadata, { ttl: 300 })
                } catch (e) {
                    console.error(`[ERRORE] Errore nell'aggiornamento cache su groups.update for ${update.id}:`, e)
                }
            }
        })
        global.cacheListenersSet = true
    }
}
if (!global.pollListenerSet) {
    const conn = global.conn
    if (conn) {
        conn.ev.on('messages.update', async (chatUpdate) => {
            for (const { key, update } of chatUpdate) {
                if (update.pollUpdates && key.fromMe) {
                    try {
                        const pollCreation = await global.store?.getMessage(key)
                        if (pollCreation) {
                            await getAggregateVotesInPollMessage({
                                message: pollCreation,
                                pollUpdates: update.pollUpdates,
                            })
                        }
                    } catch (e) {
                        console.error('[ERRORE] Errore nel gestire poll update:', e)
                    }
                }
                if (update.update?.message?.editedMessage) {
                    const editedMsg = update.update.message.editedMessage
                    const editedContent = editedMsg.message?.conversation ||
                                          editedMsg.message?.extendedTextMessage?.text ||
                                          editedMsg.message?.imageMessage?.caption ||
                                          'Contenuto non disponibile'

                    let oldContent = 'Contenuto originale non disponibile'
                    let originalMsg = null
                    try {
                        if (typeof global.store?.getMessage === 'function') {
                            originalMsg = global.store.getMessage(key)
                        }
                        if (!originalMsg && global.store?.chats) {
                            const jid = global.conn?.decodeJid(key.remoteJid || key.id?.split(':')?.[0] || '') || (key.remoteJid || '')
                            let chat = null
                            try {
                                if (typeof global.store.chats.get === 'function') chat = global.store.chats.get(jid)
                                else if (typeof global.store.chats === 'object') chat = global.store.chats[jid]
                            } catch (e) { chat = null }
                            if (chat && chat.messages) {
                                try {
                                    if (typeof chat.messages.get === 'function') originalMsg = chat.messages.get(key.id)
                                    else originalMsg = chat.messages?.[key.id]
                                } catch (e) {
                                    originalMsg = null
                                }
                            }
                        }
                        if (!originalMsg && typeof global.store?.loadMessage === 'function' && global.conn) {
                            const jid = global.conn.decodeJid(key.remoteJid || key.id?.split(':')?.[0] || '')
                            originalMsg = await global.store.loadMessage(jid, key.id).catch(() => null)
                        }

                        if (originalMsg) {
                            oldContent = originalMsg.message?.conversation ||
                                         originalMsg.message?.extendedTextMessage?.text ||
                                         originalMsg.message?.imageMessage?.caption ||
                                         'Contenuto originale non disponibile'
                        }
                    } catch (e) {
                        console.error('[WARN] Errore recupero originalMsg:', e)
                    }

                    console.log('Messaggio editato:', oldContent, '->', editedContent)
                    try {
                        const fakeKey = { ...key }
                        try { fakeKey.remoteJid = global.conn.decodeJid(fakeKey.remoteJid) } catch {}
                        if (fakeKey.participant) try { fakeKey.participant = global.conn.decodeJid(fakeKey.participant) } catch {}
                        const fakeMessage = {
                            key: fakeKey,
                            message: editedMsg.message,
                            messageTimestamp: Math.floor(Date.now() / 1000),
                            pushName: originalMsg?.pushName || (await global.conn?.getName(fakeKey.participant || fakeKey.remoteJid).catch(() => '')),
                            broadcast: originalMsg?.broadcast || false,
                            contextInfo: originalMsg?.message?.contextInfo || editedMsg.message?.contextInfo || undefined,
                            messageStubParameters: originalMsg?.messageStubParameters || editedMsg.messageStubParameters || undefined
                        }
                        if (typeof handler === 'function' && global.conn) {
                            try {
                                const processed = smsg(global.conn, fakeMessage, global.store) || fakeMessage
                                processed.text = processed.text || processed.message?.conversation || processed.message?.extendedTextMessage?.text || processed.message?.imageMessage?.caption || ''
                                await handler.call(global.conn, { messages: [processed] })
                            } catch (e) {
                                console.error('[ERRORE] Errore nello smsg del fakeMessage:', e)
                                await handler.call(global.conn, { messages: [fakeMessage] })
                            }
                        }
                    } catch (e) {
                        console.error('[ERRORE] Errore nel ri-inoltro del messaggio editato al handler:', e)
                    }
                } else if (update.update?.message === null) {
                    console.log('Messaggio eliminato:', key.id)
                }
            }
        })
        global.pollListenerSet = true
    }
}
const isNumber = x => typeof x === 'number' && !isNaN(x)
const delay = ms => isNumber(ms) && new Promise(resolve => setTimeout(resolve, ms))
const responseHandlers = new Map()
function initResponseHandler(conn) {
    if (!conn.waitForResponse) {
        conn.waitForResponse = async (chat, sender, options = {}) => {
            const {
                timeout = 30000,
                validResponses = null,
                onTimeout = null,
                filter = null
            } = options
            return new Promise((resolve) => {
                const key = chat + sender
                const timeoutId = setTimeout(() => {
                    responseHandlers.delete(key)
                    if (onTimeout) onTimeout()
                    resolve(null)
                }, timeout)
                responseHandlers.set(key, {
                    resolve,
                    timeoutId,
                    validResponses,
                    filter
                })
            })
        }
    }
}

global.processedCalls = global.processedCalls || new Map()
if (global.conn && global.conn.ws) {
    global.conn.ws.on('CB:call', async (json) => {
        try {
            if (!json?.tag || json.tag !== 'call' || !json.attrs?.from) {
                return
            }
            const callerId = global.conn.decodeJid(json.attrs.from)
            const isOwner = global.owner.some(([num]) => num === callerId.split('@')[0])
            if (isOwner) return

            const eventId = json.attrs.id
            let actualCallId = null
            if (json.content?.length > 0) {
                for (const item of json.content) {
                    if (item.attrs && item.attrs['call-id']) {
                        actualCallId = item.attrs['call-id']
                        break
                    }
                }
            }
            const uniqueCallId = actualCallId || eventId
            if (json.content?.length > 0) {
                const contentTags = json.content.map(item => item.tag)
                if (contentTags.includes('terminate')) {
                    global.processedCalls.delete(uniqueCallId)
                    return
                }
                if (contentTags.includes('relaylatency')) {
                    if (global.processedCalls.has(uniqueCallId)) {
                        return
                    }
                    global.processedCalls.set(uniqueCallId, true)

                    const numero = callerId.split('@')[0]
                    const nome = global.conn.getName(callerId) || 'Sconosciuto'
                    console.log(`[📞] chiamata in arrivo da ${numero} - ${nome}`)

                    if (!global.db.data) await global.loadDatabase()
                    let settings = global.db.data?.settings?.[global.conn.user.jid]
                    if (!settings) {
                        settings = global.db.data.settings[global.conn.user.jid] = {
                            self: false,
                            restrict: true,
                            jadibotmd: false,
                            antiPrivate: true,
                            soloCreatore: false,
                            anticall: true,
                            status: 0
                        }
                    }
                    if (!settings.anticall) return

                    let user = global.db.data.users[callerId] || (global.db.data.users[callerId] = { callCount: 0, banned: false })
                    if (user.banned) {
                        await global.conn.rejectCall(uniqueCallId, callerId)
                        return
                    }
                    user.callCount = (user.callCount || 0) + 1
                    try {
                        await global.conn.rejectCall(uniqueCallId, callerId)
                        console.log(`[📞] chiamata di ${numero} - ${nome} rifiutata`)
                        if (user.callCount >= 3) {
                            user.banned = true
                            user.bannedReason = 'Troppi tentativi di chiamata'
                            const msg = `🚫 Quanto puoi essere sfigato per spammare di call smh.`
                            await global.conn.sendMessage(toJid(callerId), { text: msg })
                        } else {
                            const msg = `🚫 Chiamata rifiutata automaticamente, non chiamare il bot.`
                            await global.conn.sendMessage(toJid(callerId), { text: msg })
                        }
                    } catch (err) {
                        console.error('[ERRORE] Errore nel gestire la chiamata:', err)
                        global.processedCalls.delete(uniqueCallId)
                    }
                }
            }
        } catch (e) {
            console.error('[ERRORE] Errore generale gestione chiamata:', e)
        }
    })
}
setInterval(() => {
    if (global.processedCalls.size > 10) {
        global.processedCalls.clear()
    }
}, 180000)

export async function participantsUpdate({ id, participants, action }) {
    if (global.db.data.chats[id]?.detect === false) return

    try {
        let metadata = await debouncedFetchMetadata(this, id)
        if (!metadata) return

        global.groupCache.set(id, metadata, { ttl: 300 })
        for (const user of participants) {
            const normalizedUser = this.decodeJid(user)
            const userName = (await this.getName(normalizedUser)) || normalizedUser.split('@')[0] || 'Sconosciuto'
            switch (action) {
                case 'add':
                    break
                case 'remove':
                    break
                case 'promote':
                    break
                case 'demote':
                    break
            }
        }
    } catch (e) {
        console.error(`[ERRORE] Errore in participantsUpdate per ${id}:`, e)
    }
}

export async function handler(chatUpdate) {
    this.msgqueque = this.msgqueque || []
    this.uptime = this.uptime || Date.now()
    if (!chatUpdate) return
    this.pushMessage(chatUpdate.messages).catch(console.error)
    let m = chatUpdate.messages[chatUpdate.messages.length - 1]
    if (!m) return
    let isEdited = m.message?.protocolMessage?.type === 'MESSAGE_EDIT'
    if (isEdited) {
        const key = m.message.protocolMessage.key
        const editedMessage = m.message.protocolMessage.editedMessage
        if (editedMessage) {
            m = {
                ...m,
                key,
                message: editedMessage,
                messageTimestamp: m.messageTimestamp,
            }
            m.text = editedMessage.conversation ||
                     editedMessage.extendedTextMessage?.text ||
                     editedMessage.imageMessage?.caption ||
                     editedMessage.videoMessage?.caption ||
                     editedMessage.documentMessage?.caption ||
                     ''
            if (editedMessage.conversation) m.mtype = 'conversation'
            else if (editedMessage.extendedTextMessage) m.mtype = 'extendedTextMessage'
            else if (editedMessage.imageMessage) m.mtype = 'imageMessage'
            else if (editedMessage.videoMessage) m.mtype = 'videoMessage'
            else if (editedMessage.audioMessage) m.mtype = 'audioMessage'
            else if (editedMessage.documentMessage) m.mtype = 'documentMessage'
            else if (editedMessage.stickerMessage) m.mtype = 'stickerMessage'
            else m.mtype = 'unknown'
        } else {
            isEdited = false
        }
    }

    if (m.key) {
        m.key.remoteJid = this.decodeJid(m.key.remoteJid)
        if (m.key.participant) m.key.participant = this.decodeJid(m.key.participant)
    }
    if (!m.key.remoteJid) return
    if (!this.originalGroupParticipantsUpdate) {
        this.originalGroupParticipantsUpdate = this.groupParticipantsUpdate
        this.groupParticipantsUpdate = async function(chatId, users, action) {
            try {
                let metadata = global.groupCache.get(chatId)
                if (!metadata) {
                    metadata = await debouncedFetchMetadata(this, chatId)
                    if (metadata) global.groupCache.set(chatId, metadata, { ttl: 300 })
                }
                if (!metadata) {
                    console.error('[ERRORE] Nessun metadato del gruppo disponibile per un aggiornamento sicuro')
                    return this.originalGroupParticipantsUpdate.call(this, chatId, users, action)
                }

                const correctedUsers = users.map(userJid => {
                    const decoded = this.decodeJid(userJid)
                    const phone = decoded.split('@')[0].replace(/:\d+$/, '')
                    const participant = metadata.participants.find(p => {
                        const pId = this.decodeJid(p.id || p.jid || '')
                        const pPhone = pId.split('@')[0].replace(/:\d+$/, '')
                        return pPhone === phone
                    })
                    return participant ? participant.id : userJid
                })

                return this.originalGroupParticipantsUpdate.call(this, chatId, correctedUsers, action)
            } catch (e) {
                console.error('[ERRORE] Errore in safeGroupParticipantsUpdate:', e)
                throw e
            }
        }
    }

    initResponseHandler(this)

    let user = null
    let chat = null
    let usedPrefix = null
    try {
        let eventHandled = false
        if (m.message?.eventResponseMessage) {
            const { eventId, response } = m.message.eventResponseMessage
            const jid = this.decodeJid(m.key.remoteJid)
            const userId = this.decodeJid(m.key.participant || m.key.remoteJid)
            const action = response === 'going' ? 'join' : 'leave'

            try {
                await handleEventParticipation(this, eventId, jid, userId, action)
                eventHandled = true
            } catch (error) {
                console.error('[ERRORE] Errore in handleEventParticipation:', error)
            }
        }
        if (m.message?.encEventResponseMessage && !eventHandled) {
            const encEventResponse = m.message.encEventResponseMessage
            const jid = this.decodeJid(m.key.remoteJid)
            const userId = this.decodeJid(m.key.participant || m.key.remoteJid)
            let eventId = encEventResponse.eventCreationMessageKey?.id
            if (!eventId && global.activeGiveaways?.has(jid)) {
                eventId = global.activeGiveaways.get(jid)?.eventId
            }

            if (eventId) {
                try {
                    await handleEventParticipation(this, eventId, jid, userId, 'join')
                    eventHandled = true
                } catch (error) {
                    console.error('[ERRORE] Errore in handleEventParticipation:', error)
                }
            }
        }

        if (m.message?.interactiveResponseMessage) {
            const interactiveResponse = m.message.interactiveResponseMessage
            if (interactiveResponse.nativeFlowResponseMessage?.paramsJson) {
                try {
                    const params = JSON.parse(interactiveResponse.nativeFlowResponseMessage.paramsJson)
                    if (params.id) {
                        const fakeMessage = {
                            key: m.key,
                            message: { conversation: params.id },
                            messageTimestamp: m.messageTimestamp,
                            pushName: m.pushName,
                            broadcast: m.broadcast
                        }
                        const processedMsg = smsg(this, fakeMessage)
                        if (processedMsg) {
                            processedMsg.text = params.id
                            return handler.call(this, { messages: [processedMsg] })
                        }
                    }
                } catch (e) {
                    console.error('[ERRORE] Errore nel parsing di nativeFlowResponse:', e)
                }
            }
        }

        if (global.db.data == null) await global.loadDatabase()
        
        try {
            m = smsg(this, m, global.store) || m
        } catch (e) {
            console.error('[ERRORE] Errore in smsg:', e)
            if (e.message.includes('Bad MAC')) {
                console.warn('[AVVISO] Rilevato "Bad MAC", considera la possibilità di cancellare i dati della sessione')
            }
            return
        }
        if (!m || !m.chat) return
        if (isEdited) m.isEdited = true
        if (m.quoted && m.quoted.key) {
            if (m.quoted.key.participant) {
                m.quoted.key.participant = this.decodeJid(m.quoted.key.participant)
            }
            m.quoted.key.remoteJid = this.decodeJid(m.quoted.key.remoteJid)
            if (m.quoted.sender) {
                m.quoted.sender = this.decodeJid(m.quoted.sender)
            }
        }

        const responseKey = m.chat + this.decodeJid(m.sender)
        if (responseHandlers.has(responseKey)) {
            const handler = responseHandlers.get(responseKey)
            let shouldRespond = false

            if (handler.filter) {
                shouldRespond = handler.filter(m)
            } else if (handler.validResponses) {
                shouldRespond = handler.validResponses.includes(m.text?.toLowerCase())
            } else {
                shouldRespond = true
            }

            if (shouldRespond) {
                clearTimeout(handler.timeoutId)
                responseHandlers.delete(responseKey)
                handler.resolve(m.text || m)
                return
            }
        }

        if (m.fromMe) return

        m.exp = 0
        m.euro = false
        if (!global.db.data.chats[m.chat]) {
            global.db.data.chats[m.chat] = { users: {} }
        }
        if (!global.db.data.chats[m.chat].users[m.sender]) {
            global.db.data.chats[m.chat].users[m.sender] = {
                messages: 0,
                exp: 0
            }
        }
        if (m.text && !m.isBaileys && !m.fromMe) {
            global.db.data.chats[m.chat].users[m.sender].messages += 1
            global.db.data.chats[m.chat].users[m.sender].exp += 1
        }
        const senderInfo = getSenderLid(m)
        const normalizedSender = toJid(senderInfo.lid || m.sender)
        const senderValidation = validateJid(normalizedSender)
        if (!senderValidation.isValid) {
            console.error('[ERRORE] Sender JID non valido:', senderValidation.error)
            return
        }
        if (!normalizedSender) return
        user = global.db.data.users[normalizedSender] || (global.db.data.users[normalizedSender] = {
            exp: 0,
            euro: 10,
            muto: false,
            registered: false,
            name: m.pushName || '?',
            age: -1,
            regTime: -1,
            banned: false,
            useDocument: false,
            bank: 0,
            level: 0,
            firstTime: Date.now(),
            spam: 0,
            callCount: 0
        })
        chat = global.db.data.chats[m.chat] || (global.db.data.chats[m.chat] = {
            isBanned: false,
            welcome: false,
            goodbye: false,
            antioneview: false,
            autolevelup: false,
            delete: false,
            antivoip: false,
            rileva: false,
            modoadmin: false,
            antiLink: false,
            antiLink2: false,
            reaction: false,
            antispam: false,
            expired: 0,
            users: {}
        })

        let settings = global.db.data.settings[this.user.jid] || (global.db.data.settings[this.user.jid] = {
            self: false,
            restrict: true,
            jadibotmd: false,
            antiPrivate: true,
            soloCreatore: false,
            anticall: false,
            status: 0
        })

        if (global.opts['nyimak'] || (global.opts['self'] && !m.fromMe) || (global.opts['swonly'] && m.chat !== 'status@broadcast')) return

        m.text = m.text || ''
        const safeSender = normalizedSender
        const safeBot = this.decodeJid(this.user.jid)
        let groupMetadata = m.isGroup ? global.groupCache.get(m.chat) : {}
        if (m.isGroup && (!groupMetadata || (groupMetadata.fetchTime && Date.now() - groupMetadata.fetchTime > 300000))) {
            const freshMetadata = await fetchGroupMetadataWithRetry(this, m.chat)
            if (freshMetadata) {
                freshMetadata.fetchTime = Date.now()
                global.groupCache.set(m.chat, freshMetadata, { ttl: 300 })
                groupMetadata = freshMetadata
            }
        }
        let participants = groupMetadata?.participants || []
        let normalizedParticipants = participants.map(u => {
            const normalizedId = this.decodeJid(u.id)
            return { ...u, id: normalizedId, jid: u.jid || normalizedId }
        })

        const canonicalSender = safeSender.replace(/:\d+@/, '@')
        const isSam = global.sam?.some(sam => (Array.isArray(sam) ? sam[0] : sam) + '@s.whatsapp.net' === canonicalSender) || false
        const isROwner = global.owner === canonicalSender.split('@')[0] || global.owner?.map(([number]) => number).includes(canonicalSender.split('@')[0]) || false
        const isOwner = isROwner || global.owner?.map(([number]) => number + '@s.whatsapp.net').includes(canonicalSender) || false
        const premJids = global.prems?.map(prem => prem + '@s.whatsapp.net') || []
        const modJids = global.mods?.map(mod => mod + '@s.whatsapp.net') || []
        const isMods = isOwner || modJids.includes(canonicalSender)
        const isPrems = isROwner || premJids.includes(canonicalSender) || user.premium

        let isAdmin = m.isGroup ? groupMetadata?.participants?.some(u => 
            (this.decodeJid(u.id) === safeSender || u.jid === safeSender) && 
            (u.admin === 'admin' || u.admin === 'superadmin')
        ) : false

        let isBotAdmin = m.isGroup ? groupMetadata?.participants?.some(u => {
            const normId = this.decodeJid(u.id)
            return (normId === safeBot || u.jid === safeBot) && 
                   (u.admin === 'admin' || u.admin === 'superadmin')
        }) || (groupMetadata?.owner === safeBot || groupMetadata?.ownerLid === safeBot) : false
        let isRAdmin = isAdmin && m.isGroup ? (groupMetadata?.owner === safeSender || groupMetadata?.ownerLid === safeSender) : false
        if (m.isGroup && !isBotAdmin && groupMetadata?.participants) {
            const freshMetadata = await fetchGroupMetadataWithRetry(this, m.chat)
            if (freshMetadata) {
                freshMetadata.fetchTime = Date.now()
                global.groupCache.set(m.chat, freshMetadata, { ttl: 300 })
                groupMetadata = freshMetadata
                participants = groupMetadata.participants
                normalizedParticipants = participants.map(u => {
                    const normalizedId = this.decodeJid(u.id)
                    return { ...u, id: normalizedId, jid: u.jid || normalizedId }
                })
                isAdmin = groupMetadata.participants.some(u => 
                    (this.decodeJid(u.id) === safeSender || u.jid === safeSender) && 
                    (u.admin === 'admin' || u.admin === 'superadmin')
                )
                isBotAdmin = groupMetadata.participants.some(u => {
                    const normId = this.decodeJid(u.id)
                    return (normId === safeBot || u.jid === safeBot) && 
                           (u.admin === 'admin' || u.admin === 'superadmin')
                }) || (groupMetadata.owner === safeBot || groupMetadata.ownerLid === safeBot)
                isRAdmin = isAdmin && (groupMetadata.owner === safeSender || groupMetadata.ownerLid === safeSender)
            }
        }

        const ___dirname = join(path.dirname(fileURLToPath(import.meta.url)), './plugins')
        for (let name in global.plugins) {
            let plugin = global.plugins[name]
            if (!plugin) continue

            const __filename = join(___dirname, name)
            if (typeof plugin.all === 'function') {
                try {
                    await plugin.all.call(this, m, {
                        chatUpdate,
                        __dirname: ___dirname,
                        __filename
                    })
                } catch (e) {
                    console.error('[ERRORE] Errore in plugin.all:', e)
                }
            }

            if (!global.opts['restrict'] && plugin.tags?.includes('admin')) continue

            const str2Regex = str => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
            let _prefix = plugin.customPrefix || global.prefix || '.'
            let match = (_prefix instanceof RegExp ? [[_prefix.exec(m.text), _prefix]] :
                Array.isArray(_prefix) ? _prefix.map(p => [p instanceof RegExp ? p : new RegExp(str2Regex(p)).exec(m.text), p]) :
                typeof _prefix === 'string' ? [[new RegExp(str2Regex(_prefix)).exec(m.text), _prefix]] :
                [[[], new RegExp]]).find(p => p[1])

            if (typeof plugin.before === 'function') {
                if (await plugin.before.call(this, m, {
                    match,
                    conn: this,
                    participants: normalizedParticipants,
                    groupMetadata,
                    user: { admin: isAdmin ? 'admin' : null },
                    bot: { admin: isBotAdmin ? 'admin' : null },
                    isSam,
                    isROwner,
                    isOwner,
                    isRAdmin,
                    isAdmin,
                    isBotAdmin,
                    isPrems,
                    chatUpdate,
                    __dirname: ___dirname,
                    __filename
                })) continue
            }

            if (typeof plugin !== 'function') continue
            
            if (!match || !match[0]) continue

            usedPrefix = (match[0] || '')[0]
            if (usedPrefix) {
                let noPrefix = m.text.replace(usedPrefix, '')
                let [command, ...args] = noPrefix.trim().split` `.filter(v => v)
                args = args || []
                let _args = noPrefix.trim().split` `.slice(1)
                let text = _args.join` `
                command = command?.toLowerCase() || ''
                let fail = plugin.fail || global.dfail
                let isAccept = plugin.command instanceof RegExp ? plugin.command.test(command) :
                    Array.isArray(plugin.command) ? plugin.command.some(cmd => cmd instanceof RegExp ? cmd.test(command) : cmd === command) :
                    typeof plugin.command === 'string' ? plugin.command === command : false

                if (!isAccept) continue

                if (m.isGroup && (plugin.admin || plugin.botAdmin)) {
                    const freshMetadata = await fetchGroupMetadataWithRetry(this, m.chat)
                    if (freshMetadata) {
                        freshMetadata.fetchTime = Date.now()
                        global.groupCache.set(m.chat, freshMetadata, { ttl: 300 })
                        groupMetadata = freshMetadata
                        participants = groupMetadata.participants
                        normalizedParticipants = participants.map(u => {
                            const normalizedId = this.decodeJid(u.id)
                            return { ...u, id: normalizedId, jid: u.jid || normalizedId }
                        })
                        isAdmin = groupMetadata.participants.some(u => 
                            (this.decodeJid(u.id) === safeSender || u.jid === safeSender) && 
                            (u.admin === 'admin' || u.admin === 'superadmin')
                        )
                        isBotAdmin = groupMetadata.participants.some(u => {
                            const normId = this.decodeJid(u.id)
                            return (normId === safeBot || u.jid === safeBot) && 
                                   (u.admin === 'admin' || u.admin === 'superadmin')
                        }) || (groupMetadata.owner === safeBot || groupMetadata.ownerLid === safeBot)
                        isRAdmin = isAdmin && (groupMetadata.owner === safeSender || groupMetadata.ownerLid === safeSender)
                    }
                }

                if (plugin.disabled && !isOwner) {
                    fail('disabled', m, this)
                    continue
                }

                if (user.muto && !isROwner && !isOwner) {
                    await this.sendMessage(m.chat, { text: `🚫 Sei stato mutato, non puoi usare i comandi.` }, { quoted: m }).catch(e => console.error('[ERRORE] Errore nell\'invio del messaggio:', e))
                    return
                }

                const ignoredGlobally = global.ignoredUsersGlobal.has(safeSender)
                const ignoredInGroup = m.isGroup && global.ignoredUsersGroup[m.chat]?.has(safeSender)
                if ((ignoredGlobally || ignoredInGroup) && !isROwner) {
                    await this.sendMessage(m.chat, { text: `🚫 Non sei autorizzato a usare comandi.` }, { quoted: m }).catch(e => console.error('[ERRORE] Errore nell\'invio del messaggio:', e))
                    return
                }

                m.plugin = name
                if (chat.isBanned && !isROwner && !['gp-sbanchat.js', 'creatore-exec.js', 'gp-delete.js'].includes(name)) return
                if (user.banned && !isROwner && name !== 'creatore-banuser.js') {
                    if (user.antispam > 2) return
                    await this.sendMessage(m.chat, {
                        text: `🚫 *Sei stato bannato/a dall'utilizzo del bot*.\n\n${user.bannedReason ? `🥀 Motivo: ${user.bannedReason}` : `🥀 Motivo: Non specificato ma meritato`}\n\n⚠️ Contatta il creatore con *${usedPrefix}segnala* per problemi.`
                    }, { quoted: m }).catch(e => console.error('[ERRORE] Errore nell\'invio del messaggio:', e))
                    user.antispam++
                    return
                }

                if (m.isGroup && !isOwner && !isROwner && !isAdmin && chat.antispam) {
                    const groupData = global.groupSpam[m.chat] || (global.groupSpam[m.chat] = {
                        count: 0,
                        firstCommandTimestamp: 0,
                        isSuspended: false
                    })
                    const now = Date.now()
                    if (groupData.isSuspended) return

                    if (now - groupData.firstCommandTimestamp > 60000) {
                        groupData.count = 1
                        groupData.firstCommandTimestamp = now
                    } else {
                        groupData.count++
                    }

                    if (groupData.count > 8) {
                        groupData.isSuspended = true
                        await this.reply(m.chat, `『 ⚠️ 』 \`Anti-spam comandi\`\n\n> Rilevati troppi comandi in un minuto, aspettate \`15 secondi\` prima di riutilizzare i comandi.\n\n*ℹ️ Gli admin del gruppo sono esenti da questo limite.*`, m).catch(e => console.error('[ERRORE] Errore nell\'invio della risposta:', e))
                        setTimeout(() => {
                            delete global.groupSpam[m.chat]
                            console.log(`[Anti-Spam] Comandi riattivati per il gruppo: ${m.chat}`)
                        }, 15000)
                        return
                    }
                }

                if (chat.modoadmin && !isOwner && !isROwner && m.isGroup && !isAdmin) return
                if (settings.soloCreatore && !isROwner) return

                if (plugin.sam && !isSam) {
                    fail('sam', m, this)
                    continue
                }
                if (plugin.rowner && !isROwner) {
                    fail('rowner', m, this)
                    continue
                }
                if (plugin.owner && !isOwner) {
                    fail('owner', m, this)
                    continue
                }
                if (plugin.mods && !isMods) {
                    fail('mods', m, this)
                    continue
                }
                if (plugin.premium && !isPrems) {
                    fail('premium', m, this)
                    continue
                }
                if (plugin.group && !m.isGroup) {
                    fail('group', m, this)
                    continue
                }
                if (plugin.botAdmin && !isBotAdmin) {
                    fail('botAdmin', m, this)
                    continue
                }
                if (plugin.admin && !isAdmin) {
                    fail('admin', m, this)
                    continue
                }
                if (plugin.private && m.isGroup) {
                    fail('private', m, this)
                    continue
                }
                if (plugin.register && !user.registered) {
                    fail('unreg', m, this)
                    continue
                }

                m.isCommand = true
                let xp = 'exp' in plugin ? parseInt(plugin.exp) : 17
                if (xp > 200) {
                    await this.reply(m.chat, 'bzzzzz', m).catch(e => console.error('[ERRORE] Errore nella risposta:', e))
                } else {
                    m.exp += xp
                }

                if (!isPrems && plugin.euro && user.euro < plugin.euro) {
                    await this.reply(m.chat, `Niente più soldini, stupido poraccio`, m, null, global.fake).catch(e => console.error('[ERRORE] Errore nella risposta:', e))
                    continue
                }

                let extra = {
                    match,
                    usedPrefix,
                    noPrefix,
                    _args,
                    args,
                    command,
                    text,
                    conn: this,
                    participants: normalizedParticipants,
                    groupMetadata,
                    user: { admin: isAdmin ? 'admin' : null },
                    bot: { admin: isBotAdmin ? 'admin' : null },
                    isSam,
                    isROwner,
                    isOwner,
                    isRAdmin,
                    isAdmin,
                    isBotAdmin,
                    isPrems,
                    chatUpdate,
                    __dirname: ___dirname,
                    __filename
                }

                try {
                    await plugin.call(this, m, extra)
                    if (!isPrems) m.euro = plugin.euro || false
                } catch (e) {
                    m.error = e
                    console.error(`[ERRORE] Errore nell'esecuzione del plugin per la chat ${m.chat}, mittente ${m.sender}:`, e)
                    if (e.message.includes('rate-overlimit')) {
                        console.warn('[AVVISO] Rate limit raggiunto, ritento dopo 2 secondi...')
                        await delay(2000)
                    }
                    let text = format(e)
                    await this.reply(m.chat, text, m).catch(e => console.error('[ERRORE] Errore nella risposta:', e))
                } finally {
                    if (typeof plugin.after === 'function') {
                        try {
                            await plugin.after.call(this, m, extra)
                        } catch (e) {
                            console.error('[ERRORE] Errore in plugin.after:', e)
                        }
                    }
                    if (m.euro) {
                        await this.reply(m.chat, `\`Hai utilizzato *${+m.euro}*\``, m, null, global.rcanal).catch(e => console.error('[ERRORE] Errore nell\'invio della risposta:', e))
                    }
                }
                break
            }
        }
    } catch (e) {
        console.error(`[ERRORE] Errore nel handler per la chat ${m.chat}, mittente ${m.sender}:`, e)
    } finally {
        if (m && user && user.muto && !m.fromMe) {
            await this.sendMessage(m.chat, { delete: m.key }).catch(e => console.error('[ERRORE] Errore nell\'eliminazione del messaggio:', e))
        }

        if (m && user) {
            user.exp += m.exp || 0
            user.euro -= m.euro * 1 || 0

            if (m.plugin) {
                let stats = global.db.data.stats || (global.db.data.stats = {})
                let stat = stats[m.plugin] || (stats[m.plugin] = {
                    total: 0,
                    success: 0,
                    last: 0,
                    lastSuccess: 0
                })
                const now = +new Date
                stat.total += 1
                stat.last = now
                if (!m.error) {
                    stat.success += 1
                    stat.lastSuccess = now
                }
            }
        }

        try {
            if (!global.opts['noprint'] && m) await (await import(`./lib/print.js`)).default(m, this)
        } catch (e) {
            console.error('[ERRORE] Errore in print:', e)
        }

        let settingsREAD = global.db.data.settings[this.user.jid] || {}
        if ((global.opts['autoread'] || settingsREAD.autoread2) && m) {
            await this.readMessages([m.key]).catch(e => console.error('[ERRORE] Errore nella lettura del messaggio:', e))
        }

        if (chat && chat.reaction && m?.text?.match(/(mente|zione|tà|ivo|osa|issimo|ma|però|eppure|anche|ma|no|se|ai|ciao|si)/gi) && !m.fromMe) {
            const emot = pickRandom([
                "🍟", "😃", "😄", "😁", "😆", "🍓", "😅", "😂", "🤣", "🥲", "☺️", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰"
            ])
            await this.sendMessage(m.chat, { react: { text: emot, key: m.key } }).catch(e => console.error('[ERRORE] Errore nell\'invio della reazione:', e))
        }
    }
}

global.dfail = async (type, m, conn) => {
    const nome = m.pushName || 'sam'
    const etarandom = Math.floor(Math.random() * 21) + 13
    const msg = {
        sam: '- 〘 🔒 〙 *`ꪶ͢Comando riservato esclusivamente al creatoreꫂ`*',
        rowner: '- 〘 👑 〙- *`ꪶ͢Solo il creatore del bot può usare questa funzioneꫂ`*',
        owner: '- 〘 🛡️ 〙 *`ꪶ͢Solo gli owner del bot possono usare questa funzioneꫂ`*',
        mods: '- 〘 ⚙️ 〙 *`ꪶ͢Solo i moderatori possono usare questo comandoꫂ`*',
        premium: '- 〘 💎 〙 *`ꪶ͢Solo gli utenti premium possono usare questo comandoꫂ`*',
        group: '- 〘 👥 〙 *`ꪶ͢Questo comando va usato solo nei gruppiꫂ`*',
        private: '- 〘 📩 〙 *`ꪶ͢Questa funzione può essere usata solo in privatoꫂ`*',
        admin: '- 〘 🛠️ 〙 *`ꪶ͢Solo gli admin del gruppo possono usare questo comandoꫂ`*',
        botAdmin: '- 〘 🤖 〙 *`ꪶ͢Devo essere admin per eseguire questo comandoꫂ`*',
        unreg: `- 〘 📛 〙 *\`ꪶ͢Non sei registrato/a, registrati per usare questa funzioneꫂ\`*\n> *\`ꪶ͢Formato: nome etàꫂ\`*\n\n *_esempio:_*\n *\`.reg ${nome} ${etarandom}\`*`,
        restrict: '- 〘 🚫 〙 *`ꪶ͢Questa funzione è attualmente disattivataꫂ`*',
        disabled: '- 〘 🚫 〙 *`ꪶ͢Questo comando è attualmente disabilitatoꫂ`*'
    }[type]
    if (msg) {
        conn.reply(m.chat, msg, m, global.rcanal).catch(e => console.error('[ERRORE] Errore in dfail:', e))
    }
}

function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)]
}

let file = global.__filename(import.meta.url, true)
watchFile(file, async () => { 
    unwatchFile(file)     
    console.log(chalk.bgMagenta("File: 'handler.js' aggiornato!"))
})
