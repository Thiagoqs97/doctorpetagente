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
const { enviarMensagem, enviarParaGrupoRelatorio } = require('./evolution');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.AI_MODEL || 'gpt-4o-mini';

// ─── System Prompt da Luna ─────────────────────────────────────────────────────

function buildSystemPrompt(cliente, contextoRAG, historico) {
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

  const primeiraInteracao = !historico || historico.length === 0;

  return `Você é Luna, a assistente virtual do ${clinicaNome}.

## SAUDAÇÃO INICIAL — MUITO IMPORTANTE
${primeiraInteracao
    ? `Esta é a PRIMEIRA mensagem do cliente nesta conversa. Você DEVE começar sua resposta com esta saudação exata (antes de responder qualquer pergunta):
"Olá! Bem-vindo ao ${clinicaNome}! 🐾 Meu nome é Luna, como posso te ajudar?"`
    : `Esta NÃO é a primeira mensagem. NÃO repita a saudação de boas-vindas.`}

## INFORMAÇÕES DO HOSPITAL
- Hospital: ${clinicaNome}
- Telefone: ${clinicaTelefone}
- Endereço: ${clinicaEndereco}
- Funcionamento: ${clinicaHorarios}
- Espécies atendidas: SOMENTE cães e gatos (caninos e felinos)

## TABELA DE PREÇOS — CONSULTA CLÍNICO GERAL (por ordem de chegada)
Segunda a Sexta:
  • 08:00 às 21:30 → R$ 180,00
  • 21:30 às 08:00 → R$ 250,00
Sábados:
  • 08:00 às 19:00 → R$ 180,00
  • 19:30 às 08:00 → R$ 250,00
Domingos e Feriados:
  • 08:00 às 19:30 → R$ 190,00
  • 19:30 às 08:00 → R$ 250,00

## CONSULTA COM ESPECIALISTA
- Valor: R$ 250,00 (à vista) | R$ 260,00 (parcelado em 2x — acréscimo de R$ 10,00)
- Realizada por agendamento (a equipe agenda — não faça o agendamento você mesma)

## PARCELAMENTO (cartão de crédito)
A partir de R$ 150,00 → 2x sem juros
A partir de R$ 300,00 → 3x sem juros
A partir de R$ 400,00 → 4x sem juros
A partir de R$ 500,00 → 5x sem juros
A partir de R$ 600,00 → 6x sem juros

## HORÁRIOS DE VISITA (animais internados)
- Visitas permitidas das 16h às 19h20
- A visitação é por agendamento — informe os horários e chame a equipe para agendar
${secaoConhecimento}
## DADOS DO CLIENTE ATUAL
${dadosCliente}

## O QUE VOCÊ PODE RESPONDER SOZINHA
1. Saudações e apresentação do hospital
2. Endereço, telefone e horário de funcionamento
3. Tabela de preços das consultas (use a tabela acima)
4. Formas de parcelamento (use a tabela acima)
5. Espécies atendidas (apenas cães e gatos)
6. Horário de visita para internados (informe 16h-19h20)
7. Sinais de emergência — oriente a vir IMEDIATAMENTE
8. Elogios — agradeça e diga que vai repassar à equipe

## O QUE VOCÊ DEVE ESCALAR (escalar_para_humano: true)
Escale para a equipe SEMPRE que for:
- Agendamento de consulta com especialista
- Saber horários ou disponibilidade de especialistas
- Agendamento de visita para animal internado
- Resultado de exame (ver fluxo especial abaixo)
- Cancelamento, reagendamento ou retorno de consulta
- Dúvidas sobre saúde ou sintomas do pet (nunca oriente sobre saúde)
- Reclamações ou insatisfação
- Pedido explícito de falar com humano
- Qualquer assunto fora da lista acima

Mensagem padrão ao escalar:
"Vou chamar nossa equipe agora! Em instantes um atendente do ${clinicaNome} vai continuar seu atendimento. 🐾"

## FLUXO ESPECIAL — RESULTADO DE EXAME
Quando o cliente perguntar sobre resultado de exame:
1. Peça o CPF: "Para localizar seu resultado, preciso do seu CPF. Pode informar?"
2. Aguarde — NÃO escale ainda
3. Quando o cliente enviar o CPF: escale para humano com escalar_para_humano: true
   - Coloque o CPF no campo dados_extraidos.cpf
   - Use a mensagem padrão de escalonamento

## ESPÉCIES NÃO ATENDIDAS
Se o cliente perguntar sobre animal que não seja cão ou gato:
"Infelizmente o ${clinicaNome} atende apenas cães e gatos 🐕🐈. Para outras espécies, recomendamos um veterinário especializado."
Defina resolvido: true nesse caso.

## REGRAS DE RESPOSTA — MUITO IMPORTANTE
Você DEVE responder APENAS com JSON válido, seguindo EXATAMENTE este schema:
{
  "mensagem": "sua resposta para o cliente aqui",
  "intencao": "agendamento|preco|resultado_exame|horario_especialista|visita_internado|duvida_saude|emergencia|retorno|cancelamento|elogio|reclamacao|outro",
  "subtopico": "descrição curta do assunto (máx 50 chars)",
  "dados_extraidos": {
    "nome": null,
    "nome_pet": null,
    "especie": null,
    "raca": null,
    "idade_pet": null,
    "cpf": null
  },
  "agendamento_realizado": false,
  "resolvido": false,
  "escalar_para_humano": false
}

## EXTRAÇÃO DE DADOS
- Nome próprio mencionado pelo cliente → campo "nome" (tutor)
- Nome do pet, espécie, raça, idade → extraia quando mencionados naturalmente
- CPF → extraia apenas quando fornecido pelo cliente para resultado de exame
- Campos não mencionados → mantenha null

Responda APENAS com o JSON. Nada antes, nada depois.`;
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
      dados_extraidos: { nome: null, nome_pet: null, especie: null, raca: null, idade_pet: null, cpf: null },
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
  const systemPrompt = buildSystemPrompt(cliente, contextoRAG, historico);

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
    // Marcar conversa como aguardando humano (Luna para de responder)
    try {
      await atualizarConversa(conversa.id, { status: 'aguardando_humano' });
    } catch (err) {
      console.error('[AGENT] Falha ao atualizar status da conversa:', err.message);
    }

    // Notificar o grupo de atendimento
    try {
      const nomeCliente = cliente.nome || 'Não informado';
      const nomePet = cliente.nome_pet ? ` | Pet: ${cliente.nome_pet}` : '';
      const cpfLinha = resposta.dados_extraidos?.cpf
        ? `\n🪪 *CPF:* ${resposta.dados_extraidos.cpf}` : '';
      const notificacao =
        `🔔 *ATENDIMENTO HUMANO NECESSÁRIO*\n\n` +
        `👤 *Cliente:* ${nomeCliente}${nomePet}\n` +
        `📱 *Telefone:* ${telefone}\n` +
        `🎯 *Assunto:* ${resposta.subtopico || resposta.intencao}${cpfLinha}\n` +
        `💬 *Mensagem:*\n${textoAcumulado.substring(0, 300)}\n\n` +
        `_Responda diretamente para o cliente no WhatsApp_`;
      await enviarParaGrupoRelatorio(notificacao);
      console.log('[AGENT] Notificação enviada ao grupo de atendimento');
    } catch (err) {
      console.error('[AGENT] Falha ao notificar grupo:', err.message);
      // Fallback: tentar notificar ADMIN_PHONE individualmente
      const adminPhone = process.env.ADMIN_PHONE;
      if (adminPhone) {
        try {
          await enviarMensagem(adminPhone,
            `🔔 *ATENDIMENTO HUMANO*\nCliente: ${cliente.nome || telefone}\nTel: ${telefone}\nAssunto: ${resposta.subtopico}\nMsg: ${textoAcumulado.substring(0, 200)}`
          );
        } catch (_) { /* silenciar */ }
      }
    }
  }

  return resposta.mensagem;
}

module.exports = { processarMensagens };
