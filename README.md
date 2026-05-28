# FlowVoz — Painel de Atendimento

Painel de atendimento humano via WhatsApp, com **suporte a múltiplos números** e **envio rápido de áudios pré-gravados**. Sem IA — o atendente conversa diretamente com o cliente.

Produção: **https://flowvoz.vercel.app**

---

## Stack
- **Next.js 15** (App Router) + React 19 + TypeScript
- **Tailwind 4** (UI)
- **PostgreSQL** (Neon) via `pg`
- **Vercel** (deploy)

## Provedores de WhatsApp suportados
- **Evolution API v2** (`provider = 'evolution'`) — usa instâncias.
- **Meta Cloud API** (`provider = 'meta'`) — usa `phone_number_id`.

O mesmo painel suporta os dois ao mesmo tempo: cada *caixa* (`inbox`) decide qual provedor usar.

---

## Variáveis de ambiente

Coloque no Vercel (Settings → Environment Variables) ou em `.env.local` pra dev:

### Login e segurança
| Nome | Obrigatório | Função |
|------|-------------|--------|
| `PANEL_PASSWORD` | sim em produção | Senha do painel. Sem ela, o painel fica aberto. |
| `WEBHOOK_SECRET` | recomendado | Protege `/api/webhook/evolution` (exige `?secret=...`). |
| `META_APP_SECRET` | recomendado em produção | Valida assinatura `X-Hub-Signature-256` do webhook Meta. |

### Banco
| Nome | Função |
|------|--------|
| `DATABASE_URL` | Connection string do Postgres (Neon). |
| `DATABASE_SSL` | `true` se o banco exige SSL (Neon sim). |

### Evolution API (provedor opcional)
| Nome | Função |
|------|--------|
| `EVO_URL` | URL base da Evolution (sem barra no fim). |
| `EVO_APIKEY` | API key global da Evolution. |
| `EVO_INSTANCE` | Instância usada como *fallback* quando o inbox da conversa não está cadastrado. |
| `WA_PROVIDER` | `evolution` ou `meta` — fallback quando o inbox da conversa não estiver na tabela `inboxes`. |

### Meta Cloud API (provedor opcional)
| Nome | Função |
|------|--------|
| `META_TOKEN` | Access token (System User token para produção). |
| `META_PHONE_NUMBER_ID` | ID do número Meta (fallback). |
| `META_VERIFY_TOKEN` | Token que você escolhe — usado pela Meta na verificação do webhook. |

### UI
| Nome | Função |
|------|--------|
| `NEXT_PUBLIC_COMPANY_NAME` | Nome da empresa exibido no rodapé da sidebar. Default: "FlowVoz". |

---

## Estrutura do banco

3 tabelas:

- **`messages`** — todas as mensagens (in/out). Coluna `inbox` marca o número.
- **`inboxes`** — caixas (números) configurados: `key`, `nome`, `provider`, `cor`, `ativo`, `ordem`.
- **`conversas_status`** — status por **(session_id, inbox)**: `novo`/`andamento`/`encerrado`.

Migrações (rodar nessa ordem no Neon SQL Editor):
1. `migration.sql` — tabelas base
2. `migration-inboxes.sql` — coluna inbox + tabela inboxes (multi-número)
3. `migration-status-inbox.sql` — status por (caixa, contato)

---

## Webhooks

### Receber mensagens (Evolution)
URL pra configurar na Evolution:
```
POST https://flowvoz.vercel.app/api/webhook/evolution?secret=<WEBHOOK_SECRET>
```
Evento necessário: **`MESSAGES_UPSERT`**.
Campo `body.instance` é usado como `inbox`.

### Receber mensagens (Meta)
URL pra configurar no app Meta → WhatsApp → Webhook:
```
https://flowvoz.vercel.app/api/webhook/meta
```
Token de verificação: o valor de `META_VERIFY_TOKEN`.
Campos a assinar: **`messages`**.
A caixa (`phone_number_id`) é **auto-cadastrada** na primeira mensagem recebida.

---

## Áudios

Os arquivos `.ogg` ficam em `public/audios/` (set fixo, commitado no repo).
A tabela `audio_templates` registra cada áudio com `audio_url` apontando pra URL pública absoluta — necessário pra Evolution/Meta conseguirem baixar.

A página `/audios` é um **catálogo read-only** (sem upload — Vercel tem FS read-only; upload exigiria Vercel Blob).
O envio acontece pela coluna direita da tela `/conversas`.

---

## Páginas

| Rota | Função |
|------|--------|
| `/conversas` | Tela principal — lista + chat + áudios rápidos |
| `/audios` | Catálogo dos áudios disponíveis |
| `/config` | Gerenciar caixas (renomear, cor, ativar/desativar) |
| `/login` | Tela de login (criada pelo middleware) |

---

## Desenvolvimento local

```bash
npm install
cp .env.local.example .env.local   # preencher
npm run dev
```

Acesse http://localhost:3000.

> Para rodar SQL no banco sem entrar no Neon: use o utilitário `db-run.mjs` (gitignored):
> ```bash
> node db-run.mjs migration-inboxes.sql
> node db-run.mjs --query "SELECT COUNT(*) FROM messages"
> ```

---

## Mobile

O painel funciona em telas pequenas com navegação **uma coluna por vez** (lista ↔ chat).
A coluna de **áudios rápidos é escondida no mobile** — pra mandar áudios pelo painel, use um navegador desktop.

---

## Conhecidos / próximos passos
- Upload de áudios novos pela UI exige integração com armazenamento externo (Vercel Blob).
- Áudios recebidos pela Meta aparecem como rótulo "[Áudio recebido]" — baixar a mídia exige um GET extra na Graph API.
- Login é por senha única; pra multi-usuário, migrar pra Supabase Auth / NextAuth.
