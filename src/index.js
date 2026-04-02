'use strict';

require('dotenv').config();
const express = require('express');
const path = require('path');
const { processarMidia } = require('./media');
const accumulator = require('./accumulator');
const { gerarEEnviarRelatorio } = require('./reports');
const apiRoutes = require('./api');

const app = express();
app.use(express.json({ limit: '50mb' }));

// ─── Servir dashboard estático ─────────────────────────────────────────────────
app.use('/dashboard', express.static(path.join(__dirname, '..', 'dashboard')));
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dashboard', 'index.html'));
});

// ─── API para o dashboard ──────────────────────────────────────────────────────
app.use('/api', apiRoutes);

// ─── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    agent: 'vet-agent',
    version: '1.0.0'
  });
});

// ─── Redirecionar raiz para dashboard ──────────────────────────────────────────
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// ─── Teste simples do webhook (GET) — para verificar se o túnel funciona ───────
app.get('/webhook', (req, res) => {
  console.log('[WEBHOOK] ✅ GET /webhook recebido — o túnel está funcionando!');
  res.json({ status: 'ok', msg: 'Webhook do vet-agent acessível!' });
});

// ─── Gerar relatório manualmente ───────────────────────────────────────────────
app.get('/relatorio/:data?', async (req, res) => {
  try {
    const data = req.params.data || null;
    const resultado = await gerarEEnviarRelatorio(data);
    res.json({ ok: true, resultado });
  } catch (err) {
    console.error('[RELATORIO] Erro:', err.message);
    res.status(500).json({ ok: false, erro: err.message });
  }
});

// ─── Webhook Evolution API ──────────────────────────────────────────────────────
app.post('/webhook', async (req, res) => {
  res.sendStatus(200);

  try {
    const body = req.body;

    // Log TUDO que chegar para diagnóstico
    const evento = body.event || 'SEM_EVENTO';
    console.log(`\n[WEBHOOK] 📩 Recebido evento: "${evento}"`);

    // Aceitar ambas as formas: MESSAGES_UPSERT e messages.upsert
    const eventoNormalizado = evento.toUpperCase().replace(/\./g, '_');
    if (eventoNormalizado !== 'MESSAGES_UPSERT') {
      console.log(`[WEBHOOK] Evento ignorado: ${evento}`);
      return;
    }

    const mensagemWA = body.data;
    if (!mensagemWA) {
      console.log('[WEBHOOK] ⚠️ body.data está vazio!');
      console.log('[WEBHOOK] Body keys:', Object.keys(body));
      return;
    }

    const key = mensagemWA.key || {};
    const remoteJid = key.remoteJid || '';

    console.log(`[WEBHOOK] De: ${remoteJid} | fromMe: ${key.fromMe}`);

    // Ignorar mensagens enviadas por nós mesmos
    if (key.fromMe) {
      console.log('[WEBHOOK] Ignorando msg própria (fromMe)');
      return;
    }

    // Ignorar grupos
    if (remoteJid.endsWith('@g.us')) {
      console.log('[WEBHOOK] Ignorando msg de grupo');
      return;
    }

    const telefone = remoteJid.replace('@s.whatsapp.net', '');
    console.log(`[WEBHOOK] 📱 Telefone: ${telefone}`);

    const tipos = {
      conversation: 'text',
      extendedTextMessage: 'text',
      audioMessage: 'audio',
      imageMessage: 'imagem',
      documentMessage: 'arquivo',
      videoMessage: 'video',
      stickerMessage: 'sticker'
    };

    const messageTypes = Object.keys(mensagemWA.message || {});
    console.log(`[WEBHOOK] Tipos na msg: [${messageTypes.join(', ')}]`);
    
    const tipoDetectado = messageTypes.find(t => tipos[t]) || 'desconhecido';
    console.log(`[WEBHOOK] Tipo detectado: ${tipoDetectado}`);

    if (!tipos[tipoDetectado]) {
      console.log(`[WEBHOOK] ⚠️ Tipo não suportado: ${tipoDetectado}`);
      return;
    }

    console.log(`[WEBHOOK] ✅ Processando mensagem ${tipoDetectado} de ${telefone}...`);

    setImmediate(async () => {
      try {
        const resultado = await processarMidia(tipoDetectado, mensagemWA.message, mensagemWA);
        if (resultado) {
          console.log(`[WEBHOOK] Conteúdo: "${resultado.conteudo.substring(0, 80)}..."`);
          await accumulator.adicionar(telefone, resultado);
        }
      } catch (err) {
        console.error(`[WEBHOOK] ❌ Erro ao processar mensagem de ${telefone}:`, err.message);
      }
    });

  } catch (err) {
    console.error('[WEBHOOK] ❌ Erro no handler:', err.message);
    console.error(err.stack);
  }
});

// ─── Catch-all log para qualquer POST não reconhecido ──────────────────────────
app.post('*', (req, res) => {
  console.log(`[SERVER] POST desconhecido: ${req.path}`);
  console.log(`[SERVER] Body keys:`, Object.keys(req.body || {}));
  res.sendStatus(404);
});

// ─── Iniciar servidor ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🐾 vet-agent rodando na porta ${PORT}`);
  console.log(`   Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`   Health:    http://localhost:${PORT}/health`);
  console.log(`   Webhook:   POST http://localhost:${PORT}/webhook`);
  console.log(`   API:       http://localhost:${PORT}/api\n`);

  require('./scheduler');
});
