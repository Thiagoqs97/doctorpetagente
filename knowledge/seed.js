'use strict';

/**
 * Script de seed — popula a tabela `conhecimento` no Supabase
 * com dados fictícios mas realistas de uma clínica veterinária.
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

const clinicaNome = process.env.CLINIC_NAME || 'Clínica Veterinária Pet Saúde';
const clinicaTelefone = process.env.CLINIC_PHONE || '(11) 99999-0000';
const clinicaHorarios = process.env.CLINIC_HOURS || 'Segunda a Sexta: 8h às 19h | Sábado: 8h às 13h';
const clinicaEndereco = process.env.CLINIC_ADDRESS || 'Rua dos Animais, 123 - Centro';

const conhecimentos = [
  // ─── SERVIÇOS ────────────────────────────────────────────────────────────────
  {
    categoria: 'servicos',
    titulo: 'Consultas Veterinárias',
    conteudo: `A ${clinicaNome} oferece consultas clínicas gerais para cães e gatos. Realizamos avaliação completa do animal, incluindo exame físico, anamnese detalhada e orientação ao tutor. Também atendemos coelhos, aves e pequenos mamíferos mediante agendamento prévio.`,
    keywords: 'consulta,veterinario,clinica,avaliacao,exame,atendimento,gato,cachorro,cao,animal'
  },
  {
    categoria: 'servicos',
    titulo: 'Exames Laboratoriais e de Imagem',
    conteudo: `Dispomos de laboratório próprio para hemograma completo, bioquímicos, urinálise, parasitológico e cultura bacteriana. Para imagens oferecemos: raio-X digital, ultrassonografia abdominal e ecocardiograma. Resultados em até 24h para exames laboratoriais de rotina.`,
    keywords: 'exame,laboratorio,hemograma,bioquimico,raio-x,ultrassom,ultrassonografia,ecocardiograma,resultado,imagem'
  },
  {
    categoria: 'servicos',
    titulo: 'Internação e UTI Veterinária',
    conteudo: `Possuímos internação 24 horas com monitoramento contínuo. Nossa UTI veterinária conta com oxigenoterapia, fluidoterapia intravenosa e monitoração de sinais vitais. Os tutores podem ligar a qualquer momento para obter informações sobre o pet internado.`,
    keywords: 'internacao,internamento,uti,24horas,plantao,emergencia,grave,soro,oxigenio,monitoramento'
  },
  {
    categoria: 'servicos',
    titulo: 'Banho, Tosa e Estética Animal',
    conteudo: `Oferecemos banho e tosa artística para cães e gatos. Serviços incluem: banho simples, banho com hidratação, tosa higiênica, tosa na tesoura, corte de unhas, limpeza de ouvido e escovação de dentes. O grooming é realizado por profissionais certificados.`,
    keywords: 'banho,tosa,estetica,higiene,unha,ouvido,escovacao,grooming,pelagem,corte'
  },
  {
    categoria: 'servicos',
    titulo: 'Pet Shop Integrado',
    conteudo: `Nossa clínica conta com pet shop completo. Vendemos rações premium e super premium para cães e gatos (todas as fases da vida), petiscos, brinquedos, coleiras, guias, camas, antipulgas, vermífugos e acessórios diversos.`,
    keywords: 'petshop,racao,brinquedo,coleira,antipulga,vermifugo,acessorio,compra,produto'
  },
  {
    categoria: 'servicos',
    titulo: 'Hotel para Pets (Pet Hotel)',
    conteudo: `Oferecemos hospedagem para cães e gatos durante viagens ou ausências. O pet hotel inclui: ambiente climatizado, alimentação conforme rotina do pet, passeios diários para cães, monitoramento 24h e envio de fotos pelo WhatsApp a pedido. Reserva com antecedência mínima de 48h.`,
    keywords: 'hotel,hospedagem,viagem,hospedar,ficar,pet hotel,hospedar pet,passeio'
  },

  // ─── PREÇOS ──────────────────────────────────────────────────────────────────
  {
    categoria: 'precos',
    titulo: 'Tabela de Preços — Consultas',
    conteudo: `Consulta clínica geral: R$ 120,00\nConsulta de retorno (até 15 dias): R$ 70,00\nConsulta de urgência (sem agendamento): R$ 150,00\nConsulta de emergência (plantão): R$ 200,00\nConsulta para exame pré-cirúrgico: R$ 100,00\nOBS: Valores aproximados, podem variar. Confirmar na recepção.`,
    keywords: 'preco,valor,quanto,custo,consulta,retorno,urgencia,taxa,cobrar'
  },
  {
    categoria: 'precos',
    titulo: 'Tabela de Preços — Banho e Tosa',
    conteudo: `Banho pequeno porte: R$ 60,00 | Médio porte: R$ 90,00 | Grande porte: R$ 130,00\nBanho + tosa higiênica: acrescente R$ 20,00\nTosa artística (tesoura): R$ 80,00 a R$ 150,00 conforme porte\nGatos (banho): R$ 90,00 a R$ 140,00\nCorte de unhas: R$ 25,00\nEscovação de dentes: R$ 35,00\nOBS: Valores orientativos, peso e pelagem influenciam no preço final.`,
    keywords: 'preco,valor,banho,tosa,gato,cachorro,quanto,porte,pelo,higiene'
  },
  {
    categoria: 'precos',
    titulo: 'Tabela de Preços — Exames',
    conteudo: `Hemograma completo: R$ 75,00\nBioquímico (cada): R$ 35,00\nPerfil renal (creatinina + ureia + fosforo): R$ 95,00\nPerfil hepático (ALT + FA + GGT): R$ 90,00\nUrinálise: R$ 55,00\nRaio-X (por incidência): R$ 110,00\nUltrassonografia abdominal: R$ 180,00\nEcocardiograma: R$ 250,00\nOBS: Pacotes de exames têm desconto. Solicite.`,
    keywords: 'preco,valor,exame,laboratorio,hemograma,raio-x,ultrassom,quanto,custo'
  },
  {
    categoria: 'precos',
    titulo: 'Formas de Pagamento',
    conteudo: `Aceitamos: dinheiro, Pix (chave: ${clinicaTelefone}), cartão de débito e crédito (todas as bandeiras). Parcelamos consultas e procedimentos a partir de R$ 200 em até 3x sem juros e 6x com juros. Não trabalhamos com cheque.`,
    keywords: 'pagamento,pix,cartao,credito,debito,parcelar,parcela,dinheiro,forma pagamento'
  },

  // ─── VACINAS ─────────────────────────────────────────────────────────────────
  {
    categoria: 'vacinas',
    titulo: 'Vacinas para Cães',
    conteudo: `Protocolo vacinal para cães:\n• V8 ou V10 (polivalente): filhotes a partir de 45 dias, 3 doses com 21 dias de intervalo + 1 reforço anual. R$ 85,00/dose\n• Raiva: anual, obrigatória por lei. R$ 55,00\n• Gripe (Bordetella): anual, especialmente para cães em contato frequente com outros. R$ 75,00\n• Leishmaniose: série de 3 doses + 1 anual. R$ 180,00/dose\nCarteirinha de vacinação emitida gratuitamente.`,
    keywords: 'vacina,vacinacao,v8,v10,raiva,gripe,bordetella,leishmaniose,filhote,cachorro,cao,dose,protocolo'
  },
  {
    categoria: 'vacinas',
    titulo: 'Vacinas para Gatos',
    conteudo: `Protocolo vacinal para gatos:\n• Tríplice felina (herpes + calicivírus + panleucopenia): filhotes a partir de 60 dias, 3 doses + booster anual. R$ 90,00/dose\n• Raiva: anual. R$ 55,00\n• Leucemia felina (FeLV): 2 doses com 30 dias de intervalo + reforço anual (recomendada para gatos semi-domésticos). R$ 120,00/dose\nLembre de trazer a carteirinha em cada consulta.`,
    keywords: 'vacina,vacinacao,gato,felino,triplice,raiva,leucemia,felv,filhote,herpes,calici,panleuco'
  },

  // ─── CIRURGIAS ───────────────────────────────────────────────────────────────
  {
    categoria: 'cirurgias',
    titulo: 'Castração de Cães e Gatos',
    conteudo: `Realizamos castração de machos e fêmeas de todas as raças e tamanhos.\n\nCães machos: orquiectomia a partir de R$ 280,00 (até 10kg) | R$ 350,00 (10-25kg) | R$ 430,00 (>25kg)\nCões fêmeas: ovário-histerectomia a partir de R$ 380,00 (até 10kg) | R$ 480,00 (10-25kg) | R$ 580,00 (>25kg)\n\nGato macho: R$ 200,00 | Gata fêmea: R$ 280,00\n\nTodos os valores incluem: anestesia, procedimento cirúrgico, material e 1 retorno pós-operatório. Exames pré-cirúrgicos à parte.`,
    keywords: 'castracao,castrar,cirurgia,orquiectomia,histerectomia,esterilizacao,neutro,macho,femea,cao,gato,operacao'
  },
  {
    categoria: 'cirurgias',
    titulo: 'Outras Cirurgias e Procedimentos Cirúrgicos',
    conteudo: `Realizamos diversas cirurgias de tecidos moles e ortopédicas. Principais procedimentos: cesárea, piometra, esplenectomia, remoção de tumor, cistotomia (cálculo vesical), osteossíntese (fratura), extração dentária. O orçamento é sempre feito após avaliação clínica e exames pré-operatórios. Contamos com anestesiologista especializado e UTI pós-operatória.`,
    keywords: 'cirurgia,operacao,tumor,fratura,cesarea,piometra,pioometra,calculo,dente,procedimento,ortopedia'
  },

  // ─── HORÁRIOS ────────────────────────────────────────────────────────────────
  {
    categoria: 'horarios',
    titulo: 'Horários de Funcionamento',
    conteudo: `${clinicaNome}\n📍 ${clinicaEndereco}\n📞 ${clinicaTelefone}\n\nHorários:\n${clinicaHorarios}\n\nPlantão de emergências: 24h (consulte taxa de plantão)\nDomingos e feriados: apenas emergências (mediante contato prévio)`,
    keywords: 'horario,funcionamento,aberto,fechado,domingo,feriado,plantao,segunda,sexta,sabado'
  },

  // ─── VETERINÁRIOS ────────────────────────────────────────────────────────────
  {
    categoria: 'veterinarios',
    titulo: 'Nossa Equipe de Veterinários',
    conteudo: `Nossa equipe é formada por veterinários com especializações diversas:\n• Dr. Carlos Mendes — Clínica Geral e Dermatologia (CRMV-SP 12345)\n• Dra. Fernanda Lima — Cardiologia e Clínica Cirúrgica (CRMV-SP 23456)\n• Dr. Ricardo Santos — Ortopedia e Traumatologia (CRMV-SP 34567)\n• Dra. Ana Costa — Oncologia e Clínica de Felinos (CRMV-SP 45678)\nTodos os profissionais são registrados no CRMV-SP.`,
    keywords: 'veterinario,medico,doutor,especialista,equipe,crmv,cardiologia,dermatologia,cirurgia,oncologia,ortopedia'
  },

  // ─── EMERGÊNCIAS ─────────────────────────────────────────────────────────────
  {
    categoria: 'emergencia',
    titulo: 'Sinais de Emergência Veterinária',
    conteudo: `ATENÇÃO: Se o seu pet apresentar qualquer um dos sinais abaixo, procure atendimento IMEDIATAMENTE:\n\n🚨 SITUAÇÕES DE EMERGÊNCIA:\n• Dificuldade respiratória (ofegância, respiração pela boca em gatos)\n• Perda de consciência ou desmaio\n• Convulsões\n• Abdômen muito distendido e dor abdominal intensa\n• Sangramento intenso que não para\n• Ingestão de produto tóxico (veneno, chocolate, medicamento humano, uva, cebola)\n• Atropelamento ou trauma grave\n• Vômitos ou diarreia com sangue\n• Não consegue urinar (especialmente gatos machos — obstrução urinária)\n• Paralisia súbita de membros\n\nNÃO ESPERE — venha diretamente à clínica ou ligue para o plantão: ${clinicaTelefone}`,
    keywords: 'emergencia,urgente,grave,socorro,engoliu,intoxicacao,veneno,convulsao,desmaio,sangue,respiracao,paralisia,obstrucao'
  },
  {
    categoria: 'emergencia',
    titulo: 'Primeiros Socorros para Pets',
    conteudo: `ORIENTAÇÕES GERAIS DE PRIMEIROS SOCORROS:\n\n1. ENVENENAMENTO: NÃO induza vômito sem orientação veterinária. Guarde a embalagem do produto e venha imediatamente.\n2. FRATURA: Não force o movimento. Transporte em superfície rígida, evite pressionar a área afetada.\n3. SANGRAMENTO: Comprima com pano limpo. Não use torniquete sem orientação.\n4. CRISE CONVULSIVA: Não segure o animal. Proteja de objetos cortantes. Anote o tempo da crise e venha imediatamente.\n5. OBSTRUÇÃO DE VIAS AÉREAS: Se o pet está com dificuldade grave de respirar, movendo a cabeça para frente tentando respirar, venha urgente.\n\nEm todos os casos: ligue primeiro e venha imediatamente.`,
    keywords: 'primeiros socorros,envenenamento,fratura,sangramento,convulsao,obstrucao,socorro,ajuda,engoliu,crise'
  },

  // ─── AGENDAMENTO ─────────────────────────────────────────────────────────────
  {
    categoria: 'agendamento',
    titulo: 'Como Agendar uma Consulta ou Serviço',
    conteudo: `Para agendar, você pode:\n1. Contato via WhatsApp (aqui mesmo!) — informe nome do tutor, nome e espécie do pet e o serviço desejado\n2. Ligar para ${clinicaTelefone} durante o horário de atendimento\n3. Comparecer presencialmente à recepção\n\nInformações necessárias para agendamento:\n• Nome completo do tutor\n• Telefone para contato\n• Nome, espécie e raça do pet\n• Motivo da consulta\n• Preferência de data e horário\n\nCancelamentos devem ser feitos com pelo menos 2 horas de antecedência.`,
    keywords: 'agendamento,agendar,marcar,consulta,horario,cancelar,cancelamento,reagendar,data,disponivel'
  },
  {
    categoria: 'agendamento',
    titulo: 'Política de Cancelamento e Reagendamento',
    conteudo: `Nossa política de cancelamento:\n• Cancelamentos com mais de 2 horas de antecedência: sem cobrança\n• Cancelamentos com menos de 2 horas: meia taxa de consulta (R$ 60,00)\n• Não comparecimento sem aviso: taxa de ausência de R$ 80,00\n\nNão se preocupe com imprevistos! Entendemos que situações surgem — entre em contato pelo WhatsApp e resolvemos da melhor forma para você e seu pet. 🐾`,
    keywords: 'cancelamento,cancelar,remarcar,reagendar,taxa,ausencia,falta,politica,desmarcacao'
  },

  // ─── CONVÊNIOS ───────────────────────────────────────────────────────────────
  {
    categoria: 'convenios',
    titulo: 'Convênios e Planos de Saúde para Pets',
    conteudo: `Trabalhamos com os seguintes convênios e planos veterinários:\n• PetLove Saúde\n• VetSaúde Premium\n• Qualicorp Pet\n• AMIPET\n\nPara atendimento via convênio:\n1. Informe o plano ao agendar\n2. Traga a carteirinha e documento com foto\n3. Alguns procedimentos podem necessitar autorização prévia do plano\n\nCaso seu plano não esteja na lista, entre em contato — podemos verificar parcerias.`,
    keywords: 'convenio,plano,saude,seguro,petlove,qualicorp,amipet,vetsaude,carteirinha,cobertura'
  },

  // ─── FAQ ─────────────────────────────────────────────────────────────────────
  {
    categoria: 'faq',
    titulo: 'Perguntas Frequentes — Dúvidas Gerais',
    conteudo: `DÚVIDAS MAIS FREQUENTES:\n\nQ: Meu pet precisa estar em jejum para a consulta?\nR: Para consultas de rotina, não é necessário. Mas se há possibilidade de anestesia ou coleta de sangue, sim (4-8h para sangue, 8-12h para anestesia).\n\nQ: Posso levar mais de um pet?\nR: Sim, mas agende uma consulta para cada animal pois cada um precisa de tempo adequado.\n\nQ: O pet precisa estar na transportadora?\nR: Gatos sim — é obrigatório para a segurança deles e dos outros animais. Cães podem vir com coleira e guia, mas transportadoras são bem-vindas.\n\nQ: Aceitam pets de raças exóticas?\nR: Realizamos consultas para coelhos, hamsters, porquinhos-da-índia, chinchilas, aves e répteis mediante agendamento prévio com nossa especialista.`,
    keywords: 'jejum,transportadora,exotico,coelho,hamster,passaro,reptil,regras,duvida,pergunta'
  },
  {
    categoria: 'faq',
    titulo: 'Cuidados Pós-Operatórios',
    conteudo: `Orientações gerais após cirurgias:\n\n• Mantenha o colar elizabetano até a retirada dos pontos\n• Evite banhos e contato com umidade na região operada\n• Medicações devem ser administradas nos horários prescritos\n• Dieta: ofereça alimento leve (frango cozido + arroz) nas primeiras 24h, depois retorne gradualmente à ração\n• Restrinja a atividade física por 10-14 dias\n• Sinais de alarme: inchaço excessivo, sangramento, febre, pet não se alimenta, ponto abrindo ➡ venha imediatamente\n• O retorno pós-operatório é incluído no procedimento — agende após a cirurgia`,
    keywords: 'pos operatorio,cirurgia,ponto,colar,elizabetano,cuidado,recuperacao,sutura,curativo,medicacao,antibiotico'
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
