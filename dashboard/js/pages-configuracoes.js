// ─── PAGE: Configurações ──────────────────────────────────────────────────────
async function renderConfiguracoes() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading"><div class="spinner"></div> Carregando configurações...</div>';
  try {
    const cfg = await api.get('/config');
    const modelo = cfg.aiModel || 'gpt-4o-mini';
    const conhecidos = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'];
    const isCustom = !conhecidos.includes(modelo);

    content.innerHTML = `
      <div class="grid-2 fade-in">
        <div class="card">
          <div class="card-header"><span class="card-title">🏥 Dados da Clínica</span></div>
          <div class="config-row"><span class="config-label">Nome</span><span class="config-value">${cfg.clinicName || '—'}</span></div>
          <div class="config-row"><span class="config-label">Telefone</span><span class="config-value">${cfg.clinicPhone || '—'}</span></div>
          <div class="config-row"><span class="config-label">Endereço</span><span class="config-value">${cfg.clinicAddress || '—'}</span></div>
          <div class="config-row"><span class="config-label">Horários</span><span class="config-value">${cfg.clinicHours || '—'}</span></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">📊 Relatório Automático</span></div>
          <div class="config-row"><span class="config-label">Cron</span><span class="config-value">${cfg.reportCron}</span></div>
          <div class="config-row"><span class="config-label">Timezone</span><span class="config-value">${cfg.reportTimezone}</span></div>
          <div class="config-row"><span class="config-label">Porta</span><span class="config-value">${cfg.port}</span></div>
        </div>
      </div>

      <div class="card fade-in" style="margin-top:24px">
        <div class="card-header"><span class="card-title">🤖 Modelo de IA (OpenAI)</span></div>
        <p style="font-size:.85rem;color:var(--text-muted);margin-bottom:16px">
          Modelo atual: <strong style="color:var(--accent)">${modelo}</strong>. A troca é imediata, sem reiniciar o servidor.
          Para tornar permanente, salve também no <code>.env</code>.
        </p>
        <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:14px">
          <div class="form-group" style="margin:0;flex:1;min-width:240px">
            <label class="form-label">Selecionar modelo</label>
            <select class="form-select" id="ai-model-select" onchange="toggleModelCustom()">
              <option value="gpt-4o" ${modelo === 'gpt-4o' ? 'selected' : ''}>gpt-4o ⭐ (Mais inteligente)</option>
              <option value="gpt-4o-mini" ${modelo === 'gpt-4o-mini' ? 'selected' : ''}>gpt-4o-mini ⚡ (Recomendado — rápido e barato)</option>
              <option value="gpt-4-turbo" ${modelo === 'gpt-4-turbo' ? 'selected' : ''}>gpt-4-turbo</option>
              <option value="gpt-3.5-turbo" ${modelo === 'gpt-3.5-turbo' ? 'selected' : ''}>gpt-3.5-turbo (Mais econômico)</option>
              <option value="custom" ${isCustom ? 'selected' : ''}>✏️ Digitar manualmente...</option>
            </select>
          </div>
          <div class="form-group" style="margin:0;flex:1;min-width:240px;${isCustom ? '' : 'display:none'}" id="ai-custom-group">
            <label class="form-label">Nome exato do modelo</label>
            <input class="form-input" id="ai-model-custom" value="${isCustom ? modelo : ''}" placeholder="ex: gpt-4o-2024-08-06">
          </div>
        </div>
        <button class="btn btn-primary" id="ai-model-btn" onclick="trocarModeloIA()">💾 Aplicar Modelo</button>
        <div id="ai-model-result" style="margin-top:12px;font-size:.82rem"></div>
      </div>

      <div class="card fade-in" style="margin-top:24px">
        <div class="card-header"><span class="card-title">🐾 Personalidade da Luna</span></div>
        <p style="font-size:.85rem;color:var(--text-secondary);line-height:1.7">
          A <strong>Luna</strong> é a recepcionista virtual da clínica. Ela é calorosa, empática e ama animais de verdade. 
          Nunca dá diagnósticos médicos — apenas orienta sobre serviços e encaminha. Em emergências, orienta vir imediatamente ou ligar para o plantão.
        </p>
        <div style="margin-top:16px;padding:14px;background:var(--bg-glass);border-radius:var(--radius-md);border-left:3px solid var(--accent)">
          <p style="font-size:.8rem;color:var(--text-muted)">💡 Para alterar os dados da clínica ou cron do relatório, edite o arquivo <code>.env</code> e reinicie o servidor.</p>
        </div>
      </div>`;
  } catch (e) { content.innerHTML = `<div class="empty-state"><span class="empty-state-icon">⚠️</span><p>${e.message}</p></div>`; }
}

function toggleModelCustom() {
  const val = document.getElementById('ai-model-select').value;
  document.getElementById('ai-custom-group').style.display = val === 'custom' ? 'block' : 'none';
}

async function trocarModeloIA() {
  const select = document.getElementById('ai-model-select');
  const modelo = select.value === 'custom'
    ? (document.getElementById('ai-model-custom').value || '').trim()
    : select.value;
  if (!modelo) { toast('Selecione ou digite um modelo', 'error'); return; }
  const btn = document.getElementById('ai-model-btn');
  const result = document.getElementById('ai-model-result');
  btn.disabled = true; btn.textContent = 'Aplicando...';
  try {
    await api.post('/config/ai-model', { modelo });
    toast(`Modelo trocado para: ${modelo}`, 'success');
    result.innerHTML = `<span style="color:var(--success)">✅ Modelo ativo: <strong>${modelo}</strong> — Vá em Integrações para testar a conexão.</span>`;
  } catch (e) {
    toast(e.message, 'error');
    result.innerHTML = `<span style="color:var(--danger)">❌ Erro: ${e.message}</span>`;
  } finally { btn.disabled = false; btn.textContent = '💾 Aplicar Modelo'; }
}
