const axios = require('axios');
const headers = { 'Content-Type': 'application/json', apikey: 'FBA648D33650-41E4-8EB7-25F3E521AA71' };
axios.post('https://evo-evolution-api.gjvjfn.easypanel.host/chat/sendPresence/win', 
  { number: '558688636999', delay: 1200, presence: 'composing' }, { headers })
  .then(() => console.log('Presence OK'))
  .catch(e => console.error('Presence ERROR:', JSON.stringify(e.response?.data || e.message)));
