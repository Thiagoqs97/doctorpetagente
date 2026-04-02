const axios = require('axios');
const headers = { 'Content-Type': 'application/json', apikey: 'FBA648D33650-41E4-8EB7-25F3E521AA71' };
axios.post('https://evo-evolution-api.gjvjfn.easypanel.host/message/sendText/win', 
  { number: '558688636999', textMessage: { text: 'Teste real' } }, { headers })
  .then(() => console.log('Teste OK'))
  .catch(e => console.error('Teste ERROR:', JSON.stringify(e.response?.data || e.message)));
