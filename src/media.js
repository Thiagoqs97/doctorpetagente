'use strict';

require('dotenv').config();
const OpenAI = require('openai');
const axios = require('axios');
const logger = require('./logger');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.AI_MODEL || 'gpt-4o-mini';

// ─── Buscar base64 da mídia na Evolution API ────────────────────────────────────
// Quando o webhook NÃO traz o base64 junto (muito comum), fazemos uma chamada
// extra na Evolution API para baixar a mídia. É o mesmo que você faz no n8n.

async function buscarBase64NaEvolution(messageKey, messageData) {
  const baseUrl = process.env.EVOLUTION_API_URL?.replace(/\/$/, '');
  const instance = process.env.EVOLUTION_INSTANCE;
  const apiKey = process.env.EVOLUTION_API_KEY;

  if (!baseUrl || !instance || !apiKey) {
    console.warn('[MEDIA] Evolution API não configurada para download de mídia');
    return null;
  }

  try {
    // Endpoint: POST /chat/getBase64FromMediaMessage/{instance}
    // Payload: a mensagem inteira (key + message)
    console.log('[MEDIA] 📥 Buscando base64 na Evolution API (fallback)...');
    logger.registrar(logger.TIPOS.MIDIA_PROCESSADA, 'Buscando mídia via Evolution API (base64 não veio no webhook)', {
      messageId: messageKey?.id || '',
    }, 'info');

    const resp = await axios.post(
      `${baseUrl}/chat/getBase64FromMediaMessage/${instance}`,
      {
        message: messageData,
        convertToMp4: false
      },
      {
        headers: {
          'Content-Type': 'application/json',
          apikey: apiKey,
        },
        timeout: 30000, // 30s timeout pra mídias grandes
      }
    );

    // A resposta vem em resp.data.base64 ou resp.data
    const base64 = resp.data?.base64 || resp.data?.media || resp.data || null;

    if (base64 && typeof base64 === 'string' && base64.length > 100) {
      console.log(`[MEDIA] ✅ Base64 obtido via Evolution API (${Math.round(base64.length / 1024)}KB)`);
      logger.registrar(logger.TIPOS.MIDIA_PROCESSADA, `Base64 obtido via fallback Evolution (${Math.round(base64.length / 1024)}KB)`, {}, 'success');
      return base64;
    }

    console.warn('[MEDIA] ⚠️ Evolution API retornou sem base64 válido');
    console.warn('[MEDIA] Resposta:', typeof resp.data, JSON.stringify(resp.data).substring(0, 200));
    return null;

  } catch (err) {
    console.error(`[MEDIA] ❌ Falha ao buscar base64 na Evolution: ${err.message}`);
    if (err.response) {
      console.error(`[MEDIA] Status: ${err.response.status} | Body: ${JSON.stringify(err.response.data).substring(0, 300)}`);
    }
    logger.registrar(logger.TIPOS.ERRO, `Falha ao buscar mídia na Evolution: ${err.message}`, {
      status: err.response?.status,
      resposta: JSON.stringify(err.response?.data || '').substring(0, 200),
    }, 'error');
    return null;
  }
}

/**
 * Extrai base64 de todos os lugares possíveis no payload do webhook.
 * Se não encontrar, faz fallback chamando a Evolution API.
 */
async function extrairBase64(fullData, messageTypeData, messageKey) {
  // 1. Tentar todas as localizações possíveis do base64 no payload
  const candidatos = [
    fullData?.media,
    fullData?.message?.base64,
    fullData?.base64,
    messageTypeData?.base64,
  ];

  for (const candidato of candidatos) {
    if (candidato && typeof candidato === 'string' && candidato.length > 100) {
      console.log(`[MEDIA] ✅ Base64 encontrado no payload do webhook (${Math.round(candidato.length / 1024)}KB)`);
      return candidato;
    }
  }

  // 2. Fallback: buscar na Evolution API
  console.log('[MEDIA] ⚠️ Base64 NÃO encontrado no webhook. Tentando fallback via Evolution API...');

  // Precisamos enviar a mensagem completa para a Evolution API conseguir baixar
  const base64 = await buscarBase64NaEvolution(messageKey, fullData);
  return base64;
}

// ─── Processadores de mídia ─────────────────────────────────────────────────────

/**
 * Transcreve áudio usando o Whisper da OpenAI.
 */
async function transcreverAudio(base64Data, mimeType = 'audio/ogg') {
  const buffer = Buffer.from(base64Data, 'base64');
  const ext = mimeType.includes('ogg') ? 'ogg'
    : mimeType.includes('mp3') ? 'mp3'
    : mimeType.includes('mp4') ? 'mp4'
    : mimeType.includes('mpeg') ? 'mp3'
    : mimeType.includes('webm') ? 'webm'
    : 'ogg';
  const file = new File([buffer], `audio.${ext}`, { type: mimeType.split(';')[0].trim() });

  const transcription = await openai.audio.transcriptions.create({
    model: 'whisper-1',
    file: file,
    language: 'pt'
  });

  return transcription.text.trim();
}

/**
 * Descreve uma imagem usando GPT-4o vision.
 */
async function descreverImagem(base64Data, mimeType = 'image/jpeg') {
  const dataUrl = `data:${mimeType.split(';')[0].trim()};base64,${base64Data}`;
  
  const completion = await openai.chat.completions.create({
    model: process.env.AI_MODEL || 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Descreva esta imagem em detalhes. Se for de um animal, foque em aparência, condição visível, sinais de saúde visíveis, comportamento aparente e qualquer detalhe relevante para uma consulta veterinária.' },
          { type: 'image_url', image_url: { url: dataUrl } }
        ]
      }
    ],
    max_tokens: 500
  });

  return completion.choices[0].message.content.trim();
}

// Requer pdf-parse no início da função (ou no arquivo)
const pdfParse = require('pdf-parse');

/**
 * Resume um documento — para PDFs, extrai texto com pdf-parse e resume com GPT-4o-mini.
 */
async function resumirDocumento(base64Data, mimeType = 'application/pdf') {
  if (mimeType.includes('pdf')) {
    try {
      const buffer = Buffer.from(base64Data, 'base64');
      const data = await pdfParse(buffer);
      const textExtraido = data.text;
      
      const completion = await openai.chat.completions.create({
        model: process.env.AI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Você é um assistente veterinário. Extraia e resuma o conteúdo a seguir retirado de um PDF lido. Se for um documento veterinário (prontuário, exame, receita), destaque as informações cruciais. Mantenha sucinto.' },
          { role: 'user', content: textExtraido.substring(0, 15000) } // limitação de tamanho razoável
        ],
        max_tokens: 500
      });
      return completion.choices[0].message.content.trim();
    } catch (e) {
      console.error('[MEDIA] Erro ao extrair PDF:', e.message);
      return '[Erro ao ler arquivo PDF: Ele pode estar criptografado ou corrompido]';
    }
  }

  // Imagem de documento
  const dataUrl = `data:${mimeType.split(';')[0].trim()};base64,${base64Data}`;
  const completion = await openai.chat.completions.create({
    model: process.env.AI_MODEL || 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Extraia e resuma o conteúdo principal deste documento. Se for um documento veterinário (prontuário, exame, receita), destaque as informações mais importantes para o atendimento.' },
          { type: 'image_url', image_url: { url: dataUrl } }
        ]
      }
    ],
    max_tokens: 500
  });

  return completion.choices[0].message.content.trim();
}

// ─── Processador principal ──────────────────────────────────────────────────────

/**
 * Processa a mensagem de acordo com o tipo detectado.
 * Agora com fallback automático: se o base64 não vier no webhook,
 * busca diretamente na Evolution API (igual ao que faz no n8n).
 */
async function processarMidia(tipoWA, message, fullData) {
  try {
    switch (tipoWA) {
      case 'conversation':
        return { tipo: 'text', conteudo: message.conversation || '' };

      case 'extendedTextMessage':
        return { tipo: 'text', conteudo: message.extendedTextMessage?.text || '' };

      case 'audioMessage': {
        const audioMsg = message.audioMessage || {};
        const messageKey = fullData?.key || {};

        // Extrair base64 com fallback automático
        const base64 = await extrairBase64(fullData, audioMsg, messageKey);

        if (!base64) {
          console.warn('[MEDIA] ❌ Áudio: impossível obter base64 (webhook E fallback falharam)');
          logger.registrar(logger.TIPOS.ERRO, 'Áudio sem base64 — webhook e fallback falharam', {
            mimetype: audioMsg.mimetype,
            seconds: audioMsg.seconds,
          }, 'error');
          return { tipo: 'audio', conteudo: '[Áudio recebido mas não foi possível transcrever. Por favor, digite sua mensagem em texto.]' };
        }

        const mimeType = audioMsg.mimetype || 'audio/ogg';
        console.log(`[MEDIA] 🎙️ Transcrevendo áudio (${audioMsg.seconds || '?'}s, ${mimeType})...`);
        const transcricao = await transcreverAudio(base64, mimeType);
        logger.registrar(logger.TIPOS.MIDIA_PROCESSADA, `Áudio transcrito com sucesso (${audioMsg.seconds || '?'}s)`, {
          transcricaoPreview: transcricao.substring(0, 100),
        }, 'success');
        return { tipo: 'audio', conteudo: `[Áudio]: ${transcricao}` };
      }

      case 'imageMessage': {
        const imgMsg = message.imageMessage || {};
        const messageKey = fullData?.key || {};

        const base64 = await extrairBase64(fullData, imgMsg, messageKey);

        if (!base64) {
          console.warn('[MEDIA] ❌ Imagem: impossível obter base64');
          logger.registrar(logger.TIPOS.ERRO, 'Imagem sem base64 — webhook e fallback falharam', {
            mimetype: imgMsg.mimetype,
          }, 'error');
          return { tipo: 'imagem', conteudo: '[Imagem recebida mas não foi possível analisar. Pode descrever o que está na imagem?]' };
        }

        const mimeType = imgMsg.mimetype || 'image/jpeg';
        console.log(`[MEDIA] 🖼️ Descrevendo imagem (${mimeType})...`);
        const descricao = await descreverImagem(base64, mimeType);
        const legenda = imgMsg.caption ? ` | Legenda: ${imgMsg.caption}` : '';
        logger.registrar(logger.TIPOS.MIDIA_PROCESSADA, 'Imagem descrita com sucesso', {
          descricaoPreview: descricao.substring(0, 100),
        }, 'success');
        return { tipo: 'imagem', conteudo: `[Imagem]: ${descricao}${legenda}` };
      }

      case 'documentMessage': {
        const docMsg = message.documentMessage || {};
        const messageKey = fullData?.key || {};

        const base64 = await extrairBase64(fullData, docMsg, messageKey);

        if (!base64) {
          console.warn('[MEDIA] ❌ Documento: impossível obter base64');
          const nomeArquivo = docMsg.fileName || 'arquivo';
          logger.registrar(logger.TIPOS.ERRO, `Documento "${nomeArquivo}" sem base64`, {
            fileName: nomeArquivo,
            mimetype: docMsg.mimetype,
          }, 'error');
          return { tipo: 'arquivo', conteudo: `[Arquivo "${nomeArquivo}" recebido mas não foi possível processar. Pode me dizer o que contém?]` };
        }

        const mimeType = docMsg.mimetype || 'application/pdf';
        const nomeArquivo = docMsg.fileName || 'arquivo';
        console.log(`[MEDIA] 📄 Resumindo documento "${nomeArquivo}" (${mimeType})...`);
        const resumo = await resumirDocumento(base64, mimeType);
        logger.registrar(logger.TIPOS.MIDIA_PROCESSADA, `Documento "${nomeArquivo}" processado`, {}, 'success');
        return { tipo: 'arquivo', conteudo: `[Arquivo]: ${resumo}` };
      }

      case 'videoMessage':
        return { tipo: 'text', conteudo: '[Vídeo recebido — a Luna ainda não consegue processar vídeos, mas pode me descrever o que acontece nele?]' };

      case 'stickerMessage':
        return { tipo: 'text', conteudo: '[Sticker recebido 😄]' };

      default:
        console.log(`[MEDIA] Tipo desconhecido: ${tipoWA}`);
        return null;
    }
  } catch (err) {
    console.error(`[MEDIA] Erro ao processar ${tipoWA}:`, err.message);
    logger.registrar(logger.TIPOS.ERRO, `Erro ao processar mídia ${tipoWA}: ${err.message}`, {
      erro: err.message,
      stack: err.stack?.split('\n').slice(0, 3).join(' | '),
    }, 'error');
    return { tipo: 'text', conteudo: '[Mensagem recebida mas não foi possível processar o conteúdo. Por favor, tente enviar em texto.]' };
  }
}

module.exports = { processarMidia, transcreverAudio, descreverImagem, resumirDocumento, buscarBase64NaEvolution };
