'use strict';

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAIFileManager } = require('@google/generative-ai/server');
const fs = require('fs');
const path = require('path');
const os = require('os');
const logger = require('./logger');

const apiKey = process.env.GEMINI_API_KEY;

let genAI = null;
let fileManager = null;

if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
  fileManager = new GoogleAIFileManager(apiKey);
} else {
  console.warn('[VIDEO] GEMINI_API_KEY não configurada. O processamento nativo de vídeo com Gemini falhará.');
}

async function analisarVideo(base64Data, mimeType = 'video/mp4') {
  if (!genAI || !fileManager) {
    return '[A API do Gemini não está configurada (GEMINI_API_KEY ausente). Não é possível analisar o vídeo.]';
  }

  // Descobrimos a extensão real se houver
  const ext = mimeType.split('/')[1] || 'mp4';
  const fileName = `upload_gemini_${Date.now()}.${ext}`;
  const tmpPath = path.join(os.tmpdir(), fileName);
  
  try {
    // Escrever o buffer pro arquivo temporário para que o GoogleAIFileManager consiga fazer o upload
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(tmpPath, buffer);

    console.log(`[VIDEO] 📤 Iniciando upload do vídeo para API do Google (Tamanho: ${(buffer.length / 1024 / 1024).toFixed(2)} MB)...`);
    
    // Upload pro Google Servidor
    const uploadResult = await fileManager.uploadFile(tmpPath, {
      mimeType: mimeType,
      displayName: 'Vídeo Recebido WhatsApp',
    });
    
    const file = uploadResult.file;
    console.log(`[VIDEO] ✅ Upload concluído: ${file.name}`);

    // Aguardar o vídeo mudar o status para ACTIVE (pode ir de PROCESSING -> ACTIVE)
    let status = file.state;
    while (status === 'PROCESSING') {
      console.log('[VIDEO] ⏳ Aguardando processamento do vídeo nos servidores do Google...');
      await new Promise((resolve) => setTimeout(resolve, 3000)); // Espera 3s
      const checkFile = await fileManager.getFile(file.name);
      status = checkFile.state;
    }

    if (status === 'FAILED') {
      throw new Error('O vídeo foi rejeitado pelo processamento do Google (formato não suportado ou erro interno).');
    }

    // Com o vídeo pronto ('ACTIVE'), repassar para a LLM
    const prompt = `Avalie este vídeo recebido por um tutor em uma clínica veterinária. 
Identifique e descreva a espécie do pet. Foque especialmente em apontar sinais do estado visual de saúde (nível de atividade, apatia, machucados, sons emitidos) 
e faça um resumo claro do problema ou acontecimento principal mostrado no vídeo.
Retorne um texto curto e objetivo que ajudará nossos veterinários no prontuário ou triagem. Se a imagem contiver donos ou pessoas falando, mencione caso falem de sintomas relevantes.`;

    console.log('[VIDEO] 🤖 Analisando o conteúdo do vídeo via gemini-1.5-flash...');
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const result = await model.generateContent([
      prompt,
      { fileData: { fileUri: file.uri, mimeType: file.mimeType } }
    ]);

    const analiseText = result.response.text().trim();
    
    // Tentar apagar o vídeo na API do Google após o uso para não acumular
    try {
      await fileManager.deleteFile(file.name);
    } catch(e) {
      console.warn(`[VIDEO] Falha ao excluir vídeo '${file.name}' da API do Google, ignorando:`, e.message);
    }

    logger.registrar(logger.TIPOS.MIDIA_PROCESSADA, 'Vídeo processado clinicamente com Gemini (fileManager)', {
      videoUri: file.uri,
      preview: analiseText.substring(0, 80)
    }, 'success');

    return analiseText;
  } catch (err) {
    console.error('[VIDEO] Erro ao analisar o vídeo:', err.message);
    logger.registrar(logger.TIPOS.ERRO, `Falhas processamento vídeo nativo: ${err.message}`, {}, 'error');
    throw err; // Repassar pro media.js tratar e emitir a mensagem statica em falha
  } finally {
    // Garantir que o temporário do OS também não acabe engolindo o HD
    if (fs.existsSync(tmpPath)) {
      try {
        fs.unlinkSync(tmpPath);
      } catch (err) {
        console.warn(`[VIDEO] Não foi possível deletar o tmp ${tmpPath}: ${err.message}`);
      }
    }
  }
}

module.exports = { analisarVideo };
