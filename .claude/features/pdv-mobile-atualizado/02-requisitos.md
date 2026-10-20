# 02 — Requisitos (refatoração): PDV Loja — Front-end mobile atualizado (abas no topo, peça → tecido → cor → tamanho)

## Motivação
Levar o front do PDV ao design atualizado (`PDV-loja/PDV Loja Mobile-atualizado.html`): a venda começa direto na escolha da peça, as abas vão para o topo, a escolha segue peça → tecido → cor → tamanho e os botões ganham relevo. A base é o front da `main` (feature **pdv-mobile-refatorado**, em produção), que fica obsoleta. Os invariantes daquela feature valem aqui com os mesmos IDs, exceto os alterados de propósito abaixo.

## Pontos de entrada afetados
| Ponto de entrada | Tipo (HTTP / evento / fila / job / função pública) | Consumidores |
|---|---|---|
| Tela de venda `Pdv` (`src/telas/Pdv/Pdv.tsx`) e componentes `Cabecalho`, `BarraInferior`, `Produtos`, `Variacoes`, `Pedido`, `Cliente`, `Dia`, `AvisoVenda` | Tela (componentes React) | Vendedor, no celular e no tablet |
| Reducer do pedido e cálculos (`src/dominio/carrinho.ts`), máscara do celular (`src/dominio/formatos.ts`) | Função pública | Tela de venda, testes de domínio |
| `api.registrarVenda` → `POST /vendas` (`src/api/cliente.ts`) | HTTP (cliente) | Back do PDV — sem mudança |
| `api.catalogo`, `api.vendasHoje`, login/sessão | HTTP (cliente) | Back do PDV — sem mudança |
| Tokens e estilos (`src/estilos/tokens.css`, `src/telas/comum.module.css`, `Pdv.module.css`) | Estilo | Todas as telas (tokens novos não podem mudar o Login) |
| Helpers de teste (`tests/telas/ajuda.tsx`: `topoDoPdv`, `esperarPdv`, `pularCliente`, `adicionarPeca`, `comecarNovaVenda`, `informarCliente`, `aumentarDescontoNoPedido`) | Função pública (testes) | Testes de tela do PDV |

## Invariantes — o que NÃO pode mudar

### Contratos externos intocáveis
| ID | Contrato | Detalhe (payload, formato, códigos de erro, ordenação...) |
|---|---|---|
| INV-001 | `POST /vendas` | Corpo igual ao da `main`: `chaveIdempotencia`, `itens` (`skuId`, `qtd`, `descPercent` sempre 0), `descontoTotalCentavos`, `cliente` (`nome`, `telefone` só dígitos ou ''), `pagamentoId`; o front nunca envia preço. |
| INV-002 | Leituras da API | Catálogo, vendas de hoje, login e sessão consumidos como hoje, sem mudança de rota nem de formato. |

### Comportamentos que devem ser preservados
| ID | Comportamento | Como verificar |
|---|---|---|
| INV-010 | Sessão expirada (401) leva de volta ao login. | Teste de tela: 401 no fechamento → tela de login. |
| INV-011 | Chave de idempotência igual em toda tentativa do mesmo pedido; muda só em "Nova venda" (aviso de sucesso) ou em "Cancelar pedido"; trava lida de ref (AP-001). | Teste: duas tentativas com erro enviam a mesma chave; depois de Nova venda/Cancelar, chave nova. |
| INV-012 (alterado) | Mesmo SKU soma na linha existente; "Adicionar ao pedido" nunca passa do saldo, contando o que já está no pedido. O −/+ de quantidade deixa de existir (ver MI-24). | Testes de domínio (`carrinho.test.ts`) e de tela. |
| INV-013 | Fechar exige ao menos uma peça e a forma de pagamento; sem envio duplo com um envio em andamento; "Cancelar pedido" desligado durante o envio. | Teste de tela: botão desligado sem peça/pagamento; um único `POST` com dois toques. |
| INV-014 (alterado) | Erro do servidor fica na tela com o pedido intacto e some na próxima mudança do pedido; 409 `sem_estoque` ou 400 `item_invalido` recarregam o catálogo. Peça acima do saldo depois de recarga: a linha mostra "Só N em estoque — tire a peça e adicione de novo" (saldo > 0) ou "Sem estoque — tire a peça" (saldo 0). | Testes de tela com respostas de erro do simulado. |
| INV-015 (alterado) | Toda recarga do catálogo atualiza o preço das linhas do pedido. O catálogo é buscado de novo sempre que uma tela de venda aparece: ao abrir o PDV (login ou recarga da página), ao entrar nas abas Produtos e Pedido, quando o app volta a ficar visível e ao fechar a venda; a aba Dia não busca. O back responde sem cache (`Cache-Control: no-store`). | Teste de domínio (ação `precos`) e de tela ("entrar em Produtos ou Pedido e voltar ao app buscam o catálogo"). |
| INV-016 (alterado) | Tamanho da grade do produto sem saldo na cor aparece desligado (tracejado), com "sem estoque" (ver INV-013 da `pdv-ajustes-tela-variacoes`); trocar de cor mantém o tamanho se ele tiver saldo na cor nova; cada tamanho com saldo mostra "estoque N". | Testes de tela de cor/tamanho. |
| INV-017 | Primeiro tipo do catálogo já vem escolhido; se uma recarga tirar o tipo escolhido, volta para o primeiro. | Teste de tela. |
| INV-018 | Aba Dia funciona com o catálogo carregando ou em falha. | Teste de tela. |
| INV-019 | Pedido só em memória; nada no armazenamento do navegador. | Inspeção: nenhum uso de `localStorage`/`sessionStorage` no PDV. |
| INV-030 | Celular opcional; quando preenchido, exige 11 dígitos (DDD + número) para salvar. | Teste de tela do formulário do cliente. |
| INV-031 | Desconto no pedido em R$, de 5 em 5, nunca acima do bruto. | Testes de domínio e de tela. |
| INV-032 | Tela de Login sem mudança de layout e comportamento. | Testes de login inalterados. |

### Bugs conhecidos a preservar
| ID | Bug | Quem pode depender dele | Decisão |
|---|---|---|---|
| INV-020 | Ao terminar a carga do catálogo, topo e barra são remontados; um toque numa aba nesse instante pode se perder. | Ninguém depende; registrado para não ser tratado como regressão nova. | preservar (fora do escopo) |
| INV-021 | `crypto.randomUUID` exige contexto seguro: abrir o dev pelo IP da rede local quebra a tela de venda. | Ninguém depende. | preservar (fora do escopo) |

## O que pode mudar
- Estrutura interna, nomes e divisão dos componentes do PDV (o `Cabecalho` e a etapa `Cliente` inicial podem sair); CSS e tokens novos.
- Textos e elementos usados como sinal pelos testes (`banner` com o nome da etapa, botão "Pular", "OK" do aviso, "Aumentar desconto no total"), desde que antes da troca o `04-desenvolvimento.md` liste o que cada teste conferia além do sinal e cada um ganhe asserção equivalente (AP-004).
- Mudanças intencionais de comportamento e de tela (decisões do Lucas em 2026-10-12; substituem MI-01 a MI-11 da pdv-mobile-refatorado onde conflitarem):
  - **MI-20 Navegação:** abas Produtos / Pedido / Dia no topo (fixas, 3 colunas, ícone + nome), número de peças em bolinha na aba Pedido. Sai o cabeçalho com o título da etapa. A barra de baixo fica só com o botão de ação da tela.
  - **MI-21 Início da venda e cliente:** a venda começa em Produtos; sai a etapa Cliente inicial. O cliente é informado pela linha do cliente no Pedido ("Alterar"), que abre o formulário "Cliente do pedido" (voltar, Nome, Celular, "Salvar cliente", "Venda sem cliente"). Mensagem "Complete o celular com DDD (11 números) ou deixe em branco." quando o celular está incompleto, e "Salvar cliente" desligado nesse caso. Máscara progressiva do design: `(DD`, `(DD) 99999`, `(DD) 99999-9999`. Voltar e trocar de aba descartam a edição.
  - **MI-22 Produtos:** cartão "1 Peça" (tipos em 3 colunas, nome do tipo escolhido à direita) e cartão "2 Tecido" (produtos do tipo em 2 colunas, "1 opção"/"N opções" à direita). Sai o selo "N no pedido".
  - **MI-23 Cor e tamanho:** voltar ("Voltar para peça e tecido") e título (peça + tecido) na própria tela; cartão "3 Cor" em 2 colunas com amostra e check na escolhida; cartão "4 Tamanho" só depois da cor (4 colunas, sigla + "estoque N"). A barra "Adicionar ao pedido" só aparece com cor e tamanho escolhidos; saem "Falta escolher…" e a linha de preço. Com todo o saldo daquele tamanho já no pedido, o botão fica **desligado, sem texto extra** (sai "Só N em estoque — já no pedido"). **Depois de adicionar, a tela volta para Peça/Tecido** com o tipo anterior ainda escolhido (substitui MI-11).
  - **MI-24 Pedido:** linha do cliente ("nome · celular" ou "Cliente não identificado", com "Alterar"); "PEÇAS" com "N peças", cada linha com nome, resumo (detalhe e " · qtd × preço" quando qtd > 1), subtotal e lixeira ("Tirar peça") — **sai o −/+ de quantidade**; linha "Desconto" com −/+ ("Diminuir desconto"/"Aumentar desconto"), **o − desligado em zero**; **o desconto diminui sozinho quando peças saem** (`min(desconto, piso(bruto/5)×5)`); "PAGAMENTO" em 2 colunas sem ícones; "Cancelar pedido" como link no fim do conteúdo. Pedido vazio mostra só "Nenhuma peça no pedido ainda. Escolha em Produtos.". Barra: resumo (peças/bruto e desconto, só com peças) e botão de fechar, que aparece também com o pedido vazio, desligado.
  - **MI-25 Cancelar pedido:** zera tudo — peças, desconto, pagamento **e cliente** — gera chave nova e **volta para Produtos**.
  - **MI-26 Aviso de venda:** segue o design — ícone, "Venda registrada", total, "N peças · pagamento", cliente ou "Cliente não identificado" e botão "Nova venda"; **sem o número do pedido**. "Nova venda" zera tudo, gera chave nova e volta para Produtos (substitui MI-04).
  - **MI-27 Dia:** título "Vendas de hoje" e a data dentro do conteúdo.
  - **MI-28 Visual:** botões com relevo; escolhido em roxo "afundado"; indisponível com borda tracejada; tokens novos em `tokens.css`.

## Invariantes alterados intencionalmente
| ID | Mudança | Motivo | Aprovado por | Data |
|---|---|---|---|---|
| INV-012 | Sai o −/+ de quantidade na linha do pedido; o limite de saldo vale só no "Adicionar" (somando o que já está no pedido). | Design atualizado (MI-24); decisão 3: não incrementar além do estoque existente. | Lucas | 2026-10-12 |
| INV-014 | Aviso de saldo na linha passa a ser "Só N em estoque — tire a peça e adicione de novo" / "Sem estoque — tire a peça" (antes "…exclua o item"), já que não há mais −. | Fim do −/+ (MI-24); decisão B. | Lucas | 2026-10-12 |
| INV-011 | "Cancelar pedido" também zera o cliente e volta para Produtos. | Decisões 1 e A (MI-25). | Lucas | 2026-10-12 |
| INV-020 | Bug corrigido: abas desenhadas uma vez acima dos ramos (ADR-001), o toque numa aba no fim da carga deixa de se perder. | Consequência do design com abas no topo; ninguém dependia do bug. | Lucas (Arquitetura) | 2026-10-12 |
| INV-015 | O catálogo passa a ser buscado também ao entrar em Produtos/Pedido e quando o app volta a ficar visível (antes: só ao abrir o PDV, depois da venda e em 409/400). Os testes que contavam buscas passam a medir só as disparadas pelo "Fechar venda". | Decisão do Lucas: o que o ERP cadastra deve aparecer no PDV toda vez que a tela é carregada. | Lucas | 2026-10-13 |
| INV-016 | Sai o tamanho desligado (tracejado): sem saldo, o tamanho nem aparece; o catálogo só traz SKUs com saldo > 0. | Decisão do Lucas: o PDV mostra só SKUs disponíveis e com estoque (INV-013 da `pdv-ajustes-tela-variacoes`). | Lucas | 2026-10-13 |
| INV-016 | Volta o tamanho desligado: o tamanho da grade do produto sem saldo na cor escolhida aparece desligado, com "sem estoque"; sem saldo em nenhuma cor, continua fora (o catálogo só traz SKUs com saldo > 0). | Decisão do Lucas: mostrar que aquele tamanho não é uma opção válida (INV-013 da `pdv-ajustes-tela-variacoes`, revisto). | Lucas | 2026-10-20 |

## Aprendizados aplicados
- AP-001: troca de aba, Nova venda, Cancelar e envio continuam com travas lidas de ref.
- AP-002: implantação só do front, checklist com "Depende de:" (back com `telefone` já em produção).
- AP-003: grades novas (abas 3 colunas, tipos 3, tecidos 2, cores 2, tamanhos 4, pagamento 2) e posição fixa no topo e no pé com `minmax(0,1fr)`, guarda automática da regra CSS e conferência a 360px e 320px.
- AP-004: inventário por teste dos sinais que mudam (`banner` da etapa em `topoDoPdv`/`esperarPdv`, etapa Cliente em `pularCliente`/`informarCliente`, "OK" em `comecarNovaVenda`, "Aumentar desconto no total", −/+ das linhas) antes da troca; helpers que não guardam elemento.

## Aprovação
- Aprovado por: Lucas (decisões 1–4 e A/B de 2026-10-12: Cancelar zera também o cliente e volta para Produtos; botão desligado sem texto; sem incremento além do estoque; aviso de venda segue o design; "Sem estoque — tire a peça")
- Data/hora: 2026-10-12 00:19
