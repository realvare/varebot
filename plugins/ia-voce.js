import fetch from 'node-fetch';

let handler = async (m, { conn, args, usedPrefix, command }) => {
  const [voiceKey, ...textArr] = m.text.split('|').map(v => v.trim());
  const voice = voiceKey?.replace(usedPrefix + command, '').trim().toLowerCase();
  const text = textArr.join(' ');

  const voices = {
    antonio: 'TxGEqnHWrfWFTfGW9XjX',  // Italian Male
    giulia: 'MF3mGyEYCl7XYWbV9V6O',   // Italian Female
    narratore: 'pNInz6obpgDQGcFmaJgB', // English Male
    sofia: '21m00Tcm4TlvDq8ikWAM',     // English Female
  };

  if (!voice || !text) {
    return m.reply(`❌ *Uso corretto:* ${usedPrefix}voce <voce> | <testo>\n\n🎙️ *Voci disponibili:*\n${Object.keys(voices).join(', ')}`);
  }

  const voiceId = voices[voice];
  if (!voiceId) return m.reply(`❌ Voce non trovata. Usa una di queste: ${Object.keys(voices).join(', ')}`);

  const payload = {
    text,
    model_id: 'eleven_multilingual_v2', // forza il modello multilingua
    voice_settings: {
      stability: 0.7,
      similarity_boost: 0.85,
      style: 0.3,
      use_speaker_boost: true
    }
  };

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': global.APIKeys?.elevenlabs,
        'Content-Type': 'application/json',
        'accept': 'audio/mpeg'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(await res.text());
    const audio = await res.buffer();
    const filename = `voce-${Date.now()}.mp3`;

    await conn.sendFile(m.chat, audio, filename, null, m, true, {
      mimetype: 'audio/mpeg',
      ptt: false
    });

  } catch (e) {
    console.error('[ERROR VOCE]', e);
    m.reply('❌ Errore nella generazione vocale.');
  }
};

handler.help = ['voce <voce> | <testo>'];
handler.tags = ['ai', 'audio'];
handler.command = /^voce$/i;
handler.register = true
export default handler;