# 04 — Desenvolvimento: PDV Loja — Login com senha de 8 números e entrada automática

<!-- Não registre código aqui: o código vive no repositório. Registre apenas decisões e fatos relevantes. -->

## Testes de caracterização (somente modo refatoração)
- Suíte: Vitest 5 nos dois repositórios (já existia; cobertura v8 com thresholds por arquivo 85/80, não alterados). Rodar com Node 22 (`PATH=/usr/local/bin:$PATH`): o `node` padrão da máquina é o 20 e o Vitest 5 não inicia nele.
- Resultado sobre o código ATUAL antes de qualquer alteração: verde — backend 380 testes (367 existentes + 13 novos), frontend 180 (171 + 9).
- Arquivos novos: `backend/tests/rotas/login.caracterizacao.test.ts` e `frontend/tests/telas/login.caracterizacao.test.tsx`; helpers em `frontend/tests/telas/ajuda.tsx`.
- Invariantes cobertos: INV-001 a INV-006, INV-010 a INV-019 e INV-020-A (tabela completa no relatório do `fluxo-testador`, consolidada em `05-testes.md`).
- T8 na caracterização: 11 mutações, 2 falsos-positivos da suíte antiga cobertos pelos testes novos (caminho do bcrypt para vendedor inexistente; "toque duplo" que passava sem nenhuma trava).

## Arquivos criados ou alterados
| Arquivo | Camada | Criado / alterado |
|---|---|---|
| `backend/src/esquemas.ts` | validação | alterado — `TAMANHO_PIN = 8`, `pinValido`, mensagem derivada |
| `backend/src/scripts/trocar-pin.ts` | script | alterado — usa `TAMANHO_PIN`/`pinValido`; exemplo recusado `12345678` |
| `backend/src/servicos/auth.service.ts` | serviço | alterado — `HASH_FALSO` de 8 números |
| `backend/src/banco/seed.ts` | banco | alterado — senha de exemplo `12345678` |
| `backend/src/rotas/auth.rotas.ts`, `src/repositorios/vendedores.ts` | rota / repositório | alterados — só comentários |
| `backend/contrato/openapi.yaml` | contrato | alterado — `^\d{8}$`, exemplo `12345678` |
| `backend/README.md` | docs | alterado |
| `backend/tests/**` (apoio + 10 arquivos) | testes | alterados — senhas e mensagens de 8 números |
| `backend/tests/rotas/login.caracterizacao.test.ts` | testes | criado |
| `frontend/src/telas/Login/Login.tsx` | tela | alterado — 8 números, envio no 8º, sem botão, qualquer erro limpa |
| `frontend/src/telas/Login/TecladoPin.tsx` | tela | alterado — propriedade `desabilitado` |
| `frontend/src/telas/Login/Login.module.css` | estilo | alterado — removido `.entrar` |
| `frontend/src/simulado/handlers.ts`, `dados.ts` | simulado | alterados — 8 números, `12345678` |
| `frontend/src/api/tipos.gerados.ts` | tipos | regenerado (`npm run gerar:tipos`) |
| `frontend/README.md` | docs | alterado |
| `frontend/tests/telas/login.test.tsx`, `pdv.test.tsx`, `ajuda.tsx`, `tests/simulado/contrato.test.ts`, `tests/api/cliente.test.ts` | testes | alterados |
| `frontend/tests/telas/login.caracterizacao.test.tsx` | testes | criado |
| `backend/docs/v5/`, `frontend/docs/v4/`, `frontend/docs/contexto-geral.md` | docs as-is | criados/alterado na Fase 3 |

## Log de decisões não previstas na arquitetura
| Data | Decisão | Motivo | Impacto |
|---|---|---|---|
| 2026-10-01 | A senha digitada vive num `useRef` (`pinAtual`), espelhada no estado só para desenhar os marcadores. | Na verificação no navegador, toques mais rápidos que o redesenho da tela perdiam números: o envio automático lia a senha do estado, que ainda não tinha sido atualizado. | Complementa o ADR-001; coberto por teste novo ("toques mais rápidos que o redesenho…"). |
| 2026-10-01 | "Trocar vendedor" também fica travado enquanto a senha é validada. | Evita voltar à lista e, em seguida, o login em andamento abrir a venda de quem já não estava selecionado. | Extensão do MUD-03; coberto por teste. |
| 2026-10-01 | O back exporta `pinValido` além de `TAMANHO_PIN`. | `trocar-pin.ts` passa a usar exatamente a mesma regra do login (antes era regex duplicada). | Resolve o problema "regra duplicada" do as-is. |
| 2026-10-01 | O teste antigo 'toque duplo em "Entrar" envia um único login' foi removido, não adaptado. | Era falso-positivo (T8 da caracterização) e dependia do botão. | INV-015 fica com os testes de `login.caracterizacao.test.tsx` e com o teste novo de toques rápidos. |
| 2026-10-01 | A mensagem do 400 do simulado continua diferente da do back ("A senha deve ter 8 números."). | Divergência pré-existente; a tela nunca chega ao 400. Fora de escopo. | Nenhum. |

## Mudanças de escopo
nenhuma.

## Débito técnico
| Item | Motivo | Sugestão de tratamento |
|---|---|---|
| Banco local já semeado continua com a senha `1234` | Seed usa `INSERT OR IGNORE` | Documentado no README do back: apagar `./dados/pdv.db` e semear de novo, ou `pin:trocar` |
| Simulado diverge do back no 400 do login | Pré-existente | Alinhar numa manutenção futura |
| `node` padrão da máquina é o 20; o projeto exige 22 | Ambiente | Ajustar o PATH do terminal ou usar nvm |
| Bugs preservados INV-020, INV-021, INV-022 | Fora de escopo | Features futuras |

## Execuções da suíte de caracterização por etapa (somente refatoração)
| Etapa da migração | Resultado | Observação |
|---|---|---|
| 1 — caracterização sobre o código atual | verde (back 380, front 180) | antes de qualquer alteração de `src/` |
| 2 — back | verde (380/380) | caracterização passou só com a troca de `PIN_CARLOS` em `tests/apoio.ts`; nenhum invariante quebrado. Testes de MUD-01/05 reescritos (literais e mensagens). |
| 3 — front | verde (181/181) | caracterização passou só com o ajuste dos 3 helpers de `ajuda.tsx` (`PIN_CERTO`, `enviarPin`, `toqueRapidoExtra`); nenhum invariante quebrado. Testes de MUD-01 a MUD-04 reescritos; +2 testes novos (teclado travado; toques rápidos). |

Verificação manual no navegador (front com API simulada, 375×812): 8 marcadores, sem botão; senha errada limpa e mostra o erro; senha certa abre a venda no 8º número; toques simultâneos não perdem números. `tsc` limpo nos dois; `npm run build` do front ok.

## Documentação (D1-D3)
- [x] As-is (Fase 3): `backend/docs/v5`, `frontend/docs/v4`, contexto geral
- [x] D1 — código-fonte comentado (to-be): 10 arquivos revisados, 6 complementados; diff só de comentários, suítes verdes (back 380, front 181)
- [x] D2 — documentação executiva to-be: `backend/docs/v6/documentacao.md` e `frontend/docs/v5/documentacao.md`
- [x] D3 — `frontend/docs/contexto-geral.md` atualizado (a raiz `docs/contexto-geral.md` é link para ele)

Observação do documentador: os docs registram a situação "desenvolvida; validação final e publicação pendentes" — ajustar depois do deploy. O contexto geral ainda registra back v4 e front v3 (integração com o ERP) como não publicados; conferir na Fase 6.

## Exceções
nenhuma.

## Pronto para documentação e testes
sim — 2026-10-01 21:55, confirmado pelo Lucas.
