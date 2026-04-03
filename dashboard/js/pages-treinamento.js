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
