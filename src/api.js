'use strict';

const express = require('express');
const axios = require('axios');
const router = express.Router();
const { supabase } = require('./database');

// ─── DASHBOARD STATS ──────────────────────────────────────────────────────────

router.get('/stats', async (req, res) => {
  try {
    const hoje = new Date();
    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString();
    const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59).toISOString();

    // Últimos 7 dias
    const inicio7d = new Date(hoje);
    inicio7d.setDate(inicio7d.getDate() - 7);
    const inicio7dISO = inicio7d.toISOString();

    // Últimos 30 dias
    const inicio30d = new Date(hoje);
    inicio30d.setDate(inicio30d.getDate() - 30);
    const inicio30dISO = inicio30d.toISOString();

    // Conversas hoje
    const { count: conversasHoje } = await supabase
      .from('conversas').select('*', { count: 'exact', head: true })
      .gte('iniciado_em', inicioHoje).lte('iniciado_em', fimHoje);

    // Conversas 7 dias
    const { count: conversas7d } = await supabase
      .from('conversas').select('*', { count: 'exact', head: true })
      .gte('iniciado_em', inicio7dISO);

    // Conversas 30 dias
    const { count: conversas30d } = await supabase
      .from('conversas').select('*', { count: 'exact', head: true })
      .gte('iniciado_em', inicio30dISO);

    // Total de clientes
    const { count: totalClientes } = await supabase
      .from('clientes').select('*', { count: 'exact', head: true });

    // Clientes novos hoje
    const { count: clientesHoje } = await supabase
      .from('clientes').select('*', { count: 'exact', head: true })
      .gte('criado_em', inicioHoje);

    // Conversas ativas
    const { count: conversasAtivas } = await supabase
      .from('conversas').select('*', { count: 'exact', head: true })
      .eq('status', 'ativa');

    // Agendamentos de hoje
    const { count: agendamentosHoje } = await supabase
      .from('conversas').select('*', { count: 'exact', head: true })
      .gte('iniciado_em', inicioHoje).lte('iniciado_em', fimHoje)
      .eq('agendamento_realizado', true);

    // Taxa de resolução 7d
    const { count: resolvidas7d } = await supabase
      .from('conversas').select('*', { count: 'exact', head: true })
      .gte('iniciado_em', inicio7dISO).eq('resolvido', true);

    const taxaResolucao = conversas7d > 0 ? ((resolvidas7d / conversas7d) * 100).toFixed(1) : 0;

    // Chunks de conhecimento
    const { count: totalConhecimento } = await supabase
      .from('conhecimento').select('*', { count: 'exact', head: true });

    const { count: conhecimentoAtivo } = await supabase
      .from('conhecimento').select('*', { count: 'exact', head: true })
      .eq('ativo', true);

    // Mensagens hoje
    const { count: mensagensHoje } = await supabase
      .from('mensagens').select('*', { count: 'exact', head: true })
      .gte('criado_em', inicioHoje);

    // Distribuição de intenções (últimos 7 dias)
    const { data: conversasIntencao } = await supabase
      .from('conversas').select('intencao_principal')
      .gte('iniciado_em', inicio7dISO)
      .not('intencao_principal', 'is', null);

    const intencoes = {};
    (conversasIntencao || []).forEach(c => {
      intencoes[c.intencao_principal] = (intencoes[c.intencao_principal] || 0) + 1;
    });

    // Conversas por dia (últimos 7 dias)
    const { data: conversasPorDia } = await supabase
      .from('conversas').select('iniciado_em')
      .gte('iniciado_em', inicio7dISO)
      .order('iniciado_em', { ascending: true });

    const porDia = {};
    (conversasPorDia || []).forEach(c => {
      const dia = new Date(c.iniciado_em).toISOString().split('T')[0];
      porDia[dia] = (porDia[dia] || 0) + 1;
    });

    // Últimas 5 conversas
    const { data: ultimasConversas } = await supabase
      .from('conversas')
      .select('id, telefone, iniciado_em, status, intencao_principal, subtopico')
      .order('iniciado_em', { ascending: false })
      .limit(5);

    res.json({
      conversasHoje: conversasHoje || 0,
      conversas7d: conversas7d || 0,
      conversas30d: conversas30d || 0,
      totalClientes: totalClientes || 0,
      clientesHoje: clientesHoje || 0,
      conversasAtivas: conversasAtivas || 0,
      agendamentosHoje: agendamentosHoje || 0,
      taxaResolucao: Number(taxaResolucao),
      totalConhecimento: totalConhecimento || 0,
      conhecimentoAtivo: conhecimentoAtivo || 0,
      mensagensHoje: mensagensHoje || 0,
      intencoes,
      conversasPorDia: porDia,
      ultimasConversas: ultimasConversas || []
    });
  } catch (err) {
    console.error('[API] stats erro:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ─── CONHECIMENTO (TREINAMENTO) ───────────────────────────────────────────────

router.get('/conhecimento', async (req, res) => {
  try {
    const { categoria, q, ativo } = req.query;
    let query = supabase.from('conhecimento').select('*').order('categoria').order('criado_em', { ascending: false });

    if (categoria) query = query.eq('categoria', categoria);
    if (ativo !== undefined) query = query.eq('ativo', ativo === 'true');
    if (q) query = query.or(`titulo.ilike.%${q}%,conteudo.ilike.%${q}%,keywords.ilike.%${q}%`);

    const { data, error } = await query;
    if (error) throw error;

    // Contagem por categoria
    const { data: todas } = await supabase.from('conhecimento').select('categoria');
    const categorias = {};
    (todas || []).forEach(c => { categorias[c.categoria] = (categorias[c.categoria] || 0) + 1; });

    res.json({ items: data || [], categorias });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/conhecimento', async (req, res) => {
  try {
    const { categoria, titulo, conteudo, keywords } = req.body;
    if (!categoria || !titulo || !conteudo) {
      return res.status(400).json({ erro: 'categoria, titulo e conteudo são obrigatórios' });
    }
    const { data, error } = await supabase
      .from('conhecimento')
      .insert({ categoria, titulo, conteudo, keywords: keywords || '' })
      .select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.put('/conhecimento/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { categoria, titulo, conteudo, keywords, ativo } = req.body;
    const updates = { atualizado_em: new Date().toISOString() };
    if (categoria !== undefined) updates.categoria = categoria;
    if (titulo !== undefined) updates.titulo = titulo;
    if (conteudo !== undefined) updates.conteudo = conteudo;
    if (keywords !== undefined) updates.keywords = keywords;
    if (ativo !== undefined) updates.ativo = ativo;

    const { data, error } = await supabase
      .from('conhecimento').update(updates).eq('id', id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.delete('/conhecimento/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('conhecimento').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.patch('/conhecimento/:id/toggle', async (req, res) => {
  try {
    const { data: current } = await supabase
      .from('conhecimento').select('ativo').eq('id', req.params.id).single();
    const { data, error } = await supabase
      .from('conhecimento').update({ ativo: !current.ativo, atualizado_em: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ─── CONVERSAS ────────────────────────────────────────────────────────────────

router.get('/conversas', async (req, res) => {
  try {
    const { status, limite } = req.query;
    let query = supabase.from('conversas')
      .select('*, clientes(nome, nome_pet)')
      .order('iniciado_em', { ascending: false })
      .limit(parseInt(limite) || 50);

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/conversas/:id', async (req, res) => {
  try {
    const { data: conversa, error: errConv } = await supabase
      .from('conversas')
      .select('*, clientes(*)')
      .eq('id', req.params.id).single();
    if (errConv) throw errConv;

    const { data: mensagens, error: errMsg } = await supabase
      .from('mensagens')
      .select('*')
      .eq('conversa_id', req.params.id)
      .order('criado_em', { ascending: true });
    if (errMsg) throw errMsg;

    res.json({ conversa, mensagens: mensagens || [] });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.put('/conversas/:id/encerrar', async (req, res) => {
  try {
    const { data, error } = await supabase.from('conversas')
      .update({ status: 'encerrada', encerrado_em: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ─── CLIENTES ─────────────────────────────────────────────────────────────────

router.get('/clientes', async (req, res) => {
  try {
    const { q } = req.query;
    let query = supabase.from('clientes').select('*').order('criado_em', { ascending: false });

    if (q) {
      query = query.or(`nome.ilike.%${q}%,telefone.ilike.%${q}%,nome_pet.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/clientes/:id', async (req, res) => {
  try {
    const { data: cliente, error } = await supabase
      .from('clientes').select('*').eq('id', req.params.id).single();
    if (error) throw error;

    const { data: conversas } = await supabase
      .from('conversas').select('*').eq('cliente_id', req.params.id)
      .order('iniciado_em', { ascending: false }).limit(10);

    res.json({ cliente, conversas: conversas || [] });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.put('/clientes/:id', async (req, res) => {
  try {
    const { nome, email, nome_pet, especie, raca, idade_pet } = req.body;
    const updates = { atualizado_em: new Date().toISOString() };
    if (nome !== undefined) updates.nome = nome;
    if (email !== undefined) updates.email = email;
    if (nome_pet !== undefined) updates.nome_pet = nome_pet;
    if (especie !== undefined) updates.especie = especie;
    if (raca !== undefined) updates.raca = raca;
    if (idade_pet !== undefined) updates.idade_pet = idade_pet;

    const { data, error } = await supabase
      .from('clientes').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.delete('/clientes/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('clientes').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ─── INTEGRAÇÕES ──────────────────────────────────────────────────────────────

router.get('/integracoes/status', async (req, res) => {
  const results = { gemini: false, supabase: false, evolution: false };
  const detalhes = {};

  // Supabase
  try {
    const { count, error } = await supabase.from('clientes').select('*', { count: 'exact', head: true });
    results.supabase = !error;
    detalhes.supabase = error ? error.message : `Conectado (${count} clientes)`;
  } catch (e) { detalhes.supabase = e.message; }

  // OpenAI
  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const modelo = process.env.AI_MODEL || 'gpt-4o-mini';
    const completion = await openai.chat.completions.create({
      model: modelo,
      messages: [{ role: 'user', content: 'Responda apenas: ok' }],
      max_tokens: 10
    });
    const text = completion.choices[0].message.content;
    results.gemini = text.length > 0;
    detalhes.gemini = results.gemini ? `Conectado — modelo: ${modelo}` : 'Sem resposta';
  } catch (e) { detalhes.gemini = e.message; }

  // Evolution API
  try {
    const url = process.env.EVOLUTION_API_URL?.replace(/\/$/, '');
    const instance = process.env.EVOLUTION_INSTANCE;
    if (url && instance) {
      const resp = await axios.get(`${url}/instance/connectionState/${instance}`, {
        headers: { apikey: process.env.EVOLUTION_API_KEY },
        timeout: 8000
      });
      const state = resp.data?.instance?.state || resp.data?.state || 'unknown';
      results.evolution = state === 'open' || state === 'connected';
      detalhes.evolution = `Estado: ${state}`;
    } else {
      detalhes.evolution = 'URL ou instância não configurada';
    }
  } catch (e) { detalhes.evolution = e.message; }

  res.json({
    status: results,
    detalhes,
    config: {
      supabaseUrl: process.env.SUPABASE_URL ? '✔ Configurado' : '✘ Faltando',
      openaiKey: process.env.OPENAI_API_KEY ? '✔ Configurado' : '✘ Faltando',
      aiModel: process.env.AI_MODEL || 'gpt-4o-mini',
      evolutionUrl: process.env.EVOLUTION_API_URL ? '✔ Configurado' : '✘ Faltando',
      evolutionInstance: process.env.EVOLUTION_INSTANCE || '—',
      clinicName: process.env.CLINIC_NAME || '—',
      reportGroupId: process.env.REPORT_GROUP_ID ? '✔ Configurado' : '✘ Faltando',
      webhookUrl: `POST ${req.protocol}://${req.get('host')}/webhook`
    }
  });
});

router.post('/integracoes/testar-evolution', async (req, res) => {
  try {
    const { numero, mensagem } = req.body;
    if (!numero) return res.status(400).json({ erro: 'Número é obrigatório' });

    const { enviarMensagem } = require('./evolution');
    await enviarMensagem(numero, mensagem || '🐾 Teste do vet-agent — Luna está on-line!');
    res.json({ ok: true, mensagem: 'Mensagem enviada com sucesso!' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ─── RELATÓRIOS ───────────────────────────────────────────────────────────────

router.get('/relatorios', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('relatorios').select('*')
      .order('gerado_em', { ascending: false }).limit(20);
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/relatorios/gerar', async (req, res) => {
  try {
    const { data } = req.body;
    const { gerarEEnviarRelatorio } = require('./reports');
    const resultado = await gerarEEnviarRelatorio(data || null);
    res.json({ ok: true, resultado });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ─── CONFIG ───────────────────────────────────────────────────────────────────

router.get('/config', (req, res) => {
  res.json({
    clinicName: process.env.CLINIC_NAME || '',
    clinicPhone: process.env.CLINIC_PHONE || '',
    clinicAddress: process.env.CLINIC_ADDRESS || '',
    clinicHours: process.env.CLINIC_HOURS || '',
    reportCron: process.env.REPORT_CRON || '0 8 * * *',
    reportTimezone: process.env.REPORT_TIMEZONE || 'America/Sao_Paulo',
    port: process.env.PORT || 3000,
    aiModel: process.env.AI_MODEL || 'gpt-4o-mini'
  });
});

// Trocar modelo de IA em tempo de execução (sem restart)
router.post('/config/ai-model', (req, res) => {
  const { modelo } = req.body;
  if (!modelo) return res.status(400).json({ erro: 'modelo é obrigatório' });
  process.env.AI_MODEL = modelo;
  res.json({ ok: true, modelo });
});

// ─── LOGS AO VIVO ─────────────────────────────────────────────────────────────

router.get('/logs', (req, res) => {
  try {
    const logger = require('./logger');
    const { tipo, nivel, telefone, limite } = req.query;
    const logs = logger.obterLogs({
      tipo: tipo || undefined,
      nivel: nivel || undefined,
      telefone: telefone || undefined,
      limite: parseInt(limite) || 100,
    });
    const stats = logger.estatisticas();
    res.json({ logs, stats });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/logs/stats', (req, res) => {
  try {
    const logger = require('./logger');
    res.json(logger.estatisticas());
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.delete('/logs', (req, res) => {
  try {
    const logger = require('./logger');
    logger.limparLogs();
    res.json({ ok: true, mensagem: 'Logs limpos' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
