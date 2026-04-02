'use strict';

require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = () => process.env.EVOLUTION_API_URL?.replace(/\/$/, '');
const INSTANCE = () => process.env.EVOLUTION_INSTANCE;
const API_KEY = () => process.env.EVOLUTION_API_KEY;

function headers() {
  return {
    'Content-Type': 'application/json',
    apikey: API_KEY()
  };
}

/**
 * Envia uma mensagem de texto simples.
 * @param {string} telefone - número sem @s.whatsapp.net
 * @param {string} texto
 */
async function enviarMensagem(telefone, texto) {
  const numero = telefone.includes('@') ? telefone : `${telefone}@s.whatsapp.net`;
  await axios.post(
    `${BASE_URL()}/message/sendText/${INSTANCE()}`,
    { number: numero, text: texto },
    { headers: headers() }
  );
}

/**
 * Simula "digitando..." para o número.
 * @param {string} telefone
 */
async function enviarDigitando(telefone) {
  const numero = telefone.includes('@') ? telefone : `${telefone}@s.whatsapp.net`;
  try {
    await axios.post(
      `${BASE_URL()}/chat/sendPresence/${INSTANCE()}`,
      { number: numero, presence: 'composing', delay: 1200 },
      { headers: headers() }
    );
  } catch (_) {
    // Presence pode não ser suportado em todas as versões — silenciar
  }
}

/**
 * Envia um arquivo PDF para um número ou grupo.
 * @param {string} destino - número ou groupJid
 * @param {string} caminhoArquivo - caminho local do PDF
 * @param {string} legenda - texto de legenda
 */
async function enviarPDF(destino, caminhoArquivo, legenda = '') {
  const numero = destino.includes('@') ? destino : `${destino}@s.whatsapp.net`;
  const base64 = fs.readFileSync(caminhoArquivo).toString('base64');
  const nomeArquivo = path.basename(caminhoArquivo);

  await axios.post(
    `${BASE_URL()}/message/sendMedia/${INSTANCE()}`,
    {
      number: numero,
      mediaMessage: {
        mediatype: 'document',
        media: base64,
        fileName: nomeArquivo,
        caption: legenda,
        mimetype: 'application/pdf'
      }
    },
    { headers: headers() }
  );
}

/**
 * Envia uma mensagem de texto para o grupo de relatórios.
 * @param {string} texto
 */
async function enviarParaGrupoRelatorio(texto) {
  const groupId = process.env.REPORT_GROUP_ID;
  if (!groupId) throw new Error('REPORT_GROUP_ID não configurado');

  // Grupos já têm @g.us no ID
  const numero = groupId.includes('@') ? groupId : `${groupId}@g.us`;
  await axios.post(
    `${BASE_URL()}/message/sendText/${INSTANCE()}`,
    { number: numero, text: texto },
    { headers: headers() }
  );
}

/**
 * Envia PDF para o grupo de relatórios.
 * @param {string} caminhoArquivo
 * @param {string} legenda
 */
async function enviarPDFParaGrupo(caminhoArquivo, legenda = '') {
  const groupId = process.env.REPORT_GROUP_ID;
  if (!groupId) throw new Error('REPORT_GROUP_ID não configurado');

  const numero = groupId.includes('@') ? groupId : `${groupId}@g.us`;
  const base64 = fs.readFileSync(caminhoArquivo).toString('base64');
  const nomeArquivo = path.basename(caminhoArquivo);

  await axios.post(
    `${BASE_URL()}/message/sendMedia/${INSTANCE()}`,
    {
      number: numero,
      mediaMessage: {
        mediatype: 'document',
        media: base64,
        fileName: nomeArquivo,
        caption: legenda,
        mimetype: 'application/pdf'
      }
    },
    { headers: headers() }
  );
}

module.exports = {
  enviarMensagem,
  enviarDigitando,
  enviarPDF,
  enviarParaGrupoRelatorio,
  enviarPDFParaGrupo
};
