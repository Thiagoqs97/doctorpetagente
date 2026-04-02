'use strict';

require('dotenv').config();
const OpenAI = require('openai');
const {
  upsertCliente,
  atualizarCliente,
  buscarOuCriarConversa,
  atualizarConversa,
  salvarMensagem,
  buscarHistorico
} = require('./database');
const { buscarContexto } = require('./rag');
const { enviarMensagem } = require('./evolution');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.AI_MODEL || 'gpt-4o-mini';

// ─── System Prompt da Luna ─────────────────────────────────────────────────────

function buildSystemPrompt(cliente, contextoRAG) {
  const clinicaNome = process.env.CLINIC_NAME || 'nossa clínica veterinária';
  const clinicaTelefone = process.env.CLINIC_PHONE || '';
  const clinicaHorarios = process.env.CLINIC_HOURS || '';
  const clinicaEndereco = process.env.CLINIC_ADDRESS || '';
  const adminPhone = process.env.ADMIN_PHONE || '';

  const dadosCliente = cliente
    ? `- Nome do tutor: ${cliente.nome || 'não informado'}
- Pet: ${cliente.nome_pet || 'não informado'} (${cliente.especie || '?'}, ${cliente.raca || '?'}, ${cliente.idade_pet || '?'})`
    : '- Cliente novo (dados ainda não coletados)';

  const secaoConhecimento = contextoRAG
    ? `\n## BASE DE CONHECIMENTO DA CLÍNICA\nUse estas informações para responder com precisão:\n${contextoRAG}\n`
    : '\n## BASE DE CONHECIMENTO\nNenhuma informação específica encontrada para este tema. Responda com base no que você sabe, mas sempre oriente o tutor a confirmar com a equipe.\n';

  return `Você é Luna, a recepcionista virtual da ${clinicaNome}. 

## SUA PERSONALIDADE
- Você é calorosa, empática e ama animais de verdade 🐾
- Seu tom é de uma recepcionista que genuinamente se importa com cada paciente
- Use emojis com moderação (1-3 por mensagem, quando fizer sentido)
- Respostas claras, objetivas e acolhedoras
- Nunca dê diagnósticos médicos — apenas oriente sobre serviços e encaminhe
- Em emergências: oriente vir IMEDIATAMENTE ou ligar para o plantão

## INFORMAÇÕES DA CLÍNICA
- Clínica: ${clinicaNome}
- Telefone: ${clinicaTelefone}
- Endereço: ${clinicaEndereco}
- Horários: ${clinicaHorarios}
${secaoConhecimento}
## DADOS DO CLIENTE ATUAL
${dadosCliente}

## REGRAS DE RESPOSTA — MUITO IMPORTANTE
Você DEVE responder APENAS com JSON válido, seguindo EXATAMENTE este schema:
{
  "mensagem": "sua resposta para o cliente aqui",
  "intencao": "agendamento|preco|duvida_saude|emergencia|retorno|cancelamento|elogio|reclamacao|outro",
  "subtopico": "descrição curta do assunto (máx 50 chars)",
  "dados_extraidos": {
    "nome": null,
    "nome_pet": null,
    "especie": null,
    "raca": null,
    "idade_pet": null
  },
  "agendamento_realizado": false,
  "resolvido": false,
  "escalar_para_humano": false
}

## QUANDO ESCALAR PARA HUMANO
- escalar_para_humano: true quando: emergência grave, cliente muito insatisfeito, solicitação complexa que você não consegue resolver, ou quando o cliente pede explicitamente falar com humano
${adminPhone ? `- Ao escalar, informe que a equipe será notificada` : ''}

## EXTRAÇÃO DE DADOS
- Sempre que o cliente mencionar nome próprio, considere como nome do tutor (campo "nome")
- Nome do pet, espécie, raça e idade: extraia quando mencionados naturalmente
- Campos não mencionados: mantenha null

Lembre-se: responda APENAS com o JSON. Nada antes, nada depois.`;
}

// ─── Parser de resposta da IA ──────────────────────────────────────────────────

function parseResposta(texto) {
  try {
    const match = texto.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ||
                  texto.match(/(\{[\s\S]*\})/);
    const jsonStr = match ? match[1] : texto;
    return JSON.parse(jsonStr.trim());
  } catch {
    console.warn('[AGENT] Falha ao parsear JSON da IA, usando fallback');
    return {
      mensagem: texto.replace(/```json|```/g, '').trim() || 'Desculpe, tive um problema ao processar. Pode repetir?',
      intencao: 'outro',
      subtopico: 'erro de parsing',
      dados_extraidos: { nome: null, nome_pet: null, especie: null, raca: null, idade_pet: null },
      agendamento_realizado: false,
      resolvido: false,
      escalar_para_humano: false
    };
  }
}

// ─── Processamento principal ───────────────────────────────────────────────────

async function processarMensagens(telefone, mensagens) {
  console.log(`\n[AGENT] Processando ${mensagens.length} msg(s) de ${telefone}`);

  const cliente = await upsertCliente(telefone);
  const conversa = await buscarOuCriarConversa(telefone, cliente.id);
  const historico = await buscarHistorico(conversa.id, 15);
  const contextoRAG = await buscarContexto(mensagens);

  // Montar histórico no formato OpenAI
  const chatHistory = historico.map(msg => ({
    role: msg.papel === 'user' ? 'user' : 'assistant',
    content: msg.conteudo
  }));

  // Texto consolidado das mensagens acumuladas
  const textoAcumulado = mensagens.map(m => m.conteudo).join('\n');

  // System prompt
  const systemPrompt = buildSystemPrompt(cliente, contextoRAG);

  // Chamar OpenAI
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      ...chatHistory,
      { role: 'user', content: textoAcumulado }
    ],
    temperature: 0.7,
    max_tokens: 1024
  });

  const respostaTexto = completion.choices[0].message.content;
  const resposta = parseResposta(respostaTexto);

  console.log(`[AGENT] Intenção: ${resposta.intencao} | Subtópico: ${resposta.subtopico}`);

  // Salvar mensagens do usuário
  for (const msg of mensagens) {
    await salvarMensagem(conversa.id, telefone, 'user', msg.conteudo, msg.tipo, resposta.intencao);
  }

  // Salvar resposta do agente
  await salvarMensagem(conversa.id, telefone, 'model', resposta.mensagem);

  // Atualizar dados extraídos
  if (resposta.dados_extraidos) {
    await atualizarCliente(telefone, resposta.dados_extraidos);
  }

  // Atualizar conversa
  await atualizarConversa(conversa.id, {
    intencao_principal: resposta.intencao,
    subtopico: resposta.subtopico,
    resolvido: resposta.resolvido,
    agendamento_realizado: resposta.agendamento_realizado,
    total_mensagens: historico.length + mensagens.length + 1,
    status: 'ativa'
  });

  // Escalar para humano
  if (resposta.escalar_para_humano) {
    const adminPhone = process.env.ADMIN_PHONE;
    if (adminPhone) {
      try {
        await enviarMensagem(
          adminPhone,
          `🚨 *Escalonamento necessário*\n\nCliente: ${cliente.nome || telefone}\nTelefone: ${telefone}\nAssunto: ${resposta.subtopico}\nÚltima mensagem: ${textoAcumulado.substring(0, 200)}...`
        );
        console.log(`[AGENT] Escalonamento enviado para admin: ${adminPhone}`);
      } catch (err) {
        console.error('[AGENT] Falha ao notificar admin:', err.message);
      }
    }
  }

  return resposta.mensagem;
}

module.exports = { processarMensagens };
