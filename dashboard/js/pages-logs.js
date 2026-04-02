// ─── PAGE: Logs ao Vivo ────────────────────────────────────────────────────────

let logsAutoRefresh = null;
let logsFilterTipo = '';
let logsFilterNivel = '';

async function renderLogs() {
  const content = document.getElementById('content');
  
  // Ações no header
  document.getElementById('header-actions').innerHTML = `
    <button class="btn btn-sm btn-secondary" id="logs-auto-btn" onclick="toggleAutoRefresh()">▶️ Auto-refresh</button>
    <button class="btn btn-sm btn-secondary" onclick="fetchLogs()">🔄 Atualizar</button>
    <button class="btn btn-sm btn-ghost" onclick="limparLogs()" style="color:var(--danger)">🗑️ Limpar</button>
  `;

  content.innerHTML = '<div class="loading"><div class="spinner"></div> Carregando logs...</div>';
  
  await fetchLogs();
  
  // Iniciar auto-refresh
  startAutoRefresh();
}

function startAutoRefresh() {
  stopAutoRefresh();
  logsAutoRefresh = setInterval(() => {
    if (currentPage === 'logs') fetchLogs();
  }, 3000);
  const btn = document.getElementById('logs-auto-btn');
  if (btn) { btn.textContent = '⏸️ Pausar'; btn.classList.add('btn-primary'); btn.classList.remove('btn-secondary'); }
}

function stopAutoRefresh() {
  if (logsAutoRefresh) { clearInterval(logsAutoRefresh); logsAutoRefresh = null; }
  const btn = document.getElementById('logs-auto-btn');
  if (btn) { btn.textContent = '▶️ Auto-refresh'; btn.classList.remove('btn-primary'); btn.classList.add('btn-secondary'); }
}

function toggleAutoRefresh() {
  if (logsAutoRefresh) stopAutoRefresh();
  else startAutoRefresh();
}

async function fetchLogs() {
  try {
    let url = '/logs?limite=200';
    if (logsFilterTipo) url += `&tipo=${logsFilterTipo}`;
    if (logsFilterNivel) url += `&nivel=${logsFilterNivel}`;
    
    const { logs, stats } = await api.get(url);
    renderLogsContent(logs, stats);
  } catch (e) {
    console.error('Erro ao buscar logs:', e);
    const content = document.getElementById('content');
    content.innerHTML = `<div class="empty-state"><span class="empty-state-icon">⚠️</span><p class="empty-state-text">Erro ao carregar logs: ${e.message}</p><button class="btn btn-primary" onclick="fetchLogs()">Tentar novamente</button></div>`;
  }
}

function renderLogsContent(logs, stats) {
  const content = document.getElementById('content');
  
  const nivelIcons = { info: '🔵', success: '🟢', warn: '🟡', error: '🔴' };
  const tipoIcons = {
    webhook_recebido: '📩', midia_processada: '🎵', ia_resposta: '🤖',
    mensagem_enviada: '📤', erro: '❌', sistema: '⚙️', relatorio: '📊', n8n_evento: '🔗'
  };
  const tipoLabels = {
    webhook_recebido: 'Webhook', midia_processada: 'Mídia', ia_resposta: 'IA',
    mensagem_enviada: 'Enviada', erro: 'Erro', sistema: 'Sistema', relatorio: 'Relatório', n8n_evento: 'n8n'
  };
  
  content.innerHTML = `
    <!-- Stats rápidas -->
    <div class="stats-grid fade-in" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">
      <div class="stat-card teal" style="padding:16px">
        <div class="stat-card-header"><span class="stat-card-label">Total</span><div class="stat-card-icon">📊</div></div>
        <div class="stat-card-value" style="font-size:1.6rem">${stats.total}</div>
        <div class="stat-card-detail">${stats.ultimaHora} na última hora</div>
      </div>
      <div class="stat-card blue" style="padding:16px">
        <div class="stat-card-header"><span class="stat-card-label">Webhooks</span><div class="stat-card-icon">📩</div></div>
        <div class="stat-card-value" style="font-size:1.6rem">${stats.porTipo?.webhook_recebido || 0}</div>
        <div class="stat-card-detail">última hora</div>
      </div>
      <div class="stat-card green" style="padding:16px">
        <div class="stat-card-header"><span class="stat-card-label">Sucesso</span><div class="stat-card-icon">✅</div></div>
        <div class="stat-card-value" style="font-size:1.6rem">${stats.porNivel?.success || 0}</div>
        <div class="stat-card-detail">última hora</div>
      </div>
      <div class="stat-card red" style="padding:16px">
        <div class="stat-card-header"><span class="stat-card-label">Erros</span><div class="stat-card-icon">❌</div></div>
        <div class="stat-card-value" style="font-size:1.6rem">${stats.porNivel?.error || 0}</div>
        <div class="stat-card-detail">última hora</div>
      </div>
    </div>

    <!-- Filtros -->
    <div class="toolbar fade-in" style="animation-delay:.05s">
      <div class="toolbar-left" style="gap:8px;flex-wrap:wrap">
        <div class="category-pills" style="margin:0">
          <div class="category-pill ${!logsFilterNivel ? 'active' : ''}" onclick="setLogNivel('')">Todos</div>
          <div class="category-pill ${logsFilterNivel === 'info' ? 'active' : ''}" onclick="setLogNivel('info')">🔵 Info</div>
          <div class="category-pill ${logsFilterNivel === 'success' ? 'active' : ''}" onclick="setLogNivel('success')">🟢 Sucesso</div>
          <div class="category-pill ${logsFilterNivel === 'warn' ? 'active' : ''}" onclick="setLogNivel('warn')">🟡 Alerta</div>
          <div class="category-pill ${logsFilterNivel === 'error' ? 'active' : ''}" onclick="setLogNivel('error')">🔴 Erro</div>
        </div>
      </div>
      <div class="toolbar-right" style="gap:8px">
        <select class="form-select" style="max-width:200px;height:36px;font-size:.8rem" onchange="setLogTipo(this.value)">
          <option value="">Todos os tipos</option>
          <option value="webhook_recebido" ${logsFilterTipo==='webhook_recebido'?'selected':''}>📩 Webhook</option>
          <option value="midia_processada" ${logsFilterTipo==='midia_processada'?'selected':''}>🎵 Mídia</option>
          <option value="ia_resposta" ${logsFilterTipo==='ia_resposta'?'selected':''}>🤖 IA</option>
          <option value="mensagem_enviada" ${logsFilterTipo==='mensagem_enviada'?'selected':''}>📤 Enviada</option>
          <option value="erro" ${logsFilterTipo==='erro'?'selected':''}>❌ Erro</option>
          <option value="sistema" ${logsFilterTipo==='sistema'?'selected':''}>⚙️ Sistema</option>
        </select>
        <span style="font-size:0.78rem;color:var(--text-muted)">${logs.length} evento(s)</span>
      </div>
    </div>

    <!-- Lista de logs -->
    <div class="card fade-in" style="animation-delay:.1s;padding:0;overflow:hidden">
      <div class="logs-list" id="logs-list">
        ${logs.length === 0 ? `
          <div class="empty-state" style="padding:48px 20px">
            <span class="empty-state-icon">📡</span>
            <p class="empty-state-text">Nenhum log encontrado</p>
            <p style="font-size:.8rem;color:var(--text-muted)">Envie uma mensagem no WhatsApp para ver os logs aparecerem aqui em tempo real</p>
          </div>
        ` : logs.map(log => {
          const time = new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const date = new Date(log.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          const icon = tipoIcons[log.tipo] || '📌';
          const label = tipoLabels[log.tipo] || log.tipo;
          const nivelIcon = nivelIcons[log.nivel] || '🔵';
          const nivelClass = log.nivel === 'error' ? 'log-error' : log.nivel === 'warn' ? 'log-warn' : log.nivel === 'success' ? 'log-success' : '';
          
          // Detalhes formatados
          let detalhesHtml = '';
          if (log.detalhes && Object.keys(log.detalhes).length > 0) {
            const items = Object.entries(log.detalhes)
              .filter(([k, v]) => v !== '' && v !== undefined && v !== null && k !== 'stack')
              .map(([k, v]) => {
                const val = typeof v === 'object' ? JSON.stringify(v) : String(v);
                return `<span class="log-detail-item"><strong>${k}:</strong> ${val.length > 120 ? val.substring(0, 120) + '...' : val}</span>`;
              }).join('');
            if (items) detalhesHtml = `<div class="log-details">${items}</div>`;
          }
          
          return `
            <div class="log-entry ${nivelClass}" onclick="this.classList.toggle('expanded')">
              <div class="log-entry-main">
                <span class="log-time">${date} ${time}</span>
                <span class="log-nivel">${nivelIcon}</span>
                <span class="log-tipo-badge">${icon} ${label}</span>
                <span class="log-resumo">${log.resumo}</span>
              </div>
              ${detalhesHtml}
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Info sobre n8n -->
    <div class="card fade-in" style="margin-top:20px;animation-delay:.15s">
      <div class="card-header"><span class="card-title">🔗 Integração com n8n</span></div>
      <p style="font-size:.84rem;color:var(--text-secondary);line-height:1.7;margin-bottom:14px">
        Você pode receber todos esses eventos automaticamente no <strong>n8n</strong> (ou qualquer ferramenta de automação).
        Basta adicionar a variável <code>N8N_WEBHOOK_URL</code> no seu <code>.env</code> com a URL do webhook do n8n.
      </p>
      <div style="padding:14px;background:var(--bg-glass);border-radius:var(--radius-md);border-left:3px solid var(--accent)">
        <p style="font-size:.78rem;color:var(--text-muted);margin-bottom:8px">Exemplo no .env:</p>
        <code style="font-size:.8rem;color:var(--accent)">N8N_WEBHOOK_URL=https://seu-n8n.com/webhook/vet-agent</code>
      </div>
      <p style="font-size:.78rem;color:var(--text-muted);margin-top:14px">
        💡 Com isso configurado, cada evento (nova mensagem, erro, relatório, etc.) será enviado para o n8n em tempo real.
        De lá você pode criar fluxos visuais: alertas no Telegram, salvar planilha, enviar e-mail, etc.
      </p>
    </div>
  `;
}

function setLogTipo(tipo) {
  logsFilterTipo = tipo;
  fetchLogs();
}

function setLogNivel(nivel) {
  logsFilterNivel = nivel;
  fetchLogs();
}

async function limparLogs() {
  if (!confirm('Limpar todos os logs da memória?')) return;
  try {
    await api.del('/logs');
    toast('Logs limpos com sucesso!', 'success');
    fetchLogs();
  } catch (e) {
    toast(e.message, 'error');
  }
}

// Limpar auto-refresh ao sair da página
const _originalNavigate = navigate;
navigate = function(page) {
  if (currentPage === 'logs' && page !== 'logs') {
    stopAutoRefresh();
  }
  _originalNavigate(page);
};
