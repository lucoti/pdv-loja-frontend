# PDV Loja — Front-end

Página web do PDV (React 19 + TypeScript + Vite), aberta pelo vendedor no navegador do celular.
Reproduz o design em `../design_handoff_pdv_loja/` e conversa com a API do `../backend` em `/api`.

## Requisitos
- Node.js 22.12+ (`export PATH=/usr/local/bin:$PATH` nesta máquina, onde o padrão é Node 20).

## Comandos
| Comando | O que faz |
|---|---|
| `npm install` | Instala as dependências |
| `npm run dev` | Página em http://localhost:5173 com a **API simulada** no navegador (MSW) — não precisa do back-end. Vendedor Carlos, PIN 1234 |
| `npm run dev:api` | Página com `/api` indo por proxy para o back real em http://localhost:3001 (`npm run dev` em `../backend`) |
| `npm run build` | Confere os tipos e gera a página estática em `dist/` |
| `npm run gerar:tipos` | Regenera `src/api/tipos.gerados.ts` a partir de `../backend/contrato/openapi.yaml` |
| `npm test` / `npm run test:coverage` | Testes (Vitest + Testing Library + MSW) |

No modo simulado a sessão fica em memória: recarregar a página volta ao login.

## Estrutura
| Pasta | Conteúdo |
|---|---|
| `src/api/` | Cliente HTTP e tipos gerados do contrato |
| `src/dominio/` | Regras de preço (espelho do back), carrinho (reducer) e formatos pt-BR |
| `src/telas/` | Login e PDV (Produtos, Variações, Pedido, Dia, modal) |
| `src/estilos/` | Tokens do handoff e estilos globais |
| `src/simulado/` | API simulada (MSW) com os dados de exemplo do handoff |
| `simulado-publico/` | `mockServiceWorker.js` — servido só no `npm run dev`, fora do build |
