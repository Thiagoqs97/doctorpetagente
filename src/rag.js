'use strict';

const { buscarConhecimento } = require('./database');

// Stopwords em português para remover antes da busca
const STOPWORDS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'para', 'com', 'que', 'não', 'em',
  'uma', 'um', 'por', 'é', 'se', 'na', 'no', 'nas', 'nos', 'ao', 'aos',
  'à', 'às', 'os', 'as', 'o', 'a', 'e', 'ou', 'mas', 'nem', 'porque',
  'quando', 'como', 'onde', 'quem', 'seu', 'sua', 'seus', 'suas',
  'meu', 'minha', 'meus', 'minhas', 'este', 'esta', 'estes', 'estas',
  'esse', 'essa', 'esses', 'essas', 'aquele', 'aquela', 'isso', 'isto',
  'aquilo', 'tudo', 'nada', 'algo', 'alguém', 'ninguém', 'cada', 'todo',
  'toda', 'todos', 'todas', 'mais', 'menos', 'muito', 'pouco', 'já',
  'ainda', 'também', 'só', 'bem', 'mal', 'sim', 'então', 'aí', 'lá',
  'aqui', 'ali', 'foi', 'ser', 'ter', 'fazer', 'ir', 'vir', 'estar',
  'ficar', 'poder', 'querer', 'precisar', 'tenho', 'tem', 'temos'
]);

/**
 * Extrai palavras-chave relevantes de um texto.
 * @param {string} texto
 * @returns {string[]}
 */
function extrairKeywords(texto) {
  return texto
    .toLowerCase()
    .replace(/[^\w\sàáâãäéêëíîïóôõöúûüç]/g, ' ') // remover pontuação
    .split(/\s+/)
    .filter(p => p.length > 2 && !STOPWORDS.has(p))
    .filter((v, i, arr) => arr.indexOf(v) === i) // deduplicar
    .slice(0, 12); // máximo de 12 keywords por busca
}

/**
 * Busca chunks de conhecimento relevantes para as mensagens acumuladas.
 * @param {Array<{tipo: string, conteudo: string}>} mensagens
 * @returns {Promise<string>} - contexto formatado para o system prompt
 */
async function buscarContexto(mensagens) {
  const textoCompleto = mensagens
    .map(m => m.conteudo)
    .join(' ');

  const keywords = extrairKeywords(textoCompleto);

  if (keywords.length === 0) return '';

  const chunks = await buscarConhecimento(keywords);

  if (chunks.length === 0) {
    console.log('[RAG] Nenhum chunk encontrado para keywords:', keywords.join(', '));
    return '';
  }

  const titulos = chunks.map(c => c.titulo).join(', ');
  console.log(`[RAG] Chunks usados: ${titulos}`);

  const contexto = chunks
    .map(c => `### ${c.titulo} (${c.categoria})\n${c.conteudo}`)
    .join('\n\n');

  return contexto;
}

module.exports = { buscarContexto, extrairKeywords };
