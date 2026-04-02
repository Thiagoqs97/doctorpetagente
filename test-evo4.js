const axios = require('axios');
const headers = { 'Content-Type': 'application/json', apikey: 'FBA648D33650-41E4-8EB7-25F3E521AA71' };
axios.post('https://evo-evolution-api.gjvjfn.easypanel.host/message/sendText/win', 
  { number: '558688636999', text: 'Teste com API v2' }, { headers })
  .then(() => console.log('Teste2 OK'))
  .catch(e => console.error('Teste2 ERROR:', JSON.stringify(e.response?.data || e.message)));
