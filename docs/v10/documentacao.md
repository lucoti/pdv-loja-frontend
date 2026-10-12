# pdv-frontend — Documentação executiva (versão 10)

> **Retrato da página como está no ar ("as-is")**, em 2026-10-12, **antes da refatoração
> pdv-mobile-atualizado** (design "PDV Loja Mobile atualizado": abas no topo, escolha peça → tecido → cor →
> tamanho, botões com relevo). O funcionamento descrito aqui é o da v9 (feature pdv-mobile-refatorado),
> que segundo o planejamento da pdv-mobile-atualizado já está publicada, junto com o pdv-backend da
> pdv-cliente-telefone. **Nesta versão nada mudou no funcionamento da página**: só foram acrescentados
> comentários no código. Ela serve de base de comparação para a próxima versão (to-be).

## Visão Geral

O **pdv-frontend** é a tela do ponto de venda (PDV) da loja FitMoveOn: a página que o vendedor abre no
navegador do celular para entrar com a senha, montar o pedido do cliente e fechar a venda. Não é um
aplicativo instalado; funciona no Chrome (Android) e no Safari (iPhone).

A página segue o design "PDV Mobile Refatorado": tema escuro (fundo azul-marinho quase preto, texto
claro, destaque lilás), fonte Inter, ícones nas abas e nos cartões, letras e botões grandes. É uma coluna
de no máximo 460 pontos de largura, centralizada; no tablet aparece a mesma coluna do celular.

A tela não guarda vendas nem decide preços. Quem registra a venda, calcula os valores oficiais, dá o
número do pedido e baixa o estoque é o serviço **pdv-backend**. A tela mostra os totais enquanto o
pedido é montado, com a mesma conta do servidor, mas o valor que vale é sempre o devolvido pelo servidor.

**Como a tela de venda está organizada hoje (resumo):**
- **No alto**, um topo fixo com o título da tela (e uma linha de apoio ou um complemento à direita).
- **Embaixo**, uma barra fixa com o botão grande da tela atual (quando houver) e, abaixo dele, as três
  abas: **Produtos**, **Pedido** (com o número de peças, por exemplo "Pedido (3)") e **Dia**.
- A venda **começa pela etapa Cliente**; depois vêm a lista de produtos e a tela de cor e tamanho, todas
  dentro da aba Produtos.
- O **Pedido** fica em quatro cartões numerados: Cliente, Peças (com "−" e "+" em cada peça), Desconto no
  pedido e Pagamento.
- Ao fechar, aparece o **aviso "Venda registrada"** com o número do pedido, e o botão **"OK"** começa a
  venda seguinte, de novo na etapa Cliente.

## Funcionalidades Principais

- **Entrada do vendedor.** A etapa "Quem está vendendo?" só aparece com mais de um vendedor ativo. A
  senha tem 8 números, digitados num teclado da própria tela, e o oitavo número já dispara a conferência.
  Se o vendedor já entrou hoje, a página abre direto na venda. À meia-noite, ou se o servidor recusar a
  sessão, a página volta sozinha para a entrada.
- **Topo de cada tela**, preso no alto ao rolar:

  | Tela | Título | Apoio / à direita |
  |---|---|---|
  | Cliente (começo da venda) | "Cliente" | "Nova venda · primeiro passo" |
  | Cliente (vindo do "Alterar") | "Cliente" | "Alterar o cliente do pedido" |
  | Lista de produtos | "Produtos" | nome do cliente (ou "Cliente não identificado"); à direita, "N modelos" |
  | Cor e tamanho | nome do produto | tecido; seta de voltar à esquerda |
  | Pedido | "Pedido" | à direita, o link "Cancelar pedido" |
  | Dia | "Vendas de hoje" | à direita, a data ("12 out") |

- **Barra de baixo.** Três abas com ícone e nome; a aba atual tem uma marca no alto. Acima delas, o
  botão grande da tela: "Escolher produtos"/"Salvar cliente" e "Venda sem cliente" na etapa Cliente;
  "Adicionar ao pedido" em cor e tamanho; o resumo e o botão de fechar no Pedido. A lista de produtos e o
  Dia não têm botão.
- **Etapa Cliente** (dentro da aba Produtos). Campos **Nome** (até 120 letras) e **Celular** (a máscara
  "(31) 98765-4321" se forma enquanto o vendedor digita; com 10 números aparece "(31) 9876-5432"). O botão
  principal só fica ativo com o celular vazio ou completo (11 números); com o celular incompleto ele fica
  apagado, **sem mensagem**. "Venda sem cliente" apaga os dois campos e segue.
- **Lista de produtos** (aba Produtos). Tipos de peça do ERP em **grade de 3 colunas**, com o primeiro já
  marcado. Abaixo, o nome do tipo, "N modelos" e a lista dos produtos do tipo, um por linha, com uma seta;
  o nome aparece sem repetir o tipo ("Suplex new zeland" no tipo "Bermuda médio"). Produto que já está no
  pedido ganha o selo **"N no pedido"**. Sem preço e sem "sem estoque" na lista. Com o catálogo vazio:
  "Nenhum produto cadastrado no ERP."
- **Cor e tamanho** (aba Produtos, com um produto aberto). Bloco **COR**: cores em lista de uma coluna,
  cada uma com a bolinha do tom (ou a miniatura da estampa) e o nome; a escolhida ganha uma marca. Bloco
  **TAMANHO** (só depois da cor): 4 colunas, cada tamanho com a sigla e "estoque N"; tamanho com estoque 0
  fica apagado e não responde. Trocar de cor mantém o tamanho, se ele tiver estoque na cor nova. Acima do
  botão, uma linha: à esquerda "Falta escolher: cor e tamanho", a escolha ("Preto · Tam M") ou "Só N em
  estoque — já no pedido"; à direita o preço (o do tamanho; antes da escolha, o do produto, com "a partir
  de" quando os tamanhos têm preços diferentes). **"Adicionar ao pedido"** fica apagado sem cor e tamanho
  ou quando o pedido já tem todo o estoque daquele tamanho.
- **Aba Pedido**, em quatro cartões numerados, cada um com ícone:
  1. **Cliente**: nome (ou "Cliente não identificado") e celular com máscara (ou "Sem celular"); a linha
     inteira, com "Alterar", reabre a etapa Cliente com os dados preenchidos.
  2. **Peças** (com "N peças" no cabeçalho): para cada variação, modelo, "tecido · Tam X · cor" e o
     subtotal; abaixo, **"−", a quantidade e "+"**, "R$ X cada" e o botão **"Tirar"** (abaixo de 360
     pontos de largura, só o ícone da lixeira). O "+" para no estoque; no limite aparece "Só N em
     estoque"; se o estoque caiu depois de uma atualização, "Só N em estoque — diminua a quantidade" ou
     "Sem estoque — exclua o item". "−" com quantidade 1 tira a peça. Sem peças: "Nenhuma peça ainda. Vá
     em Produtos para incluir."
  3. **Desconto no pedido**: "−" e "+" em passos de **R$ 5**; mostra "Sem desconto" ou "− R$ …". O "+"
     fica apagado quando mais R$ 5 passariam do valor das peças. O "−" nunca fica apagado (em zero, não
     faz nada).
  4. **Pagamento**: formas vindas do servidor, em 2 colunas, cada uma com ícone (dinheiro, Pix, cartão;
     outras formas usam o ícone de carteira).
- **Barra de fechamento** (aba Pedido): resumo com "N peças" e o valor cheio, e o desconto; abaixo, o
  botão com o que falta à esquerda — **"Inclua uma peça"**, **"Escolha o pagamento"** ou **"Fechar
  venda"** — e o **total** à direita. Enquanto envia, o botão fica travado. Erro do servidor aparece
  acima do botão.
- **Aviso de venda**: janela no meio da tela com "Venda registrada" e o texto "Pedido #N · N peças · R$ …
  em {pagamento} · {cliente}", com os valores devolvidos pelo servidor. Só fecha pelo **"OK"**.
- **Aba Dia**: cartões **"Total do dia"** e **"Pedidos"** e a lista das vendas do vendedor ("#N ·
  cliente", "hora · N peças · pagamento" e o total), buscada de novo sempre que a aba é aberta. Funciona
  mesmo com o catálogo carregando ou em falha.
- **Mensagens de erro e "Tentar de novo"** quando algo não carrega ou a internet falha.

## Fluxos de Negócio

**1. Entrada do vendedor (sem mudança desde a v5)**
1. A página confere se já existe sessão válida para hoje; se existir, vai direto para a venda.
2. Se não, mostra a escolha do vendedor (só com mais de um) e a senha de 8 números. O oitavo número
   envia a senha; enquanto o servidor responde, o teclado fica travado.
3. Senha certa: abre a tela de venda, que começa carregando o catálogo e, em seguida, mostra a **etapa
   Cliente**. Qualquer erro apaga os números e mostra a mensagem.

**2. Montagem e fechamento da venda**
1. **Cliente.** O vendedor preenche nome e celular e toca "Escolher produtos", ou toca "Venda sem
   cliente".
2. **Produtos.** Escolhe o tipo e toca no produto; abre a tela de cor e tamanho.
3. **Cor e tamanho.** Escolhe a cor, depois o tamanho, e toca "Adicionar ao pedido". A peça entra, o
   número da aba Pedido sobe e a tela **continua em cor e tamanho, com a escolha limpa**, para incluir
   outra cor ou outro tamanho da mesma peça. A seta de voltar leva à lista. Adicionar de novo a mesma
   variação soma na linha existente, até o limite do estoque.
4. **Pedido.** O vendedor confere o cliente (e pode alterá-lo), ajusta quantidades com "−" e "+", aplica
   o desconto no pedido e escolhe o pagamento.
5. **Fechar venda.** A página envia o código do pedido, cada variação com a quantidade (desconto por peça
   sempre zero), o desconto no pedido, o nome do cliente, o celular só com os números (ou vazio) e o
   pagamento — **sem preços**. O servidor confere, calcula, registra e baixa o estoque.
6. **Faltou estoque ou a peça saiu de venda:** a mensagem do servidor aparece acima do botão, a tela
   atualiza os estoques e o pedido continua como estava. Qualquer mudança no pedido apaga a mensagem.
7. **Internet falhou:** o vendedor toca de novo em "Fechar venda". O código do pedido é o mesmo em todas
   as tentativas e o servidor registra a venda uma única vez.
8. **Venda registrada:** aparece o aviso com o número e o total, e os estoques são atualizados em
   segundo plano. **"OK"** limpa tudo (peças, desconto, pagamento, nome e celular), gera um código de
   pedido novo e volta para a **etapa Cliente**.

**3. Alterar o cliente no meio da venda**
- No cartão 1 do Pedido, "Alterar" abre a etapa Cliente (na aba Produtos) com o nome e o celular já
  preenchidos. "Salvar cliente" grava e volta ao Pedido; "Venda sem cliente" apaga os dois e volta ao
  Pedido. Se o vendedor trocar de aba sem salvar, o que ele digitou fica guardado e a aba Produtos
  continua mostrando o formulário até ele salvar ou pular.

**4. Cancelar pedido**
- "Cancelar pedido", no topo da aba Pedido, limpa tudo na hora (peças, desconto, pagamento, nome e
  celular), sem confirmação, gera um código novo e volta para a etapa Cliente. Fica desligado enquanto a
  venda está sendo enviada.

**5. Consulta do dia**
- A aba Dia busca no servidor as vendas de hoje sempre que é aberta.

**6. Como a página decide o que mostrar**

| Onde o vendedor está | O que aparece |
|---|---|
| Aba Produtos, antes de definir o cliente | Etapa Cliente |
| Aba Produtos, cliente definido, sem produto aberto | Lista de produtos |
| Aba Produtos, com um produto aberto | Cor e tamanho |
| Aba Pedido | Cartões do pedido |
| Aba Dia | Vendas de hoje |

A etapa Cliente e a tela de cor e tamanho não são abas: são a aba Produtos em momentos diferentes. Ir a
outra aba e voltar mantém o produto aberto e a cor e o tamanho escolhidos.

## Integrações e Dependências

| Item | Para que serve |
|---|---|
| **pdv-backend** (API) | Fonte de tudo o que a tela mostra e destino das vendas: catálogo (`GET /catalogo`), registro da venda (`POST /vendas`, com `telefone` e sem `cpf`), vendas de hoje (`GET /vendas/hoje`), entrada e sessão. A página chama `/api/...` no mesmo domínio e a hospedagem repassa ao pdv-backend de produção. **Sem mudança nesta versão.** |
| **ERP Move On** (indireto) | O catálogo mostrado (tipos, produtos, cores, tamanhos, preços e estoques) é o cadastrado no ERP, recebido pelo pdv-backend. |
| **Contrato da API** (`backend/contrato/openapi.yaml`) | Descrição oficial das mensagens trocadas com o pdv-backend; os tipos de dados da tela são gerados a partir dele. |
| **API simulada (MSW)** | Imita o pdv-backend dentro do navegador, só no desenvolvimento e nos testes. |
| **Fonte Inter e ícones Phosphor** | Tipografia e ícones, empacotados com a página (sem serviço externo). |
| **Hospedagem (Vercel)** | Projeto `pdv-loja-frontend`, com Node 22; publica a página pronta e repassa `/api` ao pdv-backend. |
| **Código-fonte (GitHub)** | Repositório `lucoti/pdv-loja-frontend`; o que entra na branch principal é publicado. |

Nenhuma integração nova nesta versão.

## Dados Gerenciados

A página não tem banco de dados e **não salva nada no aparelho**. Tudo fica só na memória enquanto ela
está aberta:
- o vendedor conectado;
- o pedido em andamento: peças (cada uma é uma variação do ERP) e quantidades, desconto no pedido, nome e
  celular do cliente (o celular só com os números), forma de pagamento e o código do pedido que evita
  duplicidade;
- o que está sendo digitado na etapa Cliente, antes de confirmar;
- o tipo e o produto escolhidos e a cor e o tamanho em escolha;
- o catálogo (com os estoques do momento da carga) e as vendas do dia.

A senha e o celular não são gravados no aparelho nem aparecem no endereço da página. O celular só sai do
aparelho no envio da venda; o aviso de venda e a aba Dia mostram só o nome do cliente. Valores em
centavos, como no servidor.

## Pontos de Atenção

**O que a refatoração pdv-mobile-atualizado vai mexer (para comparar com a próxima versão):**
- **Partes da tela que os testes automáticos usam como sinal:** o nome da etapa no topo (lido pelos
  leitores de tela: "Cliente", "Produtos", "Cor e tamanho", "Pedido" ou "Dia"), a etapa Cliente no começo
  da venda e o botão "Venda sem cliente", o "OK" do aviso de venda, "Aumentar desconto no total", o "−" e
  o "+" de cada peça e a linha "Falta escolher: cor e tamanho" depois de adicionar. Trocar qualquer um
  exige revisar, teste a teste, o que cada um conferia.
- **O topo e a barra de baixo são desenhados duas vezes**: um par enquanto o catálogo carrega (ou falha)
  e outro com o catálogo pronto. Na tela não há diferença, mas um toque numa aba exatamente nesse instante
  pode se perder (visto só em teste).
- **Travas contra toque duplo:** "Fechar venda" e "Cancelar pedido" conferem na hora do toque se já há um
  envio em andamento. A troca de aba e o "OK" do aviso não têm essa trava: dois toques muito rápidos no
  "OK" geram dois códigos de pedido seguidos, sem efeito para o vendedor (vale o último, com o pedido já
  vazio).
- **O desconto não diminui sozinho.** O teto (valor das peças) só vale ao tocar "+". Se o vendedor tirar
  peças depois, o desconto pode ficar acima do valor; o total mostrado para em R$ 0,00 (o servidor faz a
  mesma conta).
- **Celular incompleto não mostra mensagem**: o botão só fica apagado.
- **Trocar de aba não descarta a edição do cliente** feita pelo "Alterar".
- **"Adicionar ao pedido" no limite do estoque** mostra "Só N em estoque — já no pedido" na linha acima do
  botão.
- **Cores do tema num único arquivo** (`src/estilos/tokens.css`), exceto a bolinha de cor sem tom
  cadastrado, na tela de cor e tamanho. As mesmas cores valem para a tela de entrada.
- **Grades conferidas por teste** (3 colunas de tipos, 4 de tamanhos, 2 de pagamentos, 3 abas): os testes
  automáticos não medem largura, só leem a regra das grades. A 320 pontos, "estoque 12" quebra em duas
  linhas e o "Tirar" vira só o ícone; nada passa da borda.

**Pontos que continuam valendo:**
- **O "OK" do aviso é o que gera o código do pedido seguinte.** Enquanto o aviso está aberto, o pedido
  registrado continua na memória com o código antigo.
- **Celular só com 11 números** e **nome com até 120 letras**, as mesmas regras do servidor e da API
  simulada; mudar só de um lado faz o servidor recusar a venda.
- **Desconto por peça saiu só da tela**: o servidor ainda aceita; a página manda sempre zero.
- **Teto do desconto em múltiplos de R$ 5** (com peças de R$ 89,00, o máximo é R$ 85,00).
- **Produto aberto que sai do catálogo:** a página volta sozinha para a lista. **Tipo que sai do
  catálogo:** volta para o primeiro tipo.
- **Estoque mostrado é o do momento da carga**, atualizado depois de cada venda e quando o servidor
  recusa por falta de estoque; não é em tempo real.
- **Preço mudado com o pedido aberto:** a cada atualização do catálogo, as peças do pedido passam a usar
  o preço atual do ERP.
- **Pedido perdido se a sessão cair** (meia-noite ou recusa) ou se a página for recarregada.
- **Exige endereço seguro (HTTPS)**: em teste, abrir pelo endereço de rede local (http://192.168…)
  impede montar vendas.
- **A data no topo da aba Dia vem do relógio do celular**, não do horário da loja.
- **Não há botão "Sair"**, **não há confirmação em "Cancelar pedido"**, **sem impressão de cupom** e
  **sem funcionamento offline**.
- **Versões de teste usam o servidor de produção** e baixam o estoque real do ERP.

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
| v10 | 2026-10-12 | **As-is antes da pdv-mobile-atualizado**: retrato da tela de venda no ar (funcionamento da v9): topo com título por tela e barra de baixo com o botão da tela e as abas Produtos / Pedido (N) / Dia; venda começando na etapa **Cliente** (nome e celular opcionais, "Venda sem cliente"); tipos em 3 colunas e lista de produtos com selo "N no pedido"; cores em lista e tamanhos em 4 colunas com "estoque N", ficando em cor e tamanho depois de adicionar; Pedido em quatro cartões numerados com "−"/"+" em cada peça, desconto no pedido de R$ 5 em R$ 5 com teto só no "+", pagamento com ícones; aviso "Venda registrada" com o número do pedido e "OK"; aba Dia. Registrados os sinais usados pelos testes, as travas contra toque duplo e os comportamentos que a refatoração vai trocar. Nenhuma mudança de funcionamento, só comentários no código. |
