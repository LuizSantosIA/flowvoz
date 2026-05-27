# Painel Bia — Venda Direta

Dashboard de atendimento automatizado para a assistente Bia via WhatsApp.

## Setup

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente
```bash
cp .env.local.example .env.local
```
Edite `.env.local` e preencha:
- `DATABASE_URL` — string de conexão PostgreSQL (mesmo banco do n8n)
- `EVO_URL`, `EVO_INSTANCE`, `EVO_APIKEY` — credenciais da Evolution API
- `WA_PROVIDER` — `evolution` (padrão) ou `meta`

### 3. Rodar a migration no PostgreSQL
```bash
psql -U usuario -d n8n -f migration.sql
```
Ou execute o conteúdo de `migration.sql` diretamente via pgAdmin / DBeaver.

### 4. Iniciar em desenvolvimento
```bash
npm run dev
```
Acesse: http://localhost:3000

---

## Estrutura

```
src/
  app/
    dashboard/     # Visão geral com gráficos e estatísticas
    leads/         # Lista e busca de leads qualificados
    conversas/     # Chat em tempo real com clientes
    config/        # Configurações de integrações
    api/
      stats/       # GET /api/stats
      leads/       # GET /api/leads
      conversas/   # GET|POST /api/conversas
  lib/
    db.ts          # Pool PostgreSQL
    whatsapp.ts    # Abstração de provedor (Evolution / Meta)
```

## Trocar provedor WhatsApp

1. Preencha as variáveis `META_TOKEN`, `META_PHONE_NUMBER_ID` no `.env.local`
2. Mude `WA_PROVIDER=meta`
3. Reinicie o servidor

A interface `WhatsAppProvider` em `src/lib/whatsapp.ts` garante compatibilidade total.
