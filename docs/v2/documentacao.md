# pdv-frontend — Documentação executiva (versão 2)

## Visão Geral

O **pdv-frontend** é a tela do ponto de venda (PDV) da loja FitMoveOn: a página que o vendedor
abre no navegador do celular para entrar com a senha, montar o pedido do cliente e fechar a venda.
Não é um aplicativo instalado. É uma página na internet, que funciona no Chrome (Android) e no
Safari (iPhone).

A página reproduz o design aprovado pelo cliente (`design_handoff_pdv_loja/`), pensado para um
público acima de 50 anos: letras grandes, botões grandes, poucos passos, nada escondido e nenhuma
animação.

A tela não guarda vendas nem decide preços. Quem registra a venda, calcula os valores oficiais e
dá o número do pedido é o serviço **pdv-backend**. A tela mostra os totais enquanto o pedido é
montado, com a mesma conta do servidor, mas o valor que vale é sempre o devolvido pelo servidor.

A versão 1 foi construída e conferida contra uma **API simulada**, que imita o pdv-backend dentro
do próprio navegador.

**O que mudou na versão 2 (feature pdv-integracao):** a página foi preparada para ser publicada na
internet e ligada ao serviço real. As chamadas `/api` feitas no endereço da página passam a ser
repassadas ao pdv-backend, e a verificação de sessão ao abrir a página ficou mais robusta. As telas
e regras não mudaram. Publicada em 2026-09-27 em https://pdv-loja-frontend.vercel.app e conferida
no Chrome de Android e no Safari de iPhone.

## Funcionalidades Principais

- **Entrada do vendedor.** A etapa "Quem está vendendo?" só aparece quando há mais de um vendedor
  ativo. Com um só, a tela já pede a senha. A senha de 4 números é digitada num teclado numérico
  da própria tela. Senha errada mostra "Senha incorreta. Tente de novo." e limpa os números.
- **Sessão do dia.** Se o vendedor já entrou hoje, ao abrir a página vai direto para a venda. À
  meia-noite, ou se o servidor recusar a sessão, a página volta sozinha para a tela de entrada.
- **Cabeçalho** com o nome do vendedor, a indicação "pedido novo" e a data de hoje.
- **Aba Produtos**: categorias (Calças, Bermudas, Tops, Conjuntos), lista de modelos com o preço
  "a partir de" e painel de escolha de tecido, tamanho e cor. Uma linha de apoio mostra o que ainda
  falta escolher ou, com tudo escolhido, o resumo com o preço.
- **Aba Pedido**: nome do cliente e CPF (opcionais), itens com quantidade (+/−), desconto por peça
  (sem, 5%, 10% ou 15%), desconto no total (em passos de R$ 5), forma de pagamento, totais e
  "Cancelar pedido".
- **Botão principal na barra inferior**, que muda com a tela: "Adicionar ao pedido" na escolha da
  variação; no pedido, "Inclua uma peça", "Escolha o pagamento" ou "Fechar venda · R$ …".
- **Aviso "Venda registrada"** com número do pedido, peças, total, pagamento e cliente, e o botão
  "Nova venda".
- **Aba Dia**: total vendido hoje, número de pedidos e a lista das vendas do vendedor, da mais
  recente para a mais antiga.
- **Mensagens de erro e "Tentar de novo"** quando algo não carrega ou a internet falha. Na v2, se a
  resposta do servidor ao abrir a página vier num formato inesperado, a página mostra "Algo deu
  errado. Tente de novo." com o botão "Tentar de novo", em vez de ficar parada em "Carregando…" ou
  mostrar texto técnico ao vendedor.

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

**2. Montagem e fechamento da venda**
1. Na aba Produtos, o vendedor escolhe a categoria, o modelo e depois tecido, tamanho e cor. O
   tecido já vem marcado com a primeira opção (Suplex Normal).
2. "Adicionar ao pedido" leva à aba Pedido. Se a mesma variação (modelo, tecido, tamanho e cor) for
   adicionada de novo, a quantidade da linha existente aumenta, sem criar outra linha.
3. No pedido, o vendedor ajusta quantidades e descontos, informa cliente e CPF se quiser e escolhe o
   pagamento. Tocar "−" com quantidade 1 remove o item. O total nunca fica negativo.
4. "Fechar venda" envia só as escolhas, sem preços. O servidor confere, calcula e registra.
5. Se o servidor recusar (por exemplo, CPF inválido), a mensagem dele aparece acima do botão, o
   pedido continua intacto e a mensagem some quando o pedido é editado.
6. Se a internet falhar, o vendedor pode tocar de novo em "Fechar venda". Cada pedido tem um código
   próprio, repetido em todas as tentativas, e o servidor usa esse código para registrar a venda uma
   única vez, mesmo que o envio chegue duas vezes.
7. Com a venda registrada, aparece o aviso com o número do pedido. "Nova venda" limpa tudo e volta
   para Produtos.

**3. Cancelar pedido**
- "Cancelar pedido" limpa o pedido na hora, sem pedir confirmação, como está no design.

**4. Consulta do dia**
- A aba Dia busca no servidor as vendas de hoje sempre que é aberta. Funciona mesmo quando o
  catálogo ainda está carregando ou não carregou.

## Integrações e Dependências

| Item | Para que serve |
|---|---|
| **pdv-backend** (API) | Fonte de tudo o que a tela mostra e destino das vendas. A página chama os endereços `/api/...` no mesmo domínio em que está publicada; a hospedagem repassa essas chamadas ao endereço de produção do serviço (`pdv-loja-backend.vercel.app`). Para o celular, página e API parecem ser o mesmo site, e por isso a sessão (cookie) funciona sem liberação entre domínios. |
| **Contrato da API** (`backend/contrato/openapi.yaml`) | Descrição oficial das mensagens trocadas com o pdv-backend. Os tipos de dados da tela são gerados a partir dele, e uma mudança no contrato aparece como erro na hora de gerar a página, antes de chegar ao vendedor. |
| **API simulada (MSW)** | Imita o pdv-backend dentro do navegador, com os dados de exemplo do design (vendedor Carlos, senha 1234, pedidos a partir do 1042). É usada no desenvolvimento e nos testes e não vai para a versão publicada. |
| **Fonte Libre Franklin** | Tipografia do design, incluída na própria página, sem depender de serviço externo. |
| **Hospedagem (Vercel)** | Projeto próprio `pdv-loja-frontend` (endereço previsto: `pdv-loja-frontend.vercel.app`, sem domínio próprio por enquanto), com Node 22. Publica só a página pronta (sem nada da API simulada) e repassa `/api` ao pdv-backend. |
| **Código-fonte (GitHub)** | Repositório próprio: `lucoti/pdv-loja-frontend`. O que entra na branch principal é publicado em produção pela Vercel. |

Modos de uso no desenvolvimento: `npm run dev` abre a página com a API simulada, sem precisar do
back-end. `npm run dev:api` usa o pdv-backend rodando na mesma máquina.

## Dados Gerenciados

A página não tem banco de dados e **não salva nada no aparelho**. Tudo fica só na memória enquanto
a página está aberta:
- o vendedor conectado (nome e cargo);
- o pedido em andamento: itens, quantidades, descontos, cliente, CPF, forma de pagamento e o
  código do pedido para evitar duplicidade;
- o catálogo e as vendas do dia, buscados no servidor.

A senha e o CPF não são gravados no aparelho, não aparecem no endereço da página e não vão para
registros de erro. A sessão fica num cookie protegido criado pelo servidor, que a página não lê.
Todos os valores são tratados em centavos, como no servidor.

## Pontos de Atenção

- **Pedido perdido se a sessão cair.** Se a sessão expirar (meia-noite) ou for recusada no meio de
  uma venda, a página volta para a entrada e o pedido em andamento se perde, porque nada é salvo no
  aparelho. Isso segue o escopo aprovado. Se for um problema na prática, o pedido pode passar a ser
  guardado no aparelho numa versão futura.
- **Recarregar a página volta para Produtos.** O pedido em andamento é descartado.
- **Exige endereço seguro (HTTPS).** A página gera o código antiduplicidade de cada pedido com um
  recurso que o navegador só libera em HTTPS ou na própria máquina. A publicação na Vercel é HTTPS.
  Em teste, abrir a página pelo endereço de rede local (http://192.168…) impede fechar vendas.
- **A tela mostra, o servidor decide.** A conta de preços da tela copia a do servidor. Se as regras
  de preço mudarem no pdv-backend, esta página precisa mudar junto; senão o total exibido antes de
  fechar pode divergir do registrado. O aviso "Venda registrada" sempre mostra o valor do servidor.
- **A API simulada precisa acompanhar o servidor real.** Ela reproduz as regras e mensagens do
  pdv-backend, mas de forma simplificada. Por exemplo, qualquer item inválido aparece como "modelo
  indisponível", enquanto o servidor real diz qual escolha é inválida. Na simulação, a sessão e as
  vendas somem ao recarregar a página.
- **Não há botão "Sair".** O design não tem. A sessão termina sozinha à meia-noite.
- **Sem confirmação em "Cancelar pedido"**, conforme o design. Um toque por engano apaga o pedido.
- **Sem impressão de cupom** nesta versão: a loja ainda não tem impressora.
- **Sem funcionamento offline**: sem internet não é possível entrar nem fechar vendas.
- **Versões de teste usam o servidor de produção.** O repasse de `/api` aponta sempre para o
  endereço de produção do pdv-backend, inclusive nas versões de teste (preview) da página. Vendas
  feitas numa versão de teste vão para o banco real.
- **Endereço do serviço fixo no código.** Se o endereço do pdv-backend mudar (por exemplo, com
  domínio próprio), a configuração do repasse precisa ser atualizada e a página publicada de novo.
- **Catálogo de exemplo.** A página está no ar com o catálogo de exemplo do design; a loja só passa
  a usar o PDV depois que o catálogo real for cadastrado (feature futura).
- **Projeto antigo obsoleto.** O repositório único antigo e o projeto Vercel antigo não são mais
  usados. A remoção deles fica a critério do Lucas.

## Histórico de Versões

| Versão | Data | Resumo |
|---|---|---|
| v1 | 2026-09-27 | Primeira versão: página web do PDV no celular, com entrada por senha, escolha de produtos e variações, pedido com descontos e pagamento, fechamento com proteção contra duplicidade, aviso de venda registrada e vendas do dia. Construída contra a API simulada; integração real pendente (pdv-integracao). |
| v2 | 2026-09-27 | Preparação para publicação (feature pdv-integracao): repositório e projeto Vercel próprios, repasse de `/api` para o pdv-backend de produção (mesmo domínio, sem CORS), Node 22 fixo e correção na verificação de sessão ao abrir a página (resposta inesperada mostra "Tentar de novo" com mensagem amigável, em vez de travar em "Carregando…"). Publicada em 2026-09-27. |
