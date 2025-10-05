import axios from "axios";

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) return conn.reply(m.chat, `🎨 *Flux Multi-LoRA AI Generator*\n\n*Questo comando permette di applicare stili (LoRA) tramite URL.*\n\n📝 *Per usare:* ${usedPrefix}${command} <descrizione> | <url_lora_1> | <url_lora_2> ...\n\n💡 *Esempio:* ${usedPrefix}${command} a beautiful princess | https://civitai.com/api/download/models/128424\n\n*Il LoRA è opzionale. Puoi usare anche solo il prompt.*`, m, {
        contextInfo: {
            externalAdReply: {
                title: "FLUX DEV MULTI-LORA",
                body: "Generatore di Immagini con LoRA",
                thumbnail: "https://replicate.delivery/pbxt/J1dxp5GeEv31b6hCLeED3HpHJAb3y5w5a44DkYsk4xXjGAgE/output_1.png",
                sourceUrl: "https://replicate.com/lucataco/flux-dev-multi-lora",
                mediaType: 1,
            }
        }
    });

    await m.react('🉐');

    try {
        // --- MODIFICA: Parsing dell'input per separare prompt e LoRA ---
        const parts = text.split('|').map(part => part.trim());
        const prompt = parts.shift(); // Il primo elemento è sempre il prompt
        const loras = parts.filter(url => url.startsWith('http')); // Gli altri sono gli URL dei LoRA

        if (!prompt) {
            return conn.reply(m.chat, `Inserisci almeno un prompt. Esempio: \`${usedPrefix}${command} un gatto vichingo\``, m);
        }

        const imageBuffer = await generateImageWithReplicate(prompt, loras);

        if (imageBuffer) {
            let caption = `『 📝 』 \`Prompt:\` *${prompt}*`;
            if (loras.length > 0) {
                caption += `\n\n『 ✨ 』\`LoRA Applicati:\`\n- ${loras.join('\n- ')}`;
            }
            
            await conn.sendMessage(m.chat, {
                image: imageBuffer,
                caption: caption,
                mentions: [m.sender]
            }, { quoted: m });
        }
    } catch (error) {
        await m.react('❌');
        console.error(error);
        conn.reply(m.chat, `⚠️ Si è verificato un errore durante la generazione dell'immagine. Dettagli: ${error.message}`, m);
    }
};

handler.help = ['lora'];
handler.tags = ['strumenti', 'ia', 'iaimmagini', 'premium'];
handler.command = /^(lora)$/i;
handler.register = true;
handler.premium = true;

export default handler;

// La funzione ora accetta sia il prompt che un array di LoRA
async function generateImageWithReplicate(prompt, loras = []) {
    const apiKey = global.APIKeys.replicate;
    if (!apiKey) throw new Error("Chiave API di Replicate non configurata.");

    const modelVersion = "lucataco/flux-dev-multi-lora:2389224e115448d9a77c07d7d45672b3f0aa45acacf1c5bcf51857ac295e3aec";

    try {
        const startResponse = await axios({
            method: 'POST',
            url: 'https://api.replicate.com/v1/predictions',
            headers: {
                'Authorization': `Token ${apiKey}`,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({
                version: modelVersion,
                input: {
                    prompt: `${prompt}`,
                    hf_loras: loras,
                    num_outputs: 1,
                    aspect_ratio: "1:1",
                    output_format: "webp",
                    guidance_scale: 3.5,
                    output_quality: 90,
                    prompt_strength: 0.8,
                    num_inference_steps: 28
                }
            }),
            timeout: 30000
        });

        let prediction = startResponse.data;
        const endpointUrl = prediction.urls.get;

        while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
            await new Promise(resolve => setTimeout(resolve, 3000));
            const pollResponse = await axios.get(endpointUrl, {
                headers: { 'Authorization': `Token ${apiKey}` },
                timeout: 30000
            });
            prediction = pollResponse.data;
        }

        if (prediction.status === 'succeeded' && prediction.output) {
            const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
            const imageResponse = await axios.get(imageUrl, { 
                responseType: 'arraybuffer',
                timeout: 60000
            });
            return Buffer.from(imageResponse.data, 'binary');
        } else {
            throw new Error(`Generazione immagine fallita. Stato: ${prediction.status}. Errore: ${prediction.error}`);
        }
    } catch (error) {
        const errorMessage = error.response?.data?.detail || error.message;
        throw new Error(`Errore con Replicate API: ${errorMessage}`);
    }
}