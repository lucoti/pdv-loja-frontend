# Contexto geral do ambiente — PDV Loja (FitMoveOn)

Visão única de todas as aplicações do ambiente PDV Loja e de como elas se conectam. Este arquivo é
atualizado a cada entrega; o detalhe de cada aplicação fica na documentação versionada dela
(`<app>/docs/vN/documentacao.md`). O arquivo vive no repositório do front
(`frontend/docs/contexto-geral.md`); `docs/contexto-geral.md` na pasta do ambiente é um link para ele.

Última atualização: 2026-09-27 (feature pdv-integracao: preparação da publicação; deploy ainda não
executado).

## Aplicações no Ambiente

| Aplicação | Responsabilidade | Localização | Situação |
|---|---|---|---|
| **pdv-backend** | API do PDV: entrada do vendedor por senha, sessão diária, catálogo, registro de vendas com cálculo e numeração no servidor, vendas do dia e conteúdo do cupom não fiscal; script `pin:trocar` para troca de PIN sem exposição | `backend/` — repositório `lucoti/pdv-loja-backend`, projeto Vercel `pdv-loja-backend` (docs: `backend/docs/v2/documentacao.md`; contrato: `backend/contrato/openapi.yaml`) | v2 configurada para publicação; deploy pendente (Fase 6 da pdv-integracao) |
| **pdv-frontend** | Página web do vendedor no navegador do celular (React 19 + TypeScript + Vite, página estática; não é PWA): login com PIN, aba Produtos com variações, aba Pedido com descontos e pagamento, fechamento da venda com idempotência, modal "Venda registrada" e aba Dia | `frontend/` — repositório `lucoti/pdv-loja-frontend`, projeto Vercel `pdv-loja-frontend` (docs: `frontend/docs/v2/documentacao.md`; guia técnico: `frontend/README.md`) | v2 configurada para publicação (rewrite `/api`); deploy pendente (Fase 6 da pdv-integracao) |
| **API simulada (MSW)** | Imitação do pdv-backend em memória, com os dados de exemplo do handoff (vendedor Carlos, PIN 1234, pedidos a partir de 1042). Usada no `npm run dev` do front e nos testes; fica fora do build de produção | `frontend/src/simulado/` e `frontend/simulado-publico/` | Parte do pdv-frontend |
| **Banco Turso `pdv-loja`** (serviço externo) | Banco de dados libSQL da API em produção, exclusivo do PDV | Turso, organização `personal`, região `aws-us-east-1` | Usado só pelo pdv-backend |
| *design_handoff_pdv_loja* | Especificação de design aprovada (não é aplicação) | `design_handoff_pdv_loja/` | Referência |

### Repositórios e projetos Vercel
Front e back são **dois repositórios git separados**, cada um com seu projeto Vercel (branch de
produção `main`, Node 22.x; `engines.node` = `>=22.12 <23` nos dois `package.json`):

| Pasta local | Repositório | Projeto Vercel | Endereço previsto | Observação |
|---|---|---|---|---|
| `backend/` | `lucoti/pdv-loja-backend` | `pdv-loja-backend` | `pdv-loja-backend.vercel.app` | Função Express em `iad1`, framework "Other"; `vercel.json` com `buildCommand: npm run typecheck` e `outputDirectory: public` (vazia), para expor só a função `api/` |
| `frontend/` | `lucoti/pdv-loja-frontend` | `pdv-loja-frontend` | `pdv-loja-frontend.vercel.app` | Página estática; `vercel.json` reescreve `/api/(.*)` para `https://pdv-loja-backend.vercel.app/api/$1` |

Variáveis de ambiente do back na Vercel (Production e Preview, marcadas como sensíveis):
`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` (token com escopo só do banco `pdv-loja`) e
`NODE_ENV=production`. `PORT` não é usada na Vercel e `CORS_ORIGENS` fica vazio. Os valores nunca
vão para o repositório nem para a documentação.

A publicação segue a ordem: preview do back → produção do back → preview do front → produção do
front (ADR-I02 da pdv-integracao). Até esta atualização, **nenhum deploy foi feito**.

### Obsoletos (não usados)
- O **repositório único antigo** do PDV e o **projeto Vercel antigo** foram substituídos pelos dois
  repositórios/projetos acima.
- O **banco Turso antigo `move-on`** (e os demais bancos da organização ligada à integração Vercel,
  como `portal-aluno`) não é usado nem alterado pelo PDV: o esquema dele é incompatível com o atual.

A remoção desses itens fica a critério do Lucas.

### Como rodar localmente
Node 22.12+ nas duas aplicações (nesta máquina: `export PATH=/usr/local/bin:$PATH`).

| Cenário | Comandos | Endereço |
|---|---|---|
| Só o front, com API simulada | `npm run dev` em `frontend/` | http://localhost:5173 (Carlos, PIN 1234) |
| Front + back reais | `npm run dev` em `backend/` (porta 3001) e `npm run dev:api` em `frontend/` | http://localhost:5173 (o Vite repassa `/api` para a porta 3001) |
| Build de produção do front | `npm run build` em `frontend/` | página estática em `frontend/dist/` |
| Trocar o PIN de um vendedor | `npm run pin:trocar -- <vendedorId>` em `backend/`, num terminal interativo com as variáveis `TURSO_*` do banco-alvo no ambiente | — (PIN digitado sem eco; só o hash bcrypt vai ao banco) |

## Mapa de Integrações

```
 [Navegador do celular do vendedor]
   pdv-frontend (página estática React)
        │
        │  HTTPS em pdv-loja-frontend.vercel.app (CDN Vercel)
        │  /api/* reescrito pelo frontend/vercel.json (ADR-007, ADR-I01)
        │  cookie de sessão pdv_sessao (HttpOnly, gravado no domínio do front; o front não lê)
        ▼
   pdv-backend em pdv-loja-backend.vercel.app/api/* (Node.js 22 + Express, função Vercel em iad1)
        │
        │  libSQL (URL + token, variáveis sensíveis da Vercel)
        ▼
   Turso "pdv-loja" (org personal, aws-us-east-1)

 Operação (máquina local → Turso "pdv-loja", fora do fluxo do vendedor):
   db:seed (carga inicial), pin:trocar (troca de PIN), SQL de limpeza da venda de teste

 Em desenvolvimento:
   npm run dev      → pdv-frontend ──/api──► API simulada (MSW, no próprio navegador)
   npm run dev:api  → pdv-frontend ──/api──► proxy do Vite ──► pdv-backend em localhost:3001
```

A página do vendedor só fala com a API; a API é a única que acessa o banco. O contrato
`backend/contrato/openapi.yaml` é a fonte única do formato das mensagens: o front gera os tipos a
partir dele (`npm run gerar:tipos`, arquivo `frontend/src/api/tipos.gerados.ts`) e não há código
compartilhado entre as aplicações (ADR-001/ADR-002 do back, ADR-F03 do front). A regra de preço
existe nos dois lados, de propósito: o front só a usa para exibir totais; o valor oficial é o do
back (ADR-F05).

A impressão do cupom não faz parte da v1 do front (a loja ainda não tem impressora). A rota de
cupom do back existe, mas ainda não é consumida.

## Detalhamento das Conexões

### pdv-frontend → pdv-backend
- **De:** pdv-frontend (página no navegador do celular)
- **Para:** pdv-backend
- **Como:** HTTP/JSON sob o prefixo `/api`, sempre na mesma origem da página
  (`credentials: 'same-origin'`). Em produção, o `frontend/vercel.json` reescreve `/api/(.*)` para
  `https://pdv-loja-backend.vercel.app/api/$1` (rewrite externo entre os dois projetos Vercel;
  ADR-007 do back, ADR-I01 da pdv-integracao). Para o navegador, página e API têm a mesma origem, por
  isso o cookie de sessão funciona sem liberação entre domínios. Os previews do front também apontam
  para o back de produção. A sessão viaja num cookie protegido (`pdv_sessao`, restrito a `/api`) e expira à
  meia-noite de São Paulo; qualquer 401 `sessao_invalida` leva o front de volta ao login. Em
  desenvolvimento, `npm run dev:api` usa o proxy do Vite (sem CORS); se o front rodar em outra
  origem, a API libera acesso pela variável `CORS_ORIGENS`.
- **O quê (usado pelo front v1):** `GET /config` e `GET /vendedores` (tela de entrada, sem sessão);
  `POST /auth/login` e `GET /auth/sessao`; `GET /catalogo`; `POST /vendas` (sem preços, com chave de
  idempotência UUID gerada no aparelho e repetida nos reenvios); `GET /vendas/hoje`. Não usados na
  v1: `POST /auth/logout` (não há botão "Sair") e `GET /vendas/{n}/cupom` (sem impressão).
  Formato e erros definidos em `backend/contrato/openapi.yaml`.

### pdv-frontend → API simulada (somente desenvolvimento e testes)
- **De:** pdv-frontend
- **Para:** handlers MSW em `frontend/src/simulado/handlers.ts`
- **Como:** no `npm run dev`, um service worker intercepta `/api` no navegador; nos testes, o
  `msw/node` faz o mesmo. O build de produção não inclui nada do MSW.
- **O quê:** as mesmas rotas, formatos, regras e códigos de erro do pdv-backend, em memória
  (recarregar a página zera sessão e vendas). Deve ser mantida alinhada ao contrato; a validação
  das respostas contra os schemas do `openapi.yaml` está prevista nos testes (ADR-F04, Fase 5).

### pdv-backend → Turso
- **De:** pdv-backend
- **Para:** banco Turso (libSQL)
- **Como:** cliente `@libsql/client`, configurado por `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN`. Em
  produção, banco `pdv-loja` (organização `personal`, `aws-us-east-1`), na mesma região da função
  (`iad1`) para que cada requisição cruze o continente uma só vez (ADR-I03). Em desenvolvimento usa
  um arquivo local (`file:./dados/pdv.db`); nos testes, banco em memória. O banco novo recebe
  esquema e dados de exemplo por `npm run db:seed`.
- **O quê:** vendedores, sessões, catálogo, dados da loja, vendas e itens vendidos.

### Máquina local → Turso (operação)
- **De:** terminal do operador, na pasta `backend/`
- **Para:** banco Turso `pdv-loja`
- **Como:** mesmos `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`, apenas como variáveis de shell durante o
  comando (o `.env` local continua apontando para o arquivo local).
- **O quê:** carga inicial (`db:seed`), troca de PIN (`pin:trocar`: `UPDATE vendedores.pin_hash` e
  `DELETE` das sessões do vendedor, numa transação) e limpeza da venda de teste da verificação.

### Impressora térmica (fora da v1)
- A conexão pdv-frontend → impressora térmica (80 mm ou 58 mm) com o texto do cupom devolvido pela
  API fica para uma feature futura, quando a loja tiver impressora.
