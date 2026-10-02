# 05 — Testes: PDV Loja — Login com senha de 8 números e entrada automática

## Suíte e cobertura
- Suíte: Vitest 5.0.2 nos dois repositórios — já existia. Rodar com Node 22 (`PATH=/usr/local/bin:$PATH`).
- Provider de coverage: v8 (`@vitest/coverage-v8`) — thresholds por arquivo: lines/functions/statements 85, branches 80 (já configurados, não alterados).
- Execução final: **backend 22 arquivos, 398/398 verdes; frontend 11 arquivos, 184/184 verdes; `tsc --noEmit` limpo nos dois.** "socket hang up" (INV-022) não ocorreu.

## Fontes usadas (T0)
- `backend/docs/v6/documentacao.md`, `frontend/docs/v5/documentacao.md`, `frontend/docs/contexto-geral.md`, `backend/contrato/openapi.yaml`; artefatos 01 a 04 da feature.

## Pontos de entrada testados (T2)
| Ponto de entrada | Tipo | Situação anterior (completo / incompleto / sem testes) | Ação |
|---|---|---|---|
| `POST /api/auth/login` (back) | HTTP | completo | +1 teste de paridade contrato × `esquemaLogin` × `pinValido` (`tests/contrato/openapi.test.ts`) |
| `npm run pin:trocar` (back) | script | completo (processo real em pseudo-TTY) | +17 testes unitários de `TAMANHO_PIN`/`pinValido` (`tests/esquemas.test.ts`) |
| Tela de login (front) | tela | incompleto no envio automático | 1 teste reescrito ("toques mais rápidos…"), +2 novos (`tests/telas/login.test.tsx`) |
| Simulado `POST */api/auth/login` (front) | HTTP simulado | incompleto nas âncoras da regex | +1 teste de paridade com o contrato (`tests/simulado/contrato.test.ts`) |
| Seed do back | script | completo | mantido |

## Cobertura final por arquivo
| Arquivo | Lines | Functions | Statements | Branches | Meta atingida? |
|---|---|---|---|---|---|
| `backend/src/esquemas.ts` | 100 | 100 | 100 | 83,33 | sim |
| `backend/src/banco/seed.ts` | 100 | 100 | 100 | 100 | sim |
| `backend/src/servicos/auth.service.ts` | 100 | 100 | 100 | 100 | sim |
| `backend/src/rotas/auth.rotas.ts` | 100 | 100 | 100 | 100 | sim |
| `backend/src/repositorios/vendedores.ts` | 100 | 100 | 100 | 100 | sim |
| `backend/src/scripts/trocar-pin.ts` | — | — | — | — | fora da medição pela config existente (`src/scripts/**`); testado como processo real |
| `frontend/src/telas/Login/Login.tsx` | 100 | 100 | 100 | 96,66 | sim |
| `frontend/src/telas/Login/TecladoPin.tsx` | 100 | 100 | 100 | 100 | sim |
| `frontend/src/simulado/handlers.ts` | 100 | 100 | 100 | 100 | sim |
| `frontend/src/simulado/dados.ts` | 100 | 100 | 100 | 100 | sim |
| `frontend/src/api/tipos.gerados.ts` | — | — | — | — | fora da medição pela config existente (arquivo gerado) |

Totais (lines / functions / statements / branches): backend 100 / 100 / 100 / 98,52; frontend 100 / 99,43 / 99,38 / 97,83.

## Lacunas
Nenhum arquivo abaixo da meta. Único ramo não coberto em `Login.tsx`: lista de vendedores vazia (`vendedores[0] ?? null`).

## Qualidade real dos testes (T8)
- Sinais de alerta encontrados: 1 — corrigidos: 1. O teste "toques mais rápidos que o redesenho da tela…" (escrito na Fase 4) não detectava o defeito para o qual foi criado: com `fireEvent`, a tela é redesenhada a cada toque. Reescrito com cliques nativos em sequência dentro de um único `act` (helper `tocarSemRedesenhar`).
- Pontos submetidos a mutação: 29 (11 no back, 18 no front).
- Falsos-positivos detectados e reescritos: 1 (acima), mais lacunas fechadas com teste novo: trava contra segundo pedido (`travado.current` em `digitar` e `apagar`), leitura da senha pelo ref (`pinAtual`), âncoras da regex do simulado, paridade do `pattern` do contrato no lado do back.
- Mutações sobreviventes ao final: 0.
- Confirmação: nenhuma mutação permanece aplicada no código — sim (`diff -r` de `backend/src`, `frontend/src` e do `openapi.yaml` contra a cópia inicial: idênticos).

## Validação da caracterização (somente refatoração)
- Suíte de caracterização completa sobre o código refatorado: verde (`backend/tests/rotas/login.caracterizacao.test.ts`, 13 testes; `frontend/tests/telas/login.caracterizacao.test.tsx`, 9 testes).
- Comparação com a execução original (código antigo: back 380, front 180, verde): o corpo dos dois arquivos está intacto desde antes da refatoração; só mudaram os pontos únicos previstos — `PIN_CARLOS` (`backend/tests/apoio.ts`) e `PIN_CERTO`/`enviarPin`/`toqueRapidoExtra` (`frontend/tests/telas/ajuda.tsx`). INV-001 a INV-006, INV-010 a INV-019 e INV-020-A continuam cobertos e verdes.
- Invariantes alterados intencionalmente: nenhum. As mudanças de comportamento são só as MUD-01 a MUD-06 aprovadas em `02-requisitos.md`.

### Mudanças intencionais → teste
| Mudança | Teste que comprova |
|---|---|
| MUD-01 (8 números) | back: `esquemas.test`, `auth.test`, `trocar-pin.test`, `openapi.test`; front: `login.test` (instrução e "N de 8"), `contrato.test` |
| MUD-02 (sem botão; 8º número dispara) | front `login.test`: 'não há botão "Entrar no PDV"…' |
| MUD-03 (teclado e "Trocar vendedor" travados) | front `login.test`: "enquanto valida…" e "toques mais rápidos…" |
| MUD-04 (qualquer erro limpa) | front `login.test`: "falha de rede no login limpa o PIN…" e "erro não-ErroApi…" |
| MUD-05 (exemplo `12345678`) | back `banco.test`, `trocar-pin.test`; front `contrato.test`, `cliente.test` |
| MUD-06 (senhas de 4 deixam de valer) | consequência do MUD-01 (senha de 4 → 400); decisão operacional, sem teste próprio |

## Problemas encontrados no código
| Problema | Arquivo | Gravidade | Recomendação |
|---|---|---|---|
| 400 do login no simulado diverge do back (mensagem e campos extras) | `frontend/src/simulado/handlers.ts` | baixa (pré-existente; a tela nunca chega ao 400) | alinhar numa manutenção futura |
| Sem limite de tentativas de senha (INV-020) | `backend/src/rotas/auth.rotas.ts` | risco aceito | feature futura |
| INV-021 (`pin:trocar`: buffer após Enter, eco antes do modo raw) e INV-022 ("socket hang up" intermitente) | back | baixa, preservados | feature futura |

Nenhum defeito novo no código refatorado.

## Recomendações gerais
- Em testes de tela com toques rápidos, usar o padrão `tocarSemRedesenhar` (cliques nativos num único `act`): `fireEvent`/`userEvent` redesenham a cada toque e escondem leitura de estado defasado. Candidato a lição em `.claude/aprendizados.md`.
- Rodar os testes sempre com Node 22.

## Aprendizados aplicados
nenhum (`.claude/aprendizados.md` ainda não existe).

## Resultado

<!-- A linha abaixo é lida literalmente pelo hook de deploy. Use exatamente "sim" ou "não", sem outro texto na linha. -->
Pronto para implantação: sim

## Aprovação
- Aprovado por: Lucas
- Data/hora: 2026-10-01 22:26
