import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import NodeCache from 'node-cache';
const { initAuthCreds, BufferJSON, proto } = (await import('@realvare/based')).default;

const CONFIG = {
  CACHE_TTL: {
    CONTACTS: 600,
    GROUPS: 300,
    PRESENCE: 60
  },
  CACHE_CHECK_PERIOD: 120,
  MAX_CACHE_SIZE: 1000,
  DEBOUNCE_DELAY: 1000,
  SAVE_DELAY: 5000,
  MAX_SAVE_COUNT: 10
};

const contactCache = new NodeCache({ 
  stdTTL: CONFIG.CACHE_TTL.CONTACTS,
  checkperiod: CONFIG.CACHE_CHECK_PERIOD,
  maxKeys: CONFIG.MAX_CACHE_SIZE
});

const groupCache = new NodeCache({ 
  stdTTL: CONFIG.CACHE_TTL.GROUPS,
  checkperiod: CONFIG.CACHE_CHECK_PERIOD,
  maxKeys: CONFIG.MAX_CACHE_SIZE
});

const presenceCache = new NodeCache({ 
  stdTTL: CONFIG.CACHE_TTL.PRESENCE,
  checkperiod: CONFIG.CACHE_CHECK_PERIOD,
  maxKeys: CONFIG.MAX_CACHE_SIZE
});

function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

function isValidJid(jid) {
  return jid && typeof jid === 'string' && jid !== 'status@broadcast' && jid.includes('@');
}

async function safeAsync(fn, fallback = null) {
  try {
    return await fn();
  } catch (error) {
    console.error(`[SafeAsync] Error: ${error.message}`);
    return fallback;
  }
}

/**
 * @param {import('@realvare/based').WASocket | import('@realvare/based').WALegacySocket}
 */
function bind(conn) {
  if (!conn.ev) {
    console.warn('[Store] conn.ev is not defined, skipping store bind');
    return;
  }

  // Inizializza le strutture dati
  if (!conn.chats) conn.chats = {};
  if (!conn.messages) conn.messages = {};

  // Debounced group metadata fetcher
  const debouncedGroupMetadata = debounce(async (id) => {
    if (!groupCache.has(id)) {
      const metadata = await safeAsync(() => conn.groupMetadata(id));
      if (metadata) {
        groupCache.set(id, metadata);
      }
    }
    return groupCache.get(id);
  }, CONFIG.DEBOUNCE_DELAY);

  /**
   * Aggiorna i contatti nel database
   * @param {import('@realvare/based').Contact[]|{contacts:import('@realvare/based').Contact[]}} contacts
   */
  function updateNameToDb(contacts) {
    if (!contacts) return;
    
    try {
      contacts = contacts.contacts || contacts;
      const validContacts = contacts.filter(contact => {
        const id = conn.decodeJid(contact.id);
        return isValidJid(id);
      });

      for (const contact of validContacts) {
        const id = conn.decodeJid(contact.id);
        
        // Aggiorna cache contatti
        contactCache.set(id, contact);
        
        // Aggiorna chats
        let chat = conn.chats[id];
        if (!chat) {
          chat = conn.chats[id] = { ...contact, id };
        }
        
        const isGroup = id.endsWith('@g.us');
        conn.chats[id] = {
          ...chat,
          ...contact,
          id,
          ...(isGroup ? {
            subject: contact.subject || contact.name || chat.subject || ''
          } : {
            name: contact.notify || contact.name || chat.name || chat.notify || ''
          })
        };
      }
    } catch (error) {
      console.error('[Store] Error in updateNameToDb:', error.message);
    }
  }

  // Gestione chats.set con miglioramenti
  conn.ev.on('chats.set', async ({ chats }) => {
    try {
      const processChat = async ({ id, name, readOnly }) => {
        id = conn.decodeJid(id);
        if (!isValidJid(id)) return;

        const isGroup = id.endsWith('@g.us');
        let chat = conn.chats[id];
        
        if (!chat) {
          chat = conn.chats[id] = { id };
        }
        
        chat.isChats = !readOnly;
        if (name) {
          chat[isGroup ? 'subject' : 'name'] = name;
        }

        if (isGroup) {
          const metadata = await debouncedGroupMetadata(id);
          if (metadata) {
            chat.subject = name || metadata.subject;
            chat.metadata = metadata;
          }
        }
      };

      await Promise.all(chats.map(processChat));
    } catch (error) {
      console.error('[Store] Error in chats.set:', error.message);
    }
  });

  // Gestione groups.update (rimuovo duplicazione)
  conn.ev.on('groups.update', async (groupsUpdates) => {
    try {
      const processGroupUpdate = async (update) => {
        if (!update?.id) return;
        
        const id = conn.decodeJid(update.id);
        if (!isValidJid(id) || !id.endsWith('@g.us')) return;

        let chat = conn.chats[id];
        if (!chat) {
          chat = conn.chats[id] = { id };
        }
        
        chat.isChats = true;
        
        const metadata = await debouncedGroupMetadata(id);
        if (metadata) {
          chat.metadata = metadata;
          chat.subject = update.subject || metadata.subject;
        }
        
        // Aggiorna anche il cache
        if (metadata) {
          groupCache.set(id, metadata);
        }
      };

      await Promise.all(groupsUpdates.filter(Boolean).map(processGroupUpdate));
    } catch (error) {
      console.error('[Store] Error in groups.update:', error.message);
    }
  });

  // Gestione group-participants.update
  conn.ev.on('group-participants.update', async ({ id, participants, action }) => {
    if (!id) return;
    
    const decodedId = conn.decodeJid(id);
    if (!isValidJid(decodedId)) return;

    try {
      if (!(decodedId in conn.chats)) {
        conn.chats[decodedId] = { id: decodedId };
      }
      
      const chat = conn.chats[decodedId];
      chat.isChats = true;
      
      const metadata = await debouncedGroupMetadata(decodedId);
      if (metadata) {
        chat.subject = metadata.subject;
        chat.metadata = metadata;
      }
    } catch (error) {
      console.error('[Store] Error in group-participants.update:', error.message);
    }
  });

  // Gestione chats.upsert
  conn.ev.on('chats.upsert', (chatsUpsert) => {
    try {
      if (!chatsUpsert?.id) return;
      
      const id = conn.decodeJid(chatsUpsert.id);
      if (!isValidJid(id)) return;

      conn.chats[id] = {
        ...(conn.chats[id] || {}),
        ...chatsUpsert,
        isChats: true
      };

      // Se è un gruppo, carica i metadati
      if (id.endsWith('@g.us')) {
        safeAsync(() => conn.insertAllGroup());
      }
    } catch (error) {
      console.error('[Store] Error in chats.upsert:', error.message);
    }
  });

  // Gestione presence.update con cache
  conn.ev.on('presence.update', async ({ id, presences }) => {
    try {
      const sender = Object.keys(presences)[0] || id;
      const decodedSender = conn.decodeJid(sender);
      
      if (!isValidJid(decodedSender)) return;

      const presence = presences[sender]?.lastKnownPresence || 'composing';
      
      // Cache presence
      presenceCache.set(decodedSender, presence);
      
      let chat = conn.chats[decodedSender];
      if (!chat) {
        chat = conn.chats[decodedSender] = { id: sender };
      }
      
      chat.presences = presence;
      
      // Gestione presence per gruppi
      if (id.endsWith('@g.us')) {
        let groupChat = conn.chats[id];
        if (!groupChat) {
          groupChat = conn.chats[id] = { id };
        }
      }
    } catch (error) {
      console.error('[Store] Error in presence.update:', error.message);
    }
  });

  // Event handlers esistenti
  conn.ev.on('contacts.upsert', updateNameToDb);
  conn.ev.on('contacts.set', updateNameToDb);
}

const KEY_MAP = {
  'pre-key': 'preKeys',
  'session': 'sessions',
  'sender-key': 'senderKeys',
  'app-state-sync-key': 'appStateSyncKeys',
  'app-state-sync-version': 'appStateVersions',
  'sender-key-memory': 'senderKeyMemory',
};

/**
 * Gestione stato autenticazione con miglioramenti
 * @param {String} filename
 * @param {import('pino').Logger} logger
 * @returns
 */
function useSingleFileAuthState(filename, logger) {
  let creds;
  let keys = {};
  let saveCount = 0;
  let saveTimeout = null;

  // Crea directory se non esiste
  const ensureDir = () => {
    try {
      const dir = dirname(filename);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    } catch (error) {
      console.error('[AuthState] Error creating directory:', error.message);
    }
  };

  // Salvataggio debounced
  const debouncedSave = debounce((forceSave = false) => {
    logger?.trace('[AuthState] Saving auth state');
    saveCount++;
    
    if (forceSave || saveCount >= CONFIG.MAX_SAVE_COUNT) {
      try {
        ensureDir();
        const data = JSON.stringify({ creds, keys }, BufferJSON.replacer, 2);
        writeFileSync(filename, data);
        saveCount = 0;
        logger?.debug('[AuthState] Auth state saved successfully');
      } catch (error) {
        console.error('[AuthState] Error saving auth state:', error.message);
      }
    }
  }, CONFIG.SAVE_DELAY);

  // Caricamento stato
  const loadState = () => {
    if (existsSync(filename)) {
      try {
        const data = readFileSync(filename, { encoding: 'utf-8' });
        if (data.trim()) {
          const result = JSON.parse(data, BufferJSON.reviver);
          creds = result.creds;
          keys = result.keys || {};
          logger?.debug('[AuthState] Auth state loaded successfully');
        } else {
          logger?.warn('[AuthState] Empty auth file, initializing new state');
          creds = initAuthCreds();
          keys = {};
        }
      } catch (error) {
        console.error('[AuthState] Error loading auth state:', error.message);
        logger?.warn('[AuthState] Initializing new auth state due to error');
        creds = initAuthCreds();
        keys = {};
      }
    } else {
      logger?.info('[AuthState] No auth file found, initializing new state');
      creds = initAuthCreds();
      keys = {};
    }
  };

  loadState();

  return {
    state: {
      creds,
      keys: {
        get: (type, ids) => {
          const key = KEY_MAP[type];
          if (!key) return {};
          
          return ids.reduce((dict, id) => {
            const value = keys[key]?.[id];
            if (value) {
              if (type === 'app-state-sync-key') {
                dict[id] = proto.AppStateSyncKeyData.fromObject(value);
              } else {
                dict[id] = value;
              }
            }
            return dict;
          }, {});
        },
        set: (data) => {
          for (const _key in data) {
            const key = KEY_MAP[_key];
            if (key) {
              keys[key] = keys[key] || {};
              Object.assign(keys[key], data[_key]);
            }
          }
          debouncedSave();
        },
      },
    },
    saveState: (force = false) => debouncedSave(force),
    clearState: () => {
      creds = initAuthCreds();
      keys = {};
      debouncedSave(true);
    }
  };
}

/**
 * Caricamento messaggi migliorato
 * @param {String} jid 
 * @param {String} id 
 * @returns 
 */
function loadMessage(jid, id = null) {
  try {
    if (!jid) return null;
    
    // Se abbiamo solo l'ID del messaggio
    if (!id) {
      id = jid;
      const filter = (m) => m.key?.id === id;
      
      // Cerca in tutte le chat
      for (const [chatJid, messages] of Object.entries(this.messages || {})) {
        const message = messages.find(filter);
        if (message) return message;
      }
      return null;
    }
    
    // Cerca messaggio specifico in una chat specifica
    const decodedJid = this.decodeJid?.(jid) || jid;
    const messages = this.messages?.[decodedJid] || [];
    return messages.find(m => m.key.id === id) || null;
    
  } catch (error) {
    console.error('[Store] Error in loadMessage:', error.message);
    return null;
  }
}

// Funzioni di utilità per il cache
function clearCache(type = 'all') {
  try {
    switch (type) {
      case 'contacts':
        contactCache.flushAll();
        break;
      case 'groups':
        groupCache.flushAll();
        break;
      case 'presence':
        presenceCache.flushAll();
        break;
      case 'all':
        contactCache.flushAll();
        groupCache.flushAll();
        presenceCache.flushAll();
        break;
    }
    console.log(`[Store] Cache cleared: ${type}`);
  } catch (error) {
    console.error('[Store] Error clearing cache:', error.message);
  }
}

function getCacheStats() {
  return {
    contacts: contactCache.getStats(),
    groups: groupCache.getStats(),
    presence: presenceCache.getStats()
  };
}

export default {
  bind,
  useSingleFileAuthState,
  loadMessage,
  clearCache,
  getCacheStats,
  CONFIG
};