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
| `src/telas/Pdv/Produtos.tsx`, `Variacoes.tsx`, `Dia.tsx`, `Pdv.tsx`, `Pdv.module.css`, `comum.module.css` | Front | Alterados — layout novo de Produtos, Cor e tamanho e Dia; adicionar fica em cor/tamanho (etapa 3) |
| `tests/telas/ajuda.tsx`, `pdv.test.tsx`, `pdv.caracterizacao.test.tsx`, `pdv.ajustes.test.tsx` | Teste | Alterados — inventário AP-004 da etapa 3 + guardas AP-003 (grade de tipos, cartões do dia, saldo que quebra) |
| `src/telas/Pdv/Cabecalho.tsx` | Front | Alterado — topo por tela (título h1, apoio, voltar, complemento); etapa no `aria-label` (etapa 2) |
| `src/telas/Pdv/BarraInferior.tsx` | Front | Alterado — abas com ícone Phosphor e marca da aba ativa (etapa 2) |
| `src/telas/Pdv/Pdv.tsx`, `Pedido.tsx`, `Dia.tsx`, `Variacoes.tsx` | Front | Alterados — títulos, voltar e "Cancelar pedido" passam para o topo (etapa 2) |
| `tests/telas/ajuda.tsx`, `pdv.test.tsx`, `pdv.ajustes.test.tsx`, `pdv.caracterizacao.test.tsx` | Teste | Alterados — sinal do topo (inventário AP-004 da etapa 2) |
| `src/telas/Pdv/*.tsx`, `src/dominio/carrinho.ts`, `src/dominio/precos.ts`, `src/api/cliente.ts` | Front | Alterados — só comentários (D1 as-is, Fase 3) |

## Log de decisões não previstas na arquitetura
| Data | Decisão | Motivo | Impacto |
|---|---|---|---|
| 2026-10-05 | Linha do produto mostra o nome sem o prefixo do tipo (`nomeNaLista`) | O design mostra só o tecido; no ERP o nome é "tipo + tecido". Mostrar só `tecidoNome` deixaria iguais dois produtos do mesmo tipo e tecido (ex.: no simulado, Bermuda Ciclista e Short Curto são Suplex) | Nome que não começa pelo tipo aparece inteiro |
| 2026-10-05 | Título do grupo de tipo não fica preso ao rolar | No design há um único grupo (o do tipo escolhido) e a página rola inteira, com o topo preso; prender o título exigiria compensar a altura do topo | Visual igual ao design com a lista curta |
| 2026-10-05 | Tamanhos continuam aparecendo só depois da cor (o design mostra "—" desabilitado antes) | Preserva INV-012 da feature anterior ("sem cor não há bloco TAMANHO") e o comportamento atual | Nenhum |
| 2026-10-05 | Preço na linha de apoio: do SKU escolhido; antes, o do produto, com "a partir de" se os SKUs tiverem preços diferentes | O design mostra um preço fixo por produto; no ERP o preço é por SKU | Não promete preço que o tamanho não tem |
| 2026-10-05 | Saldo do tamanho pode quebrar em 2 linhas e o botão tem altura mínima (não fixa) | Conferência a 320px: "estoque 12" mede ~66px e a coluna tem ~62px úteis | Guarda no teste MUD-02 |
| 2026-10-05 | O componente do topo continua em `Cabecalho.tsx` (com props novas), em vez de um `Topo.tsx` novo | `nomeEtapa` é importado pelos testes desse arquivo; renomear só aumentaria a troca | Nenhum |
| 2026-10-05 | A etapa vira o nome acessível do `<header>` (`aria-label`) e o título visível segue o design | O texto visível muda por tela ("Vendas de hoje", nome do produto); o sinal dos testes precisa ser estável | Helper `topoDoPdv` passa a `queryByRole('banner', { name })` |
| 2026-10-05 | Erro/alerta com tokens próprios do PDV (`--color-danger`, `--color-danger-bg`, `--color-danger-line`) e `--color-veu` para o fundo de janelas | O Nocturne não tem cor de erro nem véu | Cores novas só em `tokens.css` |
| 2026-10-05 | Inter também no peso 700 | O CSS atual usa 700 em vários textos; o design usa até 600, e os pesos são revistos nas etapas 2-5 | Um arquivo de fonte a mais |
| 2026-10-05 | `.claude/launch.json` local usa `/usr/local/bin/npm` (Node 22) | Node 20 do PATH padrão não sobe o Vite/rolldown | Só ambiente local |
| 2026-10-05 | Testes de caracterização em arquivo novo (`pdv.mobile.caracterizacao.test.tsx`) | `pdv.caracterizacao.test.tsx` já usa IDs INV-0xx da feature anterior com outro significado | Nenhum |

## Inventário AP-004 — etapa 2 (sinal do topo)
Busca por `banner`, `topoDoPdv`, `nomeEtapa`, `'Novo pedido'`, `heading` nos testes antes da troca. Testes em que o sinal carregava informação além de "o PDV abriu" e a asserção equivalente adotada:

| Teste | O que o sinal antigo conferia | Asserção equivalente |
|---|---|---|
| `ajuda.tsx` `topoDoPdv`/`esperarPdv` (≈26 usos) | PDV aberto e etapa (texto em `header div`) | `queryByRole('banner', { name: ETAPAS })` dentro de `waitFor`, sem devolver elemento |
| `ajuda.tsx` `adicionarPeca` e 5 testes com `heading 'Novo pedido'` (pdv.test 304, 919; caracterizacao 331) | Tela do Pedido aberta | `heading 'Pedido'` (h1 do topo) |
| pdv.test "RF-F04 — mostra só a etapa" | Etapa em cada aba e na cor/tamanho; ausência de vendedor/data/número | Etapa pelo `aria-label`; **acrescentado** o título visível ("Produtos", "Vendas de hoje"); ausências mantidas |
| pdv.test "catálogo em falha, topo pela aba" e pdv.ajustes MUD-03 "carregando" | Etapa por aba sem catálogo | Etapa pelo `aria-label` (`etapaNoTopo`) |
| pdv.test "catálogo carregando… aba Pedido não mostra o carrinho" | Carrinho ausente durante a carga (pelo h1 "Novo pedido") | `queryByTestId('totais')` ausente e depois presente |
| pdv.ajustes "etapa é texto simples, não título" | Topo sem heading; único h1 = produto | **Invariante alterado (MI-09):** h1 do produto agora dentro do topo; continua único h1 |
| pdv.ajustes INV-018 "topoDoPdv = primeiro filho do banner" | Topo do PDV ≠ topo do login | `topoDoPdv()` = o próprio `banner` |
| pdv.caracterizacao INV-015 "tecido e voltar" | Tecido do produto aberto; botão voltar com "←" | Tecido dentro do `banner` + nenhum tecido no `main`; voltar com o ícone (`svg`) |

Nenhuma asserção removida sem equivalente; a única mudança de comportamento é a do MI-09 (título no topo).

## Inventário AP-004 — etapa 3 (Produtos, Cor e tamanho, Dia)
Busca por `a partir de`, `sem estoque`, `botaoTamanho`/regex `R\$` dos tamanhos, `botaoCor`, `adicionarPeca`, `Falta escolher`, `Pedido #`, `peça(s)`, `children[2]` antes da troca.

| Teste | O que o sinal antigo conferia | Asserção equivalente |
|---|---|---|
| `ajuda.tsx` `botaoTamanho` | Botão pela sigla (o preço vinha logo depois) | Regex `^{sigla}estoque \d+$` (sigla não se confunde: "G" × "GG") |
| `ajuda.tsx` `adicionarPeca` | Peça entrou e a tela foi para o Pedido | **MI-11:** confere que ficou em cor/tamanho com a escolha limpa e então abre a aba Pedido (mesmo ponto de chegada); volta para a lista se houver produto aberto |
| pdv.test RF-002 (lista com "a partir de" e "sem estoque") | Ordem e conteúdo dos cartões, menor preço, aviso de sem estoque | **MI-05:** lista exata dos nomes na região do tipo; o menor preço passou para a linha de cor/tamanho (teste "a partir de… na linha de cor/tamanho", que confere também o preço do SKU depois da escolha) |
| pdv.test RF-003 tamanhos com preço; pdv.caracterizacao INV-011 antigo (sigla → preço → saldo) | Preço de cada SKU e ordem | **MI-06:** sigla → saldo no botão; preço do SKU conferido na linha de apoio (inclusive com preços diferentes por tamanho) |
| pdv.test/pdv.caracterizacao "cor zerada avisa sem estoque"; caracterizacao INV-013 antigo | Aviso na cor e no card; continuam clicáveis | **MI-05/MI-06:** botão só com o nome; continuam clicáveis; tamanhos "estoque 0" desabilitados (asserção acrescentada) |
| pdv.test resumo "Cor · Tam X — R$" e `resumoEscolha` | Texto do resumo com o preço | Resumo sem preço + preço ao lado (`precoDaEscolha`, testada à parte); "cor e tamanho" como no design |
| pdv.test "adicionar vai para a aba Pedido" | Ida ao Pedido e escolha limpa | **MI-11:** fica em cor/tamanho, escolha limpa, botão desabilitado, contador "Pedido (1)", item correto no Pedido |
| pdv.test RF-004 limite e RF-006 "tipo some" | Reabrir o produto pela lista | Produto continua aberto (MI-11); o teste usa a tela aberta ou o voltar |
| pdv.caracterizacao INV-016 (rótulos do fechar) | Rótulo depois de adicionar | Abre a aba Pedido antes de conferir (MI-11) |
| pdv.ajustes MUD-01/MUD-02 | `children[2]` = saldo; grade de 3 colunas e gap 12px | `children[1]`; **MI-06:** 4 colunas `minmax(0, 1fr)` e gap 6px + saldo sem `nowrap` e botão com `min-height` |
| pdv.test RF-F09 lista do dia | "Pedido #N · cliente", "N peça(s)" | **MI-08:** "#N · cliente", "1 peça"/"3 peças" |
| pdv.caracterizacao INV-012 antigo (regex `R\$` sem tamanho) | Nenhum tamanho antes da cor | Regex trocada para `estoque` — a antiga passaria sempre (falso-positivo evitado) |

Nenhuma asserção removida sem equivalente. Mudanças de comportamento: MI-05, MI-06, MI-08, MI-11. A decisão da pdv-ajustes-tela-variacoes de manter "sem estoque" no card e na cor foi revertida por decisão do Lucas (MI-05/MI-06).

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
| 3 — Produtos, Cor e tamanho e Dia | verde (225 + 1 expected fail); `typecheck` ok | 20 testes ajustados pelo inventário; 2 guardas novas (AP-003). Mutações "tirar o minmax" em `.gradeTipos` e `.gradeTamanhos` derrubam os testes. Navegador a 320px: largura do conteúdo = 320 (sem rolagem lateral) na lista e em cor/tamanho; 4 tamanhos de 68px em 16–304px; "estoque 12" e "estoque 123" quebram dentro do botão sem passar da borda. Caso de referência: Top Nadador com 4 tamanhos (simulado) e saldos de 2–3 dígitos forçados na página |
| 2 — topo por tela e abas com ícone | verde (223 + 1 expected fail); `typecheck` ok | 7 testes ajustados pelo inventário acima; conferido no navegador a 375px (cor/tamanho com voltar, abas com ícone e marca) |
| 1 — tema Nocturne | verde (223 + 1 expected fail); `typecheck` ok | Conferido no navegador a 375px (Login e Produtos no tema escuro); nenhuma cor fixa fora de `tokens.css` |

## Documentação (D1-D3)
- [ ] D1 — código-fonte comentado
- [ ] D2 — documentação executiva em `docs/vN/documentacao.md` (versão <N>)
- [ ] D3 — `docs/contexto-geral.md` atualizado

(As-is já feito na Fase 3: `docs/v8/documentacao.md`. O to-be roda depois do Desenvolvimento.)

## Exceções
Nenhuma.

## Pronto para documentação e testes
não — etapas 1 a 3 concluídas; próxima: etapa 4 (Pedido).
