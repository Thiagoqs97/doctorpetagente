'use strict';

const { enviarDigitando, enviarMensagem, enviarParaGrupoRelatorio } = require('./evolution');
const { processarMensagens } = require('./agent');
const { buscarConversaAtiva, atualizarConversa } = require('./database');

// ─── Estado interno do acumulador ──────────────────────────────────────────────
// { telefone: { mensagens: [], timer: Timeout, intervalDigitando: Interval } }
const buffers = new Map();

const JANELA_MS = 40_000;        // 40 segundos para acumular
const DIGITANDO_INTERVAL_MS = 10_000; // enviar "digitando..." a cada 10s

/**
 * Adiciona uma mensagem ao buffer do telefone e inicia/reinicia o timer de 40s.
 * @param {string} telefone
 * @param {{ tipo: string, conteudo: string }} msgObj
 */
async function adicionar(telefone, msgObj) {
  console.log(`[ACUMULADOR] +1 msg de ${telefone} | tipo: ${msgObj.tipo}`);

  if (!buffers.has(telefone)) {
    // Primeira mensagem: criar buffer e iniciar feedback visual
    buffers.set(telefone, {
      mensagens: [],
      timer: null,
      intervalDigitando: null
    });

    // Enviar digitando imediatamente e depois a cada 10s
    enviarDigitando(telefone).catch(() => {});
    const intervalo = setInterval(() => {
      enviarDigitando(telefone).catch(() => {});
    }, DIGITANDO_INTERVAL_MS);

    buffers.get(telefone).intervalDigitando = intervalo;
  }

  const buffer = buffers.get(telefone);
  buffer.mensagens.push(msgObj);

  // Reiniciar o timer (debounce)
  if (buffer.timer) clearTimeout(buffer.timer);

  buffer.timer = setTimeout(async () => {
    await _disparar(telefone);
  }, JANELA_MS);
}

/**
 * Dispara o processamento do buffer acumulado.
 * @param {string} telefone
 */
async function _disparar(telefone) {
  const buffer = buffers.get(telefone);
  if (!buffer) return;

  // Copiar e limpar o buffer
  const mensagens = [...buffer.mensagens];

  // Parar feedback de digitando
  if (buffer.intervalDigitando) clearInterval(buffer.intervalDigitando);

  // Remover do mapa antes de processar (para não acumular durante o processamento)
  buffers.delete(telefone);

  console.log(`[ACUMULADOR] Disparando ${mensagens.length} mensagem(ns) de ${telefone}`);

  // ─── Verificar se conversa já está aguardando humano ──────────────────────
  try {
    const conversaAtual = await buscarConversaAtiva(telefone);
    if (conversaAtual?.status === 'aguardando_humano') {
      console.log(`[ACUMULADOR] Conversa de ${telefone} está aguardando humano — encaminhando ao grupo`);
      const textoMsgs = mensagens.map(m => m.conteudo).join('\n');
      await enviarParaGrupoRelatorio(
        `📨 *Nova mensagem — cliente aguardando atendimento*\n\n📱 *Telefone:* ${telefone}\n💬 *Mensagem:*\n${textoMsgs}`
      );
      // Atualizar ultima_mensagem_em para manter a sessão viva
      await atualizarConversa(conversaAtual.id, { status: 'aguardando_humano' });
      return;
    }
  } catch (err) {
    console.error(`[ACUMULADOR] Erro ao checar status de conversa de ${telefone}:`, err.message);
  }

  // ─── Processar normalmente com a IA ───────────────────────────────────────
  try {
    const resposta = await processarMensagens(telefone, mensagens);
    if (resposta) {
      await enviarMensagem(telefone, resposta);
    }
  } catch (err) {
    console.error(`[ACUMULADOR] Erro ao processar mensagens de ${telefone}:`, err.message);
    try {
      await enviarMensagem(
        telefone,
        '😔 Tive um probleminha aqui. Pode repetir sua mensagem? A Luna está à disposição!'
      );
    } catch (_) { /* silenciar */ }
  }
}

module.exports = { adicionar };
