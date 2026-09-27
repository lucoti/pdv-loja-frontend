# 03 — Arquitetura: PDV Loja — Front-end (React)

## Visão geral
O front é uma **página web estática** (HTML, JS e CSS) em `frontend/`, independente de `backend/`.
É feito em React 19, TypeScript e Vite e conversa com a API em `/api`, no mesmo domínio (ADR-007
do pdv-backend).

Durante o desenvolvimento e os testes, a API é substituída por um servidor simulado (MSW) que segue
`backend/contrato/openapi.yaml`. A ligação com a API real fica para a pdv-integracao.

## Conformidade com o CLAUDE.md
O projeto não tem CLAUDE.md. O front segue as convenções do back:
- código e mensagens em pt-BR;
- TypeScript strict;
- valores em centavos;
- contrato como fonte da verdade.

Sem contradições.

## Estrutura do sistema
```
frontend/
  index.html · vite.config.ts · tsconfig.json · package.json · vitest.config.ts
  public/mockServiceWorker.js          (gerado pelo MSW; só usado no modo simulado)
  src/
    main.tsx                           inicia o MSW no modo simulado e monta <App/>
    App.tsx                            verifica a sessão → <Login/> ou <Pdv/>
    api/
      tipos.gerados.ts                 openapi-typescript a partir do contrato do back
      cliente.ts                       fetch em /api, erro padronizado, 401 → callback de sessão perdida
    dominio/
      precos.ts                        RN-001..004 em centavos (espelha backend/src/dominio/precos.ts)
      carrinho.ts                      reducer puro do pedido (itens, descontos, cliente, CPF, pagamento, chave)
      formatos.ts                      R$ pt-BR, DD/MM/AAAA, "peça(s)"
    telas/
      Login/                           Login.tsx, SelecaoVendedor.tsx, TecladoPin.tsx, *.module.css
      Pdv/                             Pdv.tsx, Cabecalho.tsx, Produtos.tsx, Variacoes.tsx, Pedido.tsx,
                                       Dia.tsx, BarraInferior.tsx, ModalSucesso.tsx, CaixaErro.tsx, *.module.css
    estilos/
      tokens.css · global.css          tokens e escala tipográfica do handoff
    simulado/
      dados.ts · handlers.ts · navegador.ts
  tests/                               testes de domínio, telas e contrato do simulado
```

Fluxo: `App` chama `GET /auth/sessao`.
- Com 200, abre `Pdv`, que carrega `GET /catalogo`.
- Com 401, abre `Login`, que carrega `GET /config` e `GET /vendedores` e depois faz `POST /auth/login`.
- No `Pdv`, fechar a venda chama `POST /vendas`, e a aba Dia chama `GET /vendas/hoje`.
- Qualquer 401 de uma rota protegida volta ao `Login`.

## Tecnologias
| Tecnologia | Uso | Já existe no projeto? |
|---|---|---|
| React 19 + react-dom | UI | não |
| TypeScript 7 | Tipagem strict | sim (back) |
| Vite 8 + @vitejs/plugin-react | Dev server e build estático | não |
| CSS Modules + variáveis CSS | Estilo com os tokens do handoff | não |
| @fontsource/libre-franklin | Fonte local (400/500/600/700) | não |
| openapi-typescript | Tipos a partir do `openapi.yaml` | não |
| MSW 2 | Servidor simulado (navegador e testes) | não |
| Vitest 5, @testing-library/react, user-event, jsdom | Testes | Vitest sim (back) |
| ajv + yaml | Validar as respostas do simulado contra o contrato | sim (back, dev) |

Node 22.12+ (o mesmo do back).

## Modelagem de dados
Não há banco no front. O estado fica em memória.

**Pedido (reducer):**
- `itens[]`: `{ chave, modeloId, modeloNome, tecidoId, tecidoNome, tamanho, cor, qtd, precoUnitCentavos, descPercent }`, com `chave = modelo|tecido|tamanho|cor`;
- `descontoTotalCentavos`, `cliente`, `cpf`, `pagamentoId`;
- `chaveIdempotencia`.

**Tela (estado local):**
- sessão: `vendedor`;
- navegação: `aba`, `categoriaId`, `modeloId`;
- variação em escolha: `tecidoId`, `tamanho`, `cor`;
- situação: `enviando`, `erro`, `sucesso`.

Nada é persistido no navegador.

## Interfaces e contratos
São consumidas as rotas do contrato do pdv-backend (`servers: /api`):

| Tipo | Identificador | Entrada | Saída | Erros tratados |
|---|---|---|---|---|
| endpoint | GET /config | — | `loja.nome`, `loja.unidade` | falha → "Tentar de novo" |
| endpoint | GET /vendedores | — | `[{id,nome,cargo}]` | falha → "Tentar de novo" |
| endpoint | POST /auth/login | `vendedorId`, `pin` | vendedor, `expiraEm` + cookie | 401 → "Senha incorreta…" |
| endpoint | GET /auth/sessao | cookie | vendedor, `expiraEm` | 401 → Login |
| endpoint | GET /catalogo | cookie | categorias, modelos, tecidos, tamanhos, cores, pagamentos | 401 → Login; falha → "Tentar de novo" |
| endpoint | POST /vendas | venda sem preços + `chaveIdempotencia` | Venda (201/200) | 400/409 → mensagem da API; rede/500 → "Sem conexão…"; 401 → Login |
| endpoint | GET /vendas/hoje | cookie | vendas, `totalDiaCentavos`, `quantidadePedidos` | 401 → Login; falha → "Tentar de novo" |

`POST /auth/logout` e `GET /vendas/{n}/cupom` não são usados, porque não há botão "Sair" nem impressão.

## Integrações
- **pdv-backend:** apenas via HTTP, conforme o contrato.
  - No modo `dev:api`, o Vite faz proxy de `/api` para `http://localhost:3001`.
  - Em produção, fica no mesmo domínio pelo rewrite da Vercel, que é trabalho da pdv-integracao.
- **Simulado:** handlers MSW que usam os dados de exemplo do handoff e aplicam as mesmas regras e códigos de erro do back:
  - PIN 1234;
  - numeração a partir de 1042;
  - idempotência;
  - CPF;
  - variação repetida.

## Segurança
- A sessão fica em cookie HttpOnly definido pelo back. O front nunca lê nem guarda o token e usa `credentials: 'same-origin'`.
- PIN e CPF existem apenas em memória. Não vão para console, `localStorage`/`sessionStorage` nem URL (RNF-F08).
- O front não envia preços; o servidor calcula e valida tudo.
- React escapa o texto por padrão. Não há `dangerouslySetInnerHTML`.

## Interface do usuário
As telas seguem o handoff (§1 e §2a–2e) com fidelidade alta:
- tokens em `tokens.css`;
- tamanhos mínimos obrigatórios;
- sem animações;
- folha de no máximo 460 px sobre o fundo `desk`.

Desvios decididos nas fases 1 e 2:
- "pedido novo" no lugar do número antes de fechar;
- sem a linha "Senha de teste";
- caixa de erro, "Carregando…" e "Tentar de novo" no estilo da caixa de erro do login.

## Decisões (ADRs)

### ADR-F01 — Sem roteador de URLs
- **Contexto:** o handoff não define endereços; as telas são Login e PDV, e o PDV tem abas.
- **Decisão:** alternar entre as telas pelo estado de sessão em `App`. As abas são estado do `Pdv`.
- **Consequências:** é mais simples e as trocas são instantâneas. Não há link direto para uma aba, o que não é necessário. Recarregar a página volta à aba Produtos.

### ADR-F02 — Estado com useReducer
- **Contexto:** o carrinho tem várias regras (consolidação, remoção com "−", descontos, cancelamento).
- **Decisão:** usar um reducer puro em `dominio/carrinho.ts`, sem biblioteca de estado nem de cache de dados.
- **Consequências:** cada regra fica testável isoladamente e o projeto tem menos dependências. As buscas são feitas com `useEffect` simples, o que basta para 4 leituras.

### ADR-F03 — Tipos gerados do contrato
- **Contexto:** o contrato do back é a fonte da verdade (ADR-002 do back).
- **Decisão:** o script `npm run gerar:tipos` usa o openapi-typescript em `../backend/contrato/openapi.yaml`, e o arquivo gerado é versionado.
- **Consequências:** uma mudança no contrato quebra a compilação do front em vez de quebrar em produção.

### ADR-F04 — Servidor simulado com MSW
- **Contexto:** o front deve ser desenvolvido separado do back e integrado depois.
- **Decisão:** usar handlers MSW que interceptam `/api` no navegador (`npm run dev`) e nos testes (msw/node). O modo `npm run dev:api` usa um proxy para o back real.
- **Consequências:** a página funciona sozinha. É preciso manter o simulado fiel, o que é garantido por testes que validam as respostas contra os schemas do contrato. O MSW nunca entra no build de produção.

### ADR-F05 — Fórmula de preço espelhada
- **Contexto:** a tela precisa mostrar os totais antes de enviar a venda, e front e back são projetos separados.
- **Decisão:** `dominio/precos.ts` replica RN-001..004 em centavos, incluindo o arredondamento meio para cima, e é testado com os mesmos valores de referência dos testes do back.
- **Consequências:** há duplicação pequena e controlada. O valor gravado é sempre o do servidor, e o modal mostra o total devolvido pela API.

### ADR-F06 — Chave de idempotência por pedido
- **Contexto:** a internet da loja é instável, e o back aceita reenvio com a mesma chave.
- **Decisão:** gerar a chave com `crypto.randomUUID()` quando o pedido começa, mantê-la em todos os reenvios e trocá-la só em "Nova venda" ou "Cancelar pedido".
- **Consequências:** o reenvio é seguro, sem venda duplicada. `randomUUID` exige contexto seguro (HTTPS ou localhost), o que a Vercel atende.

### ADR-F07 — Estilo com CSS Modules e tokens
- **Contexto:** o handoff define tokens exatos e proíbe animações.
- **Decisão:** variáveis CSS globais para os tokens e CSS Modules por componente, sem biblioteca de UI.
- **Consequências:** medidas fiéis e sem dependência visual externa.

## Riscos técnicos
| Risco | Impacto | Mitigação |
|---|---|---|
| Simulado diverge do back real | Falhas só na integração | Teste de contrato das respostas do MSW (ajv) e tipos gerados |
| `crypto.randomUUID` indisponível fora de HTTPS | Venda não fecha em HTTP puro | Produção é HTTPS; em dev, localhost é contexto seguro |
| Zoom automático do Safari em campos < 16 px | Tela "pula" ao digitar | Campos com 21 px, conforme o handoff |
| Dependências muito novas (TS 7, Vite 8) | Incompatibilidade de plugins | Versões fixadas; `npm run build` e `tsc` na verificação |

## Rastreabilidade
| Requisito | Componentes / arquivos previstos |
|---|---|
| RF-F01 | telas/Login/Login.tsx, SelecaoVendedor.tsx |
| RF-F02 | telas/Login/Login.tsx, TecladoPin.tsx |
| RF-F03 | App.tsx, api/cliente.ts |
| RF-F04 | telas/Pdv/Cabecalho.tsx, dominio/formatos.ts |
| RF-F05 | telas/Pdv/Produtos.tsx, Variacoes.tsx, BarraInferior.tsx, dominio/precos.ts |
| RF-F06 | telas/Pdv/Pedido.tsx, dominio/carrinho.ts, dominio/precos.ts |
| RF-F07 | telas/Pdv/Pdv.tsx, BarraInferior.tsx, api/cliente.ts |
| RF-F08 | telas/Pdv/ModalSucesso.tsx |
| RF-F09 | telas/Pdv/Dia.tsx |
| RF-F10 | telas/Pdv/CaixaErro.tsx, api/cliente.ts |
| RNF-F01..F04, F09 | estilos/tokens.css, global.css, *.module.css |
| RNF-F07 | api/tipos.gerados.ts, simulado/handlers.ts, testes de contrato |
| RNF-F08 | api/cliente.ts, dominio/carrinho.ts (sem persistência) |

## Aprendizados aplicados
Nenhum. O arquivo `.claude/aprendizados.md` ainda não existe.

## Aprovação
- Aprovado por: Lucas ("pode aprovar, siga")
- Data/hora: 2026-09-27 11:18
