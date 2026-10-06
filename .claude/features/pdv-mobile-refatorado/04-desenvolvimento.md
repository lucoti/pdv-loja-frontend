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
| `src/telas/Pdv/Cliente.tsx` | Front | Criado — etapa Cliente (etapa 5) |
| `src/telas/Pdv/AvisoVenda.tsx` (era `ModalSucesso.tsx`) | Front | Renomeado/alterado — aviso com OK (etapa 5) |
| `src/telas/Pdv/Pdv.tsx`, `Pedido.tsx`, `Cabecalho.tsx`, `Pdv.module.css` | Front | Alterados — etapa Cliente, "Alterar", `recomecar` (OK e Cancelar) (etapa 5) |
| `src/dominio/carrinho.ts`, `src/dominio/formatos.ts` | Domínio | Alterados — `cpf` → `telefone`, ação `cliente` com nome+telefone; `somenteDigitos`, `mascararCelular`, `celularValido` (etapa 5) |
| `tests/telas/pdv.cliente.test.tsx` | Teste | Criado — 8 testes de MI-02/MI-04 (etapa 5) |
| `tests/telas/ajuda.tsx`, `pdv.test.tsx`, `pdv.ajustes.test.tsx`, `pdv.caracterizacao.test.tsx`, `tests/dominio/carrinho.test.ts`, `formatos.test.ts` | Teste | Alterados — inventário AP-004 da etapa 5 |
| `src/telas/Pdv/Pedido.tsx`, `Pdv.tsx`, `Pdv.module.css`, `comum.module.css` (`.cta`) | Front | Alterados — Pedido em cartões, resumo + botão com total, trava em ref (etapa 4) |
| `src/dominio/carrinho.ts` | Domínio | Alterado — `descontoTotalMais` com `limite` e `podeAumentarDescontoTotal` (ADR-005, etapa 4) |
| `tests/dominio/carrinho.test.ts`, `tests/telas/pdv.test.tsx`, `pdv.caracterizacao.test.tsx`, `pdv.mobile.caracterizacao.test.tsx`, `pdv.ajustes.test.tsx` | Teste | Alterados — inventário AP-004 da etapa 4, teto do desconto, `it.fails` retirado, guardas AP-003 do Pedido |
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
| 2026-10-05 | A etapa Cliente só aparece com o catálogo carregado (dentro de `Venda`); durante a carga o topo segue a aba | O rascunho e os botões ficam na barra de baixo, que pertence a `Venda`; evita duplicar estado entre os dois ramos de `Pdv` | Depois do login aparece "Carregando…" e então Cliente |
| 2026-10-05 | O aviso de venda mantém o título "Venda registrada" e o resumo (agora "N peças"), com botão OK | Decisão do Lucas: aviso só com toque | Mesma estrutura de janela, botão novo |
| 2026-10-05 | Até a etapa 6 o corpo do `POST /vendas` leva `cpf: ''` e não leva o celular | O contrato atual (back no ar) exige `cpf` e recusa campo extra | Celular só em memória até o contrato novo |
| 2026-10-06 | Na etapa 6, `celularValido` passa a exigir exatamente 11 dígitos (hoje aceita 10 ou 11) | Decisão do Lucas na pdv-cliente-telefone: o back recusa com 400 `telefone_invalido` fora de 11 dígitos | Teste "Alterar" com fixo de 10 dígitos muda; simulado espelha o back (`telefone_invalido`) |
| 2026-10-05 | Botão "Venda sem cliente" (secundário, sublinhado) abaixo de "Escolher produtos" | O design não tinha o "pular" que o Lucas pediu | Visual próprio, discreto |
| 2026-10-05 | Teto do desconto: o "+" só soma se o novo valor (múltiplo de R$ 5) não passar do bruto; não arredonda para o bruto exato | O back recusa desconto que não seja múltiplo de R$ 5 (`esquemaVenda`) | Com bruto R$ 89,00 o máximo é R$ 85,00 |
| 2026-10-05 | O cartão 1 Cliente mantém, até a etapa 5, os campos de nome e CPF | A tela Cliente e o celular chegam na etapa 5 | Visual provisório do cartão 1 |
| 2026-10-05 | Preço unitário sai do detalhe do item e vai para "R$ X cada" | Design 1d | Testes ajustados |
| 2026-10-05 | Abaixo de 360px o "Tirar" mostra só o ícone (texto fica para leitores de tela) | A 320px sobram ~37px para "R$ 89,00 cada" (precisa de ~64px) | Guarda em pdv.ajustes "MI-07" |
| 2026-10-05 | Pedido e Dia com margem lateral de 12px (`.conteudoCartoes`) | Design 1d/1e | A 375px "R$ 89,00 cada" ainda quebra em 2 linhas (100px úteis), sem passar da borda — aceito |
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

## Inventário AP-004 — etapa 4 (Pedido)
Busca por `Excluir`, `sem desconto`, botões `sem/5%/10%/15%`, `% aplicado`, `Descontos`, `Total`, `Fechar venda ·`, `texto(botaoFechar())`/`texto(fechar())`, `montarReferencia`, `200,20`/`255,20`, `descontoTotalMais` antes da troca.

| Teste | O que o sinal antigo conferia | Asserção equivalente |
|---|---|---|
| pdv.test `montarReferencia` (6 usos) e os testes de totais, corpo, modal e Dia | Pedido de referência com 10% na legging + R$ 15 (total R$ 200,20) | **MI-03:** referência só com desconto no pedido, 6 × R$ 5 (total R$ 203,00); corpo com `descPercent` 0 nos dois itens e `descontoTotalCentavos` 3000; modal "R$ 203,00"; Dia "R$ 258,00" |
| pdv.test "desconto por item" | Botões de %, subtotal com desconto, "−N% aplicado" | **MI-03:** nenhum botão de % na linha, subtotal cheio, "R$ 89,00 cada" |
| pdv.test "desconto no total" | Passos de R$ 5, "sem desconto", mínimo 0 | Mesmo + "Sem desconto" (design) + **teto no bruto** (R$ 85,00 com bruto R$ 89,00) e "+" desabilitado/reabilitado |
| pdv.test "total nunca negativo" | 12 × R$ 5 com bruto R$ 55 → total R$ 0,00 e descontos R$ 60,00 | Com o teto: desconto R$ 55,00 e total R$ 0,00 (no botão) |
| pdv.test/caracterização rótulos do fechar | Texto exato do botão ("Fechar venda · R$ X") | Rótulo = primeiro texto do botão, total = último (`firstElementChild`/`lastElementChild`) |
| pdv.test "Excluir" (2) | Remove a linha | Botão "Tirar" (nome acessível igual em qualquer largura) |
| pdv.test totais `Descontos`/`Total` | Linhas do resumo | "Desconto" no resumo; total no botão |
| pdv.test vazio | "Nenhum item ainda…" | "Nenhuma peça ainda. Vá em Produtos para incluir." (design) |
| pdv.test detalhe do item com preço | Preço unitário no detalhe | Detalhe "Suplex · Tam M · Preto" + "R$ X cada" (inclusive depois da recarga de preço) |
| carrinho.test `descontoTotalMais` (6 usos) | Passo de R$ 5 | Ação com `limite` alto (`MAIS_TOTAL`) + testes novos do teto e de `podeAumentarDescontoTotal`; "total nunca negativo" montado direto no estado |
| pdv.mobile.caracterizacao INV-013 (a) | `it.fails`: 2 POST com dois toques sem redesenho | **ADR-006:** `it` normal, 1 POST. Mutações "ler do estado" e "sem trava" derrubam o teste |

Nenhuma asserção removida sem equivalente. Invariante alterado intencionalmente: o total do pedido de referência (consequência do MI-03), registrado no `02-requisitos.md` ao fechar a fase.

## Inventário AP-004 — etapa 5 (Cliente e aviso)
Busca por `esperarCatalogo`, `esperarPdv`, `Nova venda`, `Venda registrada`, `dialog`, `Nome do cliente`, `CPF (opcional)`, `cpf`, `peça(s)` antes da troca.

| Teste | O que o sinal antigo conferia | Asserção equivalente |
|---|---|---|
| `ajuda.tsx` `esperarCatalogo` (15 usos) | Catálogo carregado, lista à vista | Novo `pularCliente` (confere a etapa Cliente no topo e toca "Venda sem cliente") e então a lista; o comentário do helper diz que pula a etapa |
| `ajuda.tsx` `ETAPAS`/`esperarPdv` | PDV aberto | Inclui "Cliente" (primeira tela da venda) |
| `ajuda.tsx` `adicionarPeca` | Começa pela aba Produtos | Pula a etapa Cliente se ela estiver na tela |
| `ajuda.tsx` `comecarNovaVenda`, testes com "Nova venda" (12) | Fecha a janela e começa venda nova | Botão OK; **acrescentado:** a tela volta para a etapa Cliente (MI-04) |
| `ajuda.tsx` `informarCliente`, `montarReferencia`, testes que digitavam nome/CPF (9) | Nome e CPF no pedido | **MI-02:** "Alterar" → etapa Cliente → nome e celular → "Salvar cliente"; conferência no cartão 1 ("Maria(31) 98765-4321Alterar") |
| pdv.test "cliente e CPF vão sem espaços" e corpo do `POST` | `cliente` e `cpf` aparados | `cliente` aparado; `cpf: ''` (provisório até a etapa 6); `telefone` ausente do corpo (teste novo em pdv.cliente) |
| pdv.test 400 "CPF inválido" e "outros erros não recarregam" | Mensagem de 400 acima do botão, pedido mantido; não recarrega | 400 `entrada_invalida` forçado no servidor (sem campo de CPF não há como provocar `cpf_invalido` pela tela) — mesmas asserções |
| pdv.test RNF-F08 "PIN e CPF só em memória" | CPF fora de console/armazenamento/URL | **Celular** fora de console/armazenamento/URL |
| pdv.test "Cancelar pedido limpa…" | Itens, desconto, nome, CPF e pagamento zerados | Mesmo + volta para a etapa Cliente com campos vazios; cartão "Cliente não identificado / Sem celular" |
| pdv.test "modal… Nova venda volta para Produtos" | Valores do servidor; volta para Produtos | OK; volta para a etapa Cliente (aba Produtos) com campos vazios e pedido zerado |
| pdv.test resumos do aviso ("peça(s)") | Texto do resumo | "1 peça"/"N peças" |
| pdv.ajustes INV-018 "etapa depois do login" | "Produtos" | **MI-02:** "Cliente" |
| pdv.test "catálogo do ERP vazio" | Aviso logo depois do login | Aviso depois de pular a etapa Cliente |
| carrinho.test (`cpf`, ação `cpf`, `valor`) | Guarda cliente e CPF | Ação `cliente` com `nome` e `telefone`; teste novo de "Alterar" (troca e apaga) |

Nenhuma asserção removida sem equivalente; mudanças de comportamento: MI-02 e MI-04.

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
| 5 — etapa Cliente, "Alterar" e aviso com OK | verde (242); `typecheck` ok | 8 testes novos (pdv.cliente) + inventário; navegador a 375px: etapa Cliente igual ao design, largura 375 |
| 4 — Pedido em cartões, teto do desconto, trava em ref | verde (230, sem expected fail); `typecheck` ok | Navegador a 320px: largura 320, pagamento em 2 colunas (125px cada), "R$ 89,00 cada" com 74px e "Tirar" só ícone; a 375px tudo numa linha exceto "R$ 89,00 cada" (2 linhas, sem estourar). AP-001: mutações na trava derrubam o teste |
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
não — etapas 1 a 5 concluídas; a etapa 6 (contrato `cpf` → `telefone`) depende do contrato novo da feature pdv-cliente-telefone.
