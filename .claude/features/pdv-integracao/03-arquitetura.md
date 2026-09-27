# 03 — Arquitetura: PDV Loja — Integração (front + back + deploy)

## Visão geral
O front estático fica no ar em `pdv-loja-frontend.vercel.app`. Todas as chamadas `/api/*` são reescritas pelo `vercel.json` do front para o back em `pdv-loja-backend.vercel.app`. O back é uma função Express na região `iad1` e usa o banco Turso `pdv-loja`, na organização `personal`, em `aws-us-east-1`.

Para o navegador, página e API têm a mesma origem (ADR-007 do back). Por isso não é preciso configurar CORS e o cookie de sessão funciona sem ajustes.

## Conformidade com o CLAUDE.md
O projeto não tem CLAUDE.md. As convenções dos dois repositórios foram mantidas: pt-BR, TypeScript strict e contrato como fonte da verdade. Não há contradições.

## Estrutura do sistema
```
Celular ──► pdv-loja-frontend.vercel.app      (estático, CDN Vercel)
              │  /api/*  (rewrite — frontend/vercel.json)
              ▼
            pdv-loja-backend.vercel.app/api/* (função Express, iad1)
              │
              ▼
            Turso "pdv-loja" (org personal, aws-us-east-1)
```

Repositórios e projetos:

| Repositório | Projeto Vercel | Branch de produção |
|---|---|---|
| `lucoti/pdv-loja-backend` | `pdv-loja-backend` | `main` |
| `lucoti/pdv-loja-frontend` | `pdv-loja-frontend` | `main` |

## Tecnologias
| Tecnologia | Uso | Já existe no projeto? |
|---|---|---|
| Turso CLI 1.0.32 (`~/.turso/turso`) | Criar o banco e o token; aplicar SQL | instalado nesta fase |
| Vercel CLI / API REST | Variáveis de ambiente, região, `vercel build`, deploys e `vercel curl` | sim |
| bcryptjs | Hash do PIN no script `pin:trocar` | sim (back) |

## Modelagem de dados
- O esquema é o mesmo do pdv-backend (`backend/db/esquema.sql`), aplicado pelo `npm run db:seed` num banco novo.
- O banco antigo `move-on` e os demais bancos da organização da integração Vercel não são tocados.
- A única alteração de dados fora do seed é `vendedores.pin_hash`, trocado pelo script `pin:trocar`.

## Interfaces e contratos
| Tipo | Identificador | Entrada | Saída | Erros |
|---|---|---|---|---|
| rewrite | `frontend/vercel.json`: `/api/(.*)` → `https://pdv-loja-backend.vercel.app/api/$1` | qualquer requisição `/api/*` | resposta do back, repassada sem alteração | os do contrato do back |
| script | `npm run pin:trocar` (back) | id do vendedor (argumento) e PIN digitado sem eco; `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` no ambiente | `UPDATE vendedores SET pin_hash` | PIN que não tenha 4 dígitos, vendedor inexistente, confirmação diferente |

O contrato HTTP (`openapi.yaml`) não muda.

## Integrações
- **Front → back:** rewrite externo da Vercel.
- **Back → Turso:** `@libsql/client` com URL e token passados por variáveis de ambiente.
- **Máquina local → Turso:** usada só no seed, no script de PIN e na limpeza da venda de teste.

## Segurança
- **Segredos (URL e token do Turso):**
  - existem só em variáveis de shell durante os comandos locais e nas variáveis da Vercel marcadas como sensíveis, em Production e Preview;
  - nunca vão para arquivo, repositório, log ou chat;
  - o `.env` local continua com `file:./dados/pdv.db`.
- **Token do Turso:** criado para o banco `pdv-loja`, não para a organização (RNF-I02).
- **PIN:**
  - é digitado pelo Lucas no terminal, sem eco;
  - só o hash bcrypt vai ao banco;
  - o hash não passa pelo chat, porque um PIN de 4 dígitos com o hash exposto se quebra em segundos.
- **Proteção de preview da Vercel:** mantida. Os previews são verificados com `vercel curl`.
- **Cookie:** o `pdv_sessao` continua `HttpOnly`, `Secure` em produção, `SameSite=Lax` e `path=/api`. Com o rewrite, ele é gravado no domínio do front.

## Interface do usuário
Nenhuma tela nova. A única mudança é uma correção de robustez no `App.tsx` (RF-I06).

## Decisões (ADRs)

### ADR-I01 — Rewrite para a URL de produção do back
- **Contexto:** front e back são projetos Vercel separados, e o ADR-007 pede mesma origem.
- **Decisão:** o `frontend/vercel.json` reescreve `/api/(.*)` para `https://pdv-loja-backend.vercel.app/api/$1`.
- **Consequências:**
  - o front fica com mesma origem, sem CORS e com o cookie no domínio do front;
  - os previews do front também usam o back de produção;
  - a URL do back fica fixa no repositório do front.

### ADR-I02 — Ordem de publicação: back antes do front
- **Contexto:** o preview do front só funciona com um back real atrás do rewrite.
- **Decisão:** a publicação segue esta ordem:
  1. preview do back, verificado com `vercel curl`;
  2. produção do back;
  3. preview do front;
  4. produção do front.
- **Consequências:** o back fica público um pouco antes do front. Isso não tem impacto, porque ninguém usa o sistema ainda.

### ADR-I03 — Banco e função na mesma região da AWS (us-east-1 / iad1)
- **Contexto:** o Turso não oferece mais `gru` (decisão registrada no 02).
- **Decisão:** o banco fica em `aws-us-east-1` e a função do back em `iad1`.
- **Consequências:** há uma única viagem Brasil → EUA por requisição, e as consultas ao banco ficam locais. A mudança para `gru1` feita antes é desfeita.

### ADR-I04 — Troca de PIN por script com leitura sem eco
- **Contexto:** o PIN real não pode passar pelo Claude, nem na forma de hash.
- **Decisão:** criar o script `src/scripts/trocar-pin.ts` no back. Ele lê o PIN duas vezes sem eco, valida que tem 4 dígitos, gera o hash bcrypt (custo 10, igual ao seed) e grava com `UPDATE`. O Claude abre o comando no painel de terminal e o Lucas digita.
- **Consequências:** o PIN fica só com o Lucas. O script pode ser reutilizado para trocas futuras e para novos vendedores já cadastrados.

### ADR-I05 — Build local antes de publicar
- **Contexto:** há um risco conhecido com os imports `.js` → `.ts` (NodeNext) em `api/index.ts`.
- **Decisão:** rodar `vercel build` localmente no back antes de qualquer deploy. Se falhar, acrescentar um passo de compilação e registrar no 04.
- **Consequências:** um problema de build aparece sem publicar nada.

## Riscos técnicos
| Risco | Impacto | Mitigação |
|---|---|---|
| O rewrite externo não repassar o `Set-Cookie` | Login não persiste | Verificar no preview do front antes da produção; plano B: CORS com a origem do front e cookie `SameSite=None` (exige nova aprovação) |
| O push na `main` publica direto em produção | Código não verificado no ar | Código só vai para a `main` depois do build local e dos testes. O back verificado em preview (CLI) antes |
| A integração Turso da Vercel sobrescrever as variáveis | Back ligado ao banco errado | As variáveis atuais não são da integração (verificado). Conferir com `GET /api/config` e com uma venda no banco novo |

## Rastreabilidade
| Requisito | Componentes / arquivos previstos |
|---|---|
| RF-I01 | Turso CLI, `backend: npm run db:seed` |
| RF-I02 | `backend/src/scripts/trocar-pin.ts`, `backend/package.json` |
| RF-I03 | Projeto Vercel `pdv-loja-backend` (região, variáveis), `backend/api/index.ts` |
| RF-I04, RF-I05 | `frontend/vercel.json` |
| RF-I06 | `frontend/src/App.tsx`, novo teste em `frontend/tests/telas/` |
| RF-I07 | Verificação manual e limpeza por SQL (Turso CLI) |
| RF-I08 | Manifests e `08-metricas.md` das features irmãs |

## Aprendizados aplicados
Nenhum. O arquivo `.claude/aprendizados.md` não existe.

## Aprovação
- Aprovado por: Lucas ("pode aprovar, siga")
- Data/hora: 2026-09-27 14:16
