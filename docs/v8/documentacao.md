# pdv-frontend — Documentação executiva (versão 8)

> **Retrato da página como ela é hoje ("as-is")**, em 2026-10-05, antes da refatoração
> **pdv-mobile-refatorado** (novo visual escuro "Nocturne", venda começando pelo cliente e desconto
> único no pedido). **Nada mudou no funcionamento em relação à v7**: esta versão só descreve com mais
> detalhe a tela de venda atual e registra os pontos que a refatoração precisa respeitar. A página no
> ar é a v7, publicada em 2026-10-01. A versão seguinte (v9) descreverá o estado novo, depois da
> refatoração, para comparação com esta.

## Visão Geral

O **pdv-frontend** é a tela do ponto de venda (PDV) da loja FitMoveOn: a página que o vendedor
abre no navegador do celular para entrar com a senha, montar o pedido do cliente e fechar a venda.
Não é um aplicativo instalado. É uma página na internet, que funciona no Chrome (Android) e no
Safari (iPhone).

A página reproduz o design aprovado em 2026-09 (`design_handoff_pdv_loja/`), pensado para um público
acima de 50 anos: **tema claro** (fundo creme, texto quase preto, botões verdes), letras grandes,
botões grandes, poucos passos, nada escondido e nenhuma animação. É uma página só, com uma folha de
no máximo 460 pontos de largura centralizada; no tablet sobra fundo dos lados.

A tela não guarda vendas nem decide preços. Quem registra a venda, calcula os valores oficiais, dá o
número do pedido e baixa o estoque é o serviço **pdv-backend**. A tela mostra os totais enquanto o
pedido é montado, com a mesma conta do servidor, mas o valor que vale é sempre o devolvido pelo
servidor.

**O que esta versão (v8) acrescenta:** nenhuma mudança na página. Foram detalhados a aba Pedido
(cliente e CPF, os dois tipos de desconto e o botão de fechar), o aviso "Venda registrada", a lista
de produtos e o topo, e o código ganhou comentários sobre onde o CPF passa, de que partes da tela os
testes automáticos dependem e onde ficam as cores do tema. Esses pontos estão em "Pontos de Atenção".

**O que mudou na versão 7 (feature pdv-ajustes-tela-variacoes), publicada em 2026-10-01:** tamanhos
em três colunas iguais que cabem no celular, estoque de cada tamanho como "estoque N" e topo da tela
de venda só com a etapa ("Produtos", "Cor e tamanho", "Pedido" ou "Dia"), sem "BALCÃO", vendedor e
data. As versões anteriores estão resumidas no Histórico de Versões.

## Funcionalidades Principais

- **Entrada do vendedor.** A etapa "Quem está vendendo?" só aparece quando há mais de um vendedor
  ativo. A senha tem 8 números, digitados num teclado da própria tela, e **não há botão de
  confirmar**: o oitavo número já dispara a conferência. Qualquer erro limpa os números e mostra a
  mensagem.
- **Sessão do dia.** Se o vendedor já entrou hoje, ao abrir a página vai direto para a venda. À
  meia-noite, ou se o servidor recusar a sessão, a página volta sozinha para a tela de entrada.
- **Topo da tela de venda.** Faixa escura presa no alto, com uma única informação: a etapa em que o
  vendedor está — "Produtos", "Cor e tamanho", "Pedido" ou "Dia". Aparece também enquanto o catálogo
  carrega ou quando ele não carregou (com o nome da aba).
- **Barra de baixo com três abas**: "Produtos", "Pedido" (com o número de peças entre parênteses,
  por exemplo "Pedido (3)", quando há alguma) e "Dia". Acima das abas fica o botão grande da tela
  atual, quando houver.
- **Aba Produtos.** Botões ("chips") com os tipos de peça do ERP, lado a lado e quebrando linha; o
  primeiro já vem marcado. Abaixo, a lista dos produtos do tipo, cada um com o nome, o tecido e o
  preço **"a partir de R$ …"** (o menor preço entre as variações). O produto sem nenhuma peça em
  estoque mostra **"sem estoque"**, mas ainda abre para consulta. Com o catálogo vazio aparece
  "Nenhum produto cadastrado no ERP".
- **Tela de cor e tamanho** (dentro da aba Produtos). Seta de voltar, nome do produto e tecido no
  alto. **Cores em duas colunas**, cada uma com a bolinha do tom (ou a miniatura da estampa) e o nome;
  a cor sem estoque em nenhum tamanho avisa **"sem estoque"**, mas continua clicável. Depois de
  escolher a cor aparecem os **tamanhos em três colunas**, cada um com a sigla, o preço e
  **"estoque N"**; o tamanho com "estoque 0" fica desabilitado. Ao trocar de cor, o tamanho escolhido
  continua se tiver estoque na cor nova. A linha acima do botão mostra o que falta ("Falta escolher:
  cor, tamanho"), o resumo "Cor · Tam X — R$ …" ou "Só N em estoque — já no pedido". O botão é
  **"Adicionar ao pedido"**.
- **Aba Pedido** (título "Novo pedido"), nesta ordem:
  1. **Cliente**: "Nome do cliente" e **"CPF (opcional)"**, os dois opcionais, digitados livremente
     (o CPF não tem máscara; é conferido só pelo servidor ao fechar).
  2. **Itens**: um cartão por variação, com modelo, tecido, tamanho, cor e preço unitário, botão
     "Excluir", quantidade com "−" e "+", subtotal e, quando houver, "−N% aplicado". O "+" para no
     estoque ("Só N em estoque"); se o estoque caiu depois, o item pede "diminua a quantidade" ou
     "exclua o item".
  3. **Desconto por peça**, dentro de cada item: botões **"sem", "5%", "10%" e "15%"**.
  4. **Desconto no total**: "−" e "+" em passos de **R$ 5**; mostra "sem desconto" ou "− R$ …".
  5. **Forma de pagamento**: botões em duas colunas, vindos do servidor.
  6. **Totais**: peças e valor cheio, "Descontos" (peças + total) e "Total".
  7. **"Cancelar pedido"**, sem confirmação.
- **Botão de fechar** (na barra de baixo, na aba Pedido): "Inclua uma peça" (sem itens), "Escolha o
  pagamento" (sem pagamento) ou **"Fechar venda · R$ …"**. Enquanto envia, fica travado.
- **Aviso "Venda registrada"**: janela no meio da tela, sobre um fundo escurecido, com "Pedido #N ·
  N peça(s) · R$ … em {pagamento}" e o nome do cliente, se houver. Os valores são os devolvidos pelo
  servidor. Só fecha pelo botão **"Nova venda"**, que limpa o pedido e volta para Produtos.
- **Aba Dia** (título "Vendas de hoje"): caixas "Total do dia" e "Pedidos" e a lista das vendas do
  vendedor ("Pedido #N · cliente", hora, peças e pagamento, e o total), buscada de novo toda vez que a
  aba é aberta. Funciona mesmo com o catálogo carregando ou em falha.
- **Mensagens de erro e "Tentar de novo"** quando algo não carrega ou a internet falha.

## Fluxos de Negócio

**1. Entrada do vendedor (alterado na v5)**
1. A página abre e confere se já existe uma sessão válida para hoje. Se existir, vai direto para a
   venda. Se a conferência falhar por outro motivo (internet ou resposta inesperada), aparece uma
   mensagem com "Tentar de novo".
2. Se não existir, a página busca o nome da unidade e a lista de vendedores ativos. O topo mostra
   "BALCÃO" e "Ponto de venda · {unidade}"; o rodapé mostra "Esqueceu a senha? Peça ao gerente.".
   Se essa busca falhar, aparece a mensagem de erro com "Tentar de novo".
3. **Escolha do vendedor.** Com mais de um vendedor, aparece "Quem está vendendo?", com a inicial, o
   nome e o cargo de cada um. Ao tocar num nome, a tela passa para a senha, com uma seta para voltar
   e trocar de vendedor (o que apaga os números e a mensagem de erro). Com um vendedor só, essa
   etapa não aparece e não há seta de voltar.
4. **Senha de 8 números.** A tela mostra o nome do vendedor, a instrução "Digite sua senha de 8
   números", oito marcadores que se preenchem a cada número e um teclado da própria página (1 a 9,
   0 e "apagar"); o teclado do celular não abre. "apagar" remove o último número.
5. **Entrada automática, sem botão.** Assim que o oitavo número é digitado, a página envia o vendedor
   e a senha ao servidor. Não existe mais o botão "Entrar no PDV". Enquanto o servidor responde, os
   oito marcadores ficam preenchidos e **o teclado e a seta de trocar de vendedor ficam travados**:
   toques a mais não mudam a senha nem geram um segundo pedido de entrada. Não há aviso de
   "carregando" nessa espera, porque o design não prevê.
6. **Senha certa:** a página abre direto a tela de venda, na lista de produtos (o topo mostra
   "Produtos").
7. **Senha errada:** aparece "Senha incorreta. Tente de novo." e os números são apagados. A mesma
   mensagem vale para vendedor que não existe mais ou foi desativado.
8. **Falha de internet ou outro erro:** aparece "Sem conexão. Tente de novo." (ou a mensagem do
   servidor, ou "Algo deu errado. Tente de novo.") e os números **também são apagados**. Como não há
   botão para repetir o envio, o vendedor digita a senha de novo. Antes (v4) os números ficavam na
   tela; a mudança foi decidida de propósito.
9. A mensagem de erro some assim que o vendedor digita ou apaga um número. Depois de um erro, o
   teclado volta a responder.
10. **Sessão até a meia-noite.** Depois de entrar, o vendedor continua conectado até a meia-noite
    (horário de São Paulo), mesmo fechando e abrindo a página. Passado esse horário, a próxima ação
    que precise do servidor devolve a página à tela de entrada.
11. **Troca de senha.** Não há tela para isso. A senha é trocada por uma pessoa técnica, com o
    comando `npm run pin:trocar` do pdv-backend; a troca encerra as sessões abertas do vendedor.
    A senha nova precisa ter 8 números.

**2. Montagem e fechamento da venda (como é hoje)**
1. A venda começa pela aba **Produtos**: o vendedor escolhe o tipo e o produto; depois a cor e o
   tamanho, vendo o preço e o estoque de cada tamanho. Não há etapa de cliente no início.
2. "Adicionar ao pedido" leva à aba Pedido. Se a mesma variação for adicionada de novo, a quantidade
   da linha existente aumenta, sem criar outra linha, até o limite do estoque.
3. No pedido, o vendedor informa, se quiser, o **nome do cliente e o CPF**, ajusta quantidades,
   escolhe o **desconto de cada peça** (sem, 5, 10 ou 15%) e o **desconto no total** (de R$ 5 em
   R$ 5) e escolhe o pagamento. "−" com quantidade 1 remove o item. O total nunca fica negativo.
4. "Fechar venda" envia o código do pedido, cada variação com a quantidade e o percentual de
   desconto, o desconto no total, o nome do cliente, o CPF e o pagamento — **sem preços**. O
   servidor confere, calcula, registra e baixa o estoque.
5. **Faltou estoque ou a peça saiu de venda:** a mensagem do servidor aparece acima do botão; a tela
   atualiza os estoques e o pedido continua como estava. O vendedor ajusta e fecha de novo.
6. **CPF inválido ou outro erro:** a mensagem aparece acima do botão, com o pedido intacto, e some
   quando o pedido é editado.
7. Se a internet falhar, o vendedor toca de novo em "Fechar venda". O código do pedido é o mesmo em
   todas as tentativas, e o servidor registra a venda (e baixa o estoque) uma única vez.
8. Com a venda registrada, aparece o aviso "Venda registrada" e os estoques são atualizados em
   segundo plano. **"Nova venda"** limpa tudo (inclusive cliente e CPF), gera um código de pedido
   novo e volta para Produtos.

**3. Cancelar pedido**
- "Cancelar pedido" limpa o pedido na hora (itens, descontos, cliente, CPF e pagamento), sem pedir
  confirmação, e gera um código de pedido novo.

**4. Consulta do dia**
- A aba Dia busca no servidor as vendas de hoje sempre que é aberta.

**5. Etapas da venda e o que o topo mostra**

| Onde o vendedor está | O topo mostra |
|---|---|
| Aba Produtos, lista de produtos | Produtos |
| Aba Produtos, com um produto aberto | Cor e tamanho |
| Aba Pedido (cliente, itens, descontos e pagamento) | Pedido |
| Aba Dia | Dia |

A tela de cor e tamanho não é uma aba: se o vendedor for a outra aba e voltar para Produtos, ela
reaparece com o que já estava escolhido. O pagamento é um bloco da aba Pedido, não uma etapa.

## Integrações e Dependências

| Item | Para que serve |
|---|---|
| **pdv-backend** (API) | Fonte de tudo o que a tela mostra e destino das vendas. A página chama os endereços `/api/...` no mesmo domínio; a hospedagem repassa essas chamadas ao pdv-backend de produção (`pdv-loja-backend.vercel.app`). |
| **ERP Move On** (indireto) | O catálogo mostrado (tipos, produtos, cores, tamanhos, preços e estoques) é o cadastrado no ERP. A página não fala com o ERP: recebe tudo pelo pdv-backend. |
| **Contrato da API** (`backend/contrato/openapi.yaml`) | Descrição oficial das mensagens trocadas com o pdv-backend. Os tipos de dados da tela são gerados a partir dele. Hoje a venda leva o campo **CPF**; a feature irmã **pdv-cliente-telefone** (no back) vai trocá-lo pelo **telefone**, e a página precisa acompanhar. |
| **API simulada (MSW)** | Imita o pdv-backend dentro do navegador (inclusive a conferência do CPF). Usada no desenvolvimento e nos testes; não vai para a versão publicada. |
| **Fonte Libre Franklin** | Tipografia do design atual, incluída na própria página. |
| **Hospedagem (Vercel)** | Projeto `pdv-loja-frontend`, com Node 22. Publica só a página pronta e repassa `/api` ao pdv-backend. |
| **Código-fonte (GitHub)** | Repositório `lucoti/pdv-loja-frontend`. O que entra na branch principal é publicado em produção. |

## Dados Gerenciados

A página não tem banco de dados e **não salva nada no aparelho**. Tudo fica só na memória enquanto a
página está aberta:
- o vendedor conectado (não é mostrado na tela de venda);
- o pedido em andamento: itens (cada um é uma variação do ERP), quantidades, desconto de cada peça,
  desconto no total, **nome do cliente, CPF**, forma de pagamento e o código do pedido para evitar
  duplicidade;
- o catálogo (com os estoques do momento da carga) e as vendas do dia.

A senha e o CPF não são gravados no aparelho, não aparecem no endereço da página e não vão para
registros de erro. O CPF só sai do aparelho no envio da venda; a aba Dia e o aviso de venda não o
mostram. Todos os valores são tratados em centavos, como no servidor.

## Pontos de Atenção

**Pontos levantados nesta versão, relevantes para a refatoração pdv-mobile-refatorado:**

- **Onde o CPF passa na página.** Campo "CPF (opcional)" na aba Pedido → guardado no pedido em
  memória → enviado no fechamento da venda. Não há máscara nem conferência na página: quem confere é
  o servidor (e a API simulada). Os testes automáticos usam o rótulo "CPF (opcional)" em vários
  casos, inclusive no que garante que o CPF não fica salvo no aparelho.
- **Troca do CPF pelo telefone depende do back.** O servidor recusa qualquer campo que não conheça.
  Uma página que mande "telefone" para o servidor atual tem toda venda recusada; por isso o serviço
  novo (pdv-cliente-telefone) precisa estar no ar antes da página nova.
- **O desconto no total não tem limite.** O "+" continua somando R$ 5 mesmo depois de passar do valor
  das peças; o total mostrado para em R$ 0,00 (o servidor faz a mesma conta). Para desfazer, o
  vendedor precisa tocar "−" várias vezes.
- **Os dois tipos de desconto convivem hoje.** O desconto de cada peça (percentual) e o desconto no
  total (em reais) somam. As listas de percentuais e o passo de R$ 5 precisam ser iguais na página e
  no servidor, senão a venda é recusada.
- **O aviso "Venda registrada" é o que gera o código do pedido seguinte.** Ele só fecha pelo botão
  "Nova venda", e é esse botão que troca o código de proteção contra duplicidade. Qualquer aviso que
  o substitua precisa manter a troca do código.
- **Partes da tela que os testes automáticos usam como sinal.** O topo com a etapa (usado para saber
  que a entrada deu certo, em quase todos os testes de entrada e de venda), o aviso "Venda
  registrada" com o botão "Nova venda", o rótulo "CPF (opcional)", os textos do botão de fechar
  ("Inclua uma peça", "Escolha o pagamento", "Fechar venda") e o "a partir de" da lista de produtos.
  Trocar qualquer um deles exige revisar, teste a teste, o que cada um conferia.
- **Onde ficam as cores do tema.** As cores e a fonte do tema claro estão num único arquivo de
  "tokens" (`src/estilos/tokens.css`), usado pelos estilos das telas de entrada e de venda. Há, porém,
  alguns brancos e sombras escritos direto nos estilos, a cor do navegador definida na página
  (`index.html`, tom quase preto) e um uso de cor dentro do código da tela de cor e tamanho (bolinha
  de cor sem tom cadastrado). Trocar o tema exige olhar esses pontos também.
- **Duplo toque em "Fechar venda".** A trava contra envio duplicado depende do redesenho da tela; o
  código de proteção contra duplicidade garante que o servidor grave uma venda só, mesmo que dois
  envios saiam.

**Pontos herdados das versões anteriores (continuam valendo):**

- **Troca de aba no instante em que o catálogo termina de carregar.** Nesse instante a página troca o
  topo e a barra de baixo, e um toque numa aba pode se perder. Visto só em teste automático.
- **Produto aberto que sai do catálogo.** Se uma atualização do catálogo tirar o produto aberto, a
  página volta sozinha para a lista de produtos.
- **"sem estoque" e "estoque 0" convivem.** A cor e o produto esgotados avisam "sem estoque"; o
  tamanho zerado mostra "estoque 0".
- **Preço de quatro dígitos em celular muito estreito.** A 320 pontos de largura, um preço acima de
  R$ 999,99 passa da borda do botão do tamanho. A 360 pontos, cabe.
- **A largura das grades só é conferida no navegador.** Os testes automáticos não medem largura; há
  um teste que confere a regra das três colunas no arquivo de estilos.
- **A tela de venda não mostra quem está vendendo nem a data.**

**Demais pontos:**

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
- **O tamanho da senha (8 números) precisa ser o mesmo na página, na API simulada e no pdv-backend.**
  Na v5, dentro da tela, um único valor define os marcadores, o texto da instrução e o momento do
  envio (antes o texto era escrito à parte). A API simulada e o pdv-backend têm a própria regra, e os
  testes automáticos avisam se ficarem diferentes. Mudar o tamanho continua exigindo publicar página e
  serviço juntos.
- **A API simulada é mais simples que o servidor na entrada.** A senha de exemplo (vendedor Carlos,
  12345678) fica em texto simples, a mensagem para senha fora do formato é diferente da do servidor e
  não existe vendedor desativado. Em uso normal isso não aparece, porque a tela só envia a senha
  completa.
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
| v4 | 2026-10-01 | Retrato as-is da tela de entrada (feature pdv-login-8-digitos, antes da refatoração): escolha do vendedor, senha de 4 números no teclado da página, botão "Entrar no PDV", comportamento em senha errada (apaga os números) e em falha de internet (mantém os números), sessão até a meia-noite e troca de senha pelo comando técnico. Nenhuma mudança de funcionamento, só comentários no código. |
| v5 | 2026-10-01 | Senha de 8 números e entrada automática (feature pdv-login-8-digitos, estado novo após a refatoração): oito marcadores, instrução "Digite sua senha de 8 números", botão "Entrar no PDV" removido (o oitavo número dispara a conferência), teclado e "Trocar vendedor" travados durante a conferência, e qualquer erro (senha errada, falha de internet ou outro) apaga os números e mostra a mensagem. API simulada com senha de exemplo `12345678`. Senhas de 4 números deixam de funcionar na publicação. Escolha do vendedor, sessão e venda inalteradas. Desenvolvida; validação final e publicação pendentes (publicar junto com o pdv-backend v6). |
| v6 | 2026-10-01 | Retrato as-is da tela de cor e tamanho e do topo da tela de venda (feature pdv-ajustes-tela-variacoes, antes da refatoração): topo fixo com "BALCÃO", "{vendedor} · pedido novo" e a data, igual em todas as abas; tamanhos em quatro colunas, cada um com sigla, preço e estoque ("N un." ou "sem estoque"); etapas da venda (lista de produtos, cor e tamanho, pedido, dia), sem versão para tablet. Registrados os problemas conhecidos: tamanhos que passam da largura da tela no celular, "sem estoque" largo demais e topo sem a etapa. Nenhuma mudança de funcionamento, só comentários no código. |
| v7 | 2026-10-01 | Ajustes da tela de cor e tamanho e do topo da tela de venda (feature pdv-ajustes-tela-variacoes, estado novo após a refatoração): tamanhos em três colunas iguais que cabem na largura do celular (seis tamanhos em duas linhas de três); estoque de cada tamanho como "estoque N", com "estoque 0" no tamanho zerado, que continua desabilitado ("sem estoque" da cor e da lista de produtos inalterado); topo só com a etapa ("Produtos", "Cor e tamanho", "Pedido" ou "Dia"), sem "BALCÃO", vendedor e data. Página única, sem versão para tablet; "Pagamento" segue como bloco da aba Pedido. Nenhuma mudança na conversa com o servidor nem na tela de entrada. Desenvolvida; validação final e publicação pendentes (só a página, sem o pdv-backend). |
| v8 | 2026-10-05 | Retrato as-is da tela de venda (feature pdv-mobile-refatorado, antes da refatoração): tema claro; venda começando por Produtos, sem etapa de cliente; nome do cliente e CPF opcionais na aba Pedido; desconto por peça (sem, 5, 10 ou 15%) e desconto no total em passos de R$ 5, sem limite; aviso "Venda registrada" com o botão "Nova venda", que gera o código do pedido seguinte; topo com o nome da etapa; "estoque N" nos tamanhos; "sem estoque" e "a partir de" na lista de produtos. Registrados os pontos para a refatoração: caminho do CPF, dependência do back para trocar CPF por telefone, sinais usados pelos testes e onde ficam as cores do tema. Nenhuma mudança de funcionamento, só comentários no código. |
