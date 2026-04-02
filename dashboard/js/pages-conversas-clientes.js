// ─── PAGE: Conversas ───────────────────────────────────────────────────────────
let selectedConversaId = null;

async function renderConversas() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading"><div class="spinner"></div> Carregando conversas...</div>';
  try {
    const conversas = await api.get('/conversas?limite=60');
    content.innerHTML = `<div class="chat-layout">
      <div class="chat-list">
        <div class="chat-list-header"><input class="form-input" id="conv-search" placeholder="🔍 Filtrar conversas..."></div>
        <div id="conv-list">${conversas.length === 0 ? '<div style="padding:30px;text-align:center;color:var(--text-dim)">Nenhuma conversa</div>' : conversas.map(c => renderConvItem(c)).join('')}</div>
      </div>
      <div class="chat-messages-area" id="conv-detail">
        <div class="chat-empty"><span class="chat-empty-icon">💬</span><p>Selecione uma conversa</p></div>
      </div>
    </div>`;
    document.getElementById('conv-search').addEventListener('input', e => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('.chat-item').forEach(el => {
        el.style.display = el.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
    if (selectedConversaId) loadConversaDetail(selectedConversaId);
  } catch (e) { content.innerHTML = `<div class="empty-state"><span class="empty-state-icon">⚠️</span><p>${e.message}</p></div>`; }
}

function renderConvItem(c) {
  const nome = c.clientes?.nome || fmtPhone(c.telefone);
  const pet = c.clientes?.nome_pet ? ` • 🐾 ${c.clientes.nome_pet}` : '';
  return `<div class="chat-item ${selectedConversaId === c.id ? 'active' : ''}" onclick="loadConversaDetail('${c.id}')">
    <div class="chat-item-header"><span class="chat-item-name">${nome}${pet}</span><span class="chat-item-time">${fmtDate(c.iniciado_em)}</span></div>
    <div class="chat-item-preview">${intentionTag(c.intencao_principal)} ${c.subtopico || ''}</div>
  </div>`;
}

async function loadConversaDetail(id) {
  selectedConversaId = id;
  document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
  const clicked = [...document.querySelectorAll('.chat-item')].find(el => el.getAttribute('onclick')?.includes(id));
  if (clicked) clicked.classList.add('active');
  const area = document.getElementById('conv-detail');
  area.innerHTML = '<div class="loading" style="flex:1"><div class="spinner"></div></div>';
  try {
    const { conversa: c, mensagens } = await api.get(`/conversas/${id}`);
    const nome = c.clientes?.nome || fmtPhone(c.telefone);
    area.innerHTML = `
      <div class="chat-messages-header">
        <div><strong>${nome}</strong> <span style="color:var(--text-dim);font-size:.82rem">• ${fmtPhone(c.telefone)}</span><br>
        <span style="font-size:.78rem;color:var(--text-muted)">${intentionTag(c.intencao_principal)} ${statusTag(c.status)} ${c.subtopico ? `• ${c.subtopico}` : ''}</span></div>
        ${c.status === 'ativa' ? `<button class="btn btn-sm btn-secondary" onclick="encerrarConversa('${id}')">Encerrar</button>` : ''}
      </div>
      <div class="chat-messages-body">${mensagens.length === 0 ? '<div class="chat-empty"><p>Sem mensagens</p></div>' : mensagens.map(m => `
        <div class="message-bubble ${m.papel}">
          ${m.tipo !== 'text' ? `<div class="message-type-tag">${m.tipo === 'audio' ? '🎤' : m.tipo === 'imagem' ? '📷' : '📎'} ${m.tipo}</div>` : ''}
          ${m.conteudo.replace(/\n/g, '<br>')}
          <div class="message-time">${fmtDate(m.criado_em)}</div>
        </div>`).join('')}
      </div>`;
    const body = area.querySelector('.chat-messages-body');
    body.scrollTop = body.scrollHeight;
  } catch (e) { area.innerHTML = `<div class="chat-empty"><p>Erro: ${e.message}</p></div>`; }
}

async function encerrarConversa(id) {
  try { await api.put(`/conversas/${id}/encerrar`, {}); toast('Conversa encerrada', 'success'); loadConversaDetail(id); } catch (e) { toast(e.message, 'error'); }
}

// ─── PAGE: Clientes ────────────────────────────────────────────────────────────
async function renderClientes() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading"><div class="spinner"></div> Carregando clientes...</div>';
  try {
    const clientes = await api.get('/clientes');
    content.innerHTML = `
      <div class="toolbar fade-in"><div class="toolbar-left"><div class="search-box"><span class="search-icon">🔍</span><input class="form-input" id="cli-search" placeholder="Buscar por nome, telefone ou pet..." style="padding-left:40px"></div></div>
        <span style="font-size:.82rem;color:var(--text-muted)">${clientes.length} cliente(s)</span></div>
      <div class="card fade-in"><div class="table-container"><table class="table"><thead><tr><th>Nome</th><th>Telefone</th><th>Pet</th><th>Espécie / Raça</th><th>Desde</th><th></th></tr></thead>
      <tbody id="cli-tbody">${clientes.map(c => renderClienteRow(c)).join('')}</tbody></table></div></div>`;
    document.getElementById('cli-search').addEventListener('input', debounce(async e => {
      const q = e.target.value;
      const r = await api.get(`/clientes?q=${encodeURIComponent(q)}`);
      document.getElementById('cli-tbody').innerHTML = r.map(c => renderClienteRow(c)).join('');
    }, 400));
  } catch (e) { content.innerHTML = `<div class="empty-state"><span class="empty-state-icon">⚠️</span><p>${e.message}</p></div>`; }
}

function renderClienteRow(c) {
  return `<tr><td><strong>${c.nome || '—'}</strong></td><td>${fmtPhone(c.telefone)}</td><td>${c.nome_pet || '—'}</td>
    <td>${c.especie || '—'} ${c.raca ? `/ ${c.raca}` : ''} ${c.idade_pet ? `(${c.idade_pet})` : ''}</td>
    <td>${fmtDate(c.criado_em)}</td><td><button class="btn btn-ghost btn-sm" onclick='openEditCliente(${JSON.stringify(c).replace(/'/g, "\\'")})'>✏️</button></td></tr>`;
}

function openEditCliente(c) {
  openModal(`<div class="modal-header"><h3>Editar Cliente</h3><button class="btn btn-ghost" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="grid-2"><div class="form-group"><label class="form-label">Nome</label><input class="form-input" id="ec-nome" value="${c.nome || ''}"></div>
      <div class="form-group"><label class="form-label">Email</label><input class="form-input" id="ec-email" value="${c.email || ''}"></div></div>
      <div class="grid-2"><div class="form-group"><label class="form-label">Nome do Pet</label><input class="form-input" id="ec-pet" value="${c.nome_pet || ''}"></div>
      <div class="form-group"><label class="form-label">Espécie</label><input class="form-input" id="ec-especie" value="${c.especie || ''}"></div></div>
      <div class="grid-2"><div class="form-group"><label class="form-label">Raça</label><input class="form-input" id="ec-raca" value="${c.raca || ''}"></div>
      <div class="form-group"><label class="form-label">Idade do Pet</label><input class="form-input" id="ec-idade" value="${c.idade_pet || ''}"></div></div>
    </div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="saveCliente('${c.id}')">Salvar</button></div>`);
}

async function saveCliente(id) {
  const body = { nome: document.getElementById('ec-nome').value, email: document.getElementById('ec-email').value, nome_pet: document.getElementById('ec-pet').value, especie: document.getElementById('ec-especie').value, raca: document.getElementById('ec-raca').value, idade_pet: document.getElementById('ec-idade').value };
  try { await api.put(`/clientes/${id}`, body); toast('Cliente atualizado!', 'success'); closeModal(); renderClientes(); } catch (e) { toast(e.message, 'error'); }
}
