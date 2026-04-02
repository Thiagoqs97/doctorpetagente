'use strict';

require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.AI_MODEL || 'gpt-4o-mini';

/**
 * Transcreve áudio usando o Whisper da OpenAI.
 * Recebe base64 e converte para buffer.
 */
async function transcreverAudio(base64Data, mimeType = 'audio/ogg') {
  const buffer = Buffer.from(base64Data, 'base64');
  // Criar um File-like object para a API
  const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp3') ? 'mp3' : 'wav';
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

/**
 * Resume um documento — para PDFs, extrai texto com GPT-4o vision.
 */
async function resumirDocumento(base64Data, mimeType = 'application/pdf') {
  // Para PDFs e documentos, converter para imagem não é ideal.
  // Usamos uma abordagem de texto: enviar como contexto se possível.
  if (mimeType.includes('pdf')) {
    // PDF precisa ser convertido — por ora usar fallback textual
    const completion = await openai.chat.completions.create({
      model: process.env.AI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'O usuário enviou um documento PDF. Não foi possível processá-lo diretamente. Peça para o usuário descrever o conteúdo ou enviar como imagem/foto.' },
        { role: 'user', content: 'O cliente enviou um documento PDF.' }
      ],
      max_tokens: 200
    });
    return completion.choices[0].message.content.trim();
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

/**
 * Processa a mensagem de acordo com o tipo detectado.
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
        const base64 = fullData?.media || fullData?.message?.base64 || message?.base64 || audioMsg?.base64 || fullData?.base64 || '';
        if (!base64) {
          console.warn('[MEDIA] Áudio sem base64 disponível. Verifique se o Webhook Base64 está ativo na Evolution API.');
          return { tipo: 'audio', conteudo: '[Áudio]: (não foi possível transcrever - configure o Webhook Base64 na Evolution)' };
        }
        const mimeType = audioMsg.mimetype || 'audio/ogg';
        console.log('[MEDIA] Transcrevendo áudio com Whisper...');
        const transcricao = await transcreverAudio(base64, mimeType);
        return { tipo: 'audio', conteudo: `[Áudio]: ${transcricao}` };
      }

      case 'imageMessage': {
        const imgMsg = message.imageMessage || {};
        const base64 = fullData?.media || fullData?.message?.base64 || message?.base64 || imgMsg?.base64 || fullData?.base64 || '';
        if (!base64) {
          console.warn('[MEDIA] Imagem sem base64 disponível. Verifique se o Webhook Base64 está ativo.');
          return { tipo: 'imagem', conteudo: '[Imagem]: (não foi possível processar a imagem - configure o Webhook Base64)' };
        }
        const mimeType = imgMsg.mimetype || 'image/jpeg';
        console.log('[MEDIA] Descrevendo imagem com GPT-4o...');
        const descricao = await descreverImagem(base64, mimeType);
        const legenda = imgMsg.caption ? ` | Legenda: ${imgMsg.caption}` : '';
        return { tipo: 'imagem', conteudo: `[Imagem]: ${descricao}${legenda}` };
      }

      case 'documentMessage': {
        const docMsg = message.documentMessage || {};
        const base64 = fullData?.media || fullData?.message?.base64 || message?.base64 || docMsg?.base64 || fullData?.base64 || '';
        if (!base64) {
          console.warn('[MEDIA] Documento sem base64 disponível. Verifique o Webhook Base64.');
          const nomeArquivo = docMsg.fileName || 'arquivo';
          return { tipo: 'arquivo', conteudo: `[Arquivo]: ${nomeArquivo} (não foi possível processar - sem base64)` };
        }
        const mimeType = docMsg.mimetype || 'application/pdf';
        console.log('[MEDIA] Resumindo documento...');
        const resumo = await resumirDocumento(base64, mimeType);
        return { tipo: 'arquivo', conteudo: `[Arquivo]: ${resumo}` };
      }

      case 'videoMessage':
        return { tipo: 'text', conteudo: '[Vídeo recebido — a Luna ainda não consegue processar vídeos]' };

      case 'stickerMessage':
        return { tipo: 'text', conteudo: '[Sticker recebido 😄]' };

      default:
        console.log(`[MEDIA] Tipo desconhecido: ${tipoWA}`);
        return null;
    }
  } catch (err) {
    console.error(`[MEDIA] Erro ao processar ${tipoWA}:`, err.message);
    return { tipo: 'text', conteudo: '[Mensagem recebida mas não foi possível processar o conteúdo]' };
  }
}

module.exports = { processarMidia, transcreverAudio, descreverImagem, resumirDocumento };
