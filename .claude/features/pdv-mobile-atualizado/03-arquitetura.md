# 03 — Arquitetura (refatoração): PDV Loja — Front-end mobile atualizado (abas no topo, peça → tecido → cor → tamanho)

## As-is (estado atual)
- Documentação gerada (D1-D3): `docs/v10/documentacao.md` — versão 10 (as-is antes da pdv-mobile-atualizado); `docs/contexto-geral.md` atualizado (front e back em produção).
- Resumo da estrutura atual:
  - `Pdv` guarda `aba`, a carga do catálogo e o `pedido` (`useReducer(reduzirPedido)`). Com catálogo ok desenha `<Venda>`; carregando/falha desenha outro ramo com `Cabecalho` + `Dia`/`Carregando`/`FalhaAoCarregar` + `BarraInferior` (dois pares de topo e barra → INV-020).
  - `Venda`: `tipoEscolhido`, `produtoId`, `escolha`, `enviando` + `enviandoRef`, `erro`, `sucesso`, `clienteDefinido`, `origemCliente`, `rascunho`. A tela é decidida por `naCliente = aba==='produtos' && !clienteDefinido` e `naVariacao`. `recomecar` (OK do aviso e Cancelar) zera tudo e volta para a etapa Cliente.
  - `Cabecalho` = `<header aria-label={etapa}>` (sinal dos testes); `BarraInferior` = ação + `<nav aria-label="Abas">` embaixo.
  - `Pedido` em cartões numerados 1–4 com −/+ por linha; `ResumoPedido` na barra. `AvisoVenda` com "Pedido #N" e OK.
  - Domínio: ações `adicionar`, `mais`, `menos`, `remover`, `desconto`, `descontoTotalMais`, `descontoTotalMenos`, `cliente`, `pagamento`, `precos`, `novo`. Desconto nunca reduz sozinho. `mascararCelular`: `(DD) XXXX-XXXX` até 10 dígitos, `(DD) XXXXX-XXXX` com 11.
  - Travas em ref: só `enviandoRef` (Fechar e Cancelar).

### Problemas do estado atual
| Problema | Onde | Impacto |
|---|---|---|
| Topo e barra montados em dois ramos | `Pdv.tsx` | Toque numa aba pode se perder no fim da carga (INV-020) |
| Tela decidida por combinação de flags (`clienteDefinido`, `origemCliente`, `produto`) | `Venda` | Difícil de seguir; a edição do cliente sobrevive à troca de aba |
| Desconto não acompanha a queda do bruto | `carrinho.ts` | Desconto pode ficar acima do bruto depois de tirar peça ou recarregar preço |
| Testes dependem do `banner` com o nome da etapa e da etapa Cliente | `tests/telas/ajuda.tsx` | Quase todos os testes de PDV mudam com o design (AP-004) |

## Conformidade com o CLAUDE.md
Não há `CLAUDE.md` no repositório. Seguidos os padrões do código: CSS Modules, tokens em `tokens.css`, Phosphor, comentários em pt-BR explicando o porquê.

## To-be (estado proposto)
- **Navegação (ADR-001):** componente novo `Abas` (`<nav aria-label="Abas">`, 3 colunas, bolinha de peças na aba Pedido, `aria-current="page"` na ativa), desenhado **uma vez** em `Pdv`, acima dos dois ramos. `Cabecalho` sai. `BarraInferior` vira `BarraAcao`, só com o botão de ação, desenhada só quando há ação.
- **Sinal de tela (ADR-002):** `<main aria-label={etapa}>`, com etapa ∈ "Produtos" | "Cor e tamanho" | "Pedido" | "Cliente do pedido" | "Dia". Testes trocam o `banner` por `main` com nome.
- **Estado de `Venda` (ADR-003):** saem `clienteDefinido` e `origemCliente`; entra `editandoCliente` (só na aba Pedido). `trocarAba(aba)` muda a aba e zera `editandoCliente` (descarta a edição). `recomecar` (Nova venda e Cancelar) zera pedido, cliente, escolha e produto, gera chave nova e vai para Produtos.
- **Produtos e Variações:** `Produtos` com cartão "1 Peça" (tipos, 3 colunas, nome do tipo à direita) e "2 Tecido" (produtos do tipo, 2 colunas, "1 opção"/"N opções"); sai `noPedido`. `Variacoes` ganha voltar ("Voltar para peça e tecido") e título (peça 20px, tecido 15px), cartão "3 Cor" (2 colunas, amostra 60×52, check) e "4 Tamanho" (só com cor, 4 colunas, "estoque N"). Barra "Adicionar ao pedido" só com SKU escolhido, desligada sem texto quando `jaNoPedido >= saldo`. `adicionar` → `voltarParaProdutos()` (tipo mantido). Saem `resumoEscolha` e `precoDaEscolha`.
- **Pedido:** sem `Cartao` numerado. Linha do cliente (botão 52px, "nome · celular" ou "Cliente não identificado", "Alterar"); "PEÇAS" + "N peças"; linhas com nome, resumo (+ " · qtd × preço" se qtd > 1), subtotal, lixeira "Tirar peça" e aviso de saldo (INV-014 alterado); linha "Desconto" com "Diminuir desconto" (desligado em 0) / "Aumentar desconto"; "PAGAMENTO" em 2 colunas sem ícones; "Cancelar pedido" como link no fim do `main` (trava em ref + `disabled={enviando}`). Pedido vazio: só a mensagem. Barra: `ResumoPedido` (só com peças), `CaixaErro` e botão de fechar (mesmos rótulos "Inclua uma peça"/"Escolha o pagamento"/"Fechar venda" + total), sempre visível.
- **Cliente do pedido:** `Cliente` passa a ter voltar ("Voltar para o pedido", descarta), título, campos Nome ("Nome do cliente") e Celular (`inputMode="numeric"`) e a mensagem "Complete o celular com DDD (11 números) ou deixe em branco." quando incompleto. Barra: "Salvar cliente" (desligado com celular incompleto) e "Venda sem cliente" (grava cliente vazio). Os dois voltam para o Pedido.
- **Domínio (ADR-004):** saem as ações `mais` e `menos`. Ao fim de `reduzirPedido`, o desconto é limitado a `piso(bruto/R$5)×R$5`; o objeto só é recriado se o desconto mudar (a ação `precos` sem mudança continua devolvendo o mesmo objeto). Helper `podeDiminuirDescontoTotal`.
- **Máscara (ADR-005):** `mascararCelular` progressiva do design: `(D`, `(DD`, `(DD) X…` até 7 dígitos, `(DD) XXXXX-XXXX` a partir de 8. `celularValido` igual (0 ou 11).
- **Aviso de venda:** `AvisoVenda` com ícone, "Venda registrada", total, "N peças · {pagamento.nome}", cliente ou "Cliente não identificado", botão "Nova venda" (autoFocus) → `recomecar`. Sem número do pedido. Dados vindos do servidor.
- **Dia:** título "Vendas de hoje" e data (`hojeCurto`) dentro do próprio `Dia`; aparece também com catálogo carregando/em falha.
- **Visual (ADR-006):** tokens `--tile-bg` (#40445a), `--tile-borda` (#75798c), `--tile-sombra`, `--tile-escolhido-bg` (#5d5294), `--tile-escolhido-borda` (#d2cefd), `--tile-escolhido-sombra`, `--tile-off-borda` (#595d6c tracejada), `--tile-off-texto` (#75798c); classe `.tile` comum com escolhido por `[aria-pressed='true']` e indisponível por `:disabled`. Login não usa `.tile`.

## Estratégia de migração
- **Estratégia escolhida:** incremental, uma etapa por commit, suíte completa a cada etapa.
- **Justificativa:** front-only e sem consumidores externos além do back (contrato intocado); etapas pequenas isolam o que quebra na caracterização. Feature flag não compensa: o design novo substitui o antigo inteiro.

### Etapas
| Etapa | O que muda | Invariantes em risco | Rollback |
|---|---|---|---|
| 1 | Testes de caracterização sobre o código atual | — | Não altera código de produção |
| 2 | Domínio: fim de `mais`/`menos`, teto do desconto, máscara nova | INV-012, INV-015, INV-030, INV-031 | `git revert` da etapa |
| 3 | Tokens `--tile-*` e classe `.tile` | INV-032 (Login) | `git revert` da etapa |
| 4 | `Abas` no topo, `main aria-label`, `Cabecalho` sai, `BarraAcao`; helpers de teste trocados com inventário (AP-004) | INV-018, INV-020 (corrigido) | `git revert` da etapa |
| 5 | Produtos (Peça/Tecido) e Variações (Cor/Tamanho, volta para Peça) | INV-012, INV-016, INV-017 | `git revert` da etapa |
| 6 | Pedido e Cliente do pedido | INV-011, INV-013, INV-014, INV-030, INV-031 | `git revert` da etapa |
| 7 | Aviso de venda e Dia | INV-011, INV-018 | `git revert` da etapa |
| 8 | Conferência no navegador a 390, 360 e 320px | AP-003 | Ajuste de CSS |

Rollback em produção: publicar de novo o build anterior do front (back não muda).

## Cobertura dos invariantes
| Invariante | Teste de caracterização previsto |
|---|---|
| INV-001 | Corpo exato do `POST /vendas` (com e sem cliente) |
| INV-002 | Leituras do catálogo, vendas de hoje e sessão como hoje |
| INV-010 | 401 no fechamento → login |
| INV-011 | Mesma chave em duas tentativas com erro; chave nova depois de Nova venda e de Cancelar; Cancelar zera o cliente |
| INV-012 | Domínio: mesmo SKU soma; "Adicionar" não passa do saldo contando o pedido |
| INV-013 | Botão desligado sem peça/pagamento, rótulos; um único `POST` com dois toques; Cancelar desligado no envio |
| INV-014 | Erro na tela, some na mudança; 409/`item_invalido` recarregam; aviso de saldo na linha |
| INV-015 | Ação `precos` e recarga ao fechar |
| INV-016 | Tamanho sem saldo desligado, "estoque N", tamanho mantido ao trocar cor |
| INV-017 | Primeiro tipo escolhido; recarga sem o tipo volta ao primeiro |
| INV-018 | Dia com catálogo carregando/em falha |
| INV-019 | Nenhum uso de `localStorage`/`sessionStorage` no PDV |
| INV-030 | Celular opcional; incompleto bloqueia salvar |
| INV-031 | Desconto de 5 em 5, teto no bruto |
| INV-032 | Testes de login inalterados |

## Decisões (ADRs)

### ADR-001 — Abas desenhadas uma vez, acima dos ramos
- **Contexto:** o design põe as abas no topo; hoje topo e barra existem em dois ramos e são remontados no fim da carga (INV-020).
- **Decisão:** `Abas` em `Pdv`, fora do ramo condicional; a barra de ação fica em `Venda`.
- **Consequências:** o INV-020 deixa de existir (mudança intencional aprovada pelo Lucas em 2026-10-12); a troca de aba no fim da carga passa a funcionar.

### ADR-002 — `main` com nome como sinal da tela
- **Contexto:** o `banner` com a etapa sai junto com o `Cabecalho`, e os helpers de teste dependem dele (AP-004).
- **Decisão:** `<main aria-label={etapa}>`; `topoDoPdv`/`esperarPdv` passam a procurar `main` com nome; antes da troca, inventário por teste do que cada um conferia além do sinal.
- **Consequências:** os testes não guardam elemento entre renders; os helpers ficam independentes do visual.

### ADR-003 — Edição do cliente dentro do Pedido, descartada na troca de aba
- **Contexto:** a etapa Cliente inicial sai; o cliente é editado pelo "Alterar".
- **Decisão:** `editandoCliente` só na aba Pedido; `trocarAba` e o voltar descartam o rascunho. Sem trava em ref na troca de aba e no "Nova venda" (AP-001 avaliado: a troca de aba não envia nada; dois toques em "Nova venda" só geram duas chaves seguidas com o pedido vazio, e vale a última) — decisão do Lucas em 2026-10-12.
- **Consequências:** saem `clienteDefinido` e `origemCliente`; a tela é decidida só por `aba`, `editandoCliente` e `produto`.

### ADR-004 — Teto do desconto aplicado no reducer
- **Contexto:** o desconto deve diminuir sozinho quando o bruto cai (MI-24), inclusive por recarga de preços.
- **Decisão:** limitar `descontoTotalCentavos` a `piso(bruto/500)×500` ao fim de toda ação; mesmo objeto quando nada muda. `mais`/`menos` saem.
- **Consequências:** INV-031 vale em qualquer caminho; testes de domínio de `mais`/`menos` saem (INV-012 alterado).

### ADR-005 — Máscara progressiva do design
- **Contexto:** o design formata o celular por faixa de dígitos, sempre no formato de 11.
- **Decisão:** reescrever `mascararCelular` pela regra do design; `somenteDigitos` e `celularValido` iguais.
- **Consequências:** o corpo enviado não muda (só dígitos); testes da máscara atualizados.

### ADR-006 — Tokens `--tile-*` e classe `.tile`
- **Contexto:** os botões do design têm relevo, estado escolhido e indisponível próprios.
- **Decisão:** tokens novos em `tokens.css` e classe comum usada por tipo, produto, cor, tamanho, pagamento e −/+ do desconto.
- **Consequências:** Login inalterado; estado visual continua dirigido por `aria-pressed`/`disabled`.

## Riscos técnicos
| Risco | Impacto | Mitigação |
|---|---|---|
| Troca de sinais nos testes esconde perda de asserção | Alto | Inventário por teste em `04-desenvolvimento.md` antes da troca (AP-004) |
| Grades e `position: sticky` no topo/pé não medidas pelo jsdom | Médio | Teste que lê a regra da classe e conferência a 360/320px (AP-003) |
| Teto do desconto quebrar a identidade do objeto em `precos` | Médio | Teste de domínio: `precos` sem mudança devolve o mesmo objeto |
| Toques rápidos em Fechar/Cancelar | Baixo | `enviandoRef` mantida (AP-001) |

## Aprendizados aplicados
- AP-001: trava em ref mantida em Fechar e Cancelar; avaliada e dispensada na troca de aba e em "Nova venda" (ADR-003).
- AP-002: implantação só do front, checklist com "Depende de:" (back com `telefone` já em produção).
- AP-003: grades com `minmax(0,1fr)`, guarda automática da regra CSS e conferência a 360/320px (etapa 8).
- AP-004: inventário de sinais antes da etapa 4 (ADR-002).

## Aprovação
- Aprovado por: Lucas ("de acordo com os 2, pode gravar e seguir": INV-020 corrigido pelo ADR-001; sem trava em ref na troca de aba e no "Nova venda")
- Data/hora: 2026-10-12 00:28
