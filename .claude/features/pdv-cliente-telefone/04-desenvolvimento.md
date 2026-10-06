# 04 — Desenvolvimento: PDV Loja — Cliente da venda com telefone no lugar do CPF (back)

<!-- Não registre código aqui: o código vive no repositório. Registre apenas decisões e fatos relevantes. -->
<!-- Código: repositório backend/ (branch pdv-cliente-telefone). -->

## Testes de caracterização (somente modo refatoração)
- Suíte: Vitest 5.0.2 + supertest + libSQL em memória (já existente); cobertura v8 com thresholds por arquivo 85/85/85/80 (mantidos). Rodar com Node 22 (`PATH=/usr/local/bin:$PATH`).
- Executado por: subagente `fluxo-testador`, modo `caracterizacao`, em 2026-10-06. Conferido pelo orquestrador: `git status` (só `tests/caracterizacao/` novo) e suíte rodada de novo.
- Resultado sobre o código ATUAL antes de qualquer alteração: **verde** — 23 arquivos, 428 testes (antes 398). Cobertura de todos os arquivos ≥ meta (total 100/100/100/98,52).
- Arquivo: CRIADO `backend/tests/caracterizacao/telefone.caracterizacao.test.ts` (30 testes). Ponto único da troca: objeto `DADO_CLIENTE` (campo, coluna, valores, código e mensagem de inválido, campo e linha do cupom), com o valor de depois da troca em comentário; o dado entra no corpo só pelo helper `comDado()`. `tests/apoio.ts`/`vendaReferencia()` não foram alterados.
- Invariantes cobertos: INV-001 a INV-007 e INV-010 a INV-015. Novos: ordem das recusas (8 casos, nada gravado), INV-011 pela rota (corpo diferente → 200 com a original; outro vendedor → 409), INV-006 (colunas de `vendas`/`itens_venda` como prefixo, colunas lidas pelo ERP fixas), INV-013 (console sem o dado), INV-014 (migrar 2× com dados; banco antigo), INV-015 (401 antes da validação), cupom pela rota em 32 colunas.
- T8: 3 sinais de alerta corrigidos; 12 mutações no código + 2 na fixture, todas derrubaram testes; 1 falso-positivo reescrito (teste de log sem pré-condição de que o corpo leva o dado).
- Achados: nenhum defeito novo. Fixados: o parse do esquema vem antes da idempotência (ADR-001); o cupom é legível por qualquer vendedor logado e passará a mostrar o telefone completo (MI-04).

## Arquivos criados ou alterados
| Arquivo | Camada | Criado / alterado |
|---|---|---|
| `backend/tests/caracterizacao/telefone.caracterizacao.test.ts` | Teste | Criado (etapa 0) |
| `backend/src/*` (8 arquivos), `backend/docs/v7/` | Back / docs | Só comentários e docs as-is (Fase 3) |
| `backend/db/esquema.sql`, `backend/src/banco/migrar.ts`, `backend/tests/banco/banco.test.ts` | Banco | Coluna `vendas.telefone` (fim da tabela) + `adicionarColunaTelefone` + 3 testes (etapa 1) |
| `backend/src/dominio/telefone.ts`, `backend/tests/dominio/telefone.test.ts` | Domínio | Criados — `somenteDigitos` (movido), `telefoneValido` (11 dígitos), `formatarTelefone` (etapa 2) |
| `backend/src/esquemas.ts`, `servicos/vendas.service.ts`, `repositorios/vendas.ts`, `contrato/openapi.yaml` | Back / contrato | `cpf` → `telefone`, `telefone_invalido`, `Venda.telefone` (etapa 3) |
| `backend/src/dominio/cupom.ts`, `servicos/cupom.service.ts` | Back | `telefoneCliente` e linha "Tel:" (etapa 4) |
| `backend/src/dominio/cpf.ts`, `backend/tests/dominio/cpf.test.ts` | Domínio | Removidos (etapa 5); comentários com CPF atualizados em `pdv.rotas.ts`, `erros.ts`, `vendas.service.ts`, `repositorios/vendas.ts` |
| `backend/tests/apoio.ts`, `esquemas.test.ts`, `rotas/pdv.test.ts`, `servicos/vendas.service.test.ts`, `servicos/cupom.service.test.ts`, `dominio/cupom.test.ts`, `contrato/openapi.test.ts`, `http/erros.test.ts`, `repositorios/repositorios.test.ts`, `caracterizacao/telefone.caracterizacao.test.ts` | Teste | Inventário AP-004 da etapa 3 |

## Log de decisões não previstas na arquitetura
| Data | Decisão | Motivo | Impacto |
|---|---|---|---|
| 2026-10-06 | Etapas 3 (contrato) e 4 (cupom) num commit só | O cupom lê `venda.cpf`, que some na etapa 3; separar deixaria um estado intermediário com o cupom sem a linha e testes da caracterização vermelhos | Um commit a menos; rollback das duas juntas |
| 2026-10-06 | `telefoneValido` aceita só dígitos, espaços, parênteses e hífen (sem ponto nem "+") | ADR-003; o front manda a máscara "(31) 98765-4321" | "31.98765.4321" e "+55 …" → `telefone_invalido` |
| 2026-10-06 | Cupom de teste com cliente DDD 11 | O telefone da loja é (31); asserções com `(31)` ficariam ambíguas (risco do levantamento) | `tests/dominio/cupom.test.ts` |
| 2026-10-06 | Leitura `String(l.telefone ?? '')` | Defesa contra NULL (a coluna é NOT NULL DEFAULT '') | Ramo não exercitado: `repositorios/vendas.ts` 87,5% de branches (meta 80) |

## Inventário AP-004 — etapa 3 (CPF → telefone nos testes do back)
Busca por `cpf`, `CPF`, `CPF_VALIDO`, `cpf_invalido`, `cpfMascarado`, `52998224725` antes da troca (29 blocos + fixture `vendaReferencia` em 17 testes).

| Teste | O que o sinal antigo conferia | Asserção equivalente |
|---|---|---|
| `tests/caracterizacao/telefone.caracterizacao.test.ts` (30 testes, fixture `DADO_CLIENTE`) | Comportamento com o dado pessoal (gravação, idempotência, ordem das recusas, log, cupom) | Só os valores da fixture trocados (antes em comentário); **os 30 passaram sem outra mudança** — prova de que o resto do comportamento ficou igual |
| `tests/apoio.ts` `CPF_VALIDO`/`vendaReferencia()` | Venda de referência com dado pessoal | `TELEFONE_VALIDO = '(31) 98765-4321'` |
| `tests/dominio/cpf.test.ts` (9) | Regra do CPF | Removido com o módulo; regra nova em `tests/dominio/telefone.test.ts` (16 casos) |
| `esquemas.test.ts` (4) | Padrão '', trim, limite de 20, tipo errado, mensagens em pt-BR | Mesmo com `telefone` ("Celular inválido") + **novo:** corpo com `cpf` → "Campo não permitido: cpf." |
| `rotas/pdv.test.ts` (4) | Venda devolve dígitos; letras → `cpf_invalido`; 2 casos inválidos; cupom mascarado | Mesmo com telefone (`telefone_invalido`, 10 dígitos e "+55"); cupom com "Tel: (31) 98765-4321" e sem "CPF" + **novo:** corpo com `cpf` → 400 e nada gravado |
| `servicos/vendas.service.test.ts` (3) | Referência com dígitos; 7 inválidos com nada gravado; vazio e máscara | Mesmo com telefone (7 inválidos, `contar(vendas) = 0` mantido) |
| `servicos/cupom.service.test.ts` (3) | `cpfMascarado`, venda antiga, sem dado → linha omitida | `telefoneCliente` formatado, linha "Tel:", dígitos crus ausentes; venda antiga com `telefoneCliente: ''` |
| `dominio/cupom.test.ts` (2) | Texto de 32 colunas com a linha do CPF; omissões | Linha "Tel: (11) 91234-5678" na mesma posição; omissão de `(11)` e `Tel:` |
| `contrato/openapi.test.ts` (3) | Lista de códigos com `cpf_invalido`; cupom com/sem dado; paridade API × schema | `telefone_invalido`; paridade com `telefone` e **novo caso** `cpf: ''` (os dois recusam) |
| `http/erros.test.ts` (1) | Log sem CPF/PIN | Log sem o telefone (dígitos e "98765") nem PIN |
| `repositorios/repositorios.test.ts` (fixture) | `NovaVenda.cpf` | `NovaVenda.telefone` |

Nenhuma asserção removida sem equivalente. Mutações conferidas pelo orquestrador: aceitar 10 dígitos (12 testes falham), tirar a validação do serviço (15), tirar a linha "Tel:" do cupom (4).

## Mudanças de escopo
Nenhuma.

## Débito técnico
| Item | Motivo | Sugestão de tratamento |
|---|---|---|
| Seed de dev do ERP com INSERT posicional em `vendas` | Quebra com a coluna nova (ADR-002, só registrar) | Ajustar quando alguém mexer no ERP |

## Execuções da suíte de caracterização por etapa (somente refatoração)
| Etapa da migração | Resultado | Observação |
|---|---|---|
| 0 — caracterização sobre o código atual | verde (428) | |
| 1 — coluna `vendas.telefone` | verde (431) | ALTER condicional idempotente; banco novo e migrado com a mesma ordem de colunas |
| 2 — `dominio/telefone.ts` | verde (447) | `cpf.ts` reexporta `somenteDigitos` até a etapa 5 |
| 3+4 — contrato e cupom | verde (449) | Caracterização verde só com a troca da fixture |
| 5 — remoção do CPF | verde (431; −18 testes do `cpf.test.ts`) | `tsc` ok; cobertura total 100/98,03/100/100, todos os arquivos ≥ meta |

## Documentação (D1-D3)
- [x] D1 — código-fonte comentado (8 linhas de comentário em `telefone.ts`, `migrar.ts`, `repositorios/vendas.ts`, `vendas.service.ts`; ATENÇÃO nova em `telefoneValido`: só formato e 11 dígitos, sem conferir DDD nem o 9)
- [x] D2 — documentação executiva em `backend/docs/v8/documentacao.md` (versão 8, to-be)
- [x] D3 — `docs/contexto-geral.md` atualizado (front ainda envia `cpf` até a etapa 6 da pdv-mobile-refatorado; deploy coordenado com "depende de:")

Pontos em aberto registrados (decisão do Lucas pendente, fora do escopo): regra do celular mais rígida (DDD/9) exigiria mudar back e front juntos; cupom com telefone completo visível a qualquer vendedor logado (MI-04).

(As-is feito na Fase 3: `backend/docs/v7`. O to-be roda depois do Desenvolvimento.)

## Exceções
Nenhuma.

## Pronto para documentação e testes
sim — etapas 1 a 5 concluídas em 2026-10-06 (branch `pdv-cliente-telefone` do back, 5 commits sem push). Próximo: Documentação (to-be).
