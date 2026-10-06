# 05 — Testes: PDV Loja — Cliente da venda com telefone no lugar do CPF (back)

Executado pelo subagente `fluxo-testador` (modo `caracterizacao-final`) em 2026-10-06, sobre o repositório `backend/`, branch `pdv-cliente-telefone`, commit 2e78243. Nenhum arquivo criado ou alterado nesta fase; mutações e cópia do commit original só no scratchpad da sessão.

## Suíte e cobertura
- Suíte: Vitest 5.0.2 + supertest + libSQL em memória — já existia (Node 22.19, `PATH=/usr/local/bin:$PATH`); `tsc --noEmit` ok.
- Provider de coverage: v8 (`@vitest/coverage-v8`) — thresholds por arquivo em `backend/vitest.config.ts`: 85 lines / 85 functions / 85 statements / 80 branches (sem mudança).

## Fontes usadas (T0)
- `backend/docs/v8/documentacao.md` (to-be, fonte primária), `frontend/docs/contexto-geral.md`, artefatos 00 a 04 desta feature, `contrato/openapi.yaml` (via `tests/contrato/openapi.test.ts`).

## Pontos de entrada testados (T2)
| Ponto de entrada | Tipo | Situação anterior (completo / incompleto / sem testes) | Ação |
|---|---|---|---|
| `POST /api/vendas` | HTTP | completo | Afetado; testes trocados pelo inventário AP-004 (Fase 4) |
| `GET /api/vendas/hoje` | HTTP | completo | Nenhuma (INV-004) |
| `GET /api/vendas/:numero/cupom` | HTTP | completo | Afetado; MI-04 coberto (Fase 4) |
| `GET /api/catalogo` | HTTP | completo | Nenhuma |
| `POST /api/auth/login`, `GET /api/auth/sessao`, `POST /api/auth/logout` | HTTP | completo | Nenhuma (INV-007) |
| `GET /api/config`, `GET /api/vendedores` | HTTP | completo | Nenhuma (INV-007) |
| `migrar()` / `db:migrar` | Função / script | completo | Afetado; 3 testes novos em `banco.test.ts` (Fase 4) |

Não há eventos nem filas.

## Cobertura final por arquivo
| Arquivo | Lines | Functions | Statements | Branches | Meta atingida? |
|---|---|---|---|---|---|
| src/esquemas.ts | 100 | 100 | 100 | 83,33 | sim |
| src/dominio/telefone.ts (novo) | 100 | 100 | 100 | 100 | sim |
| src/dominio/cupom.ts | 100 | 100 | 100 | 96,15 | sim |
| src/repositorios/vendas.ts | 100 | 100 | 100 | 87,5 | sim |
| src/repositorios/catalogo.ts | 100 | 100 | 100 | 91,66 | sim |
| src/servicos/vendas.service.ts | 100 | 100 | 100 | 100 | sim |
| src/servicos/cupom.service.ts | 100 | 100 | 100 | 100 | sim |
| src/banco/migrar.ts | 100 | 100 | 100 | 100 | sim |
| src/http/erros.ts | 100 | 100 | 100 | 100 | sim |
| src/rotas/pdv.rotas.ts | 100 | 100 | 100 | 100 | sim |
| Demais 17 arquivos de `src/` | 100 | 100 | 100 | 100 | sim |
| **Total** (23 arquivos de teste, 431 testes) | **100** | **100** | **100** | **98,03** (200/204) | sim |

## Lacunas
Nenhum arquivo abaixo da meta. Ramos não cobertos, todos defensivos: `esquemas.ts:20` (`issue.keys ?? []`), `repositorios/vendas.ts:113` (`String(l.telefone ?? '')`, coluna NOT NULL DEFAULT ''), `cupom.ts:52` (`linhas.pop() ?? ''`), `catalogo.ts:111`.

## Qualidade real dos testes (T8)
- Sinais de alerta encontrados: 0 — corrigidos: 0 (11 arquivos de teste alterados/novos revisados; `requireAssertions: true` já ativo)
- Pontos submetidos a mutação: 21, todos detectados
  - Código (19): `telefone.ts` aceitar "+"/ponto (2 falhas), ≥10 dígitos (12), corte errado em `formatarTelefone` (4); `vendas.service.ts` gravar com máscara (7), código `cpf_invalido` (13), `telefone: ''` na resposta (7), telefone antes de `sem_itens` (2), telefone antes da idempotência (4); `esquemas.ts` sem `trim` (2), `max(30)` (2), aceitar `cpf` de novo (3); `repositorios/vendas.ts` INSERT em `cpf` (10), leitura de `l.cpf` (10); `migrar.ts` sem `adicionarColunaTelefone` (2), ALTER sem condição (270); `cupom.service.ts` sem formatar (3); `cupom.ts` "Tel:" antes de "Cliente:" (2), "Tel:" vazia (3); `http/erros.ts` log com corpo (4)
  - Helpers de teste (2, AP-004): `comDado()` sem o dado (8), `vendaReferencia()` sem telefone (4)
- Falsos-positivos detectados e reescritos: 0
- Confirmação: nenhuma mutação permanece aplicada no código — sim (`git status` do back limpo em 2e78243; suíte final 431/431)

## Validação da caracterização (somente refatoração)
- Suíte de caracterização completa sobre o código refatorado: verde (30/30 em `tests/caracterizacao/telefone.caracterizacao.test.ts`; diff do arquivo só nos valores de `DADO_CLIENTE` e um comentário).
- Comparação com a execução original: suíte de 3ee8951 (428) × HEAD 2e78243 (431), teste a teste pelo nome. Saíram 39 (18 de `cpf.test.ts`, removido com o módulo; 21 renomeados CPF → telefone pelo inventário AP-004) e entraram 42 (16 de `telefone.test.ts`, 2 de "corpo com cpf → 400", 3 de migração, os 21 renomeados). Nenhuma asserção removida sem equivalente; ressalva: em `tests/rotas/pdv.test.ts` a conferência "sem dígitos crus" virou "texto sem 'CPF' e `dados` sem `cpfMascarado`" — aceitável, pois com MI-04 o número completo aparece de propósito.
- Invariantes INV-001 a INV-015 verdes. Invariantes alterados intencionalmente: nenhum além de MI-01 a MI-05 (aprovados na Fase 2).

## Problemas encontrados no código
| Problema | Arquivo | Gravidade | Recomendação |
|---|---|---|---|
| `telefoneValido` só confere formato e 11 dígitos ("(00) 00000-0000" passa) | `src/dominio/telefone.ts` | Baixa | Decisão em aberto do Lucas; endurecer exige back e front juntos (feature à parte) |
| Cupom com telefone completo visível a qualquer vendedor logado | `src/rotas/pdv.rotas.ts`, `src/servicos/cupom.service.ts` | Média (privacidade) | Decisão MI-04; restringir ao autor da venda fica em aberto |
| Seed de desenvolvimento do ERP faz INSERT por posição em `vendas` | ERP (só dev) | Baixa | Já no ADR-002 / débito técnico |

## Recomendações gerais
- **Deploy coordenado obrigatório (AP-002):** o front no ar ainda manda `cpf`; com o back novo, toda venda (inclusive o reenvio de venda já gravada) volta 400 "Campo não permitido: cpf.". Ordem:
  - A — `db:migrar`. Depende de: nenhum.
  - B — deploy do back. Depende de: A.
  - C — `gerar:tipos`, etapa 6 e deploy do front (pdv-mobile-refatorado). Depende de: B.
  - D — passo manual do Lucas: recarregar o PDV nos celulares. Depende de: C.
  - B e C seguidos, em horário sem venda.
- Na etapa 6 do front, testar a regra de 11 dígitos, o corpo com `telefone` e a ausência de `cpf`.
- Opcional: no teste do cupom pela rota, conferir que o JSON inteiro não contém os dígitos crus.

## Aprendizados aplicados
AP-004 (auditoria das asserções pelo inventário, comparação teste a teste, mutação dos helpers), AP-002 (dependências "Depende de:" e passo manual D). AP-001 e AP-003 não se aplicam.

## Resultado

<!-- A linha abaixo é lida literalmente pelo hook de deploy. Use exatamente "sim" ou "não", sem outro texto na linha. -->
Pronto para implantação: sim

Condição: só em deploy coordenado com a pdv-mobile-refatorado (etapa 6), na ordem A → B → C → D.

## Aprovação
- Aprovado por: Lucas ("pode gravar e retornar ao front")
- Data/hora: 2026-10-06 01:10
