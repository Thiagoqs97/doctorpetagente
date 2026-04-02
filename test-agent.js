const { processarMensagens } = require('./src/agent');
processarMensagens('5586999999999', [{ tipo: 'text', conteudo: 'Ola test' }])
  .then(console.log)
  .catch(e => console.error('AGENT ERROR:', e.message));
