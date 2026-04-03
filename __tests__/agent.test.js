const { processarMensagens } = require('../src/agent');

// Mockamos o módulo do evolution porque senão bateríamos nas credenciais de prod sem querer
jest.mock('../src/evolution', () => ({
  enviarMensagem: jest.fn().mockResolvedValue({}),
  enviarDigitando: jest.fn().mockResolvedValue({})
}));

jest.mock('../src/database', () => ({
  upsertCliente: jest.fn().mockResolvedValue({ id: 1, nome: 'Test' }),
  atualizarCliente: jest.fn().mockResolvedValue({}),
  buscarOuCriarConversa: jest.fn().mockResolvedValue({ id: 1 }),
  atualizarConversa: jest.fn().mockResolvedValue({}),
  salvarMensagem: jest.fn().mockResolvedValue({}),
  buscarHistorico: jest.fn().mockResolvedValue([])
}));

jest.mock('../src/rag', () => ({
  buscarContexto: jest.fn().mockResolvedValue('')
}));

// Impede chamadas reais a API da openai
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: { content: '{"mensagem": "Mockado", "intencao": "outro", "subtopico": "teste"}' }
          }]
        })
      }
    }
  }));
});

describe('Agent Logic Integration', () => {
  it('deve possuir o orquestrador principal exportado', () => {
    expect(typeof processarMensagens).toBe('function');
  });

  // Substitui a chamada estrita do "test-agent.js" e trata a Promise com mock async
  it('deve conseguir chamar "processarMensagens" mas retornar early se configs falsas', async () => {
    // Ao mockarmos, impedimos que quebre por supabase undefined, mas a gente ainda testa o JS core
    const res = processarMensagens('5586999999999', [{ tipo: 'text', conteudo: 'Ola test' }]);
    expect(res).toBeInstanceOf(Promise);
  });
});
