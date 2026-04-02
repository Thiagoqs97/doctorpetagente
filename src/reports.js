'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { coletarDadosRelatorio, salvarRelatorio } = require('./database');
const { enviarPDFParaGrupo, enviarParaGrupoRelatorio } = require('./evolution');

// Garantir que diretório de relatórios existe
const REPORTS_DIR = path.join(__dirname, '..', 'reports');
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

// ─── Paleta de Cores ───────────────────────────────────────────────────────────
const CORES = {
  primaria: '#1B4F72',      // azul escuro
  secundaria: '#2E86C1',    // azul médio
  acento: '#28B463',        // verde
  laranja: '#E67E22',       // laranja
  vermelho: '#E74C3C',      // vermelho
  cinzaClaro: '#F2F3F4',   // fundo cards
  cinzaMedio: '#839192',    // texto secundário
  branco: '#FFFFFF',
  texto: '#1C2833'          // texto principal
};

// ─── Funções Auxiliares de Desenho ────────────────────────────────────────────

function desenharCabecalho(doc, dados) {
  const clinicaNome = process.env.CLINIC_NAME || 'Clínica Veterinária';
  const { dataReferencia } = dados;

  // Fundo do cabeçalho
  doc.rect(0, 0, doc.page.width, 90).fill(CORES.primaria);

  // Ícone da pata (símbolo)
  doc.fontSize(28).fillColor(CORES.acento).text('🐾', 30, 22, { lineBreak: false });

  // Nome da clínica
  doc.fontSize(22).fillColor(CORES.branco)
    .font('Helvetica-Bold')
    .text(clinicaNome, 70, 20, { lineBreak: false });

  // Subtítulo
  doc.fontSize(11).fillColor('#AED6F1').font('Helvetica')
    .text('Relatório Diário de Atendimentos', 70, 48);

  // Data
  const dataFormatada = new Date(dataReferencia + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  doc.fontSize(11).fillColor('#AED6F1')
    .text(dataFormatada, 0, 48, { align: 'right', width: doc.page.width - 30 });

  doc.moveDown(4);
}

function desenharCard(doc, x, y, largura, altura, titulo, valor, subvalor = '', corFundo = CORES.cinzaClaro) {
  // Sombra
  doc.rect(x + 2, y + 2, largura, altura).fill('#D5D8DC');
  // Fundo do card
  doc.rect(x, y, largura, altura).fill(corFundo);
  // Borda superior colorida
  doc.rect(x, y, largura, 4).fill(CORES.secundaria);

  // Título
  doc.fontSize(9).fillColor(CORES.cinzaMedio).font('Helvetica')
    .text(titulo.toUpperCase(), x + 10, y + 14, { width: largura - 20 });

  // Valor principal
  doc.fontSize(26).fillColor(CORES.texto).font('Helvetica-Bold')
    .text(String(valor), x + 10, y + 28, { width: largura - 20 });

  // Subvalor
  if (subvalor) {
    doc.fontSize(9).fillColor(CORES.cinzaMedio).font('Helvetica')
      .text(subvalor, x + 10, y + 58, { width: largura - 20 });
  }
}

function desenharBarraHorizontal(doc, x, y, largura, percentual, label, valor, cor) {
  const barraLargura = Math.max((largura - 170) * (percentual / 100), 2);

  doc.fontSize(9).fillColor(CORES.texto).font('Helvetica')
    .text(label, x, y + 3, { width: 120, ellipsis: true });

  doc.rect(x + 125, y, largura - 170, 14).fill('#E8EAED');
  doc.rect(x + 125, y, barraLargura, 14).fill(cor);

  doc.fontSize(9).fillColor(CORES.cinzaMedio)
    .text(`${valor} (${percentual}%)`, x + largura - 40, y + 3, { width: 60 });

  return y + 22;
}

function desenharSecaoTitulo(doc, titulo) {
  doc.moveDown(0.5);
  const yAtual = doc.y;
  doc.rect(30, yAtual, doc.page.width - 60, 24).fill(CORES.primaria);
  doc.fontSize(11).fillColor(CORES.branco).font('Helvetica-Bold')
    .text(titulo, 40, yAtual + 6);
  doc.y = yAtual + 30;
  doc.moveDown(0.3);
}

// ─── Gerador do PDF ────────────────────────────────────────────────────────────

async function gerarPDF(dados) {
  const { dataReferencia } = dados;
  const nomeArquivo = `relatorio_${dataReferencia}.pdf`;
  const caminhoArquivo = path.join(REPORTS_DIR, nomeArquivo);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    const stream = fs.createWriteStream(caminhoArquivo);

    doc.pipe(stream);

    // ── Cabeçalho ──
    desenharCabecalho(doc, dados);

    // ── Métricas Principais (cards) ──
    desenharSecaoTitulo(doc, '📊 Visão Geral');
    const cardY = doc.y;
    const cardLarg = (doc.page.width - 80) / 4;

    desenharCard(doc, 30, cardY, cardLarg - 5, 80, 'Conversas', dados.totalConversas, 'total do dia');
    desenharCard(doc, 30 + cardLarg, cardY, cardLarg - 5, 80, 'Clientes Novos', dados.clientesNovos, 'novos hoje');
    desenharCard(doc, 30 + cardLarg * 2, cardY, cardLarg - 5, 80, 'Agendamentos', dados.agendamentosRealizados, 'realizados');
    desenharCard(doc, 30 + cardLarg * 3, cardY, cardLarg - 5, 80, 'Tx. Resolução', `${dados.taxaResolucao}%`, 'conversas resolvidas');

    doc.y = cardY + 90;
    doc.moveDown(0.5);

    const card2Y = doc.y;
    desenharCard(doc, 30, card2Y, cardLarg - 5, 80, 'Abandonadas', dados.conversasAbandonadas, 'sem resolução', '#FDFEFE');
    desenharCard(doc, 30 + cardLarg, card2Y, cardLarg - 5, 80, 'Méd. Mensagens', dados.mediaMensagens, 'por conversa', '#FDFEFE');
    desenharCard(doc, 30 + cardLarg * 2, card2Y, cardLarg - 5, 80, 'Áudios', dados.midias.audio || 0, 'recebidos', '#FDFEFE');
    desenharCard(doc, 30 + cardLarg * 3, card2Y, cardLarg - 5, 80, 'Imagens', dados.midias.imagem || 0, 'recebidas', '#FDFEFE');

    doc.y = card2Y + 100;

    // ── Distribuição por Intenção ──
    desenharSecaoTitulo(doc, '🎯 Distribuição por Intenção');

    const intencoes = Object.entries(dados.intencoes).sort((a, b) => b[1] - a[1]);
    const totalIntencoes = intencoes.reduce((s, [, v]) => s + v, 0);
    const coresIntencoes = [CORES.secundaria, CORES.acento, CORES.laranja, CORES.vermelho, '#8E44AD', '#16A085', '#F39C12', '#2C3E50'];

    let yBarra = doc.y;
    intencoes.forEach(([label, valor], i) => {
      const pct = totalIntencoes > 0 ? ((valor / totalIntencoes) * 100).toFixed(1) : 0;
      const labelFormatado = {
        agendamento: 'Agendamento', preco: 'Preço/Valores',
        duvida_saude: 'Dúvida de Saúde', emergencia: '🚨 Emergência',
        retorno: 'Retorno', cancelamento: 'Cancelamento',
        elogio: 'Elogio', reclamacao: 'Reclamação', outro: 'Outro'
      }[label] || label;

      yBarra = desenharBarraHorizontal(
        doc, 30, yBarra, doc.page.width - 60,
        Number(pct), labelFormatado, valor,
        coresIntencoes[i % coresIntencoes.length]
      );

      if (yBarra > doc.page.height - 100) {
        doc.addPage();
        yBarra = 30;
      }
    });
    doc.y = yBarra + 5;

    // ── Horários de Pico ──
    desenharSecaoTitulo(doc, '⏰ Horários de Pico');

    if (dados.topHorarios.length > 0) {
      const maxQtd = dados.topHorarios[0]?.quantidade || 1;
      let yHora = doc.y;
      dados.topHorarios.forEach((h, i) => {
        const pct = ((h.quantidade / maxQtd) * 100).toFixed(1);
        yHora = desenharBarraHorizontal(
          doc, 30, yHora, doc.page.width - 60,
          Number(pct), h.hora, h.quantidade,
          i === 0 ? CORES.laranja : CORES.secundaria
        );
      });
      doc.y = yHora + 5;
    } else {
      doc.fontSize(10).fillColor(CORES.cinzaMedio).text('Nenhum dado de horário disponível.', 30);
    }

    // ── Top Assuntos ──
    desenharSecaoTitulo(doc, '💬 Top Assuntos Mencionados');

    if (dados.topSubtopicos.length > 0) {
      let yAssunto = doc.y;
      const maxAssunto = dados.topSubtopicos[0]?.quantidade || 1;

      dados.topSubtopicos.forEach((s, i) => {
        const pct = ((s.quantidade / maxAssunto) * 100).toFixed(1);
        yAssunto = desenharBarraHorizontal(
          doc, 30, yAssunto, doc.page.width - 60,
          Number(pct), s.topico, s.quantidade,
          [CORES.acento, CORES.secundaria, CORES.laranja][i % 3]
        );

        if (yAssunto > doc.page.height - 100) {
          doc.addPage();
          yAssunto = 30;
        }
      });
      doc.y = yAssunto + 5;
    } else {
      doc.fontSize(10).fillColor(CORES.cinzaMedio).text('Nenhum subtópico registrado.', 30);
    }

    // ── Breakdown de Mídia ──
    desenharSecaoTitulo(doc, '📎 Tipos de Mídia Recebida');

    const midias = [
      { label: 'Mensagens de Texto', valor: dados.midias.text || 0 },
      { label: 'Áudios', valor: dados.midias.audio || 0 },
      { label: 'Imagens', valor: dados.midias.imagem || 0 },
      { label: 'Arquivos/Documentos', valor: dados.midias.arquivo || 0 }
    ];
    const totalMidia = midias.reduce((s, m) => s + m.valor, 0);
    let yMidia = doc.y;
    const coresMidias = [CORES.secundaria, CORES.laranja, CORES.acento, CORES.vermelho];

    midias.forEach((m, i) => {
      const pct = totalMidia > 0 ? ((m.valor / totalMidia) * 100).toFixed(1) : 0;
      yMidia = desenharBarraHorizontal(
        doc, 30, yMidia, doc.page.width - 60,
        Number(pct), m.label, m.valor, coresMidias[i]
      );
    });

    // ── Rodapé ──
    const alturaRodape = 35;
    const yRodape = doc.page.height - alturaRodape;
    doc.rect(0, yRodape, doc.page.width, alturaRodape).fill(CORES.primaria);

    const agora = new Date().toLocaleString('pt-BR', { timeZone: process.env.REPORT_TIMEZONE || 'America/Sao_Paulo' });
    doc.fontSize(9).fillColor('#AED6F1')
      .text(`Gerado em: ${agora} | vet-agent v1.0.0 🐾`, 30, yRodape + 12);

    doc.end();

    stream.on('finish', () => resolve(caminhoArquivo));
    stream.on('error', reject);
  });
}

// ─── Função Principal ──────────────────────────────────────────────────────────

/**
 * Gera o relatório PDF e envia para o grupo configurado.
 * @param {string|null} dataRef - YYYY-MM-DD ou null para ontem
 */
async function gerarEEnviarRelatorio(dataRef = null) {
  // Data de referência: parâmetro ou ontem
  const tz = process.env.REPORT_TIMEZONE || 'America/Sao_Paulo';
  const agora = new Date(new Date().toLocaleString('en-US', { timeZone: tz }));

  let dataReferencia = dataRef;
  if (!dataReferencia) {
    agora.setDate(agora.getDate() - 1);
    dataReferencia = agora.toISOString().split('T')[0];
  }

  console.log(`\n[RELATORIO] Gerando relatório para: ${dataReferencia}`);

  const dados = await coletarDadosRelatorio(dataReferencia);

  // Se não houver conversas, enviar apenas texto
  if (dados.totalConversas === 0) {
    const msg = `📊 *Relatório Diário — ${dataReferencia}*\n\nNenhum atendimento registrado nesta data. 🌙`;
    await enviarParaGrupoRelatorio(msg);
    console.log('[RELATORIO] Sem conversas — mensagem de texto enviada');
    return { dataReferencia, totalConversas: 0 };
  }

  // Gerar PDF
  const caminhoArquivo = await gerarPDF(dados);
  console.log(`[RELATORIO] PDF gerado: ${caminhoArquivo}`);

  // Legenda resumida
  const legenda = `📊 *Relatório Diário — ${dataReferencia}*\n` +
    `• ${dados.totalConversas} conversa(s) | ${dados.clientesNovos} novo(s)\n` +
    `• ${dados.agendamentosRealizados} agendamento(s) | ${dados.taxaResolucao}% resolvidas\n` +
    `• Gerado automaticamente pelo vet-agent 🐾`;

  // Enviar para o grupo
  await enviarPDFParaGrupo(caminhoArquivo, legenda);
  console.log('[RELATORIO] PDF enviado para o grupo!');

  // Salvar no banco
  await salvarRelatorio(dataReferencia, caminhoArquivo, dados);

  return { dataReferencia, caminhoArquivo, ...dados };
}

module.exports = { gerarEEnviarRelatorio, gerarPDF };
