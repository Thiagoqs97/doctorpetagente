'use strict';

/**
 * Script de seed — popula a tabela `conhecimento` no Supabase
 * com os dados reais do Hospital Doctor Vet.
 *
 * Execute: node knowledge/seed.js
 * (Configure o .env antes de rodar)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const clinicaNome = process.env.CLINIC_NAME || 'Doctor Vet';
const clinicaTelefone = process.env.CLINIC_PHONE || '558688454343';
const clinicaEndereco = process.env.CLINIC_ADDRESS || 'Av. Dom Severino, 3060 - São Cristóvão, Teresina - PI, 64051-160';

const conhecimentos = [
  // ─── IDENTIFICAÇÃO ────────────────────────────────────────────────────────────
  {
    categoria: 'horarios',
    titulo: 'Funcionamento e Localização',
    conteudo: `${clinicaNome}\n📍 ${clinicaEndereco}\n📞 ${clinicaTelefone}\n\nFuncionamento: 24 horas por dia, 7 dias por semana, incluindo domingos e feriados.\n\nEspécies atendidas: SOMENTE cães e gatos (caninos e felinos).`,
    keywords: 'horario,funcionamento,aberto,fechado,domingo,feriado,plantao,24horas,endereco,localizacao,onde,canino,felino,cao,gato'
  },

  // ─── PREÇOS ──────────────────────────────────────────────────────────────────
  {
    categoria: 'precos',
    titulo: 'Tabela de Preços — Consulta Clínico Geral',
    conteudo: `Consulta com Clínico Geral — por ordem de chegada (sem agendamento):\n\nSegunda a Sexta:\n  • 08:00 às 21:30 → R$ 180,00\n  • 21:30 às 08:00 (madrugada) → R$ 250,00\n\nSábados:\n  • 08:00 às 19:00 → R$ 180,00\n  • 19:30 às 08:00 (noite/madrugada) → R$ 250,00\n\nDomingos e Feriados:\n  • 08:00 às 19:30 → R$ 190,00\n  • 19:30 às 08:00 (noite/madrugada) → R$ 250,00\n\n⚠️ Consulta com clínico geral é por ORDEM DE CHEGADA.`,
    keywords: 'preco,valor,quanto,custo,consulta,clinico,geral,taxa,cobrar,segunda,sabado,domingo,feriado,madrugada,plantao'
  },
  {
    categoria: 'precos',
    titulo: 'Consulta com Especialista',
    conteudo: `Consulta com Médico Especialista: R$ 250,00 (à vista)\nParcelado em 2x: R$ 260,00 (acréscimo de R$ 10,00)\n\n⚠️ Consultas com especialistas são realizadas SOMENTE por agendamento.\nPara agendar, fale com nossa equipe.`,
    keywords: 'especialista,medico,especializado,agendamento,preco,valor,quanto,custo,especialidade'
  },
  {
    categoria: 'precos',
    titulo: 'Formas de Pagamento e Parcelamento',
    conteudo: `Parcelamento disponível:\n  • A partir de R$ 150,00 → 2x\n  • A partir de R$ 300,00 → 3x\n  • A partir de R$ 400,00 → 4x\n  • A partir de R$ 500,00 → 5x\n  • A partir de R$ 600,00 → 6x\n\nConsulta com especialista: parcela em até 2x (valor total: R$ 260,00)\n\nFormas aceitas: cartão de crédito, cartão de débito, Pix e dinheiro.`,
    keywords: 'pagamento,parcelamento,parcela,cartao,credito,debito,pix,dinheiro,forma,vezes,juros'
  },

  // ─── VISITAS ─────────────────────────────────────────────────────────────────
  {
    categoria: 'visitas',
    titulo: 'Horário de Visita para Animais Internados',
    conteudo: `Visitas a animais internados são permitidas das 16h às 19h20.\nA visitação é realizada por agendamento.\n\nPara agendar sua visita, entre em contato com nossa equipe pelo WhatsApp ou telefone: ${clinicaTelefone}`,
    keywords: 'visita,internado,internacao,ver,animai,pet internado,horario visita,agendar visita,ver meu pet'
  },

  // ─── EMERGÊNCIAS ─────────────────────────────────────────────────────────────
  {
    categoria: 'emergencia',
    titulo: 'Sinais de Emergência Veterinária',
    conteudo: `ATENÇÃO: Se o seu pet apresentar qualquer sinal abaixo, venha IMEDIATAMENTE ao ${clinicaNome} — atendemos 24 horas!\n\n🚨 SITUAÇÕES DE EMERGÊNCIA:\n• Dificuldade respiratória (ofegância, respiração pela boca em gatos)\n• Perda de consciência ou desmaio\n• Convulsões\n• Abdômen muito distendido e dor intensa\n• Sangramento intenso\n• Ingestão de produto tóxico (veneno, chocolate, medicamento humano, uva, cebola, xilitol)\n• Atropelamento ou trauma grave\n• Vômitos ou diarreia com sangue\n• Gato macho não consegue urinar (obstrução urinária — emergência grave)\n• Paralisia súbita de membros\n\nNÃO ESPERE — venha direto: ${clinicaEndereco}\nTelefone: ${clinicaTelefone}`,
    keywords: 'emergencia,urgente,grave,socorro,engoliu,intoxicacao,veneno,convulsao,desmaio,sangue,respiracao,paralisia,obstrucao,nao urina,atropelado'
  },
  {
    categoria: 'emergencia',
    titulo: 'Primeiros Socorros para Pets',
    conteudo: `ORIENTAÇÕES GERAIS DE PRIMEIROS SOCORROS — venha imediatamente ao hospital após:\n\n1. ENVENENAMENTO: NÃO induza vômito sem orientação veterinária. Guarde a embalagem e venha imediatamente.\n2. FRATURA: Não force movimento. Transporte em superfície rígida.\n3. SANGRAMENTO: Comprima com pano limpo. Não use torniquete.\n4. CONVULSÃO: Não segure o animal. Proteja de objetos cortantes. Anote o tempo da crise.\n5. DIFICULDADE RESPIRATÓRIA: Venha imediatamente sem aguardar.\n\nO ${clinicaNome} atende emergências 24 horas: ${clinicaEndereco}`,
    keywords: 'primeiros socorros,envenenamento,fratura,sangramento,convulsao,socorro,ajuda,engoliu,crise,intoxicacao'
  },

  // ─── EXAMES ───────────────────────────────────────────────────────────────────
  {
    categoria: 'exames',
    titulo: 'Resultado de Exames',
    conteudo: `Para consultar resultado de exame, nossa equipe precisa localizar o cadastro pelo CPF do tutor.\nInforme seu CPF e um atendente irá te ajudar com os resultados.\n\nContato: ${clinicaTelefone}`,
    keywords: 'resultado,exame,laboratorio,cpf,buscar,localizar,laudo,retorno exame,exame pronto'
  },

  // ─── SERVIÇOS ────────────────────────────────────────────────────────────────
  {
    categoria: 'servicos',
    titulo: 'Serviços do Hospital Doctor Vet',
    conteudo: `O ${clinicaNome} oferece atendimento completo para cães e gatos:\n\n• Consultas clínicas gerais — 24 horas, por ordem de chegada\n• Consultas com especialistas — por agendamento\n• Exames laboratoriais e de imagem\n• Internação e UTI veterinária 24 horas\n• Cirurgias clínicas e ortopédicas\n• Emergências e plantão 24 horas\n\nAtendemos SOMENTE cães e gatos.`,
    keywords: 'servico,atendimento,clinica,hospital,cirurgia,internacao,exame,plantao,24horas,completo'
  },

  // ─── AGENDAMENTO ─────────────────────────────────────────────────────────────
  {
    categoria: 'agendamento',
    titulo: 'Agendamento de Consultas e Serviços',
    conteudo: `Consulta com clínico geral: sem agendamento, por ordem de chegada, 24 horas.\n\nConsulta com especialista: realizada por agendamento — entre em contato com nossa equipe.\n\nVisita a animais internados: por agendamento, das 16h às 19h20.\n\nPara agendar, fale com nossa equipe pelo WhatsApp: ${clinicaTelefone}`,
    keywords: 'agendar,agendamento,marcar,consulta,horario,disponivel,especialista,visita,data'
  }
];

async function seed() {
  console.log(`\n🌱 Iniciando seed da base de conhecimento — ${conhecimentos.length} registros\n`);

  // Limpar dados anteriores (opcional — comente se não quiser apagar)
  const { error: deleteError } = await supabase
    .from('conhecimento')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // deleta todos

  if (deleteError) {
    console.warn('⚠️  Não foi possível limpar dados anteriores:', deleteError.message);
  } else {
    console.log('🗑️  Dados anteriores removidos');
  }

  // Inserir em lotes de 5
  const loteSize = 5;
  for (let i = 0; i < conhecimentos.length; i += loteSize) {
    const lote = conhecimentos.slice(i, i + loteSize);
    const { error } = await supabase.from('conhecimento').insert(lote);

    if (error) {
      console.error(`❌ Erro ao inserir lote ${i / loteSize + 1}:`, error.message);
    } else {
      console.log(`✅ Lote ${i / loteSize + 1} inserido (${lote.length} registros)`);
    }
  }

  console.log('\n🎉 Seed concluído! Base de conhecimento populada com sucesso.');
  console.log('💡 Dica: Acesse o Supabase Table Editor para editar os dados com as informações reais da clínica.\n');
}

seed().catch(err => {
  console.error('\n❌ Erro fatal no seed:', err.message);
  process.exit(1);
});
