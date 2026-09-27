# Contexto geral do ambiente — PDV Loja (FitMoveOn)

Visão única de todas as aplicações deste repositório e de como elas se conectam. Este arquivo é
atualizado a cada entrega; o detalhe de cada aplicação fica na documentação versionada dela
(`<app>/docs/vN/documentacao.md`).

Última atualização: 2026-09-27 (entrega da feature pdv-frontend, v1).

## Aplicações no Ambiente

| Aplicação | Responsabilidade | Localização | Situação |
|---|---|---|---|
| **pdv-backend** | API do PDV: entrada do vendedor por senha, sessão diária, catálogo, registro de vendas com cálculo e numeração no servidor, vendas do dia e conteúdo do cupom não fiscal | `backend/` (docs: `backend/docs/v1/documentacao.md`; contrato: `backend/contrato/openapi.yaml`) | Desenvolvida (v1) |
| **pdv-frontend** | Página web do vendedor no navegador do celular (React 19 + TypeScript + Vite, página estática; não é PWA): login com PIN, aba Produtos com variações, aba Pedido com descontos e pagamento, fechamento da venda com idempotência, modal "Venda registrada" e aba Dia | `frontend/` (docs: `frontend/docs/v1/documentacao.md`; guia técnico: `frontend/README.md`) | Desenvolvida (v1), contra a API simulada |
| **API simulada (MSW)** | Imitação do pdv-backend em memória, com os dados de exemplo do handoff (vendedor Carlos, PIN 1234, pedidos a partir de 1042). Usada no `npm run dev` do front e nos testes; fica fora do build de produção | `frontend/src/simulado/` e `frontend/simulado-publico/` | Parte do pdv-frontend |
| **Banco Turso** (serviço externo) | Banco de dados libSQL da API em produção | Nuvem Turso | Usado pelo pdv-backend |
| *design_handoff_pdv_loja* | Especificação de design aprovada (não é aplicação) | `design_handoff_pdv_loja/` | Referência |

A integração ponta a ponta das duas aplicações e a publicação (Vercel, rewrite de `/api`) serão
feitas na feature **pdv-integracao**.

### Como rodar localmente
Node 22.12+ nas duas aplicações (nesta máquina: `export PATH=/usr/local/bin:$PATH`).

| Cenário | Comandos | Endereço |
|---|---|---|
| Só o front, com API simulada | `npm run dev` em `frontend/` | http://localhost:5173 (Carlos, PIN 1234) |
| Front + back reais | `npm run dev` em `backend/` (porta 3001) e `npm run dev:api` em `frontend/` | http://localhost:5173 (o Vite repassa `/api` para a porta 3001) |
| Build de produção do front | `npm run build` em `frontend/` | página estática em `frontend/dist/` |

## Mapa de Integrações

```
 [Navegador do celular do vendedor]
   pdv-frontend (página estática React)
        │
        │  HTTPS, mesmo domínio: /api/* repassado ao backend (rewrite, ADR-007)
        │  cookie de sessão pdv_sessao (HttpOnly, o front não lê)
        ▼
   pdv-backend (Node.js + Express, Vercel serverless)
        │
        │  libSQL (URL + token)
        ▼
   Turso (banco de dados)

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
  (`credentials: 'same-origin'`). Em produção, a página e a API ficam no mesmo domínio e `/api/*` é
  repassado à API (rewrite, ADR-007), por isso o cookie de sessão funciona sem liberação entre
  domínios. A sessão viaja num cookie protegido (`pdv_sessao`, restrito a `/api`) e expira à
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
  desenvolvimento usa um arquivo local; nos testes, banco em memória. A estrutura do banco é aplicada
  por `npm run db:migrar` na publicação.
- **O quê:** vendedores, sessões, catálogo, dados da loja, vendas e itens vendidos.

### Impressora térmica (fora da v1)
- A conexão pdv-frontend → impressora térmica (80 mm ou 58 mm) com o texto do cupom devolvido pela
  API fica para uma feature futura, quando a loja tiver impressora.
