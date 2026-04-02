'use strict';

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ─── CLIENTES ─────────────────────────────────────────────────────────────────

/**
 * Busca ou cria um cliente pelo telefone (upsert).
 */
async function upsertCliente(telefone, dadosExtras = {}) {
  // Remover campos nulos/undefined para não sobrescrever dados existentes
  const atualizacao = { atualizado_em: new Date().toISOString() };
  for (const [k, v] of Object.entries(dadosExtras)) {
    if (v !== null && v !== undefined && v !== '') atualizacao[k] = v;
  }

  const { data, error } = await supabase
    .from('clientes')
    .upsert({ telefone, ...atualizacao }, { onConflict: 'telefone', returning: 'representation' })
    .select()
    .single();

  if (error) throw new Error(`[DB] upsertCliente: ${error.message}`);
  return data;
}

/**
 * Atualiza dados extraídos de um cliente (apenas sobrescreve campos não nulos).
 */
async function atualizarCliente(telefone, dados) {
  const atualizacao = { atualizado_em: new Date().toISOString() };
  for (const [k, v] of Object.entries(dados)) {
    if (v !== null && v !== undefined && v !== '') atualizacao[k] = v;
  }

  const { error } = await supabase
    .from('clientes')
    .update(atualizacao)
    .eq('telefone', telefone);

  if (error) throw new Error(`[DB] atualizarCliente: ${error.message}`);
}

// ─── CONVERSAS ────────────────────────────────────────────────────────────────

const SESSAO_EXPIRACAO_MS = 2 * 60 * 60 * 1000; // 2 horas

/**
 * Busca ou cria uma conversa ativa para o telefone.
 * Sessão expira após 2h sem mensagem.
 */
async function buscarOuCriarConversa(telefone, clienteId) {
  const limite = new Date(Date.now() - SESSAO_EXPIRACAO_MS).toISOString();

  const { data: conversaExistente } = await supabase
    .from('conversas')
    .select('*')
    .eq('telefone', telefone)
    .eq('status', 'ativa')
    .gt('ultima_mensagem_em', limite)
    .order('iniciado_em', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (conversaExistente) return conversaExistente;

  // Encerrar conversa anterior se existir
  await supabase
    .from('conversas')
    .update({ status: 'encerrada', encerrado_em: new Date().toISOString() })
    .eq('telefone', telefone)
    .eq('status', 'ativa');

  // Criar nova conversa
  const { data: nova, error } = await supabase
    .from('conversas')
    .insert({
      cliente_id: clienteId,
      telefone,
      ultima_mensagem_em: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw new Error(`[DB] criarConversa: ${error.message}`);
  return nova;
}

/**
 * Atualiza metadados de uma conversa.
 */
async function atualizarConversa(conversaId, dados) {
  const { error } = await supabase
    .from('conversas')
    .update({ ...dados, ultima_mensagem_em: new Date().toISOString() })
    .eq('id', conversaId);

  if (error) throw new Error(`[DB] atualizarConversa: ${error.message}`);
}

// ─── MENSAGENS ────────────────────────────────────────────────────────────────

/**
 * Salva uma mensagem no banco.
 */
async function salvarMensagem(conversaId, telefone, papel, conteudo, tipo = 'text', intencao = null) {
  const { error } = await supabase.from('mensagens').insert({
    conversa_id: conversaId,
    telefone,
    papel,
    conteudo,
    tipo,
    intencao_detectada: intencao
  });

  if (error) throw new Error(`[DB] salvarMensagem: ${error.message}`);
}

/**
 * Busca as últimas N mensagens de uma conversa (para contexto do agente).
 */
async function buscarHistorico(conversaId, limite = 15) {
  const { data, error } = await supabase
    .from('mensagens')
    .select('papel, conteudo, tipo, criado_em')
    .eq('conversa_id', conversaId)
    .order('criado_em', { ascending: false })
    .limit(limite);

  if (error) throw new Error(`[DB] buscarHistorico: ${error.message}`);

  // Retornar em ordem cronológica
  return (data || []).reverse();
}

// ─── RELATÓRIOS ───────────────────────────────────────────────────────────────

/**
 * Coleta dados do dia para o relatório.
 * @param {string} dataReferencia - YYYY-MM-DD
 */
async function coletarDadosRelatorio(dataReferencia) {
  const inicio = `${dataReferencia}T00:00:00.000Z`;
  const fim = `${dataReferencia}T23:59:59.999Z`;

  // Total de conversas
  const { count: totalConversas } = await supabase
    .from('conversas')
    .select('*', { count: 'exact', head: true })
    .gte('iniciado_em', inicio)
    .lte('iniciado_em', fim);

  // Clientes novos
  const { count: clientesNovos } = await supabase
    .from('clientes')
    .select('*', { count: 'exact', head: true })
    .gte('criado_em', inicio)
    .lte('criado_em', fim);

  // Agendamentos realizados
  const { count: agendamentosRealizados } = await supabase
    .from('conversas')
    .select('*', { count: 'exact', head: true })
    .gte('iniciado_em', inicio)
    .lte('iniciado_em', fim)
    .eq('agendamento_realizado', true);

  // Conversas resolvidas
  const { count: conversasResolvidas } = await supabase
    .from('conversas')
    .select('*', { count: 'exact', head: true })
    .gte('iniciado_em', inicio)
    .lte('iniciado_em', fim)
    .eq('resolvido', true);

  // Conversas com escalamento
  const { data: conversasDia } = await supabase
    .from('conversas')
    .select('*')
    .gte('iniciado_em', inicio)
    .lte('iniciado_em', fim);

  // Mensagens do dia
  const { data: mensagensDia } = await supabase
    .from('mensagens')
    .select('tipo, criado_em, papel, intencao_detectada')
    .gte('criado_em', inicio)
    .lte('criado_em', fim);

  // Distribuição por intenção
  const intencoes = {};
  (conversasDia || []).forEach(c => {
    if (c.intencao_principal) {
      intencoes[c.intencao_principal] = (intencoes[c.intencao_principal] || 0) + 1;
    }
  });

  // Horários de pico
  const horarios = {};
  (mensagensDia || [])
    .filter(m => m.papel === 'user')
    .forEach(m => {
      const hora = new Date(m.criado_em).getUTCHours();
      horarios[hora] = (horarios[hora] || 0) + 1;
    });

  const topHorarios = Object.entries(horarios)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([h, q]) => ({ hora: `${h.padStart ? h.toString().padStart(2, '0') : String(h).padStart(2, '0')}:00`, quantidade: q }));

  // Tipos de mídia
  const midias = { text: 0, audio: 0, imagem: 0, arquivo: 0 };
  (mensagensDia || [])
    .filter(m => m.papel === 'user')
    .forEach(m => {
      if (midias[m.tipo] !== undefined) midias[m.tipo]++;
    });

  // Média de mensagens por conversa
  const totalMsgs = (mensagensDia || []).filter(m => m.papel === 'user').length;
  const mediaMensagens = totalConversas > 0 ? (totalMsgs / totalConversas).toFixed(1) : 0;

  // Subtópicos mais mencionados
  const subtopicos = {};
  (conversasDia || []).forEach(c => {
    if (c.subtopico) subtopicos[c.subtopico] = (subtopicos[c.subtopico] || 0) + 1;
  });
  const topSubtopicos = Object.entries(subtopicos)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([t, q]) => ({ topico: t, quantidade: q }));

  return {
    dataReferencia,
    totalConversas: totalConversas || 0,
    clientesNovos: clientesNovos || 0,
    agendamentosRealizados: agendamentosRealizados || 0,
    taxaResolucao: totalConversas > 0 ? ((conversasResolvidas / totalConversas) * 100).toFixed(1) : 0,
    conversasAbandonadas: (totalConversas || 0) - (conversasResolvidas || 0),
    mediaMensagens,
    intencoes,
    topHorarios,
    midias,
    topSubtopicos,
    conversasDia: conversasDia || []
  };
}

/**
 * Salva registro de relatório gerado.
 */
async function salvarRelatorio(dataReferencia, arquivoPath, dadosJson) {
  const { error } = await supabase.from('relatorios').insert({
    data_referencia: dataReferencia,
    arquivo_path: arquivoPath,
    dados_json: dadosJson
  });

  if (error) throw new Error(`[DB] salvarRelatorio: ${error.message}`);
}

// ─── CONHECIMENTO ─────────────────────────────────────────────────────────────

/**
 * Busca chunks de conhecimento pelo array de keywords.
 */
async function buscarConhecimento(keywords) {
  if (!keywords || keywords.length === 0) return [];

  const resultados = new Map();

  for (const kw of keywords) {
    const { data } = await supabase
      .from('conhecimento')
      .select('id, titulo, conteudo, categoria, keywords')
      .eq('ativo', true)
      .or(`keywords.ilike.%${kw}%,conteudo.ilike.%${kw}%,titulo.ilike.%${kw}%`);

    (data || []).forEach(item => {
      if (resultados.has(item.id)) {
        resultados.get(item.id).score++;
      } else {
        resultados.set(item.id, { ...item, score: 1 });
      }
    });
  }

  return Array.from(resultados.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

module.exports = {
  supabase,
  upsertCliente,
  atualizarCliente,
  buscarOuCriarConversa,
  atualizarConversa,
  salvarMensagem,
  buscarHistorico,
  coletarDadosRelatorio,
  salvarRelatorio,
  buscarConhecimento
};
