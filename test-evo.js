const { enviarMensagem, enviarDigitando } = require('./src/evolution');
enviarMensagem('5586999999999', 'Teste direto evolution')
  .then(() => console.log('OK enviarMensagem'))
  .catch(e => console.error('ERROR enviarMensagem:', e.message));

enviarDigitando('5586999999999')
  .then(() => console.log('OK enviarDigitando'))
  .catch(e => console.error('ERROR enviarDigitando:', e.message));
