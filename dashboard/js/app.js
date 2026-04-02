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

// ─── PAGE: Treinamento ─────────────────────────────────────────────────────────
let trainFilter = '';
let trainSearch = '';

async function renderTreinamento() {
  const content = document.getElementById('content');
  document.getElementById('header-actions').innerHTML = '<button class="btn btn-primary" onclick="openKnowledgeModal()">+ Novo Conhecimento</button>';
  content.innerHTML = '<div class="loading"><div class="spinner"></div> Carregando base de conhecimento...</div>';
  try {
    let url = '/conhecimento?';
    if (trainFilter) url += `categoria=${trainFilter}&`;
    if (trainSearch) url += `q=${encodeURIComponent(trainSearch)}&`;
    const { items, categorias } = await api.get(url);

    const allCats = Object.entries(categorias || {}).sort((a, b) => b[1] - a[1]);
    const totalItems = Object.values(categorias || {}).reduce((s, v) => s + v, 0);

    content.innerHTML = `
      <div class="toolbar fade-in">
        <div class="toolbar-left">
          <div class="search-box"><span class="search-icon">🔍</span><input class="form-input" id="train-search" placeholder="Buscar conhecimento..." value="${trainSearch}" style="padding-left:40px"></div>
        </div>
        <div class="toolbar-right"><span style="font-size:0.82rem;color:var(--text-muted)">${items.length} resultado(s)</span></div>
      </div>
      <div class="category-pills fade-in">
        <div class="category-pill ${!trainFilter ? 'active' : ''}" onclick="setTrainFilter('')">Todas <span class="pill-count">${totalItems}</span></div>
        ${allCats.map(([c, n]) => `<div class="category-pill ${trainFilter === c ? 'active' : ''}" onclick="setTrainFilter('${c}')">${catIcons[c] || '📄'} ${c} <span class="pill-count">${n}</span></div>`).join('')}
      </div>
      <div class="knowledge-grid fade-in" id="knowledge-list">
        ${items.length === 0 ? '<div class="empty-state" style="grid-column:1/-1"><span class="empty-state-icon">🧠</span><p class="empty-state-text">Nenhum conhecimento encontrado</p><button class="btn btn-primary" onclick="openKnowledgeModal()">Adicionar primeiro</button></div>' : items.map(k => renderKnowledgeCard(k)).join('')}
      </div>`;

    document.getElementById('train-search').addEventListener('input', debounce(e => { trainSearch = e.target.value; renderTreinamento(); }, 400));
  } catch (e) { content.innerHTML = `<div class="empty-state"><span class="empty-state-icon">⚠️</span><p class="empty-state-text">${e.message}</p></div>`; }
}

function setTrainFilter(cat) { trainFilter = cat; renderTreinamento(); }

function renderKnowledgeCard(k) {
  const kws = (k.keywords || '').split(',').filter(x => x.trim()).slice(0, 6);
  return `<div class="knowledge-card ${k.ativo ? '' : 'inactive'}">
    <div class="knowledge-card-header">
      <span class="knowledge-card-title">${catIcons[k.categoria] || '📄'} ${k.titulo}</span>
      <label class="toggle" title="${k.ativo ? 'Ativo' : 'Inativo'}"><input type="checkbox" ${k.ativo ? 'checked' : ''} onchange="toggleKnowledge('${k.id}')"><span class="toggle-slider"></span></label>
    </div>
    <span class="tag tag-blue" style="margin-bottom:8px;font-size:0.68rem">${k.categoria}</span>
    <div class="knowledge-card-body">${k.conteudo.replace(/\n/g, '<br>')}</div>
    <div class="knowledge-card-footer">
      <div class="knowledge-keywords">${kws.map(w => `<span class="keyword-tag">${w.trim()}</span>`).join('')}</div>
      <div class="knowledge-card-actions">
        <button class="btn btn-ghost btn-sm" onclick='editKnowledge(${JSON.stringify(k).replace(/'/g, "\\'")})' title="Editar">✏️</button>
        <button class="btn btn-ghost btn-sm" onclick="deleteKnowledge('${k.id}')" title="Excluir">🗑️</button>
      </div>
    </div>
  </div>`;
}

async function toggleKnowledge(id) { try { await api.patch(`/conhecimento/${id}/toggle`); toast('Status atualizado!', 'success'); } catch (e) { toast(e.message, 'error'); renderTreinamento(); } }

async function deleteKnowledge(id) { if (!confirm('Excluir este conhecimento permanentemente?')) return; try { await api.del(`/conhecimento/${id}`); toast('Conhecimento excluído', 'success'); renderTreinamento(); } catch (e) { toast(e.message, 'error'); } }

function openKnowledgeModal(data = null) {
  const isEdit = !!data;
  openModal(`
    <div class="modal-header"><h3>${isEdit ? 'Editar' : 'Novo'} Conhecimento</h3><button class="btn btn-ghost" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="form-group"><label class="form-label">Categoria</label>
        <select class="form-select" id="k-categoria"><option value="">Selecione...</option>
        ${['servicos','precos','vacinas','cirurgias','horarios','convenios','veterinarios','emergencia','agendamento','faq'].map(c => `<option value="${c}" ${data?.categoria === c ? 'selected' : ''}>${catIcons[c] || ''} ${c}</option>`).join('')}
        </select></div>
      <div class="form-group"><label class="form-label">Título</label><input class="form-input" id="k-titulo" value="${data?.titulo || ''}" placeholder="Ex: Vacinas para Cães"></div>
      <div class="form-group"><label class="form-label">Conteúdo</label><textarea class="form-textarea" id="k-conteudo" rows="6" placeholder="Texto completo que a Luna usará para responder...">${data?.conteudo || ''}</textarea></div>
      <div class="form-group"><label class="form-label">Palavras-chave (separadas por vírgula)</label><input class="form-input" id="k-keywords" value="${data?.keywords || ''}" placeholder="vacina, cachorro, filhote, v8"></div>
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="saveKnowledge('${data?.id || ''}')">${isEdit ? 'Salvar' : 'Criar'}</button></div>
  `);
}

function editKnowledge(data) { openKnowledgeModal(data); }

async function saveKnowledge(id) {
  const body = { categoria: document.getElementById('k-categoria').value, titulo: document.getElementById('k-titulo').value, conteudo: document.getElementById('k-conteudo').value, keywords: document.getElementById('k-keywords').value };
  if (!body.categoria || !body.titulo || !body.conteudo) { toast('Preencha todos os campos obrigatórios', 'error'); return; }
  try {
    if (id) { await api.put(`/conhecimento/${id}`, body); toast('Conhecimento atualizado!', 'success'); }
    else { await api.post('/conhecimento', body); toast('Conhecimento criado!', 'success'); }
    closeModal(); renderTreinamento();
  } catch (e) { toast(e.message, 'error'); }
}

function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
