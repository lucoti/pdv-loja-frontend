# 02 — Requisitos (refatoração): PDV Loja — Front-end mobile refatorado (design Nocturne)

## Motivação
Levar o front do PDV ao design "PDV Mobile Refatorado" (tema escuro Nocturne, venda começando pelo cliente, desconto único no pedido) sem quebrar o que já funciona na venda: sessão, idempotência, limites de estoque e tratamento de erros do servidor.

Achado do levantamento: o desconto em R$ no pedido inteiro já existe no domínio (`descontoTotalCentavos`, passo `PASSO_DESCONTO_TOTAL_CENTAVOS` = R$ 5, em `src/dominio/carrinho.ts` e `src/dominio/precos.ts`). A mudança de desconto é só de tela: sai o desconto por item (%), o contrato com o back fica igual.

## Pontos de entrada afetados
| Ponto de entrada | Tipo (HTTP / evento / fila / job / função pública) | Consumidores |
|---|---|---|
| Tela de venda `Pdv` (`src/telas/Pdv/Pdv.tsx`) e componentes `Produtos`, `Variacoes`, `Pedido`, `Dia`, `BarraInferior`, `Cabecalho`, `ModalSucesso` | Tela (componentes React) | Vendedor, no celular e no tablet |
| Reducer do pedido `reduzirPedido`, `pedidoVazio`, `calcularPedido`, `podeFechar` (`src/dominio/carrinho.ts`) | Função pública | Tela de venda, testes de domínio |
| `api.registrarVenda` → `POST /vendas` (`src/api/cliente.ts`) | HTTP (cliente) | Back do PDV |
| `api.catalogo`, `api.vendasHoje`, login/sessão | HTTP (cliente) | Back do PDV |
| Tokens e estilos globais (`src/estilos/tokens.css`, `global.css`, `comum.module.css`, `Pdv.module.css`) | Estilo | Todas as telas, inclusive Login |
| Handlers simulados (`src/simulado/handlers.ts`) | Função pública (modo simulado) | Modo de demonstração e testes |

## Invariantes — o que NÃO pode mudar

### Contratos externos intocáveis
| ID | Contrato | Detalhe (payload, formato, códigos de erro, ordenação...) |
|---|---|---|
| INV-001 | `POST /vendas` | Corpo com `chaveIdempotencia`, `itens` (`skuId`, `qtd`, `descPercent`), `descontoTotalCentavos`, `cliente`, `pagamentoId`; o front nunca envia preço. Única mudança prevista: `cpf` → `telefone`, combinada com a feature **pdv-cliente-telefone** (registrada abaixo em "Invariantes alterados intencionalmente" quando executada). `descPercent` passa a ir sempre 0. |
| INV-002 | Leituras da API | Catálogo, vendas de hoje, login e sessão consumidos como hoje, sem mudança de rota nem de formato. |

### Comportamentos que devem ser preservados
| ID | Comportamento | Como verificar |
|---|---|---|
| INV-010 | Sessão expirada (401) leva de volta ao login. | Teste de tela: resposta 401 no fechamento → tela de login. |
| INV-011 | Chave de idempotência igual em toda tentativa do mesmo pedido; muda só em venda nova (depois do aviso de sucesso) ou em "Cancelar pedido". | Teste: duas tentativas com erro enviam a mesma chave; depois da venda/cancelar, chave nova. |
| INV-012 | Mesmo SKU soma na linha existente; "Adicionar" e "+" não passam do saldo; "−" com quantidade 1 tira o item. | Testes de domínio (`carrinho.test.ts`) e de tela. |
| INV-013 | Fechar exige ao menos um item e a forma de pagamento; o botão diz o que falta ("Inclua uma peça" / "Escolha o pagamento"); sem envio duplo com um envio em andamento. | Teste de tela: rótulos do botão e um único pedido HTTP com dois toques. |
| INV-014 | Erro do servidor fica na tela com o pedido intacto e some na próxima mudança do pedido; 409 `sem_estoque` ou 400 `item_invalido` recarregam o catálogo; item acima do saldo mostra "Só N em estoque…" / "Sem estoque — exclua o item". | Testes de tela com respostas de erro do simulado. |
| INV-015 | Toda recarga do catálogo atualiza o preço das linhas do pedido; fechar a venda recarrega o catálogo. | Teste de domínio (ação `precos`) e de tela. |
| INV-016 | Tamanho sem saldo aparece desabilitado; trocar de cor mantém o tamanho se ele tiver saldo na cor nova; cada tamanho mostra "estoque N" (decisão do Lucas, contra "esgotado / só 1 / N un" do design). | Testes de tela de cor/tamanho (`pdv.ajustes.test.tsx`). |
| INV-017 | Primeiro tipo do catálogo já vem escolhido; se uma recarga tirar o tipo escolhido, volta para o primeiro. | Teste de tela. |
| INV-018 | Aba Dia funciona com o catálogo carregando ou em falha. | Teste de tela. |
| INV-019 | Pedido só em memória; nada no armazenamento do navegador. | Teste/inspeção: nenhum uso de `localStorage`/`sessionStorage` no PDV. |

### Bugs conhecidos a preservar
| ID | Bug | Quem pode depender dele | Decisão |
|---|---|---|---|
| INV-020 | Ao terminar a carga do catálogo, topo e barra inferior são remontados; um toque numa aba nesse instante pode se perder (comentário em `Pdv.tsx`). | Ninguém depende; registrado para não ser tratado como regressão nova. | preservar (fora do escopo) |
| INV-021 | `crypto.randomUUID` exige contexto seguro: abrir o dev pelo IP da rede local quebra a tela de venda. | Ninguém depende. | preservar (fora do escopo) |

## O que pode mudar
- Estrutura interna, nomes e divisão dos componentes do PDV; CSS e tokens de tema.
- Textos usados pelos testes, desde que antes da troca o `04-desenvolvimento.md` liste o que cada teste conferia além do sinal e cada um ganhe asserção equivalente (AP-004).
- Mudanças intencionais de comportamento e de tela (decisões do Lucas em 2026-10-05):
  - **MI-01** Tema escuro Nocturne no celular e no tablet; layouts do design (375 × 667) usados nas duas larguras.
  - **MI-02** Etapa nova **Cliente** no início da venda: nome e celular opcionais (máscara (31) 99999-9999), com botão para pular; o campo CPF sai do PDV. O cartão 1 do Pedido mostra o cliente com "Alterar".
  - **MI-03** O desconto por item (%) sai da tela; fica só o desconto no pedido, em R$ de 5 em 5 com −/+, e o "+" para no total bruto.
  - **MI-04** Ao fechar a venda, aparece um **aviso** com o número e o total do pedido; quando o aviso sai, a tela volta para a etapa **Cliente** com um pedido novo. A janela atual "Venda registrada" com o botão "Nova venda" deixa de existir. Como o aviso sai (toque ou tempo) é decidido na Arquitetura.
  - **MI-05** Produtos: tipos em grade de 3 colunas; lista do tipo escolhido só com o tecido e o selo "N no pedido"; **sem** "a partir de R$…" e **sem** "sem estoque" no cartão (decisão do Lucas: seguir o design, revertendo a decisão da feature pdv-ajustes-tela-variacoes); nome do cliente sob o título e "N modelos" no topo.
  - **MI-06** Cor e tamanho: cores em lista de uma coluna com marcação da escolhida e **sem** "sem estoque" no cartão da cor; tamanhos em 4 colunas, **sem** preço no botão (o preço aparece só na linha acima de "Adicionar ao pedido").
  - **MI-07** Pedido em cartões numerados 1 Cliente, 2 Peças (−/+ e "Tirar"), 3 Desconto no pedido, 4 Pagamento; resumo de peças/bruto/desconto e total dentro do botão de fechar; "Cancelar pedido" no topo.
  - **MI-08** Dia: lista "#N · cliente"; topo com a data. Barra inferior com ícones e aba "Pedido (N)".
  - **MI-10** Tela de Login também no tema escuro: só cores e fonte; layout e comportamento iguais (decisão do Lucas na Arquitetura, 2026-10-05).
  - **MI-11** Depois de "Adicionar ao pedido", a tela fica em Cor e tamanho com a escolha limpa (hoje vai para a aba Pedido) — decisão do Lucas na Arquitetura: seguir o design.
  - **MI-09** Topo de cada tela segue o design (título da etapa e informação de apoio), substituindo o `Cabecalho` só com o nome da etapa.

## Invariantes alterados intencionalmente
<Preenchido durante as Fases 4 e 5 se um teste de caracterização quebrar e a mudança for aceita.>

| ID | Mudança | Motivo | Aprovado por | Data |
|---|---|---|---|---|
| INV-001 | Corpo do `POST /vendas` com `telefone` (só dígitos, ou '') no lugar de `cpf`; testes de caracterização `CAMPOS_VENDA` e corpo exato atualizados | Contrato novo da pdv-cliente-telefone (mudança prevista no próprio INV-001) | Lucas (Requisitos e Testes da pdv-cliente-telefone) | 2026-10-06 |
| INV-014 | Caso de erro 400 da caracterização passa de `cpf_invalido` para `telefone_invalido` (mesmo comportamento: pedido intacto, sem recarga) | O código `cpf_invalido` deixou de existir no back | Lucas | 2026-10-06 |
| Pedido de referência dos testes | Total do pedido de referência passa de R$ 200,20 para R$ 203,00 (sem 10% na legging; só R$ 30 no pedido) | Consequência do MI-03 (fim do desconto por peça na tela) | Lucas (MI-03 nos Requisitos; registro na Fase 5) | 2026-10-06 |
| INV-013 | Achado da caracterização (dois toques no mesmo `act` geravam 2 `POST /vendas`) corrigido pelo ADR-006; o invariante passa a valer como escrito (`it.fails` → `it`) | Trava lida da ref no toque (AP-001) | Lucas (Arquitetura) | 2026-10-06 |

## Aprendizados aplicados
- AP-004: a troca de textos/elementos usados como sinal pelos testes (ex.: "Produtos" no `banner` em `esperarPdv`, "Venda registrada", "Nova venda", "CPF (opcional)") exige inventário por teste antes da troca.
- AP-003: grades novas (tipos 3 colunas, tamanhos 4 colunas, descontos/pagamentos) com `minmax(0,1fr)` e guarda automática.
- AP-001: avaliado para o aviso que some sozinho (MI-04) — não é ação disparada por eventos consecutivos do usuário; a troca de chave de idempotência continua vinculada ao fim do aviso e será tratada no ADR da Arquitetura.

## Aprovação
- Aprovado por: Lucas ("pode gravar"; decisões de 2026-10-05: aviso ao finalizar e volta para Cliente, seguir o design em preços e "sem estoque")
- Data/hora: 2026-10-05 22:40
