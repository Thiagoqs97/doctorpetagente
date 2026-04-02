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
