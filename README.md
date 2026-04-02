# 🐾 vet-agent — Agente WhatsApp para Clínica Veterinária

Agente de atendimento automatizado via WhatsApp com IA Gemini para clínicas veterinárias. A **Luna** é a recepcionista virtual que acumula mensagens, processa mídia (áudio, imagem, PDF) e responde com contexto da clínica via RAG.

---

## 📋 Pré-requisitos

- **Node.js** >= 18.0.0 ([download](https://nodejs.org))
- Conta no **Supabase** (gratuita) — [supabase.com](https://supabase.com)
- Conta na **Google AI Studio** (Gemini) — [aistudio.google.com](https://aistudio.google.com)
- **Evolution API** configurada com uma instância WhatsApp conectada — [evolution-api.com](https://evolution-api.com)

---

## 🗄️ 1. Configuração do Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. Vá em **SQL Editor** e cole o conteúdo de `supabase/schema.sql`
3. Execute o SQL e aguarde a criação das tabelas
4. Vá em **Settings > API** e copie:
   - `Project URL` → `SUPABASE_URL`
   - `service_role` key → `SUPABASE_SERVICE_KEY` (**nunca exponha no front-end!**)

---

## ⚙️ 2. Configuração do `.env`

```bash
# Copie o arquivo de exemplo
cp .env.example .env
```

Preencha todas as variáveis no `.env`:

| Variável | Onde encontrar |
|---|---|
| `GEMINI_API_KEY` | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) |
| `SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `SUPABASE_SERVICE_KEY` | Supabase → Settings → API → service_role |
| `EVOLUTION_API_URL` | URL da sua instalação da Evolution API |
| `EVOLUTION_API_KEY` | Chave global da Evolution API |
| `EVOLUTION_INSTANCE` | Nome da instância criada na Evolution API |
| `REPORT_GROUP_ID` | ID do grupo WhatsApp (veja seção abaixo) |
| `CLINIC_NAME` | Nome da sua clínica |
| `ADMIN_PHONE` | Número para receber escalonamentos (ex: `5511999990000`) |

---

## 🔗 3. Configuração do Webhook na Evolution API

Após o servidor estar rodando (local ou deploy), registre o webhook:

### Via painel da Evolution API:
1. Acesse o painel da Evolution API
2. Selecione sua instância
3. Vá em **Webhook** e adicione:
   - **URL**: `https://seu-dominio.com/webhook`
   - **Eventos**: marque `MESSAGES_UPSERT`

### Via API (curl):
```bash
curl -X POST "https://sua-evolution-api.com/webhook/set/NOME_INSTANCIA" \
  -H "apikey: SUA_CHAVE" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://seu-dominio.com/webhook",
    "webhook_by_events": false,
    "webhook_base64": true,
    "events": ["MESSAGES_UPSERT"]
  }'
```

> **Importante**: O `webhook_base64: true` é necessário para receber mídias (áudio, imagem, PDF) em base64 no payload.

---

## 📱 4. Como pegar o ID do grupo WhatsApp para o relatório

1. Adicione a instância ao grupo desejado
2. Envie uma mensagem no grupo
3. Acesse os logs da Evolution API ou use a rota:

```bash
curl "https://sua-evolution-api.com/group/fetchAllGroups/NOME_INSTANCIA?getParticipants=false" \
  -H "apikey: SUA_CHAVE"
```

4. Localize o grupo pelo nome e copie o `id` (formato: `5511999999999-1234567890@g.us`)
5. Cole em `REPORT_GROUP_ID` no `.env`

---

## 🌱 5. Popular o Conhecimento Inicial

O script de seed popula o banco com dados fictícios de uma clínica veterinária. **Execute uma vez após configurar o `.env`**:

```bash
node knowledge/seed.js
```

Após executar, acesse o **Supabase Table Editor** (tabela `conhecimento`) e substitua os dados pelos da sua clínica real. Os campos são:

| Campo | Descrição |
|---|---|
| `categoria` | `servicos`, `precos`, `vacinas`, `cirurgias`, `horarios`, `convenios`, `veterinarios`, `emergencia`, `agendamento`, `faq` |
| `titulo` | Título do chunk de conhecimento |
| `conteudo` | Texto completo que a Luna vai usar para responder |
| `keywords` | Palavras-chave separadas por vírgula para o RAG |
| `ativo` | `true` para ativo, `false` para desativar sem apagar |

---

## 🚀 6. Iniciar o Projeto

```bash
# Instalar dependências
npm install

# Desenvolvimento (com hot-reload)
npm run dev

# Produção
npm start
```

O servidor sobe na porta `3000` (ou `PORT` do `.env`).

**Rotas disponíveis:**
- `GET /health` — status do servidor
- `POST /webhook` — recebe eventos da Evolution API
- `GET /relatorio` — gera e envia relatório de ontem manualmente
- `GET /relatorio/2024-12-25` — relatório de uma data específica

---

## 🚂 7. Deploy no Railway

1. Crie uma conta em [railway.app](https://railway.app)
2. **New Project** → **Deploy from GitHub repo**
3. Adicione todas as variáveis de ambiente em **Variables**
4. O Railway detecta `package.json` automaticamente e usa `npm start`
5. Configure um domínio personalizado em **Settings → Domains**
6. Atualize o webhook da Evolution API com o novo domínio

---

## 🖥️ 8. Deploy em VPS com PM2

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Clonar o projeto
git clone https://github.com/seu-usuario/vet-agent.git
cd vet-agent

# Configurar .env
cp .env.example .env
nano .env  # preencher as variáveis

# Instalar dependências
npm install

# Iniciar com PM2
pm2 start src/index.js --name vet-agent

# Auto-reiniciar no boot
pm2 startup
pm2 save

# Logs em tempo real
pm2 logs vet-agent

# Reiniciar após mudanças
pm2 restart vet-agent
```

### Nginx como proxy reverso (recomendado):
```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## ➕ 9. Adicionar Conhecimento Novo

A forma mais fácil é pelo **Supabase Table Editor**:

1. Acesse seu projeto no Supabase
2. Vá em **Table Editor → conhecimento**
3. Clique em **Insert row**
4. Preencha os campos e salve

O agente vai usar o novo conhecimento automaticamente na próxima mensagem que corresponder às keywords.

---

## 🔧 Arquitetura

```
WhatsApp → Evolution API → POST /webhook
                                ↓
                          media.js (processa mídia via Gemini)
                                ↓
                         accumulator.js (janela de 40s)
                                ↓
                           agent.js (Gemini 2.5 Pro)
                          ↙         ↘
                    rag.js         database.js
                  (Supabase)      (Supabase)
                                ↓
                         evolution.js (envia resposta)
                                ↓
                             WhatsApp
```

---

## 📊 Relatório Diário

O relatório é gerado automaticamente pelo cron (padrão: 8h da manhã) e contém:
- Cards com métricas principais
- Distribuição por intenção das conversas
- Horários de pico
- Top assuntos mencionados
- Breakdown de tipos de mídia recebida

O PDF é enviado automaticamente para o grupo WhatsApp configurado em `REPORT_GROUP_ID`.

---

## 🤝 Suporte

Para dúvidas ou problemas, revise os logs com `pm2 logs vet-agent` ou verifique o console durante o desenvolvimento.
