'use strict';

/**
 * Sistema de log em memória para o vet-agent.
 * Armazena os últimos N eventos para visualização no dashboard
 * e envia opcionalmente para um webhook externo (n8n).
 */

const axios = require('axios');

const MAX_LOGS = 500;
const logs = [];

// Tipos de evento possíveis
const TIPOS = {
  WEBHOOK_RECEBIDO: 'webhook_recebido',
  MIDIA_PROCESSADA: 'midia_processada',
  IA_RESPOSTA: 'ia_resposta',
  MENSAGEM_ENVIADA: 'mensagem_enviada',
  ERRO: 'erro',
  SISTEMA: 'sistema',
  RELATORIO: 'relatorio',
  N8N_EVENTO: 'n8n_evento',
};

/**
 * Registra um evento no log.
 * @param {string} tipo - Tipo do evento (ver TIPOS)
 * @param {string} resumo - Resumo curto do evento
 * @param {object} detalhes - Objeto com detalhes completos
 * @param {'info'|'success'|'warn'|'error'} nivel - Nível do log
 */
function registrar(tipo, resumo, detalhes = {}, nivel = 'info') {
  const evento = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: new Date().toISOString(),
    tipo,
    resumo,
    detalhes,
    nivel,
  };

  logs.unshift(evento); // mais recente primeiro

  // Manter tamanho máximo
  if (logs.length > MAX_LOGS) {
    logs.length = MAX_LOGS;
  }

  // Log no console também
  const icons = { info: 'ℹ️', success: '✅', warn: '⚠️', error: '❌' };
  console.log(`[LOG] ${icons[nivel] || 'ℹ️'} [${tipo}] ${resumo}`);

  // Enviar para n8n se configurado
  enviarParaN8N(evento);

  return evento;
}

/**
 * Envia evento para webhook externo (n8n, Zapier, etc.)
 */
async function enviarParaN8N(evento) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await axios.post(webhookUrl, {
      agente: 'vet-agent',
      clinica: process.env.CLINIC_NAME || 'Clínica',
      ...evento,
    }, { timeout: 5000 });
  } catch (err) {
    // Não logar erro do n8n para evitar loop infinito
    console.warn(`[N8N] Falha ao enviar evento: ${err.message}`);
  }
}

/**
 * Retorna os logs filtrados.
 */
function obterLogs({ tipo, nivel, telefone, limite = 100 } = {}) {
  let resultado = logs;

  if (tipo) {
    resultado = resultado.filter(l => l.tipo === tipo);
  }
  if (nivel) {
    resultado = resultado.filter(l => l.nivel === nivel);
  }
  if (telefone) {
    resultado = resultado.filter(l =>
      l.detalhes?.telefone === telefone ||
      l.resumo?.includes(telefone)
    );
  }

  return resultado.slice(0, Math.min(limite, MAX_LOGS));
}

/**
 * Limpa todos os logs da memória.
 */
function limparLogs() {
  logs.length = 0;
}

/**
 * Retorna estatísticas rápidas sobre os logs atuais.
 */
function estatisticas() {
  const agora = new Date();
  const umaHoraAtras = new Date(agora - 60 * 60 * 1000);

  const logsUltimaHora = logs.filter(l => new Date(l.timestamp) >= umaHoraAtras);

  const porTipo = {};
  const porNivel = { info: 0, success: 0, warn: 0, error: 0 };

  logsUltimaHora.forEach(l => {
    porTipo[l.tipo] = (porTipo[l.tipo] || 0) + 1;
    porNivel[l.nivel] = (porNivel[l.nivel] || 0) + 1;
  });

  return {
    total: logs.length,
    ultimaHora: logsUltimaHora.length,
    porTipo,
    porNivel,
    ultimoEvento: logs[0] || null,
  };
}

module.exports = { registrar, obterLogs, limparLogs, estatisticas, TIPOS };
