# pdv-frontend — Documentação executiva (versão 3)

## Visão Geral

O **pdv-frontend** é a tela do ponto de venda (PDV) da loja FitMoveOn: a página que o vendedor
abre no navegador do celular para entrar com a senha, montar o pedido do cliente e fechar a venda.
Não é um aplicativo instalado. É uma página na internet, que funciona no Chrome (Android) e no
Safari (iPhone).

A página reproduz o design aprovado pelo cliente (`design_handoff_pdv_loja/`), pensado para um
público acima de 50 anos: letras grandes, botões grandes, poucos passos, nada escondido e nenhuma
animação.

A tela não guarda vendas nem decide preços. Quem registra a venda, calcula os valores oficiais, dá o
número do pedido e baixa o estoque é o serviço **pdv-backend**. A tela mostra os totais enquanto o
pedido é montado, com a mesma conta do servidor, mas o valor que vale é sempre o devolvido pelo
servidor.

**O que mudou na versão 3 (feature integracao-pdv-erp): a tela vende pelo catálogo do ERP e respeita o
estoque.** Os produtos agora vêm do **ERP Move On** (o sistema de gestão da loja). A escolha passou a
ser **produto → cor → tamanho**, e cada tamanho mostra o preço e quantas peças há em estoque. O que
está zerado aparece como "sem estoque" e não pode ser escolhido, e o pedido não deixa passar da
quantidade disponível. Se, ao fechar, outra venda tiver levado a peça, a tela avisa qual peça faltou,
atualiza os estoques e mantém o pedido para o vendedor ajustar. Depois de cada venda, os estoques da
tela são atualizados. Desenvolvida e conferida no modo de demonstração; testes e publicação pendentes.

**O que mudou na versão 2 (feature pdv-integracao):** a página foi preparada para ser publicada na
internet e ligada ao serviço real. Publicada em 2026-09-27 em https://pdv-loja-frontend.vercel.app.

## Funcionalidades Principais

- **Entrada do vendedor.** A etapa "Quem está vendendo?" só aparece quando há mais de um vendedor
  ativo. Com um só, a tela já pede a senha. A senha de 4 números é digitada num teclado numérico
  da própria tela. Senha errada mostra "Senha incorreta. Tente de novo." e limpa os números.
- **Sessão do dia.** Se o vendedor já entrou hoje, ao abrir a página vai direto para a venda. À
  meia-noite, ou se o servidor recusar a sessão, a página volta sozinha para a tela de entrada.
- **Cabeçalho** com o nome do vendedor, a indicação "pedido novo" e a data de hoje.
- **Aba Produtos (alterada na v3)**: botões com os tipos de peça do ERP (só os que têm produto à venda;
  o primeiro já vem marcado) e a lista de produtos do tipo, com o tecido e o preço "a partir de". O
  produto sem nenhuma peça em estoque mostra "sem estoque", mas ainda abre para consulta. Com o
  catálogo do ERP vazio, aparece "Nenhum produto cadastrado no ERP".
- **Escolha da variação (alterada na v3)**: primeiro a cor (bolinha com o tom ou miniatura da estampa;
  cor sem estoque avisa "sem estoque"), depois o tamanho, cada um com o preço e "N un." em estoque.
  Tamanho sem estoque aparece desabilitado. Ao trocar de cor, o tamanho escolhido continua se existir
  com estoque na cor nova. A linha de apoio mostra o que falta escolher, o resumo "Cor · Tam X — R$" ou
  o aviso "Só N em estoque — já no pedido".
- **Aba Pedido**: nome do cliente e CPF (opcionais), itens com quantidade (+/−), desconto por peça
  (sem, 5%, 10% ou 15%), desconto no total (em passos de R$ 5), forma de pagamento, totais e
  "Cancelar pedido". **Na v3**, o "+" para no estoque disponível e mostra "Só N em estoque"; se o
  estoque caiu depois (outra venda), o item pede "diminua a quantidade" ou "exclua o item".
- **Botão principal na barra inferior**, que muda com a tela: "Adicionar ao pedido" na escolha da
  variação; no pedido, "Inclua uma peça", "Escolha o pagamento" ou "Fechar venda · R$ …".
- **Aviso "Venda registrada"** com número do pedido, peças, total, pagamento e cliente, e o botão
  "Nova venda".
- **Aba Dia**: total vendido hoje, número de pedidos e a lista das vendas do vendedor, da mais
  recente para a mais antiga.
- **Mensagens de erro e "Tentar de novo"** quando algo não carrega ou a internet falha. Enquanto o
  catálogo carrega, nada pode ser adicionado ao pedido.

## Fluxos de Negócio

**1. Entrada do vendedor**
1. A página abre e confere se já existe uma sessão válida para hoje. Se existir, vai direto para a
   venda. Se a conferência falhar por outro motivo (internet ou resposta inesperada), aparece uma
   mensagem com "Tentar de novo".
2. Se não existir, mostra o nome da unidade e a lista de vendedores (ou direto a senha, se houver
   só um).
3. O vendedor digita os 4 números e toca em "Entrar no PDV".
4. Senha errada: aparece a mensagem e os números são apagados. Falha de internet: aparece "Sem
   conexão. Tente de novo." e os números digitados são mantidos.

**2. Montagem e fechamento da venda (alterado na v3)**
1. Na aba Produtos, o vendedor escolhe o tipo de peça e o produto; depois a cor e o tamanho, vendo o
   preço e o estoque de cada tamanho.
2. "Adicionar ao pedido" leva à aba Pedido. Se a mesma variação for adicionada de novo, a quantidade
   da linha existente aumenta, sem criar outra linha, até o limite do estoque.
3. No pedido, o vendedor ajusta quantidades e descontos, informa cliente e CPF se quiser e escolhe o
   pagamento. Tocar "−" com quantidade 1 remove o item. O total nunca fica negativo.
4. "Fechar venda" envia só qual variação, a quantidade e o desconto de cada linha, sem preços. O
   servidor confere, calcula, registra e baixa o estoque.
5. **Faltou estoque ou a peça saiu de venda:** a mensagem do servidor aparece acima do botão, nomeando
   a peça; a tela atualiza os estoques e o pedido continua como estava, com os limites novos em cada
   item. O vendedor ajusta e fecha de novo.
6. Outros erros (por exemplo, CPF inválido) também aparecem acima do botão, com o pedido intacto; a
   mensagem some quando o pedido é editado.
7. Se a internet falhar, o vendedor pode tocar de novo em "Fechar venda". Cada pedido tem um código
   próprio, repetido em todas as tentativas, e o servidor registra a venda (e baixa o estoque) uma
   única vez.
8. Com a venda registrada, aparece o aviso com o número do pedido e os estoques da tela são
   atualizados em segundo plano. "Nova venda" limpa tudo e volta para Produtos.

**3. Cancelar pedido**
- "Cancelar pedido" limpa o pedido na hora, sem pedir confirmação, como está no design.

**4. Consulta do dia**
- A aba Dia busca no servidor as vendas de hoje sempre que é aberta. Funciona mesmo quando o
  catálogo ainda está carregando ou não carregou.

## Integrações e Dependências

| Item | Para que serve |
|---|---|
| **pdv-backend** (API) | Fonte de tudo o que a tela mostra e destino das vendas. A página chama os endereços `/api/...` no mesmo domínio; a hospedagem repassa essas chamadas ao pdv-backend de produção (`pdv-loja-backend.vercel.app`). |
| **ERP Move On** (indireto) | **Novo na v3:** o catálogo mostrado (tipos, produtos, cores, tamanhos, preços e estoques) é o cadastrado no ERP. A página não fala com o ERP: recebe tudo pelo pdv-backend, que lê o banco compartilhado. |
| **Contrato da API** (`backend/contrato/openapi.yaml`) | Descrição oficial das mensagens trocadas com o pdv-backend. Os tipos de dados da tela são gerados a partir dele. **Mudou na v3** (catálogo novo, venda por variação, erro "sem estoque"): página e serviço precisam ser publicados juntos. |
| **API simulada (MSW)** | Imita o pdv-backend dentro do navegador, agora com um catálogo de exemplo no formato do ERP (os mesmos produtos e estoques do catálogo de exemplo do back) e com baixa de estoque a cada venda. É usada no desenvolvimento e nos testes e não vai para a versão publicada. |
| **Fonte Libre Franklin** | Tipografia do design, incluída na própria página. |
| **Hospedagem (Vercel)** | Projeto próprio `pdv-loja-frontend`, com Node 22. Publica só a página pronta e repassa `/api` ao pdv-backend. |
| **Código-fonte (GitHub)** | Repositório próprio: `lucoti/pdv-loja-frontend`. O que entra na branch principal é publicado em produção pela Vercel. |

Modos de uso no desenvolvimento: `npm run dev` abre a página com a API simulada, sem precisar do
back-end. `npm run dev:api` usa o pdv-backend rodando na mesma máquina.

## Dados Gerenciados

A página não tem banco de dados e **não salva nada no aparelho**. Tudo fica só na memória enquanto
a página está aberta:
- o vendedor conectado (nome e cargo);
- o pedido em andamento: itens (cada um é uma variação do ERP), quantidades, descontos, cliente, CPF,
  forma de pagamento e o código do pedido para evitar duplicidade;
- o catálogo (com os estoques do momento em que foi carregado) e as vendas do dia, buscados no
  servidor.

A senha e o CPF não são gravados no aparelho, não aparecem no endereço da página e não vão para
registros de erro. Todos os valores são tratados em centavos, como no servidor.

## Pontos de Atenção

- **Publicar junto com o pdv-backend v4.** O formato do catálogo e da venda mudou. A página nova com o
  serviço antigo (ou o contrário) não funciona. A publicação vem depois da atualização do banco do ERP.
- **Estoque mostrado é o do momento da carga.** A tela atualiza os estoques depois de cada venda e
  quando o servidor recusa por falta de estoque, mas não em tempo real: outro vendedor pode levar a
  peça antes. Nesse caso o servidor recusa e nada é gravado.
- **Preço mudado com o pedido aberto.** Cada vez que a tela atualiza o catálogo, os itens do pedido
  passam a usar o preço atual do ERP, e o total mostrado acompanha. Se o preço mudar depois da última
  atualização, o aviso "Venda registrada" mostra o valor do servidor, que é o que vale.
- **Tipo que sai do catálogo.** Se, numa atualização, o tipo selecionado deixar de ter produtos, a
  tela volta para o primeiro tipo da lista.
- **Pedido perdido se a sessão cair.** Se a sessão expirar (meia-noite) ou for recusada no meio de
  uma venda, a página volta para a entrada e o pedido em andamento se perde. **Recarregar a página**
  também descarta o pedido.
- **Exige endereço seguro (HTTPS).** Em teste, abrir a página pelo endereço de rede local
  (http://192.168…) impede montar e fechar vendas.
- **A API simulada precisa acompanhar o servidor real** (e o catálogo de exemplo do back). Ela é
  simplificada: por exemplo, trabalha com um único tecido. Na simulação, a sessão, as vendas e os
  estoques voltam ao início ao recarregar a página.
- **Não há botão "Sair"** e **não há confirmação em "Cancelar pedido"**, conforme o design.
- **Sem impressão de cupom** nesta versão e **sem funcionamento offline**.
- **Versões de teste usam o servidor de produção.** Vendas feitas numa versão de teste (preview) vão
  para o banco real e, a partir da v3, **baixam o estoque real do ERP**.
- **Endereço do serviço fixo no código.** Se o endereço do pdv-backend mudar, o repasse precisa ser
  atualizado e a página publicada de novo.
- **Fora do escopo**: leitura do código da peça ou do código de barras, venda sem estoque, troca e
  devolução.

## Histórico de Versões

| Versão | Data | Resumo |
|---|---|---|
| v1 | 2026-09-27 | Primeira versão: página web do PDV no celular, com entrada por senha, escolha de produtos e variações, pedido com descontos e pagamento, fechamento com proteção contra duplicidade, aviso de venda registrada e vendas do dia. Construída contra a API simulada; integração real pendente (pdv-integracao). |
| v2 | 2026-09-27 | Preparação para publicação (feature pdv-integracao): repositório e projeto Vercel próprios, repasse de `/api` para o pdv-backend de produção (mesmo domínio, sem CORS), Node 22 fixo e correção na verificação de sessão ao abrir a página. Publicada em 2026-09-27. |
| v3 | 2026-09-29 | Catálogo do ERP (feature integracao-pdv-erp): tipos do ERP, escolha produto → cor → tamanho com preço e estoque de cada tamanho, "sem estoque" desabilitado, pedido limitado ao estoque ("Só N em estoque"), tratamento da recusa por falta de estoque (mensagem com a peça, estoques atualizados, pedido mantido) e atualização dos estoques depois de cada venda. API simulada no formato novo. Desenvolvida; testes e publicação pendentes. |
