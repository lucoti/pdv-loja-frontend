# 06 — Implantação: PDV Loja — Integração (front + back + deploy)

> **Situação: EXECUTADA em 2026-09-27.** O PDV está no ar em https://pdv-loja-frontend.vercel.app.
> Este checklist também executou os planos `pdv-backend/06-implantacao.md` e `pdv-frontend/06-implantacao.md`.

## Pré-requisitos
- [x] `05-testes.md` com "Pronto para implantação: sim" (integração, back e front).
- [x] Repositórios `lucoti/pdv-loja-backend` e `lucoti/pdv-loja-frontend` com projetos Vercel ligados à branch `main`.
- [x] Turso CLI instalado (`~/.turso/turso`, v1.0.32) e login do Lucas feito.
- [x] Vercel CLI autenticado.
- [ ] Catálogo real: **não se aplica**. Por decisão do Lucas, o catálogo de exemplo segue até ser reescrito numa feature futura.

## Configuração e variáveis de ambiente
Somente nomes. Os valores nunca são registrados.

| Variável / config | Ambiente | Situação |
|---|---|---|
| `pdv-loja-backend`: Node 22.x, framework "Other", região de funções `iad1` | Vercel | aplicado |
| `pdv-loja-backend`: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` (sensíveis), `NODE_ENV=production` | Production e Preview | substituídas (banco novo) |
| `pdv-loja-backend`: `PORT` e `CORS_ORIGENS` | — | removidas |
| `pdv-loja-frontend`: Node 22.x, framework Vite | Vercel | aplicado |
| Banco Turso `pdv-loja` (org `personal`, grupo `default`, `aws-us-east-1`) | Turso | criado |

Tokens do Turso:
- Os tokens avulsos criados durante a configuração foram invalidados (`turso group tokens invalidate default`).
- Resta um token sem expiração, guardado só na Vercel.
- Existem também dois tokens locais de 1 dia, usados no seed e na troca do PIN. Eles expiram sozinhos.

## Migrações de dados
- `npm run db:seed` aplicou o `esquema.sql` e os dados de exemplo no banco novo: 1 vendedor, 14 modelos, 8 cores, 4 pagamentos e 4 chaves de configuração.
- O PIN do Carlos foi trocado pelo Lucas com `npm run pin:trocar` (ADR-I04).
  - O hash foi conferido: o PIN 1234 não confere mais.
  - As sessões foram encerradas.
- A venda de teste #1042 (1 item) foi apagada por SQL. O próximo pedido volta a ser o #1042.

## Checklist de deploy (executado, em ordem)
1. [x] Região das funções do back de volta para `iad1` (ADR-I03).
2. [x] Criado o banco `pdv-loja` e carregado o seed.
3. [x] Variáveis do back gravadas pela API da Vercel, sem imprimir valores. Os tokens avulsos foram invalidados.
4. [x] Troca do PIN pelo Lucas, no painel de terminal.
5. [x] Commits:
   - back: `b7d8b48`;
   - front: `7d8eaf7`.
6. [x] Deploy do back com `vercel deploy`.
   - **Desvio:** por ser o primeiro deploy do projeto, a Vercel o publicou direto em **produção**, sem passar por preview.
   - Sem impacto, porque ainda não havia usuários.
   - A verificação foi feita em produção.
7. [x] Push do back (`123908d..b7d8b48`).
8. [x] Preview do front (`vercel deploy`), verificado com `vercel curl`.
9. [x] Push do front (`5ce9b93..7d8eaf7`), que gerou o deploy de produção.
10. [x] Verificação pós-deploy, incluindo os celulares.

## Verificação pós-deploy
- [x] Back em produção (`pdv-loja-backend.vercel.app`):
  - `/api/config` → 200 (FitMoveOn / Unidade Centro);
  - `/api/vendedores` → 200, sem PIN nem hash;
  - `/api/catalogo` sem sessão → 401;
  - rota inexistente → 404 no formato do contrato;
  - `/src/app.ts` e `/package.json` → 404, então o código-fonte não está exposto;
  - login com 1234 → 401;
  - header `x-vercel-id: gru1::iad1`: entrada pela borda de São Paulo e função em `iad1`.
- [x] Front no preview e em produção (`pdv-loja-frontend.vercel.app`):
  - `/` → 200 (Balcão · PDV);
  - `/api/config` e `/api/vendedores` pelo rewrite → 200;
  - `/mockServiceWorker.js` → 404;
  - `Set-Cookie` repassado pelo rewrite com `Path=/api; HttpOnly; Secure; SameSite=Lax`, conferido pelo logout;
  - login com 1234 pelo rewrite → 401.
- [x] Tela de login em produção conferida em 390 px: unidade vinda do banco, fonte correta, sem "Senha de teste".
- [x] **Celulares (Lucas, 2026-09-27): "testes no celular ok".** Foram conferidos:
  - login com o PIN novo;
  - sessão mantida ao recarregar;
  - venda de teste #1042 com modal e aba Dia;
  - sem rolagem lateral.
- [x] Venda de teste apagada. O banco ficou com 0 vendas, 0 itens e o próximo pedido em #1042.

## Plano de rollback
- **Gatilhos:**
  - respostas 500;
  - login com o PIN correto falhando;
  - `/api` sem resposta pelo front.
- **Passos:** usar o Instant Rollback da Vercel no projeto afetado. Se já houver uso real, registrar um incidente (Fase 7).
- **Dados:** antes de qualquer `ALTER TABLE` futuro, fazer backup com `turso db shell pdv-loja .dump`.

## Comunicação
O Lucas avisa a loja quando o catálogo real estiver pronto. O PIN novo é passado pessoalmente, nunca por mensagem.

## Responsáveis
| Nome | Papel no deploy |
|---|---|
| Lucas | Aprovações, login no Turso, troca do PIN, teste nos celulares |
| Claude (Claude Code) | Banco, variáveis, deploys, verificação e limpeza |

## Aprovação
- Aprovado por: Lucas ("testes no celular ok, pode proseguir")
- Data/hora: 2026-09-27 17:07
