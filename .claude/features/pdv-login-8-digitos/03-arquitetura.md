# 03 — Arquitetura (refatoração): PDV Loja — Login com senha de 8 números e entrada automática

## As-is (estado atual)
- Documentação gerada (D1-D3): `backend/docs/v5/documentacao.md` (versão 5) e `frontend/docs/v4/documentacao.md` (versão 4); `frontend/docs/contexto-geral.md` atualizado (a raiz `docs/contexto-geral.md` é link para ele).
- Resumo da estrutura atual:
  - **Front:** `Login.tsx` carrega config e vendedores; `Etapas` guarda `vendedor`, `pin`, `erro`, `enviando`; `TAMANHO_PIN = 4`; `TecladoPin.tsx` (1–9, 0, "apagar", sem `<input>`); `api.login` em `cliente.ts`. Simulado: `POST */api/auth/login` em `handlers.ts`, `PINS = { carlos: '1234' }` em `dados.ts`.
  - **Back:** `esquemaLogin` (objeto estrito, `pin` texto `^\d{4}$`), rota `POST /login`, `servicoAuth.login` (bcrypt + `HASH_FALSO`), `repositorioVendedores.buscarAtivoComPin`, sessões com SHA-256 do token e validade até a meia-noite local.
  - **Operação:** `npm run pin:trocar -- <vendedorId>` (lê sem eco duas vezes, exige `^\d{4}$`, recusa `1234`, troca o hash e apaga as sessões do vendedor num batch); `seed.ts` (vendedor `carlos`, pin `1234`, `INSERT OR IGNORE`).
  - **Fluxo:** escolha do vendedor (omitida se houver um só) → 4 números → botão "Entrar no PDV" → `POST /auth/login` → 400 `entrada_invalida` / 401 `senha_incorreta` / 200 com cookie `pdv_sessao`. Na tela, 401 limpa o PIN; falha de rede mantém o PIN.

### Problemas do estado atual
| Problema | Onde | Impacto |
|---|---|---|
| Tamanho da senha sem fonte única | `esquemas.ts`, `openapi.yaml`, `trocar-pin.ts`, `Login.tsx` (constante e texto fixo), `handlers.ts`, `dados.ts`, `seed.ts`, testes, READMEs | Mudar o tamanho exige tocar em vários pontos; divergência grava senha que a API recusa |
| Teclado não trava durante a validação | `Login.tsx` / `TecladoPin.tsx` | Inofensivo hoje; com envio automático é o que garante um único pedido (INV-015) |
| `HASH_FALSO` é hash de `0000` | `auth.service.ts` | Só coerência com o tamanho novo (INV-020-A) |
| Seed com `INSERT OR IGNORE` | `seed.ts` | Trocar a senha de exemplo não altera banco local já semeado |
| Simulado diverge do back no 400 do login | `handlers.ts` ("A senha deve ter 4 números.", aceita campos extras) | Caracterização do INV-004 deve ser feita no back, não no simulado |
| Comentários desatualizados | `repositorios/vendedores.ts` ("por SQL/seed"), `auth.rotas.ts` ("10.000 PINs possíveis") | Só documentação; ajustar no to-be |

## Conformidade com o CLAUDE.md
Não há `CLAUDE.md` no projeto. Seguem-se as convenções do código existente (pt-BR, comentários por bloco, zod no back, CSS modules no front) — sem contradições.

## To-be (estado proposto)
| Onde | O que muda |
|---|---|
| Back, `src/esquemas.ts` | Exporta `TAMANHO_PIN = 8`; a regex e a mensagem "Digite a senha de 8 números." derivam dela. |
| Back, `src/scripts/trocar-pin.ts` | Usa `TAMANHO_PIN`; prompt e mensagem com 8 números; `PIN_DE_EXEMPLO` = `12345678`. |
| Back, `src/servicos/auth.service.ts` | `HASH_FALSO` = hash de `00000000`. |
| Back, `src/banco/seed.ts` | Senha de exemplo `12345678`. |
| Back, `contrato/openapi.yaml` | `pattern: '^\d{8}$'`, `example: '12345678'`. |
| Back, comentários, README e testes | Ajustados para 8 números. |
| Front, `src/telas/Login/Login.tsx` | `TAMANHO_PIN = 8`, usado também no texto "Digite sua senha de 8 números"; o 8º número chama o login; botão "Entrar no PDV" removido; qualquer erro limpa os números. |
| Front, `src/telas/Login/TecladoPin.tsx` | Nova propriedade `desabilitado`: trava números e "apagar" enquanto valida. |
| Front, `src/telas/Login/Login.module.css` | Remove o estilo `.entrar` se ficar sem uso. |
| Front, `src/simulado/handlers.ts` e `dados.ts` | Regex e mensagem com 8 números; senha de exemplo `12345678`. |
| Front, `src/api/tipos.gerados.ts` | Regenerado com `npm run gerar:tipos`. |
| Front, README, testes e `docs/contexto-geral.md` | Ajustados para 8 números. |

Nada muda em banco, sessão, cookie, escolha do vendedor, tela de venda nem nas demais rotas.

## Estratégia de migração
- **Estratégia escolhida:** big bang coordenado.
- **Justificativa:** front e back precisam concordar no tamanho da senha; o Lucas decidiu que não há convivência entre 4 e 8 números (MUD-06). Incremental/feature flag exigiria aceitar os dois tamanhos, o que está fora do escopo.

### Etapas
| Etapa | O que muda | Invariantes em risco | Rollback |
|---|---|---|---|
| 1 | Testes de caracterização sobre o código atual, verdes | nenhum | nada a desfazer |
| 2 | Back: validação, contrato, script, seed, hash falso, comentários e testes | INV-001 a INV-006, INV-019, INV-020-A | `git revert`/descartar no repositório do back |
| 3 | Front: tipos gerados, simulado, tela, teclado e testes | INV-010 a INV-018 | `git revert`/descartar no repositório do front |
| 4 | Documentação to-be (D1-D3) e validação final (Fase 5) | — | — |
| 5 | Deploy (Fase 6): back → `pin:trocar` de cada vendedor → front | todos | redeploy da versão anterior dos dois projetos na Vercel; senhas voltam a 4 números com o script antigo |

## Cobertura dos invariantes
| Invariante | Teste de caracterização previsto |
|---|---|
| INV-001 | `backend/tests/esquemas.test.ts` e `tests/rotas/auth.test.ts`: corpo `{ vendedorId, pin }`, pin texto com zero à esquerda, objeto estrito; `frontend/tests/telas/login.test.tsx`: corpo enviado segue o contrato |
| INV-002 | `backend/tests/rotas/auth.test.ts`: 200 com `{ vendedor, expiraEm }` e atributos do cookie |
| INV-003 | `backend/tests/rotas/auth.test.ts`: errado/inexistente/inativo com a mesma resposta 401 |
| INV-004 | `backend/tests/rotas/auth.test.ts` e `esquemas.test.ts`: 400 e mensagens de vendedor/campo extra |
| INV-005 | Suítes existentes de sessão, logout, pdv e públicas, sem alteração |
| INV-006 | `backend/tests/banco/banco.test.ts` e `tests/contrato/openapi.test.ts` |
| INV-010 a INV-014, INV-016, INV-017 | `frontend/tests/telas/login.test.tsx` (RF-F01, RF-F02) |
| INV-015 | `frontend/tests/telas/login.test.tsx`: contagem de requisições de login |
| INV-018 | `frontend/tests/telas/login.test.tsx` (RF-F03) |
| INV-019 | `backend/tests/scripts/trocar-pin.test.ts` |
| INV-020-A | `backend/tests/servicos/auth.service.test.ts` |

Os testes que cobrem tamanho 4, botão "Entrar no PDV" e falha de rede mantendo o PIN retratam comportamento que muda (MUD-01 a MUD-05); são reescritos na etapa correspondente, com a mudança registrada em `04-desenvolvimento.md`.

## Decisões (ADRs)

### ADR-001 — Disparo do login no 8º número
- **Contexto:** sem botão, o login precisa sair da digitação; o estado `enviando` do React é lido em closure e dois toques no mesmo ciclo poderiam gerar dois pedidos.
- **Decisão:** `digitar` calcula o novo PIN e, ao completar `TAMANHO_PIN`, chama o login. Uma trava imediata (`useRef`) impede o segundo pedido, e o teclado recebe `desabilitado` enquanto valida.
- **Consequências:** INV-015 passa a depender da trava e do teclado travado (coberto por teste); "apagar" não responde durante a validação (MUD-03).

### ADR-002 — Uma constante de tamanho por repositório
- **Contexto:** back e front são repositórios independentes, sem pacote compartilhado.
- **Decisão:** cada um tem a sua `TAMANHO_PIN`; o contrato OpenAPI é o elo, e os testes de contrato dos dois lados pegam divergência.
- **Consequências:** mudança futura de tamanho toca 3 pontos (back, contrato, front) em vez de 7+.

### ADR-003 — Nomes preservados e sem migração de banco
- **Contexto:** a senha deixa de ser um "PIN de 4", mas o campo `pin`, a coluna `pin_hash` e o comando `pin:trocar` são contrato/operacional.
- **Decisão:** nenhum nome muda; bcrypt aceita qualquer tamanho, então não há migração.
- **Consequências:** INV-001 e INV-006 preservados; hashes antigos simplesmente deixam de casar com qualquer entrada válida.

### ADR-004 — Sem indicador novo de "validando"
- **Contexto:** o handoff não desenha estado de carregamento no login e o Lucas não quer extras.
- **Decisão:** durante a validação os 8 marcadores ficam preenchidos e o teclado travado; nenhum elemento novo.
- **Consequências:** em rede lenta o vendedor vê a tela parada por instantes; aceito.

## Riscos técnicos
| Risco | Impacto | Mitigação |
|---|---|---|
| Janela do deploy (back novo, front antigo) | Nenhum login novo funciona nesse intervalo; sessões abertas seguem | Deploy com a loja fechada, back e front em sequência |
| Rollback depois de trocar as senhas | Senhas de 8 números não servem no código antigo | Rollback inclui recadastrar senhas de 4 com o script antigo; registrado no checklist |
| Banco local com a senha `1234` | Dev local não entra com `12345678` | Recriar o banco local ou rodar `pin:trocar`; registrar no README |
| Login duplicado no envio automático | Duas sessões criadas | ADR-001 + teste de INV-015 |

## Aprendizados aplicados
nenhum (`.claude/aprendizados.md` ainda não existe).

## Aprovação
- Aprovado por: Lucas
- Data/hora: 2026-10-01 21:38
