# 03 — Arquitetura (refatoração): PDV Loja — Cliente da venda com telefone no lugar do CPF (back)

## As-is (estado atual)
- Documentação gerada (D1-D3): `backend/docs/v7/documentacao.md` — versão 7 (retrato as-is); `frontend/docs/contexto-geral.md` atualizado (`PDV-loja/docs/contexto-geral.md` é link para ele). D1 só comentários (50 inserções; 4 linhas removidas, todas de comentário), `tsc` ok, 398 testes verdes.
- Resumo da estrutura atual (caminho do CPF):
  - `src/esquemas.ts`: `esquemaVenda` é `z.strictObject` com `cpf: z.string().trim().max(20).default('')`; campo desconhecido → 400 `entrada_invalida` "Campo não permitido: X.". O parse acontece na rota **antes** da checagem de idempotência.
  - `src/servicos/vendas.service.ts`: recusas em ordem `sem_itens` → `sem_pagamento` → `cpf_invalido` (regex + módulo 11 de `dominio/cpf.ts`) → `item_invalido`/`item_repetido` → `sem_estoque`; grava `cpf` só com dígitos; `VendaResposta.cpf`.
  - `src/repositorios/vendas.ts`: `NovaVenda.cpf`; INSERT com colunas nomeadas (`cpf` na 7ª); leitura `v.*` com `String(l.cpf)`.
  - `src/dominio/cpf.ts`: `somenteDigitos` (genérico), `cpfValido`, `mascararCpf`.
  - Cupom: `cupom.service.ts` monta `cpfMascarado`; `dominio/cupom.ts` imprime "CPF: …". `DadosCupom.loja.telefone` já existe (telefone da LOJA).
  - `db/esquema.sql`: `vendas.cpf TEXT NOT NULL DEFAULT ''`. `src/banco/migrar.ts`: esquema.sql e depois ALTERs condicionais (padrão `adicionarColunasSku`).
  - `contrato/openapi.yaml`: `cpf_invalido` no enum de erro; `VendaEntrada.cpf`; `Venda.cpf` (required); `Cupom.dados.cpfMascarado` (required).
  - Testes: 29 blocos citam CPF em 9 arquivos, mais a fixture `vendaReferencia()` (`tests/apoio.ts`, `cpf: CPF_VALIDO` por padrão) usada em 17 testes.

### Problemas do estado atual
| Problema | Onde | Impacto |
|---|---|---|
| Venda guarda CPF; o negócio quer celular | esquema, serviço, banco, contrato, cupom | Motivo da feature |
| `somenteDigitos` mora em `cpf.ts` | `dominio/cpf.ts` | Some junto com o CPF se não for movido |
| Nome "telefone" já usado para o telefone da loja no cupom | `DadosCupom.loja.telefone`, `config.loja_telefone` | Confusão no código e no contrato |
| Fixture de teste com `cpf` por padrão | `tests/apoio.ts` | Depois da troca, 17 testes mandariam `cpf` e voltariam 400 |

## Conformidade com o CLAUDE.md
Não há `CLAUDE.md` no `backend/`. Seguidos os padrões do código: Express + zod + libSQL, serviços/repositórios, `ErroNegocio(status, codigo, mensagem)`, migração por `esquema.sql` + ALTER condicional, contrato OpenAPI validado por teste, comentários em pt-BR. Regra do contexto geral: mudança de coluna em `vendas` combinada com o ERP — verificada: o ERP só lê `total_centavos`, `pecas` e `data_local` de `vendas` (e `itens_venda`); coluna nova não o afeta. Sem contradições.

## To-be (estado proposto)
- **`src/dominio/telefone.ts` (novo):** `somenteDigitos` (movido de `cpf.ts`), `telefoneValido(texto)` — aceita dígitos, espaços, parênteses e hífen (sem "+55"); depois de tirar a máscara precisa ter exatamente 11 dígitos (MI-02) — e `formatarTelefone(digitos)` → "(31) 98765-4321".
- **`src/esquemas.ts`:** `cpf` sai; entra `telefone: z.string({ error: 'Celular inválido' }).trim().max(20, 'Celular inválido').default('')`. Com o objeto estrito, corpo com `cpf` → 400 `entrada_invalida` "Campo não permitido: cpf." (MI-01).
- **`src/servicos/vendas.service.ts`:** recusas em ordem `sem_itens` → `sem_pagamento` → `telefone_invalido` ("Celular inválido") → itens → estoque; grava `telefone` só com dígitos; `VendaResposta.telefone` (MI-02, MI-03).
- **`src/repositorios/vendas.ts`:** `NovaVenda.telefone`; INSERT nomeia `telefone` (a coluna `cpf` deixa de ser informada e fica com o DEFAULT `''`); leitura `String(l.telefone ?? '')`.
- **Banco (MI-05):** `db/esquema.sql` ganha `telefone TEXT NOT NULL DEFAULT ''` como **última** coluna de `vendas` (mesma posição que o ALTER produz); `migrar()` ganha `adicionarColunaTelefone` (ALTER condicional). Nenhum índice novo.
- **Cupom (MI-04):** `DadosCupom.telefoneCliente` (já formatado; vazio se não houver) e linha "Tel: (31) 98765-4321" logo depois do cliente; `cpfMascarado` e a linha "CPF" saem. O nome evita confusão com `loja.telefone`.
- **Contrato:** `VendaEntrada.telefone` (opcional, `maxLength: 20`, descrição da regra de 11 dígitos), `Venda.telefone` (required, só dígitos ou vazio), `Cupom.dados.telefoneCliente` (required, formatado ou vazio), enum de erro `telefone_invalido` no lugar de `cpf_invalido`, descrição do 400.
- **Sai:** `src/dominio/cpf.ts`, `tests/dominio/cpf.test.ts`, `cpf_invalido`, `cpfMascarado`.
- **Testes:** fixture `vendaReferencia()` com `telefone: '(31) 98765-4321'` no lugar do CPF; teste de migração no molde de `migrar — colunas do SKU`.

## Estratégia de migração
- **Estratégia escolhida:** incremental no código (um branch `pdv-cliente-telefone` no back, commit por etapa, suíte verde ao fim de cada uma), **big bang no contrato** (sem janela de compatibilidade, decisão do Lucas).
- **Justificativa:** as etapas 1–2 são aditivas e não mudam o comportamento; a troca do contrato precisa ser atômica porque `cpf` e `telefone` não convivem (objeto estrito, sem janela).

### Etapas
| Etapa | O que muda | Invariantes em risco | Rollback |
|---|---|---|---|
| 0 | Caracterização: completar testes sobre o código ATUAL para INV-001 a INV-015 (Fase 4, passo 1) | — | — |
| 1 | Coluna `vendas.telefone` (esquema.sql + ALTER condicional + teste de migração); nada a lê ou escreve ainda | INV-006, INV-014 | revert; a coluna fica no banco (aditiva, DEFAULT `''`, inofensiva) |
| 2 | `dominio/telefone.ts` com `somenteDigitos` movido (cpf.ts passa a importar dele) + testes | nenhum | revert |
| 3 | Troca do contrato: esquema, serviço, repositório, resposta, `openapi.yaml`, fixture e inventário AP-004 dos testes | INV-001, INV-002, INV-003, INV-010, INV-011, INV-013 | revert do commit (o banco não muda nesta etapa) |
| 4 | Cupom com `telefoneCliente` e a linha "Tel:" | INV-005 | revert |
| 5 | Remove `dominio/cpf.ts` e seus testes; comentários que citam CPF (`pdv.rotas.ts`, `erros.ts`) | nenhum | revert |

### Deploy (detalhado na Fase 6 — AP-002)
| Passo | O quê | Quem | Depende de |
|---|---|---|---|
| A | `db:migrar` no banco de produção (aditivo; o back e o ERP atuais ignoram a coluna) | Claude, com confirmação do Lucas | nenhum |
| B | Deploy do back (branch aprovado → produção) | Claude, com confirmação | A |
| C | Front: `gerar:tipos`, etapa 6 e deploy da pdv-mobile-refatorado | Claude, com confirmação | B |
| D | **Manual do Lucas:** recarregar o PDV nos celulares (a página antiga aberta continua mandando `cpf`) | Lucas | C |

Entre B e C toda venda do front antigo volta 400 (sem janela); B e C seguidos, em horário sem venda. A pode rodar antes, em paralelo a qualquer coisa.

## Cobertura dos invariantes
| Invariante | Teste de caracterização previsto |
|---|---|
| INV-001 | `tests/esquemas.test.ts` (objeto estrito, campos, trim, limites) + paridade do contrato (`openapi.test.ts`) |
| INV-002 | `tests/rotas/pdv.test.ts` e lista de códigos em `openapi.test.ts` |
| INV-003 | `openapi.test.ts` (resposta real × schema `Venda`) + `pdv.test.ts` |
| INV-004 | `pdv.test.ts` (vendas/hoje, só do vendedor, ordem) |
| INV-005 | `tests/dominio/cupom.test.ts` (texto de 32 colunas) e `cupom.service.test.ts` |
| INV-006 | `tests/banco/banco.test.ts`: colunas existentes de `vendas` e posição das que o ERP lê inalteradas |
| INV-007 | testes de rota existentes |
| INV-010 | `vendas.service.test.ts` (pedido de referência) |
| INV-011 | `pdv.test.ts`: mesma chave/mesmo vendedor com corpo diferente → 200 com a venda original; outro vendedor → 409 |
| INV-012 | `vendas.service.test.ts`/repositório (baixa na transação; `sem_estoque` não grava) |
| INV-013 | `tests/http/erros.test.ts` com telefone no corpo: log sem o número |
| INV-014 | `banco.test.ts`: migrar 2× sem mudança; banco antigo com vendas recebe a coluna com `''` |
| INV-015 | testes de rota sem sessão → 401 |

## Decisões (ADRs)

### ADR-001 — Sem janela de compatibilidade: `cpf` recusado pelo objeto estrito
- **Contexto:** decisão do Lucas; o esquema já é estrito.
- **Decisão:** remover `cpf` do esquema e não tratá-lo; corpo com `cpf` cai no 400 `entrada_invalida` "Campo não permitido: cpf.".
- **Consequências:** nenhum código de transição para remover depois; vendas do front antigo falham entre os passos B e C do deploy e enquanto a página antiga estiver aberta (passo D). Reenvio de venda já gravada vindo do front antigo também recebe 400 (o parse é antes da idempotência).

### ADR-002 — Coluna nova `telefone`; `cpf` fica no banco
- **Contexto:** vendas atuais são anônimas; a tabela é lida pelo ERP; não se apaga dado.
- **Decisão:** `telefone TEXT NOT NULL DEFAULT ''` no fim da tabela, por esquema.sql e ALTER condicional; `cpf` não é mais escrito (fica `''`).
- **Consequências:** migração aditiva e idempotente; nenhuma mudança no ERP de produção. **Risco registrado (decisão do Lucas: só registrar):** o seed de desenvolvimento do ERP (`ERP-loja/backend/src/scripts/semear-dev.ts`) faz INSERT posicional com 13 valores e quebra num banco de dev que já tenha a coluna; afeta só desenvolvimento do ERP.

### ADR-003 — Regra do telefone em `dominio/telefone.ts`
- **Contexto:** MI-02 (11 dígitos); `somenteDigitos` hoje está em `cpf.ts`, que vai sair.
- **Decisão:** módulo novo com `somenteDigitos`, `telefoneValido` (só dígitos, espaços, parênteses e hífen; 11 dígitos depois de limpar) e `formatarTelefone`.
- **Consequências:** a mesma regra do front (que também passa a exigir 11 dígitos na etapa 6 da pdv-mobile-refatorado); "+55" é recusado (o vendedor digita DDD + número).

### ADR-004 — `telefoneCliente` no cupom
- **Contexto:** `DadosCupom.loja.telefone` já é o telefone da loja.
- **Decisão:** o dado do cliente se chama `telefoneCliente`, já formatado; a linha é "Tel: (31) 98765-4321" (20 caracteres, cabe nas 32 colunas) logo depois da linha do cliente.
- **Consequências:** o teste que prova que o telefone da loja sumiu (`/\(31\)/`) precisa usar outro DDD ou outra asserção para não colidir (AP-004).

## Riscos técnicos
| Risco | Impacto | Mitigação |
|---|---|---|
| Troca em massa nos testes (29 blocos + fixture `vendaReferencia` em 17 testes) | Alto | AP-004: inventário por teste no `04` antes da etapa 3, asserção equivalente com telefone; T8 com mutação na validação e na fixture |
| Vendas falhando entre o deploy do back e o do front, e em celulares com a página antiga | Alto | Checklist com "Depende de:", B e C seguidos em horário sem venda, passo manual D (recarregar) |
| Coluna nula lida como "null" (`String(null)`) | Baixo | `NOT NULL DEFAULT ''` + `?? ''` na leitura; teste com venda antiga |
| Seed de dev do ERP quebra com a coluna nova | Baixo (só dev) | Registrado (ADR-002); fora do escopo |
| Contrato e API divergirem | Médio | Teste de contrato com paridade de requisições e `afterAll` cobrindo todos os pares |

## Aprendizados aplicados
- AP-002: tabela de deploy com "Depende de:", passo manual D marcado, A em paralelo.
- AP-004: inventário dos testes que usam CPF e da fixture implícita antes da etapa 3.
- AP-001 e AP-003: não se aplicam.

## Aprovação
- Aprovado por: Lucas ("pode gravar"; decisões na fase: INV-011 corrigido no texto, seed do ERP só registrado)
- Data/hora: 2026-10-05 23:58
