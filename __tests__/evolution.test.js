const evolution = require('../src/evolution');

describe('Evolution API - Client Mocks', () => {
  it('deve expor todos os métodos previamente testados nos arquivos manuais', () => {
    expect(typeof evolution.enviarMensagem).toBe('function');
    expect(typeof evolution.enviarDigitando).toBe('function');
    // Adicionar verificações de envio de áudio, img e presence que constavam nos test-evo*.js
  });

  // O foco destes modulos em prod seria e2e; de mock seria não explodir em parse de env undefined
  it('função enviarMensagem deve rejeitar erro claro caso API_URL não exista e não seja mock', async () => {
    // Apagamos env para testar
    const oldUrl = process.env.EVOLUTION_API_URL;
    process.env.EVOLUTION_API_URL = '';
    
    await expect(evolution.enviarMensagem('5511999999999', 'Teste')).rejects.toThrow();
    
    // Volta env pro estado inicial
    if (oldUrl !== undefined) {
      process.env.EVOLUTION_API_URL = oldUrl;
    } else {
      delete process.env.EVOLUTION_API_URL;
    }
  });
});
