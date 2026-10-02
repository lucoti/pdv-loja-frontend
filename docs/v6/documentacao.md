# pdv-frontend — Documentação executiva (versão 6)

> **Retrato de como a página é hoje ("as-is")**, feito em 2026-10-01 antes da refatoração
> pdv-ajustes-tela-variacoes. Descreve em detalhe a tela de cor e tamanho e o topo da tela de venda,
> que são as partes que essa refatoração vai mexer. **Nada mudou no funcionamento**: só foram
> acrescentados comentários ao código. A versão seguinte desta documentação trará o estado novo, para
> comparação. A versão 5 (senha de 8 números) foi publicada em 2026-10-01, conforme o registro de
> implantação da feature pdv-login-8-digitos.

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

**O que mudou na versão 6 (feature pdv-ajustes-tela-variacoes, retrato as-is):** nada no
funcionamento. Foram detalhados o topo da tela de venda, a tela de cor e tamanho e as etapas da venda
(fluxo 5 e Pontos de Atenção), com os três problemas que motivam a refatoração: os tamanhos passam da
largura da tela no celular, o texto "sem estoque" ocupa espaço demais dentro de cada tamanho e o topo
mostra informações que não ajudam na venda.

**O que mudou na versão 5 (feature pdv-login-8-digitos): senha de 8 números e entrada automática.**
A senha do vendedor passou de 4 para 8 números, e o botão "Entrar no PDV" saiu da tela: ao digitar o
oitavo número, a página confere a senha sozinha e, se estiver certa, abre a venda. Enquanto a senha é
conferida, o teclado e a seta de trocar de vendedor ficam travados. Qualquer problema (senha errada,
falha de internet ou outro erro) apaga os números e mostra a mensagem; o vendedor digita de novo.
**As senhas antigas, de 4 números, deixam de funcionar** quando esta versão for publicada. O resto da
página (escolha do vendedor, sessão do dia, venda, pedido e aba Dia) não mudou.

**O que mudou na versão 4 (feature pdv-login-8-digitos, retrato as-is):** nada no funcionamento. O
fluxo de entrada do vendedor foi detalhado (fluxo 1 e Pontos de Atenção) e o código ganhou
comentários sobre a regra do tamanho da senha.

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

- **Entrada do vendedor (alterada na v5).** A etapa "Quem está vendendo?" só aparece quando há mais de
  um vendedor ativo. Com um só, a tela já pede a senha. A senha de 8 números é digitada num teclado
  numérico da própria tela e **não há botão para confirmar**: o oitavo número já dispara a
  conferência. Senha errada mostra "Senha incorreta. Tente de novo." e limpa os números; falha de
  internet ou outro erro também limpa os números e mostra a mensagem.
- **Sessão do dia.** Se o vendedor já entrou hoje, ao abrir a página vai direto para a venda. À
  meia-noite, ou se o servidor recusar a sessão, a página volta sozinha para a tela de entrada.
- **Topo da tela de venda (detalhado na v6).** Uma faixa escura, presa no alto mesmo quando a tela
  rola, com três informações: a marca "BALCÃO", a linha "{vendedor} · pedido novo" e, à direita, a
  data de hoje (dia/mês/ano, horário de São Paulo). O topo é igual nas três abas e também aparece
  enquanto o catálogo carrega ou quando ele não carregou. **Ele não diz em que etapa da venda o
  vendedor está.** "pedido novo" é fixo: o número do pedido só existe depois de fechar a venda.
- **Aba Produtos (alterada na v3)**: botões com os tipos de peça do ERP (só os que têm produto à venda;
  o primeiro já vem marcado) e a lista de produtos do tipo, com o tecido e o preço "a partir de". O
  produto sem nenhuma peça em estoque mostra "sem estoque", mas ainda abre para consulta. Com o
  catálogo do ERP vazio, aparece "Nenhum produto cadastrado no ERP".
- **Escolha da variação (alterada na v3)**: primeiro a cor (bolinha com o tom ou miniatura da estampa;
  cor sem estoque avisa "sem estoque"), depois o tamanho, cada um com o preço e "N un." em estoque.
  Tamanho sem estoque aparece desabilitado. **Detalhe da v6:** as cores ficam em duas colunas e os
  tamanhos em quatro colunas; cada tamanho é um botão com três linhas (sigla, preço e estoque), e o
  estoque aparece como "N un." ou, quando zerado, "sem estoque". Os tamanhos só aparecem depois de
  escolher a cor e seguem a ordem da grade do ERP; com mais de quatro, os demais vão para a linha
  de baixo. No alto dessa tela ficam a seta de voltar, o nome do produto e o tecido. Ao trocar de cor, o tamanho escolhido continua se existir
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
6. **Senha certa:** a página abre direto a tela de venda, com "{vendedor} · pedido novo".
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

**5. Etapas da venda e o que o topo mostra (retrato as-is, v6)**
1. A tela de venda tem três abas na barra de baixo: Produtos, Pedido (com o contador de peças) e Dia.
2. A aba Produtos tem duas etapas: a **lista de produtos** e, depois de tocar num produto, a **tela
   de cor e tamanho**. A tela de cor e tamanho não é uma aba à parte. Se o vendedor for a outra aba e
   voltar para Produtos, ela reaparece com o que já estava escolhido; só a seta de voltar, "Adicionar
   ao pedido" ou "Nova venda" a fecham.
3. A forma de pagamento não é uma etapa separada: é um bloco dentro da aba Pedido.
4. Em todas essas etapas o topo mostra o mesmo conteúdo ("BALCÃO", vendedor e data). Hoje, a única
   indicação de onde o vendedor está é a aba marcada na barra de baixo e o título de cada tela.
5. Não existe uma versão da página para tablet. A página é uma só, com uma folha de no máximo 460
   pontos de largura centralizada na tela; em telas maiores, sobra fundo dos lados.

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

**Problemas conhecidos nas telas retratadas na v6 (motivo da refatoração pdv-ajustes-tela-variacoes):**

- **Tamanhos passam da largura da tela no celular.** Os tamanhos ficam em quatro colunas de largura
  fixa, sem ajuste para telas estreitas. Num celular de 360 pontos de largura, cada coluna tem cerca
  de 73 pontos, e o texto "sem estoque" ou um preço de três dígitos não cabe nesse espaço. O
  resultado é que as colunas ficam com larguras diferentes e os últimos tamanhos passam da borda
  direita. O caso relatado foi um produto com seis tamanhos.
- **"sem estoque" ocupa espaço demais dentro do tamanho.** É o texto mais largo do botão e o principal
  responsável pelo problema acima. O mesmo texto também aparece, por outros caminhos, na cor e na
  lista de produtos; só o do tamanho vem da regra "N un. / sem estoque".
- **O topo não ajuda na venda.** "BALCÃO", o nome do vendedor e a data ocupam a faixa fixa do alto e
  não dizem em que etapa o vendedor está.
- **O topo não sabe quando a tela de cor e tamanho está aberta.** Do jeito que a página é montada
  hoje, o topo recebe só o nome do vendedor. Mostrar a etapa exige passar essa informação a ele,
  inclusive a diferença entre a lista de produtos e a tela de cor e tamanho.
- **A data do topo não tem relógio próprio.** Ela é a do momento em que a tela foi desenhada pela
  última vez. Com a página aberta na virada do dia, a data só muda quando o vendedor faz algo na tela.
- **Os testes automáticos usam o texto do topo como sinal de entrada bem-sucedida.** Cerca de 25
  testes procuram "Carlos · pedido novo" para saber que a senha foi aceita. Mudar o topo exige trocar
  esse sinal nos testes, sem que o comportamento da entrada mude.
- **Produto aberto que sai do catálogo.** Se uma atualização do catálogo tirar o produto que está
  aberto na tela de cor e tamanho, a página volta sozinha para a lista de produtos.

**Mudanças na operação trazidas pela v5 (senha de 8 números e entrada automática):**

- **Todos os vendedores precisam de senha nova no dia da publicação.** As senhas de 4 números deixam
  de funcionar e não podem ser convertidas. Uma pessoa técnica cadastra a senha de 8 números de
  **cada** vendedor com o comando `npm run pin:trocar` do pdv-backend. Quem ficar sem senha nova não
  consegue entrar. Vale avisar a equipe antes: senha nova, mais longa, e sem botão para confirmar.
- **Janela sem entrada entre publicar o serviço e a página.** O serviço é publicado primeiro e a
  página depois. Nesse intervalo, a página antiga ainda pede 4 números e o serviço novo recusa:
  **ninguém consegue fazer uma entrada nova**. Quem já estava conectado continua vendendo. O
  recomendado é publicar com a loja fechada.
- **Página e serviço precisam ser publicados juntos (pdv-backend v6).** Página nova com serviço
  antigo, ou o contrário, recusa toda entrada.
- **Voltar atrás exige recadastrar as senhas.** As senhas de 8 números não servem na versão anterior.
- **Tela parada por instantes em internet lenta.** Durante a conferência da senha, o teclado fica
  travado e não há aviso de "carregando". Em conexão lenta, o vendedor vê a tela parada com os oito
  marcadores preenchidos até a resposta chegar.
- **Erro de internet obriga a digitar a senha de novo.** Com 8 números, isso custa mais toques do que
  antes; foi aceito em troca de uma tela sem botão.
- **Banco local de desenvolvimento já criado continua com a senha antiga.** Quem testa a página contra
  o pdv-backend na própria máquina, com um banco criado antes desta versão, não entra com a senha de
  exemplo nova: é preciso recriar o banco local ou trocar a senha pelo comando. Não afeta a loja nem
  o modo de demonstração (que já usa a senha de exemplo de 8 números).

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
