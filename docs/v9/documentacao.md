# pdv-frontend — Documentação executiva (versão 9)

> **Estado novo da página ("to-be")**, em 2026-10-06, depois da refatoração **pdv-mobile-refatorado**
> (design "PDV Mobile Refatorado", tema escuro "Nocturne"). Compare com a v8, que é o retrato da página
> antes da mudança. Esta versão está **desenvolvida e ainda não publicada**: a página no ar continua
> sendo a v7, publicada em 2026-10-01. A página nova **só funciona com o pdv-backend da feature
> pdv-cliente-telefone no ar**, e as duas precisam ser publicadas juntas, em ordem (ver "Pontos de
> Atenção").

## Visão Geral

O **pdv-frontend** é a tela do ponto de venda (PDV) da loja FitMoveOn: a página que o vendedor abre no
navegador do celular para entrar com a senha, montar o pedido do cliente e fechar a venda. Não é um
aplicativo instalado. É uma página na internet, que funciona no Chrome (Android) e no Safari (iPhone).

A página segue o design "PDV Mobile Refatorado" (feito para iPhone SE, 375 × 667): **tema escuro**
(fundo azul-marinho quase preto, texto claro, destaque lilás), fonte Inter, ícones em todas as abas e
cartões, letras e botões grandes, poucos passos. É uma página só, com uma folha de no máximo 460 pontos
de largura centralizada; no tablet aparece a mesma coluna do celular, com fundo dos lados.

A tela não guarda vendas nem decide preços. Quem registra a venda, calcula os valores oficiais, dá o
número do pedido e baixa o estoque é o serviço **pdv-backend**. A tela mostra os totais enquanto o
pedido é montado, com a mesma conta do servidor, mas o valor que vale é sempre o devolvido pelo
servidor.

**O que mudou nesta versão (v9), em relação à v8:**
- **Tema escuro em todas as telas**, inclusive na entrada do vendedor (na entrada mudam só as cores e a
  fonte; o funcionamento é o mesmo).
- **A venda começa pelo cliente.** Primeiro passo: nome e celular, os dois opcionais, com o botão
  "Venda sem cliente" para pular. **O CPF saiu do PDV** e foi substituído pelo celular.
- **Celular com máscara** "(31) 99999-9999", aceito só completo (DDD + 9 + oito números, 11 dígitos), a
  mesma regra do servidor.
- **Lista de produtos mais simples**: tipos em grade de 3 colunas, cada produto só com o nome e o selo
  "N no pedido"; saíram o preço "a partir de" e o aviso "sem estoque" da lista.
- **Cor e tamanho**: cores em lista, com a escolhida marcada; tamanhos em 4 colunas, com a sigla e
  "estoque N", sem o preço no botão (o preço aparece ao lado do botão "Adicionar ao pedido"). Depois de
  adicionar, a tela **continua em cor e tamanho**, com a escolha limpa.
- **Pedido em quatro cartões numerados**: 1 Cliente (com "Alterar"), 2 Peças, 3 Desconto no pedido,
  4 Pagamento. **O desconto por peça (5%, 10%, 15%) saiu**; fica só o desconto no pedido, em reais, de
  R$ 5 em R$ 5, **que não passa do valor das peças**.
- **Aviso de venda com botão "OK"** no lugar de "Nova venda"; o OK começa a venda seguinte já na etapa
  Cliente.
- **Topo de cada tela** com título e linha de apoio, como no design; **barra de baixo com ícones**.
- **A venda enviada ao servidor leva o celular** (campo `telefone`, só os números) e não leva mais o
  CPF. Esta é a única mudança na conversa com o servidor, e é ela que obriga a publicação conjunta com o
  pdv-backend.

## Funcionalidades Principais

- **Entrada do vendedor** (sem mudança de funcionamento; só cores e fonte). A etapa "Quem está
  vendendo?" só aparece quando há mais de um vendedor ativo. A senha tem 8 números, digitados num
  teclado da própria tela, e o oitavo número já dispara a conferência. Qualquer erro limpa os números e
  mostra a mensagem.
- **Sessão do dia.** Se o vendedor já entrou hoje, ao abrir a página vai direto para a venda. À
  meia-noite, ou se o servidor recusar a sessão, a página volta sozinha para a tela de entrada.
- **Topo de cada tela**, preso no alto ao rolar, com o título e uma linha de apoio:

  | Tela | Título | Apoio / à direita |
  |---|---|---|
  | Cliente | "Cliente" | "Nova venda · primeiro passo" (ou "Alterar o cliente do pedido") |
  | Lista de produtos | "Produtos" | nome do cliente (ou "Cliente não identificado"); à direita, "N modelos" |
  | Cor e tamanho | nome do produto | tecido; seta de voltar à esquerda |
  | Pedido | "Pedido" | à direita, o link "Cancelar pedido" |
  | Dia | "Vendas de hoje" | à direita, a data ("06 out") |

- **Barra de baixo** com três abas, cada uma com ícone: **Produtos**, **Pedido** (com o número de peças,
  por exemplo "Pedido (3)") e **Dia**; a aba atual tem uma marca no alto. Acima das abas fica o botão
  grande da tela atual, quando houver.
- **Etapa Cliente** (primeiro passo da venda, dentro da aba Produtos). Campos **Nome** (até 120 letras) e
  **Celular** (a máscara "(31) 98765-4321" se forma enquanto o vendedor digita). O botão **"Escolher
  produtos"** só fica ativo com o celular vazio ou completo; **"Venda sem cliente"** apaga os dois campos e
  segue. Vindo do "Alterar" do Pedido, o botão vira **"Salvar cliente"** e volta para o Pedido.
- **Aba Produtos.** Tipos de peça do ERP em **grade de 3 colunas**; o primeiro já vem marcado. Abaixo, o
  grupo do tipo escolhido, com "N modelos" e uma linha por produto: o nome sem repetir o tipo (por
  exemplo "Suplex new zeland" no tipo "Bermuda médio") e, se já estiver no pedido, o selo **"N no
  pedido"**. Sem preço e sem "sem estoque" na lista. Com o catálogo vazio aparece "Nenhum produto
  cadastrado no ERP".
- **Tela de cor e tamanho** (dentro da aba Produtos). **Cores em lista**, cada uma com a bolinha do tom
  (ou a miniatura da estampa), o nome e uma marca na escolhida; a cor esgotada continua clicável, para
  consulta. Depois de escolher a cor aparecem os **tamanhos em 4 colunas**, cada um com a sigla e
  **"estoque N"**; o tamanho com "estoque 0" fica desabilitado. Ao trocar de cor, o tamanho escolhido
  continua se tiver estoque na cor nova. Acima do botão: à esquerda o que falta ("Falta escolher: cor e
  tamanho"), a escolha ("Preto · Tam M") ou "Só N em estoque — já no pedido"; à direita o preço (o do
  tamanho escolhido; antes da escolha, o do produto, com "a partir de" se os tamanhos tiverem preços
  diferentes). Botão **"Adicionar ao pedido"**: a peça entra, o contador da aba Pedido sobe e a tela fica
  em cor e tamanho, com a escolha limpa, para incluir outra cor ou tamanho.
- **Aba Pedido**, em quatro cartões:
  1. **Cliente**: nome (ou "Cliente não identificado") e celular com máscara (ou "Sem celular"); tocar
     em **"Alterar"** reabre a etapa Cliente com os dados preenchidos.
  2. **Peças** (com o total de peças no cabeçalho): para cada variação, modelo, tecido, tamanho, cor e
     subtotal; "−", quantidade e "+"; "R$ X cada"; botão **"Tirar"** (em celular com menos de 360 pontos
     de largura, só o ícone da lixeira). O "+" para no estoque ("Só N em estoque"); se o estoque caiu
     depois, o item pede "diminua a quantidade" ou "exclua o item". Sem peças: "Nenhuma peça ainda. Vá
     em Produtos para incluir."
  3. **Desconto no pedido**: "−" e "+" em passos de **R$ 5**; mostra "Sem desconto" ou "− R$ …". O "+"
     fica desabilitado quando mais R$ 5 passariam do valor das peças.
  4. **Pagamento**: formas vindas do servidor, em duas colunas, cada uma com ícone (dinheiro, Pix,
     cartão; outras formas usam um ícone de carteira).
- **Barra de fechamento** (aba Pedido): resumo com peças e valor cheio, e o desconto; abaixo, o botão
  com o que falta à esquerda — **"Inclua uma peça"**, **"Escolha o pagamento"** ou **"Fechar venda"** — e
  o **total** à direita. Enquanto envia, o botão fica travado.
- **Aviso de venda**: janela no meio da tela com "Venda registrada" e "Pedido #N · N peças · R$ … em
  {pagamento} · {cliente}", com os valores devolvidos pelo servidor. Só fecha pelo botão **"OK"**, que
  começa uma venda nova na etapa Cliente.
- **Aba Dia** ("Vendas de hoje"): cartões **"Total do dia"** e **"Pedidos"** e a lista das vendas do
  vendedor ("#N · cliente", "hora · N peças · pagamento" e o total), buscada de novo toda vez que a aba é
  aberta. Funciona mesmo com o catálogo carregando ou em falha. O celular do cliente não aparece aqui.
- **Mensagens de erro e "Tentar de novo"** quando algo não carrega ou a internet falha.

## Fluxos de Negócio

**1. Entrada do vendedor (sem mudança desde a v5)**
1. A página abre e confere se já existe uma sessão válida para hoje; se existir, vai direto para a venda.
2. Se não existir, mostra a escolha do vendedor (só com mais de um) e a senha de 8 números no teclado da
   página. O oitavo número envia a senha; enquanto o servidor responde, o teclado e a troca de vendedor
   ficam travados.
3. Senha certa: abre a tela de venda, **na etapa Cliente** (antes: na lista de produtos). Senha errada,
   falha de internet ou outro erro: mensagem e números apagados.
4. A sessão vale até a meia-noite (horário de São Paulo). A troca de senha é feita por uma pessoa
   técnica, com o comando `npm run pin:trocar` do pdv-backend.

**2. Montagem e fechamento da venda (novo)**
1. **Cliente.** A venda começa pedindo o nome e o celular do cliente. O vendedor preenche e toca
   "Escolher produtos", ou toca **"Venda sem cliente"**. Com o celular incompleto, "Escolher produtos"
   fica desabilitado até o vendedor completar ou apagar o número.
2. **Produtos.** O vendedor escolhe o tipo e o produto; depois a cor e o tamanho, vendo o estoque de
   cada tamanho e o preço ao lado do botão.
3. **Adicionar ao pedido.** A peça entra no pedido e a tela continua em cor e tamanho, para incluir
   outra variação da mesma peça. Se a mesma variação for adicionada de novo, a quantidade da linha
   existente aumenta, sem criar outra linha, até o limite do estoque. A seta de voltar leva à lista.
4. **Pedido.** O vendedor confere o cliente (e pode alterá-lo), ajusta quantidades ("−" com quantidade 1
   tira a peça), aplica o **desconto no pedido** (de R$ 5 em R$ 5, até o valor das peças) e escolhe o
   pagamento. O total nunca fica negativo.
5. **Fechar venda.** Envia o código do pedido, cada variação com a quantidade (desconto por peça sempre
   zero), o desconto no pedido, o nome do cliente, **o celular só com os números** (ou vazio) e o
   pagamento — **sem preços**. O servidor confere, calcula, registra e baixa o estoque.
6. **Faltou estoque ou a peça saiu de venda:** a mensagem do servidor aparece acima do botão; a tela
   atualiza os estoques e o pedido continua como estava. O vendedor ajusta e fecha de novo.
7. **Celular recusado pelo servidor ou outro erro:** a mensagem aparece acima do botão, com o pedido
   intacto, e some quando o pedido é editado. (Na prática, a tela já não deixa seguir com celular
   incompleto.)
8. Se a internet falhar, o vendedor toca de novo em "Fechar venda". O código do pedido é o mesmo em todas
   as tentativas, e o servidor registra a venda (e baixa o estoque) uma única vez.
9. Com a venda registrada, aparece o aviso com o número e o total, e os estoques são atualizados em
   segundo plano. **"OK"** limpa tudo (peças, desconto, pagamento, nome e celular), gera um código de
   pedido novo e volta para a etapa **Cliente**.

**3. Alterar o cliente no meio da venda**
- No cartão 1 do Pedido, "Alterar" abre a etapa Cliente com o nome e o celular já preenchidos. "Salvar
  cliente" grava e volta ao Pedido; "Venda sem cliente" apaga os dois e volta ao Pedido. As peças e o
  pagamento não mudam.

**4. Cancelar pedido**
- "Cancelar pedido", no topo da aba Pedido, limpa tudo na hora (peças, desconto, pagamento, nome e
  celular), sem pedir confirmação, gera um código de pedido novo e volta para a etapa Cliente.
- Enquanto a venda está sendo enviada, "Cancelar pedido" fica desligado.

**5. Consulta do dia**
- A aba Dia busca no servidor as vendas de hoje sempre que é aberta.

**6. Etapas da venda e o que o topo mostra**

| Onde o vendedor está | O topo mostra |
|---|---|
| Aba Produtos, antes de definir o cliente | Cliente |
| Aba Produtos, lista de produtos | Produtos |
| Aba Produtos, com um produto aberto | nome do produto (etapa "Cor e tamanho") |
| Aba Pedido | Pedido |
| Aba Dia | Vendas de hoje (etapa "Dia") |

A etapa Cliente e a tela de cor e tamanho não são abas: são a aba Produtos em momentos diferentes. Se o
vendedor for a outra aba e voltar, a tela de cor e tamanho reaparece com o que já estava escolhido.

## Integrações e Dependências

| Item | Para que serve |
|---|---|
| **pdv-backend** (API) | Fonte de tudo o que a tela mostra e destino das vendas. A página chama os endereços `/api/...` no mesmo domínio; a hospedagem repassa essas chamadas ao pdv-backend de produção (`pdv-loja-backend.vercel.app`). **Esta versão exige o pdv-backend com a feature pdv-cliente-telefone** (venda com `telefone`, sem `cpf`). |
| **ERP Move On** (indireto) | O catálogo mostrado (tipos, produtos, cores, tamanhos, preços e estoques) é o cadastrado no ERP. A página não fala com o ERP: recebe tudo pelo pdv-backend. |
| **Contrato da API** (`backend/contrato/openapi.yaml`) | Descrição oficial das mensagens trocadas com o pdv-backend. Os tipos de dados da tela foram gerados de novo a partir do contrato da pdv-cliente-telefone: a venda leva `telefone` e o erro `telefone_invalido` substitui o `cpf_invalido`. |
| **API simulada (MSW)** | Imita o pdv-backend dentro do navegador, já com a regra nova: celular com 11 dígitos, erro `telefone_invalido` e recusa de qualquer venda que ainda mande `cpf`. Usada no desenvolvimento e nos testes; não vai para a versão publicada. |
| **Fonte Inter** (novo, no lugar da Libre Franklin) | Tipografia do tema Nocturne, incluída na própria página (não depende do Google Fonts). |
| **Ícones Phosphor** (novo) | Ícones das abas, dos cartões, dos pagamentos e dos botões, incluídos na própria página (só os usados). |
| **Hospedagem (Vercel)** | Projeto `pdv-loja-frontend`, com Node 22. Publica só a página pronta e repassa `/api` ao pdv-backend. |
| **Código-fonte (GitHub)** | Repositório `lucoti/pdv-loja-frontend`. O que entra na branch principal é publicado em produção. A refatoração está no branch `pdv-mobile-refatorado`. |

Nenhum serviço externo novo: fonte e ícones vêm empacotados com a página.

## Dados Gerenciados

A página não tem banco de dados e **não salva nada no aparelho**. Tudo fica só na memória enquanto a
página está aberta:
- o vendedor conectado (não é mostrado na tela de venda);
- o pedido em andamento: peças (cada uma é uma variação do ERP), quantidades, desconto no pedido, **nome
  e celular do cliente** (o celular guardado só com os números), forma de pagamento e o código do pedido
  para evitar duplicidade;
- o que está sendo digitado na etapa Cliente, antes de confirmar;
- o catálogo (com os estoques do momento da carga) e as vendas do dia.

**O CPF não é mais coletado nem enviado.** A senha e o celular não são gravados no aparelho, não aparecem
no endereço da página e não vão para registros de erro. O celular só sai do aparelho no envio da venda;
o aviso de venda e a aba Dia mostram só o nome do cliente. No servidor, o celular fica gravado na venda e
sai completo no cupom (ainda não impresso pela página). Todos os valores são tratados em centavos, como
no servidor.

## Pontos de Atenção

**Publicação (nada foi publicado ainda):**

- **Publicação coordenada com o pdv-backend, sem janela de compatibilidade.** A página nova manda
  `telefone`, que o servidor atual recusa; o servidor novo recusa a página antiga, que manda `cpf`. Em
  qualquer combinação diferente, **toda venda é recusada**. Ordem obrigatória, em horário sem venda:

  | Passo | O que | Quem | Depende de |
  |---|---|---|---|
  | A | `db:migrar` do PDV no banco de produção (coluna nova `vendas.telefone`) | técnico | nenhum (pode rodar antes, a qualquer momento; o servidor atual ignora a coluna) |
  | B | Publicar o pdv-backend com a feature pdv-cliente-telefone | técnico | A |
  | C | Publicar esta página (pdv-frontend v9) | técnico | B (logo em seguida: entre B e C nenhuma venda fecha) |
  | D | **Passo manual do Lucas:** recarregar o PDV em cada celular da loja | Lucas | C (a página antiga aberta continua mandando `cpf` até ser recarregada) |

  Só o passo A pode ser feito antes e em paralelo a outros trabalhos. Voltar atrás exige voltar os dois
  (página e servidor) juntos; a coluna nova pode ficar no banco.
- **A página nova depende de testes finais.** A validação final (Fase 5) desta refatoração ainda não foi
  feita; o pdv-backend da pdv-cliente-telefone já foi testado.

**Pontos novos desta versão:**

- **Celular só com 11 dígitos.** Fixo de 10 dígitos não é aceito (decisão do Lucas). A mesma regra existe
  em três lugares — tela, API simulada e servidor — e precisa mudar junto nos três. A regra confere só o
  formato e a quantidade: um número inventado com 11 dígitos passa.
- **Nome do cliente com até 120 letras**, limite igual ao do servidor; mudar de um lado só faz o servidor
  recusar a venda.
- **O desconto por peça saiu só da tela.** O servidor e a conta da página continuam aceitando percentual
  por peça; a página sempre manda zero. O desconto no pedido para no valor das peças ao tocar "+", mas se
  o vendedor tirar peças depois, o desconto pode ficar acima do valor: o total mostrado para em R$ 0,00 (o
  servidor faz a mesma conta).
- **Teto do desconto em múltiplos de R$ 5.** Com peças de R$ 89,00, o máximo é R$ 85,00 (o servidor só
  aceita desconto de 5 em 5 reais).
- **O OK do aviso é o que gera o código do pedido seguinte.** Enquanto o aviso está aberto, o pedido já
  registrado continua na memória com o código antigo. Qualquer mudança futura no aviso precisa manter a
  troca do código no fechamento dele.
- **"Cancelar pedido" desligado durante o envio** (decisão do Lucas, 2026-10-06). Enquanto a venda está
  sendo enviada o link fica apagado e não responde, inclusive a um toque no mesmo instante do "Fechar
  venda". Se o envio falhar, ele volta a valer com o pedido intacto. Antes, limpar a tela não cancelava o
  envio e a venda podia ser registrada com a tela já limpa.
- **Duplo toque em "Fechar venda" resolvido.** A trava contra envio duplicado passou a valer na hora do
  toque (antes dependia do redesenho da tela, e dois toques muito rápidos geravam dois envios, que o
  servidor juntava numa venda só).
- **Lista de produtos sem preço e sem "sem estoque".** Decisão do Lucas para seguir o design, revertendo
  a decisão da v7. O vendedor só vê preço e estoque ao abrir o produto.
- **Nome do produto na lista sem o tipo.** Se o nome do ERP começar pelo nome do tipo, a lista mostra só
  o restante; se não começar, mostra o nome inteiro.
- **Larguras conferidas a 320 e 375 pontos.** A 320 pontos, "estoque 12" quebra em duas linhas dentro do
  botão do tamanho e o "Tirar" vira só o ícone; nada passa da borda. A 375 pontos, "R$ 89,00 cada" quebra
  em duas linhas. Os testes automáticos não medem largura; há testes que conferem as regras das grades
  (3 colunas de tipos, 4 de tamanhos, 2 de pagamentos) nos arquivos de estilo.
- **Cores do tema num único arquivo** (`src/estilos/tokens.css`), inclusive as cores de erro e o fundo
  escurecido das janelas, que o Nocturne não tinha. A cor do navegador (`index.html`) acompanha o fundo
  escuro. Há um uso de cor do tema dentro do código da tela de cor e tamanho (bolinha de cor sem tom
  cadastrado).
- **Partes da tela que os testes automáticos usam como sinal.** O nome da etapa no topo (lido pelos
  leitores de tela, não o título visível), o aviso "Venda registrada" com o botão "OK", os textos do botão
  de fechar ("Inclua uma peça", "Escolha o pagamento", "Fechar venda") e "Venda sem cliente". Trocar
  qualquer um deles exige revisar, teste a teste, o que cada um conferia.
- **A data no topo da aba Dia vem do relógio do celular**, não do horário da loja; com o celular em outro
  fuso, ela pode diferir da lista do servidor.

**Pontos herdados das versões anteriores (continuam valendo):**

- **Troca de aba no instante em que o catálogo termina de carregar** pode se perder (visto só em teste).
- **Produto aberto que sai do catálogo:** a página volta sozinha para a lista.
- **Estoque mostrado é o do momento da carga.** A tela atualiza os estoques depois de cada venda e quando
  o servidor recusa por falta de estoque, mas não em tempo real; nesse caso o servidor recusa e nada é
  gravado.
- **Preço mudado com o pedido aberto:** a cada atualização do catálogo, as peças do pedido passam a usar o
  preço atual do ERP; o aviso de venda mostra o valor do servidor, que é o que vale.
- **Tipo que sai do catálogo:** a tela volta para o primeiro tipo.
- **Pedido perdido se a sessão cair** (meia-noite ou recusa) ou se a página for recarregada.
- **Exige endereço seguro (HTTPS).** Em teste, abrir a página pelo endereço de rede local
  (http://192.168…) impede montar e fechar vendas.
- **A API simulada precisa acompanhar o servidor real.** Ela é simplificada (um único tecido, senha de
  exemplo em texto simples, vendedor Carlos com 12345678) e volta ao início ao recarregar a página.
- **O tamanho da senha (8 números) precisa ser o mesmo na página, na API simulada e no pdv-backend.**
- **Não há botão "Sair"** e **não há confirmação em "Cancelar pedido"**, conforme o design.
- **Sem impressão de cupom** e **sem funcionamento offline**.
- **Versões de teste usam o servidor de produção** e baixam o estoque real do ERP.
- **Endereço do serviço fixo no código** (repasse de `/api` no `vercel.json`).
- **Fora do escopo:** leitura de código de barras, venda sem estoque, troca e devolução.

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
| v9 | 2026-10-06 | Design "PDV Mobile Refatorado" (feature pdv-mobile-refatorado, estado novo após a refatoração): tema escuro Nocturne em todas as telas (entrada só com cores e fonte novas), fonte Inter e ícones Phosphor; etapa **Cliente** no começo da venda, com nome e celular opcionais ("Venda sem cliente" para pular) e **"Alterar"** no Pedido; **CPF substituído pelo celular** (11 dígitos, com máscara), enviado como `telefone` só com os números; tipos em grade de 3 colunas e lista sem preço e sem "sem estoque", com selo "N no pedido"; cores em lista e tamanhos em 4 colunas, sem preço no botão; depois de adicionar, a tela fica em cor e tamanho; Pedido em quatro cartões, **sem desconto por peça**, desconto no pedido de R$ 5 em R$ 5 até o valor das peças e total dentro do botão de fechar; aviso de venda com **"OK"**, que volta para a etapa Cliente; topo com título e apoio por tela; abas com ícones; trava contra envio duplo na hora do toque. Desenvolvida (243 testes automáticos verdes); validação final e publicação pendentes, **em conjunto com o pdv-backend da pdv-cliente-telefone** (ordem A `db:migrar` → B back → C página → D recarregar os celulares). |
