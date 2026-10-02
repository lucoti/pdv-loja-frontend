# 02 — Requisitos (refatoração): PDV Loja — Ajustes da tela de cor/tamanho e do topo do PDV

## Motivação
No celular, a grade de tamanhos estoura a largura da tela e fica desalinhada; "sem estoque" ocupa espaço demais dentro de cada tamanho; o topo mostra "BALCÃO", vendedor e data, que não ajudam na venda.

## Ajustes ao Planejamento (decididos pelo Lucas em 2026-10-01, nesta fase)
- **Não existe layout de tablet no código**: o PDV é uma página única, com folha de até 460px centralizada (`src/telas/Folha.tsx`, sem `@media`). O item "topo do tablet fica como está" do `01-planejamento.md` deixa de valer: o topo novo vale para a página única (decisão do Lucas: "topo novo na página única").
- **"Pagamento" não é etapa separada**: a forma de pagamento é um bloco da aba Pedido. O topo terá quatro etapas, sem "Pagamento" (decisão do Lucas).
- Confirmado pelo Lucas ("pode seguir"): tamanho sem saldo continua desabilitado; nada mais muda nessas telas; o aviso de limite fica como está.

## Pontos de entrada afetados
| Ponto de entrada | Tipo (HTTP / evento / fila / job / função pública) | Consumidores |
|---|---|---|
| `Cabecalho` (`src/telas/Pdv/Cabecalho.tsx`) | componente de tela | `Pdv.tsx` (abas Produtos, Pedido e Dia; também com catálogo carregando ou em falha) |
| `Variacoes` (`src/telas/Pdv/Variacoes.tsx`) | componente de tela | `Pdv.tsx` (aba Produtos com produto escolhido) |
| `textoSaldo` (`src/dominio/catalogo.ts`) | função pública | `Variacoes.tsx` (único uso) |
| `.grade4`, `.tamanho*`, `.cabecalho`, `.marca`, `.subtitulo`, `.data` (`Pdv.module.css`) | estilos | telas acima |

## Invariantes — o que NÃO pode mudar

### Contratos externos intocáveis
| ID | Contrato | Detalhe (payload, formato, códigos de erro, ordenação...) |
|---|---|---|
| INV-001 | Chamadas à API | Nenhuma chamada muda (catálogo, venda, login): mesmos endpoints, corpos e tratamento de erro. |

### Comportamentos que devem ser preservados
| ID | Comportamento | Como verificar |
|---|---|---|
| INV-010 | Tamanho com saldo 0 aparece desabilitado e não pode ser escolhido. | Teste de tela: botão do tamanho `disabled`. |
| INV-011 | Cada tamanho mostra sigla, preço e saldo, nessa ordem, e os tamanhos mantêm a ordem de hoje. | Teste de tela: texto e ordem dos botões. |
| INV-012 | Tamanhos só aparecem depois de escolher a cor; ao trocar de cor, o tamanho escolhido se mantém se tiver saldo na cor nova. | Testes existentes de `pdv.test.tsx`. |
| INV-013 | Cor com todos os tamanhos zerados mostra "sem estoque" e continua clicável; o produto sem estoque mostra "sem estoque" na lista e abre para consulta. | Testes existentes (`Pretosem estoque`, card do produto). |
| INV-014 | Linha de apoio acima do botão fica igual: "Falta escolher: …", resumo com preço, "Só N em estoque — já no pedido". Avisos de limite do Pedido também ficam iguais. | Testes existentes de `resumoEscolha` e do Pedido. |
| INV-015 | Botão de voltar, nome do produto e tecido na tela de cor/tamanho ficam iguais. | Testes existentes. |
| INV-016 | As três abas de baixo, o contador "Pedido (N)" e os botões "Adicionar ao pedido" / "Fechar venda" ficam iguais. | Testes existentes. |
| INV-017 | O topo continua fixo no alto ao rolar a tela e aparece nas três abas, inclusive com o catálogo carregando ou em falha. | Teste de tela + conferência no navegador. |
| INV-018 | A tela de login não muda (ela tem o seu próprio "BALCÃO"). | Testes existentes do login. |

### Bugs conhecidos a preservar
Nenhum.

| ID | Bug | Quem pode depender dele | Decisão |
|---|---|---|---|
| | | | |

## O que pode mudar
Mudanças intencionais (pedidas pelo Lucas):

| ID | Mudança |
|---|---|
| MUD-01 | Saldo do tamanho: "N un." vira "estoque N"; "sem estoque" vira "estoque 0" (saldo negativo também mostra "estoque 0"). |
| MUD-02 | Grade de tamanhos cabe na largura da tela, com colunas iguais e alinhadas (produto com 6 tamanhos e preço de 3 dígitos como caso de referência, a 360px de largura). |
| MUD-03 | Topo: saem "BALCÃO", "{vendedor} · pedido novo" e a data; entra o nome da etapa — "Produtos" (lista de produtos), "Cor e tamanho" (produto escolhido), "Pedido", "Dia". |
| MUD-04 | Nome do vendedor e data não aparecem em nenhum lugar do PDV. |

Também pode mudar: estrutura interna dos componentes, nomes de classes CSS, assinatura do `Cabecalho`, remoção de estilos e helpers que ficarem sem uso.

**Efeito nos testes:** cerca de 25 testes (`login.test.tsx`, `login.caracterizacao.test.tsx`, `pdv.test.tsx`, helper em `ajuda.tsx`) usam o texto "Carlos · pedido novo" como sinal de que o login deu certo. Eles passam a procurar a etapa "Produtos" no topo. É troca do sinal usado pelo teste; o comportamento do login não muda (INV-018). Os testes de `textoSaldo` e os que conferem "N un." / "sem estoque" no tamanho mudam por MUD-01. O teste do cabeçalho ("BALCÃO", vendedor, data) muda por MUD-03.

## Invariantes alterados intencionalmente
<Preenchido durante as Fases 4 e 5 se um teste de caracterização quebrar e a mudança for aceita.>

| ID | Mudança | Motivo | Aprovado por | Data |
|---|---|---|---|---|
| | | | | |

## Aprendizados aplicados
Nenhum nesta fase (AP-001 não se aplica: não há ação disparada sem botão; AP-002 é da Implantação).

## Aprovação
- Aprovado por: Lucas ("sim aprovo")
- Data/hora: 2026-10-01 23:03
