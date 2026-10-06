# 02 — Requisitos (refatoração): PDV Loja — Cliente da venda com telefone no lugar do CPF (back)

## Motivação
Trocar o dado do cliente na venda de CPF para celular (DDD + celular, 11 dígitos), para a loja poder contatar o cliente, sem mudar mais nada no registro da venda. Pré-requisito da publicação do front pdv-mobile-refatorado.

Informação do Lucas (2026-10-05): as vendas registradas até hoje são anônimas (sem CPF); vendas antigas não precisam ser consideradas na impressão do cupom.

## Pontos de entrada afetados
| Ponto de entrada | Tipo (HTTP / evento / fila / job / função pública) | Consumidores |
|---|---|---|
| `POST /api/vendas` (`src/rotas/pdv.rotas.ts` → `esquemaVenda` em `src/esquemas.ts` → `vendas.service.ts` → `repositorios/vendas.ts`) | HTTP | Front do PDV |
| `GET /api/vendas/hoje` | HTTP | Front do PDV (aba Dia) |
| `GET /api/vendas/:numero/cupom` (`cupom.service.ts`, `dominio/cupom.ts`) | HTTP | Front do PDV / impressão |
| `migrar()` (`src/banco/migrar.ts`, script `db:migrar`) | Função pública / script | Deploy (banco Turso compartilhado) |
| Tabela `vendas` | Banco | ERP (lê `vendas` para o painel) |
| `contrato/openapi.yaml` | Contrato | Front (`npm run gerar:tipos`), testes de contrato |

## Invariantes — o que NÃO pode mudar

### Contratos externos intocáveis
| ID | Contrato | Detalhe (payload, formato, códigos de erro, ordenação...) |
|---|---|---|
| INV-001 | Corpo do `POST /vendas` (exceto cliente) | `chaveIdempotencia` (UUID), `itens` (`skuId`, `qtd`, `descPercent`), `descontoTotalCentavos` (múltiplo de 500), `cliente` (até 120, aparado), `pagamentoId`; objeto estrito (campo desconhecido → 400). Única mudança: `cpf` → `telefone` (MI-01). |
| INV-002 | Respostas e códigos do `POST /vendas` | 201 venda nova, 200 reenvio já gravado com a mesma chave (mesmo vendedor), 409 `chave_em_uso` (chave de outro vendedor), 409 `sem_estoque` (mensagem nomeando a peça), 400 `sem_itens`/`sem_pagamento`/`item_invalido`/`item_repetido`/`entrada_invalida`, 401 sessão; formato `{ erro: { codigo, mensagem } }`. `cpf_invalido` sai e entra `telefone_invalido` (MI-02). |
| INV-003 | Objeto `Venda` devolvido | Todos os campos atuais (número, data/hora, vendedor, cliente, pagamento, itens, totais), exceto `cpf` → `telefone` (MI-03). |
| INV-004 | `GET /vendas/hoje` | Mesmo formato (total do dia, quantidade, lista com número, cliente, hora, peças, pagamento, total), só do vendedor logado, mais recente primeiro. |
| INV-005 | Cupom | Mesmo conteúdo e ordem de linhas (loja, aviso, número, data/hora, vendedor, cliente, itens, totais, pagamento), exceto a linha do CPF, que vira a do telefone (MI-04). |
| INV-006 | Tabela `vendas` para o ERP | Nenhuma coluna existente renomeada ou removida; colunas lidas pelo ERP inalteradas. |
| INV-007 | Demais rotas | `/config`, `/vendedores`, `/auth/*`, `/catalogo` sem mudança. |

### Comportamentos que devem ser preservados
| ID | Comportamento | Como verificar |
|---|---|---|
| INV-010 | Preços, descontos e totais calculados só no servidor (preço do SKU do ERP; desconto por item 0/5/10/15; desconto no total em passos de R$ 5; total ≥ 0). | Testes de serviço/rota com o pedido de referência |
| INV-011 | Numeração sequencial a partir de 1042 e idempotência pela chave: a mesma chave do mesmo vendedor devolve 200 com a venda original, **qualquer que seja o corpo**; chave de outro vendedor → 409 `chave_em_uso`. (Texto corrigido na Fase 3, decisão do Lucas: descreve o código atual, que é preservado.) | Testes de rota |
| INV-012 | Baixa do estoque do ERP na mesma transação da venda; sem saldo → 409 `sem_estoque` e nada gravado. | Testes de serviço/repositório |
| INV-013 | Logs de erro com método, rota e mensagem, nunca o corpo (agora também por causa do telefone). | `tests/http/erros.test.ts` com telefone no corpo |
| INV-014 | `migrar()` pode rodar de novo sem alterar nada (idempotente) e não mexe em tabelas do ERP. | Teste de migração rodando duas vezes |
| INV-015 | Sessão exigida em todas as rotas do PDV (401 sem sessão). | Testes de rota |

### Bugs conhecidos a preservar
| ID | Bug | Quem pode depender dele | Decisão |
|---|---|---|---|
| — | Nenhum identificado no levantamento. | — | — |

## O que pode mudar
- Estrutura interna de `vendas.service.ts`, `esquemas.ts`, `repositorios/vendas.ts`, `cupom.*`; remoção de `src/dominio/cpf.ts`.
- Mudanças intencionais (decisões do Lucas em 2026-10-05):
  - **MI-01** `POST /vendas`: `telefone` opcional no lugar de `cpf`; aceita máscara e espaços, grava só os dígitos; vazio vale. Corpo com `cpf` é recusado (400, objeto estrito) — sem janela de compatibilidade.
  - **MI-02** Telefone preenchido precisa ter **exatamente 11 dígitos** (DDD + celular); senão 400 `telefone_invalido` ("Celular inválido"). `cpf_invalido` deixa de existir.
  - **MI-03** `Venda` devolvida (e `POST`/reenvio) com `telefone` (só dígitos, ou vazio) no lugar de `cpf`.
  - **MI-04** Cupom com a linha "Tel: (31) 98765-4321" (telefone completo, formatado) quando houver telefone; a linha do CPF mascarado sai. Vendas antigas não precisam de tratamento especial (são anônimas).
  - **MI-05** Banco: coluna nova `vendas.telefone TEXT NOT NULL DEFAULT ''` (no `esquema.sql` e por ALTER condicional em `migrar()`); a coluna `cpf` fica, sem novos valores.

## Invariantes alterados intencionalmente
<Preenchido durante as Fases 4 e 5 se um teste de caracterização quebrar e a mudança for aceita.>

| ID | Mudança | Motivo | Aprovado por | Data |
|---|---|---|---|---|
| | | | | |

## Aprendizados aplicados
- AP-004: o CPF é sinal em ~30 testes (esquemas, rotas, contrato, cupom, repositórios, erros); antes da troca o `04-desenvolvimento.md` lista o que cada um conferia e a asserção equivalente com telefone.
- AP-002: a ausência de janela de compatibilidade (MI-01) vai para a estratégia de migração e o checklist de deploy com "Depende de:".

## Aprovação
- Aprovado por: Lucas ("pode gravar")
- Data/hora: 2026-10-05 23:43
