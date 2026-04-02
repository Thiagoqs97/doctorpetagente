-- ============================================
-- VET-AGENT — Schema do Banco de Dados
-- Execute este arquivo no SQL Editor do Supabase
-- ============================================

-- Habilitar extensão para UUIDs (já vem habilitado no Supabase, mas garantimos aqui)
-- create extension if not exists "pgcrypto";

-- ------------------------------------------------
-- Clientes (tutores dos animais)
-- ------------------------------------------------
create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  telefone text unique not null,
  nome text,
  email text,
  nome_pet text,
  especie text,
  raca text,
  idade_pet text,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

-- ------------------------------------------------
-- Conversas (sessões de atendimento)
-- ------------------------------------------------
create table if not exists conversas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id),
  telefone text not null,
  iniciado_em timestamptz default now(),
  encerrado_em timestamptz,
  status text default 'ativa',
  intencao_principal text,
  subtopico text,
  resolvido boolean default false,
  agendamento_realizado boolean default false,
  total_mensagens int default 0,
  ultima_mensagem_em timestamptz,
  notas text
);

-- ------------------------------------------------
-- Mensagens (histórico completo da conversa)
-- ------------------------------------------------
create table if not exists mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid references conversas(id),
  telefone text not null,
  papel text not null,                -- 'user' | 'model'
  conteudo text not null,
  tipo text default 'text',           -- 'text' | 'audio' | 'imagem' | 'arquivo'
  intencao_detectada text,
  criado_em timestamptz default now()
);

-- ------------------------------------------------
-- Conhecimento (base RAG — Retrieval-Augmented Generation)
-- ------------------------------------------------
create table if not exists conhecimento (
  id uuid primary key default gen_random_uuid(),
  categoria text not null,            -- servicos, precos, vacinas, etc.
  titulo text not null,
  conteudo text not null,
  keywords text,                      -- palavras-chave separadas por vírgula
  ativo boolean default true,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

-- ------------------------------------------------
-- Relatórios gerados
-- ------------------------------------------------
create table if not exists relatorios (
  id uuid primary key default gen_random_uuid(),
  data_referencia date not null,
  gerado_em timestamptz default now(),
  arquivo_path text,
  enviado boolean default false,
  dados_json jsonb
);

-- ------------------------------------------------
-- Índices para performance
-- ------------------------------------------------
create index if not exists idx_clientes_telefone on clientes(telefone);
create index if not exists idx_conversas_telefone on conversas(telefone);
create index if not exists idx_conversas_status on conversas(status);
create index if not exists idx_conversas_iniciado_em on conversas(iniciado_em);
create index if not exists idx_mensagens_conversa_id on mensagens(conversa_id);
create index if not exists idx_mensagens_telefone on mensagens(telefone);
create index if not exists idx_conhecimento_ativo on conhecimento(ativo);
create index if not exists idx_conhecimento_categoria on conhecimento(categoria);

-- ------------------------------------------------
-- Row Level Security (RLS) — desabilitado para service_key
-- Habilite conforme sua política de segurança
-- ------------------------------------------------
-- alter table clientes enable row level security;
-- alter table conversas enable row level security;
-- alter table mensagens enable row level security;
-- alter table conhecimento enable row level security;
-- alter table relatorios enable row level security;
