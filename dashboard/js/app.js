// vet-agent dashboard — main application

// ─── API Client ────────────────────────────────────────────────────────────────
const api = {
  async get(path) {
    const r = await fetch(`/api${path}`);
    if (!r.ok) throw new Error((await r.json()).erro || r.statusText);
    return r.json();
  },
  async post(path, body) {
    const r = await fetch(`/api${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error((await r.json()).erro || r.statusText);
    return r.json();
  },
  async put(path, body) {
    const r = await fetch(`/api${path}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error((await r.json()).erro || r.statusText);
    return r.json();
  },
  async patch(path) {
    const r = await fetch(`/api${path}`, { method: 'PATCH' });
    if (!r.ok) throw new Error((await r.json()).erro || r.statusText);
    return r.json();
  },
  async del(path) {
    const r = await fetch(`/api${path}`, { method: 'DELETE' });
    if (!r.ok) throw new Error((await r.json()).erro || r.statusText);
    return r.json();
  }
};

// ─── Toast ─────────────────────────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-text">${msg}</span>`;
  c.appendChild(el);
  setTimeout(() => { el.style.animation = 'toastOut 0.3s forwards'; setTimeout(() => el.remove(), 300); }, 4000);
}

// ─── Modal ─────────────────────────────────────────────────────────────────────
function openModal(html) {
  document.getElementById('modal-container').innerHTML = html;
  document.getElementById('modal-overlay').classList.add('active');
}
function closeModal() { document.getElementById('modal-overlay').classList.remove('active'); }
document.getElementById('modal-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }); }
function fmtPhone(p) { if (!p || p.length < 10) return p || '—'; return p.replace(/^(\d{2})(\d{2})(\d{4,5})(\d{4})$/, '+$1 ($2) $3-$4'); }
function intentionTag(i) {
  const m = { agendamento: ['tag-blue', '📅'], preco: ['tag-orange', '💰'], duvida_saude: ['tag-purple', '🏥'], emergencia: ['tag-red', '🚨'], retorno: ['tag-teal', '🔄'], cancelamento: ['tag-red', '❌'], elogio: ['tag-green', '👏'], reclamacao: ['tag-orange', '😤'], outro: ['tag-gray', '📌'] };
  const [cls, ic] = m[i] || m.outro;
  return `<span class="tag ${cls}">${ic} ${i || 'outro'}</span>`;
}
function statusTag(s) { return s === 'ativa' ? '<span class="tag tag-green">● Ativa</span>' : '<span class="tag tag-gray">● Encerrada</span>'; }

const catIcons = { servicos: '🏥', precos: '💰', vacinas: '💉', cirurgias: '🔪', horarios: '🕐', convenios: '📋', veterinarios: '👨‍⚕️', emergencia: '🚨', agendamento: '📅', faq: '❓' };

// ─── Router ────────────────────────────────────────────────────────────────────
// Pages map uses string names → resolved at call time via window[] to avoid
// referencing functions in scripts that haven't loaded yet.
const pageNames = ['dashboard', 'treinamento', 'conversas', 'clientes', 'integracoes', 'relatorios', 'configuracoes', 'logs'];

let currentPage = 'dashboard';

function getRenderer(page) {
  const fnName = 'render' + page.charAt(0).toUpperCase() + page.slice(1);
  return window[fnName] || renderDashboard;
}

function navigate(page) {
  if (!pageNames.includes(page)) page = 'dashboard';
  currentPage = page;
  window.location.hash = page;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === page));
  const titles = { dashboard: 'Dashboard', treinamento: 'Treinamento do Agente', conversas: 'Conversas', clientes: 'Clientes', integracoes: 'Integrações', relatorios: 'Relatórios', configuracoes: 'Configurações', logs: 'Logs ao Vivo' };
  document.getElementById('page-title').textContent = titles[page] || 'Dashboard';
  document.getElementById('header-actions').innerHTML = '';
  getRenderer(page)();
}

document.querySelectorAll('.nav-item').forEach(n => n.addEventListener('click', () => navigate(n.dataset.page)));
window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (h && pageNames.includes(h)) navigate(h); });

// ─── Init — deferred until all scripts are loaded ──────────────────────────────
window.addEventListener('load', async function init() {
  const h = location.hash.slice(1);
  navigate(pageNames.includes(h) ? h : 'dashboard');
  try { const s = await api.get('/integracoes/status'); const ok = s.status.supabase && s.status.gemini;
    document.getElementById('global-status-dot').className = `status-dot ${ok ? '' : 'offline'}`;
    document.getElementById('global-status-text').textContent = ok ? 'Sistemas on-line' : 'Verificar integrações';
  } catch { document.getElementById('global-status-dot').className = 'status-dot offline'; document.getElementById('global-status-text').textContent = 'Sem conexão API'; }
});

// ─── PAGE: Dashboard ───────────────────────────────────────────────────────────
async function renderDashboard() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading"><div class="spinner"></div> Carregando métricas...</div>';
  try {
    const s = await api.get('/stats');
    content.innerHTML = `
      <div class="stats-grid fade-in">
        <div class="stat-card teal"><div class="stat-card-header"><span class="stat-card-label">Conversas Hoje</span><div class="stat-card-icon">💬</div></div><div class="stat-card-value">${s.conversasHoje}</div><div class="stat-card-detail">${s.conversas7d} nos últimos 7 dias</div></div>
        <div class="stat-card purple"><div class="stat-card-header"><span class="stat-card-label">Clientes</span><div class="stat-card-icon">👤</div></div><div class="stat-card-value">${s.totalClientes}</div><div class="stat-card-detail">${s.clientesHoje} novo(s) hoje</div></div>
        <div class="stat-card blue"><div class="stat-card-header"><span class="stat-card-label">Agendamentos</span><div class="stat-card-icon">📅</div></div><div class="stat-card-value">${s.agendamentosHoje}</div><div class="stat-card-detail">Taxa resolução: ${s.taxaResolucao}%</div></div>
        <div class="stat-card orange"><div class="stat-card-header"><span class="stat-card-label">Base RAG</span><div class="stat-card-icon">🧠</div></div><div class="stat-card-value">${s.conhecimentoAtivo}</div><div class="stat-card-detail">${s.totalConhecimento} chunks total</div></div>
      </div>
      <div class="grid-2 fade-in" style="animation-delay:.1s">
        <div class="card">
          <div class="card-header"><span class="card-title">📈 Conversas por Dia (7d)</span></div>
          <div class="bar-chart" id="chart-days"></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">🎯 Intenções Detectadas</span></div>
          <div class="bar-chart" id="chart-intencoes"></div>
        </div>
      </div>
      <div class="card fade-in" style="margin-top:20px;animation-delay:.2s">
        <div class="card-header"><span class="card-title">🕐 Últimas Conversas</span><button class="btn btn-sm btn-secondary" onclick="navigate('conversas')">Ver todas</button></div>
        <div class="table-container"><table class="table"><thead><tr><th>Telefone</th><th>Intenção</th><th>Subtópico</th><th>Status</th><th>Início</th></tr></thead>
        <tbody>${(s.ultimasConversas || []).map(c => `<tr><td>${fmtPhone(c.telefone)}</td><td>${intentionTag(c.intencao_principal)}</td><td>${c.subtopico || '—'}</td><td>${statusTag(c.status)}</td><td>${fmtDate(c.iniciado_em)}</td></tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-dim)">Nenhuma conversa ainda</td></tr>'}</tbody></table></div>
      </div>`;
    // Charts
    const daysEl = document.getElementById('chart-days');
    const dias = s.conversasPorDia || {};
    const maxD = Math.max(...Object.values(dias), 1);
    const colors = ['#00d4aa', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#ef4444'];
    if (Object.keys(dias).length === 0) { daysEl.innerHTML = '<div style="text-align:center;color:var(--text-dim);padding:30px">Sem dados</div>'; }
    else { daysEl.innerHTML = Object.entries(dias).map(([d, v], i) => { const pct = (v / maxD * 100).toFixed(0); const label = new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }); return `<div class="bar-row"><span class="bar-label">${label}</span><div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${colors[i % 7]}">${v}</div></div></div>`; }).join(''); }
    const intEl = document.getElementById('chart-intencoes');
    const ints = s.intencoes || {};
    const maxI = Math.max(...Object.values(ints), 1);
    if (Object.keys(ints).length === 0) { intEl.innerHTML = '<div style="text-align:center;color:var(--text-dim);padding:30px">Sem dados</div>'; }
    else { intEl.innerHTML = Object.entries(ints).sort((a, b) => b[1] - a[1]).map(([k, v], i) => { const pct = (v / maxI * 100).toFixed(0); return `<div class="bar-row"><span class="bar-label">${k}</span><div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${colors[i % 7]}">${v}</div></div></div>`; }).join(''); }
  } catch (e) { content.innerHTML = `<div class="empty-state"><span class="empty-state-icon">⚠️</span><p class="empty-state-text">Erro ao carregar: ${e.message}</p><button class="btn btn-primary" onclick="renderDashboard()">Tentar novamente</button></div>`; }
}

// Treinamento movido para pages-treinamento.js

function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
