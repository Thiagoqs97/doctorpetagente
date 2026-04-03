'use strict';

require('dotenv').config();
const cron = require('node-cron');
const { gerarEEnviarRelatorio } = require('./reports');

const CRON_EXPR = process.env.REPORT_CRON || '0 8 * * *';
const TIMEZONE = process.env.REPORT_TIMEZONE || 'America/Sao_Paulo';

console.log(`[SCHEDULER] Relatório configurado: "${CRON_EXPR}" (${TIMEZONE})`);

cron.schedule(
  CRON_EXPR,
  async () => {
    console.log('\n[SCHEDULER] Disparando geração do relatório diário...');
    try {
      const resultado = await gerarEEnviarRelatorio();
      console.log(`[SCHEDULER] Relatório concluído para: ${resultado.dataReferencia}`);
    } catch (err) {
      console.error('[SCHEDULER] Erro ao gerar relatório:', err.message);
    }
  },
  { timezone: TIMEZONE }
);

// ─── Limpeza automática de relatórios antigos (Para não lotar o servidor) ───
const fs = require('fs');
const path = require('path');

const limparPdfsAntigos = () => {
  const reportsDir = path.join(__dirname, '..', 'reports');
  if (!fs.existsSync(reportsDir)) return;
  const files = fs.readdirSync(reportsDir);
  const agora = Date.now();
  const tempoLimite = 7 * 24 * 60 * 60 * 1000; // 7 dias
  
  files.forEach(file => {
    if (!file.endsWith('.pdf')) return;
    const filePath = path.join(reportsDir, file);
    const stats = fs.statSync(filePath);
    if (agora - stats.mtimeMs > tempoLimite) {
      try {
        fs.unlinkSync(filePath);
        console.log(`[SCHEDULER] 🗑️ PDF de relatório antigo ecluído: ${file}`);
      } catch (err) {
        console.warn(`[SCHEDULER] Falha ao tentar excluir PDF: ${file}`);
      }
    }
  });
};

// Limpa todos os dias as 03:00 da manhã
cron.schedule('0 3 * * *', () => {
  console.log('[SCHEDULER] Rotina de limpeza de arquivos iniciada.');
  limparPdfsAntigos();
}, { timezone: TIMEZONE });
