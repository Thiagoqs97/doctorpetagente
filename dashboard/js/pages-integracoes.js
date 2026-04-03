// ─── PAGE: Integrações ─────────────────────────────────────────────────────────
async function renderIntegracoes() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading"><div class="spinner"></div> Verificando integrações...</div>';
  try {
    const r = await api.get('/integracoes/status');
    const s = r.status;
    const d = r.detalhes;
    const cfg = r.config;
    const stLabel = (ok) => ok ? '<div class="integration-status online"><div class="status-dot"></div> Conectado</div>' : '<div class="integration-status offline"><div class="status-dot offline"></div> Desconectado</div>';

    content.innerHTML = `
      <div class="section-header fade-in"><h3>Status das Integrações</h3><p>Verifique a conectividade de todos os serviços</p></div>
      <div class="grid-3 fade-in">
        <div class="integration-card ${s.supabase ? 'connected' : 'disconnected'}">
          <div class="integration-card-icon supabase">🗄️</div>
          <h3>Supabase</h3><p>Banco de dados PostgreSQL</p>
          ${stLabel(s.supabase)}
          <div style="font-size:.8rem;color:var(--text-muted)">${d.supabase}</div>
        </div>
        <div class="integration-card ${s.ia ? 'connected' : 'disconnected'}">
          <div class="integration-card-icon gemini">🧠</div>
          <h3>Inteligência Artificial</h3><p>Cérebro do agente Luna</p>
          ${stLabel(s.ia)}
          <div style="font-size:.8rem;color:var(--text-muted)">${d.ia}</div>
        </div>
        <div class="integration-card ${s.evolution ? 'connected' : 'disconnected'}">
          <div class="integration-card-icon evolution">📱</div>
          <h3>Evolution API</h3><p>Conexão WhatsApp</p>
          ${stLabel(s.evolution)}
          <div style="font-size:.8rem;color:var(--text-muted)">${d.evolution}</div>
        </div>
      </div>

      <div class="card fade-in" style="margin-top:24px">
        <div class="card-header"><span class="card-title">⚙️ Configuração Atual</span><button class="btn btn-sm btn-secondary" onclick="renderIntegracoes()">🔄 Atualizar</button></div>
        ${Object.entries(cfg).map(([k, v]) => `<div class="config-row"><span class="config-label">${k}</span><span class="config-value">${v}</span></div>`).join('')}
      </div>

      <div class="card fade-in" style="margin-top:24px">
        <div class="card-header"><span class="card-title">📤 Teste de Envio (Evolution API)</span></div>
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Número</label><input class="form-input" id="test-numero" placeholder="5511999990000"></div>
          <div class="form-group"><label class="form-label">Mensagem</label><input class="form-input" id="test-msg" value="🐾 Teste do vet-agent — Luna está on-line!"></div>
        </div>
        <button class="btn btn-primary" id="test-send-btn" onclick="testarEnvio()">Enviar Teste</button>
      </div>
      <div class="card fade-in" style="margin-top:24px">
        <div class="card-header"><span class="card-title">🔗 URL do Webhook</span></div>
        <p style="font-size:.82rem;color:var(--text-muted);margin-bottom:12px">Configure esta URL na Evolution API para receber mensagens:</p>
        <div class="copy-box"><code id="webhook-url">${cfg.webhookUrl}</code><button class="btn btn-ghost btn-sm" onclick="copyWebhook()">📋</button></div>
      </div>`;
  } catch (e) { content.innerHTML = `<div class="empty-state"><span class="empty-state-icon">⚠️</span><p>${e.message}</p></div>`; }
}

async function testarEnvio() {
  const numero = document.getElementById('test-numero').value;
  const mensagem = document.getElementById('test-msg').value;
  if (!numero) { toast('Informe o número', 'error'); return; }
  const btn = document.getElementById('test-send-btn');
  btn.disabled = true; btn.textContent = 'Enviando...';
  try { await api.post('/integracoes/testar-evolution', { numero, mensagem }); toast('Mensagem enviada com sucesso!', 'success'); }
  catch (e) { toast(e.message, 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Enviar Teste'; }
}

function copyWebhook() {
  const t = document.getElementById('webhook-url').textContent;
  navigator.clipboard.writeText(t).then(() => toast('Copiado!', 'success')).catch(() => toast('Falha ao copiar', 'error'));
}
