// ─── PAGE: Relatórios ──────────────────────────────────────────────────────────
async function renderRelatorios() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading"><div class="spinner"></div> Carregando relatórios...</div>';
  try {
    const relatorios = await api.get('/relatorios');
    content.innerHTML = `
      <div class="toolbar fade-in">
        <div class="toolbar-left">
          <div class="form-group" style="margin:0"><input type="date" class="form-input" id="report-date"></div>
          <button class="btn btn-primary" id="gen-report-btn" onclick="gerarRelatorio()">📊 Gerar Relatório</button>
        </div>
      </div>
      <div class="card fade-in">
        <div class="card-header"><span class="card-title">📄 Relatórios Gerados</span></div>
        <div class="table-container"><table class="table"><thead><tr><th>Data Referência</th><th>Gerado em</th><th>Enviado</th><th>Conversas</th></tr></thead>
        <tbody>${relatorios.length === 0 ? '<tr><td colspan="4" style="text-align:center;color:var(--text-dim)">Nenhum relatório gerado</td></tr>' :
          relatorios.map(r => {
            const dados = r.dados_json || {};
            return `<tr><td><strong>${r.data_referencia}</strong></td><td>${fmtDate(r.gerado_em)}</td>
              <td>${r.enviado ? '<span class="tag tag-green">Enviado</span>' : '<span class="tag tag-gray">Local</span>'}</td>
              <td>${dados.totalConversas ?? '—'}</td></tr>`;
          }).join('')}
        </tbody></table></div>
      </div>`;
  } catch (e) { content.innerHTML = `<div class="empty-state"><span class="empty-state-icon">⚠️</span><p>${e.message}</p></div>`; }
}

async function gerarRelatorio() {
  const data = document.getElementById('report-date').value || null;
  const btn = document.getElementById('gen-report-btn');
  btn.disabled = true; btn.textContent = 'Gerando...';
  try { await api.post('/relatorios/gerar', { data }); toast('Relatório gerado e enviado!', 'success'); renderRelatorios(); }
  catch (e) { toast(e.message, 'error'); }
  finally { btn.disabled = false; btn.textContent = '📊 Gerar Relatório'; }
}
