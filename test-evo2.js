const axios = require('axios');
const headers = { 'Content-Type': 'application/json', apikey: 'FBA648D33650-41E4-8EB7-25F3E521AA71' };
axios.post('https://evo-evolution-api.gjvjfn.easypanel.host/message/sendText/win', 
  { number: '5586999999999@s.whatsapp.net', textMessage: { text: 'Teste1' } }, { headers })
  .then(() => console.log('Teste1 OK'))
  .catch(e => console.error('Teste1 ERROR:', e.response?.data || e.message));

axios.post('https://evo-evolution-api.gjvjfn.easypanel.host/message/sendText/win', 
  { number: '5586999999999@s.whatsapp.net', text: 'Teste2' }, { headers })
  .then(() => console.log('Teste2 OK'))
  .catch(e => console.error('Teste2 ERROR:', e.response?.data || e.message));
