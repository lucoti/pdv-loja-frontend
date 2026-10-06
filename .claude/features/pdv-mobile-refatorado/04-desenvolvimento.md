# 04 — Desenvolvimento: PDV Loja — Front-end mobile refatorado (design Nocturne)

<!-- Não registre código aqui: o código vive no repositório. Registre apenas decisões e fatos relevantes. -->

## Testes de caracterização (somente modo refatoração)
- Suíte: Vitest 5.0.2 + Testing Library + MSW (já existente); cobertura v8 com thresholds por arquivo 85/85/85/80 (mantidos). Rodar com Node 22 (`PATH=/usr/local/bin:$PATH`): o Node 20 do PATH padrão desta máquina não sobe o Vitest 5 (`engines` pede >=22.12 <23).
- Executado por: subagente `fluxo-testador`, modo `caracterizacao`, em 2026-10-05. Conferido pelo orquestrador: `git status` (só `tests/telas/ajuda.tsx` alterado e `tests/telas/pdv.mobile.caracterizacao.test.tsx` criado; `src/` só com os comentários do D1) e suíte rodada de novo.
- Resultado sobre o código ATUAL antes de qualquer alteração: **verde** — 14 arquivos, 223 passed + 1 expected fail (224; antes eram 207). Cobertura de todos os módulos do PDV ≥ meta.
- Arquivos: CRIADO `tests/telas/pdv.mobile.caracterizacao.test.tsx` (17 testes); ALTERADO `tests/telas/ajuda.tsx` só com acréscimos (helpers `esperarVendaRegistrada`, `comecarNovaVenda`, `cancelarPedido`, `informarCliente`, `aumentarDescontoNoPedido`, `escolherPagamento`, `esperarErroAoFechar`, `esperarTelaDeLogin`, todos com `waitFor` e sem devolver elemento — AP-004). Lista dos campos do `POST /vendas` centralizada em `CAMPOS_VENDA` (ponto único da troca `cpf` → `telefone`).
- Invariantes cobertos: INV-001, INV-002, INV-010 a INV-019 (existentes + novos; tabela no relatório do testador, resumida abaixo). INV-020 e INV-021 não se aplicam (bugs preservados).
  - Novos: INV-001 (campos exatos, `descPercent` 0, sem preço), INV-002 (rotas de leitura), INV-010 (401 no fechamento), INV-011 (3 pedidos, 7 tentativas), INV-013 (a/b/c/d), INV-014 (5 códigos de erro), INV-018 (carregando e em falha), INV-019 (espiões de Storage).
  - Só existentes (sem lacuna): INV-012, INV-015, INV-016, INV-017.
- **Achado INV-013 (registrado, não corrigido nesta etapa):** dois toques nativos em "Fechar venda" no mesmo `act`, sem redesenho, geram **2 `POST /vendas`** com a mesma chave; o servidor grava 1 venda (idempotência), mas a requisição e a recarga do catálogo saem em dobro. Causa: a trava lê `enviando` do estado. Teste (a) marcado `it.fails`; será corrigido pelo **ADR-006** (trava em `useRef`) e o `.fails` sai na mesma etapa.
- T8 da caracterização: 4 sinais de alerta (3 corrigidos, 1 intencional documentado); 15 mutações no código + 3 helpers (+4 combinações); 2 falsos-positivos reescritos. Sobreviventes explicados: tirar só o `disabled` (a trava em `fechar` segura) e helpers vazios isolados (falham combinados com a quebra do comportamento).

## Arquivos criados ou alterados
| Arquivo | Camada | Criado / alterado |
|---|---|---|
| `tests/telas/pdv.mobile.caracterizacao.test.tsx` | Teste | Criado (etapa 0) |
| `tests/telas/ajuda.tsx` | Teste (helpers) | Alterado — só acréscimos (etapa 0) |
| `src/estilos/tokens.css` | Estilo | Alterado — tokens Nocturne + extensões do PDV (`--color-danger*`, `--color-veu`) (etapa 1) |
| `src/estilos/global.css`, `src/telas/comum.module.css`, `src/telas/Login/Login.module.css`, `src/telas/Pdv/Pdv.module.css` | Estilo | Alterados — só troca de tokens/cores fixas (etapa 1) |
| `src/main.tsx`, `index.html`, `package.json`/`package-lock.json` | Config/entrada | Alterados — Inter + Phosphor no lugar de Libre Franklin; `theme-color` #161826 (etapa 1) |
| `src/telas/Pdv/Variacoes.tsx` | Front | Alterado — cor inline de amostra sem hex para token (etapa 1) |
| `src/telas/Pdv/*.tsx`, `src/dominio/carrinho.ts`, `src/dominio/precos.ts`, `src/api/cliente.ts` | Front | Alterados — só comentários (D1 as-is, Fase 3) |

## Log de decisões não previstas na arquitetura
| Data | Decisão | Motivo | Impacto |
|---|---|---|---|
| 2026-10-05 | Erro/alerta com tokens próprios do PDV (`--color-danger`, `--color-danger-bg`, `--color-danger-line`) e `--color-veu` para o fundo de janelas | O Nocturne não tem cor de erro nem véu | Cores novas só em `tokens.css` |
| 2026-10-05 | Inter também no peso 700 | O CSS atual usa 700 em vários textos; o design usa até 600, e os pesos são revistos nas etapas 2-5 | Um arquivo de fonte a mais |
| 2026-10-05 | `.claude/launch.json` local usa `/usr/local/bin/npm` (Node 22) | Node 20 do PATH padrão não sobe o Vite/rolldown | Só ambiente local |
| 2026-10-05 | Testes de caracterização em arquivo novo (`pdv.mobile.caracterizacao.test.tsx`) | `pdv.caracterizacao.test.tsx` já usa IDs INV-0xx da feature anterior com outro significado | Nenhum |

## Mudanças de escopo
Nenhuma.

## Débito técnico
| Item | Motivo | Sugestão de tratamento |
|---|---|---|
| Node 20 no PATH padrão da máquina; testes exigem Node 22 | Ambiente local | Documentar no README do front (`engines` já declara) |

## Execuções da suíte de caracterização por etapa (somente refatoração)
| Etapa da migração | Resultado | Observação |
|---|---|---|
| 0 — caracterização sobre o código atual | verde (223 + 1 expected fail) | `it.fails` do INV-013 (a) até a etapa do ADR-006 |
| 1 — tema Nocturne | verde (223 + 1 expected fail); `typecheck` ok | Conferido no navegador a 375px (Login e Produtos no tema escuro); nenhuma cor fixa fora de `tokens.css` |

## Documentação (D1-D3)
- [ ] D1 — código-fonte comentado
- [ ] D2 — documentação executiva em `docs/vN/documentacao.md` (versão <N>)
- [ ] D3 — `docs/contexto-geral.md` atualizado

(As-is já feito na Fase 3: `docs/v8/documentacao.md`. O to-be roda depois do Desenvolvimento.)

## Exceções
Nenhuma.

## Pronto para documentação e testes
não — etapa 1 concluída; próxima: etapa 2 (topo por tela e barra de abas).
