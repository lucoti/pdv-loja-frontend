# pdv-frontend — Documentação executiva (versão 12)

> **Catálogo sempre atualizado e só com estoque (2026-10-13).** A tela de venda busca o catálogo de novo
> sempre que aparece (ao abrir o PDV, ao entrar em Produtos ou Pedido e quando o celular volta ao
> navegador) e mostra só o que tem estoque: acabaram as telas "estoque 0" e o tamanho tracejado. O
> restante é o design da versão 11. Publicado no `main` (commits `c867f18` e `9a97d93`), junto com o
> pdv-backend que só manda variações com estoque. A versão 11 descreve a tela antes desta mudança.

## Visão Geral

O **pdv-frontend** é a tela do ponto de venda (PDV) da loja FitMoveOn: a página que o vendedor abre no
navegador do celular para entrar com a senha, montar o pedido do cliente e fechar a venda. Não é um
aplicativo instalado; funciona no Chrome (Android) e no Safari (iPhone).

A página mantém o tema escuro (fundo azul-marinho quase preto, texto claro, destaque lilás), a fonte Inter
e os ícones Phosphor. É uma coluna de no máximo 460 pontos de largura, centralizada; no tablet aparece a
mesma coluna do celular.

A tela não guarda vendas nem decide preços. Quem registra a venda, calcula os valores oficiais, dá o
número do pedido e baixa o estoque é o serviço **pdv-backend**. A tela mostra os totais enquanto o
pedido é montado, com a mesma conta do servidor, mas o valor que vale é sempre o devolvido pelo servidor.

**Como a tela de venda fica organizada (resumo):**
- **No alto**, sempre visíveis, as três abas: **Produtos**, **Pedido** (com o número de peças numa
  bolinha) e **Dia**, cada uma com ícone e nome.
- **Embaixo**, uma barra só com o botão da tela atual, quando a tela tem ação (salvar o cliente,
  adicionar a peça ou fechar a venda). Sem ação, não há barra.
- A venda **começa em Produtos**, na escolha da peça. Não existe mais a etapa Cliente no começo.
- O cliente é informado **pelo Pedido**, na linha do cliente ("Alterar").
- Ao fechar, aparece o aviso **"Venda registrada"**, e o botão **"Nova venda"** começa a venda seguinte
  em Produtos.

**O que mudou em relação à versão 10, em uma frase por tela:**

| Tela | Antes (v10) | Agora (v11) |
|---|---|---|
| Navegação | Título da tela no alto; abas embaixo, abaixo do botão | Abas no alto; embaixo só o botão da tela |
| Começo da venda | Etapa Cliente | Escolha da peça (Produtos) |
| Produtos | Tipos em 3 colunas + lista de produtos com selo "N no pedido" | Cartão "1 Peça" e cartão "2 Tecido", sem selo |
| Cor e tamanho | Cores em lista, linha "Falta escolher…" e preço; continuava ali depois de adicionar | Cartões "3 Cor" e "4 Tamanho", sem linha de preço; volta para a peça depois de adicionar |
| Pedido | Quatro cartões, "−"/"+" em cada peça, pagamento com ícones | Linha do cliente, peças só com lixeira, linha de desconto, pagamento sem ícones, "Cancelar pedido" no fim |
| Cliente | Etapa no começo da venda | Formulário "Cliente do pedido", aberto pelo Pedido |
| Aviso de venda | Número do pedido e "OK" (voltava para Cliente) | Ícone, total, peças e pagamento, cliente e "Nova venda" (volta para Produtos) |
| Dia | Título no topo da tela | Título "Vendas de hoje" e data dentro do conteúdo |

## Funcionalidades Principais

- **Entrada do vendedor (sem mudança).** A etapa "Quem está vendendo?" só aparece com mais de um vendedor
  ativo. A senha tem 8 números, digitados num teclado da própria tela, e o oitavo número já dispara a
  conferência. Se o vendedor já entrou hoje, a página abre direto na venda. À meia-noite, ou se o servidor
  recusar a sessão, a página volta sozinha para a entrada.
- **Abas no topo**, presas no alto ao rolar, em três colunas iguais. A aba atual fica destacada. A aba
  Pedido mostra o número de peças numa bolinha (para quem usa leitor de tela, ela é lida como "Pedido
  (3)"). Em telas mais estreitas que 380 pontos as abas ficam só com o nome, sem ícone, para caber.
- **Produtos — escolha da peça e do tecido.**
  - Cartão **"1 Peça"**: os tipos de peça do ERP em 3 colunas, com o primeiro já escolhido; o nome do
    tipo escolhido aparece à direita do título.
  - Cartão **"2 Tecido"**: os produtos daquele tipo em 2 colunas, com "1 opção" ou "N opções" à direita.
    O nome aparece sem repetir o tipo ("Suplex new zeland" no tipo "Bermuda médio").
  - Só aparecem tipos e tecidos **com estoque**: produto sem nenhuma variação com saldo não aparece.
  - Sem preço nem estoque nesta tela, e sem o antigo selo "N no pedido". Com o catálogo vazio:
    "Nenhum produto cadastrado no ERP."
  - Sem botão embaixo: tocar num tecido já abre a tela de cor e tamanho.
- **Cor e tamanho.**
  - No alto, a seta "Voltar para peça e tecido" e o título com a peça e, abaixo, o tecido.
  - Cartão **"3 Cor"**: só as cores com algum tamanho em estoque, em 2 colunas, cada uma com a amostra do tom (ou a miniatura da estampa) e o
    nome; a escolhida fica em roxo, com uma marca sobre a amostra.
  - Cartão **"4 Tamanho"**, só depois da cor: 4 colunas, cada tamanho com a sigla e "estoque N". **Só
    aparecem os tamanhos com estoque**, e todos podem ser escolhidos (não existe mais tamanho tracejado
    nem "estoque 0"). Trocar de cor mantém o tamanho, se ele existir na cor nova.
  - O botão **"Adicionar ao pedido"** só aparece com cor e tamanho escolhidos. Se o pedido já tem todo o
    estoque daquele tamanho, ele fica apagado, **sem texto extra**.
  - Saíram a linha "Falta escolher: cor e tamanho" e a linha de preço.
- **Aba Pedido.**
  - **Linha do cliente**: "nome · celular" (ou "Cliente não identificado") com "Alterar"; tocar na linha
    abre o formulário do cliente.
  - **PEÇAS**, com "N peças" à direita: cada linha tem o modelo, "tecido · Tam X · cor" (e
    " · 2 × R$ 89,00" quando há mais de uma unidade), o subtotal e a **lixeira** ("Tirar peça"). **Não há
    mais "−" e "+" de quantidade**: para levar mais uma unidade, o vendedor adiciona de novo em Produtos
    (soma na mesma linha, até o estoque).
  - Se o estoque caiu depois de uma atualização, a linha avisa **"Só N em estoque — tire a peça e
    adicione de novo"** ou **"Sem estoque — tire a peça"**.
  - **Desconto**: "−" e "+" em passos de **R$ 5**, com o valor no meio ("R$ 0,00" ou "− R$ 10,00"). O "−"
    fica apagado em zero; o "+" fica apagado quando mais R$ 5 passariam do valor das peças. **O desconto
    diminui sozinho quando peças saem** (ou quando um preço cai), ficando no maior múltiplo de R$ 5 que
    cabe no valor das peças.
  - **PAGAMENTO**: as formas vindas do servidor em 2 colunas, só com o nome (sem ícones).
  - **"Cancelar pedido"**, como link no fim da tela.
  - Pedido vazio mostra só "Nenhuma peça no pedido ainda. Escolha em Produtos."
- **Barra de fechamento** (aba Pedido): com peças, o resumo ("N peças" e o valor cheio, e o desconto);
  abaixo, o botão com o que falta à esquerda — **"Inclua uma peça"**, **"Escolha o pagamento"** ou
  **"Fechar venda"** — e o **total** à direita. O botão aparece também com o pedido vazio, apagado.
  Enquanto envia, fica travado. Erro do servidor aparece acima do botão.
- **Cliente do pedido** (aberto pelo "Alterar"): seta "Voltar para o pedido", título, campos **Nome** (até
  120 letras) e **Celular**. A máscara se forma aos poucos enquanto o vendedor digita: "(31", "(31) 98765",
  "(31) 98765-4321". Com o celular incompleto aparece **"Complete o celular com DDD (11 números) ou deixe em
  branco."** e "Salvar cliente" fica apagado. Embaixo: **"Salvar cliente"** e **"Venda sem cliente"**
  (apaga nome e celular); os dois voltam para o Pedido.
- **Aviso de venda**: janela no meio da tela com ícone de confirmação, "Venda registrada", o total, "N
  peças · forma de pagamento" e o nome do cliente (ou "Cliente não identificado"), com os valores
  devolvidos pelo servidor. **Não mostra mais o número do pedido.** Só fecha por **"Nova venda"**.
- **Aba Dia**: título "Vendas de hoje" e a data ("12 out") no próprio conteúdo; cartões **"Total do dia"**
  e **"Pedidos"** e a lista das vendas do vendedor ("#N · cliente", "hora · N peças · pagamento" e o
  total), buscada de novo sempre que a aba é aberta. Funciona mesmo com o catálogo carregando ou em falha.
- **Botões com relevo**: tipos, tecidos, cores, tamanhos, pagamentos e o "−"/"+" do desconto têm
  aparência de tecla; o escolhido fica roxo e "afundado"; o indisponível (hoje só o "−"/"+" do
  desconto no limite) fica sem fundo, com borda tracejada. A tela de entrada não usa esse estilo.
- **Mensagens de erro e "Tentar de novo"** quando algo não carrega ou a internet falha.

## Fluxos de Negócio

**1. Entrada do vendedor (sem mudança desde a v5)**
1. A página confere se já existe sessão válida para hoje; se existir, vai direto para a venda.
2. Se não, mostra a escolha do vendedor (só com mais de um) e a senha de 8 números. O oitavo número
   envia a senha; enquanto o servidor responde, o teclado fica travado.
3. Senha certa: abre a tela de venda, que carrega o catálogo e mostra **Produtos** (escolha da peça).
   O catálogo é buscado de novo, em segundo plano e sem mexer no pedido, sempre que o vendedor entra em
   **Produtos** ou **Pedido** e quando o celular volta ao navegador; a aba Dia não busca.
   Qualquer erro apaga os números e mostra a mensagem.

**2. Montagem e fechamento da venda**
1. **Peça e tecido.** O vendedor escolhe a peça (o primeiro tipo já vem escolhido) e toca no tecido.
2. **Cor e tamanho.** Escolhe a cor, depois o tamanho, e toca "Adicionar ao pedido". A peça entra, a
   bolinha da aba Pedido sobe e a tela **volta para peça e tecido**, com a mesma peça ainda escolhida,
   pronta para a próxima. Adicionar de novo a mesma variação soma uma unidade na linha existente, até o
   limite do estoque.
3. **Pedido.** O vendedor confere as peças (pode tirar alguma pela lixeira), informa o cliente se quiser
   (linha do cliente → "Alterar"), aplica o desconto no pedido e escolhe o pagamento.
4. **Fechar venda.** A página envia o código do pedido, cada variação com a quantidade (desconto por peça
   sempre zero), o desconto no pedido, o nome do cliente, o celular só com os números (ou vazio) e o
   pagamento — **sem preços**. O servidor confere, calcula, registra e baixa o estoque. **O conteúdo
   enviado é exatamente o mesmo da versão anterior.**
5. **Faltou estoque ou a peça saiu de venda:** a mensagem do servidor aparece acima do botão, a tela
   atualiza os estoques e o pedido continua como estava; a linha afetada pede para tirar a peça (e
   adicionar de novo, se ainda houver estoque). Qualquer mudança no pedido apaga a mensagem.
6. **Internet falhou:** o vendedor toca de novo em "Fechar venda". O código do pedido é o mesmo em todas
   as tentativas e o servidor registra a venda uma única vez.
7. **Venda registrada:** aparece o aviso com o total, e os estoques são atualizados em segundo plano.
   **"Nova venda"** limpa tudo (peças, desconto, pagamento, nome e celular), gera um código de pedido novo
   e volta para **Produtos**.

**3. Informar ou alterar o cliente**
- Na linha do cliente do Pedido, "Alterar" abre "Cliente do pedido" com o nome e o celular já
  preenchidos. "Salvar cliente" grava e volta ao Pedido; "Venda sem cliente" apaga os dois e volta ao
  Pedido. **Voltar pela seta ou trocar de aba descarta o que foi digitado** (antes, a edição ficava
  guardada).
- A linha do cliente só aparece com ao menos uma peça no pedido.

**4. Cancelar pedido**
- "Cancelar pedido", no fim da aba Pedido, limpa tudo na hora (peças, desconto, pagamento, nome e
  celular), sem confirmação, gera um código novo e **volta para Produtos**. Fica desligado enquanto a
  venda está sendo enviada.

**5. Consulta do dia**
- A aba Dia busca no servidor as vendas de hoje sempre que é aberta.

**6. Como a página decide o que mostrar**

| Onde o vendedor está | O que aparece | Botão embaixo |
|---|---|---|
| Aba Produtos, sem tecido aberto | Peça e tecido | nenhum |
| Aba Produtos, com um tecido aberto | Cor e tamanho | "Adicionar ao pedido" (só com cor e tamanho) |
| Aba Pedido | Pedido | resumo e botão de fechar |
| Aba Pedido, depois de "Alterar" | Cliente do pedido | "Salvar cliente" e "Venda sem cliente" |
| Aba Dia | Vendas de hoje | nenhum |

Ir a outra aba e voltar mantém o tecido aberto e a cor e o tamanho escolhidos; só a edição do cliente é
descartada. As abas continuam no alto mesmo enquanto o catálogo carrega ou se ele falhar.

## Integrações e Dependências

| Item | Para que serve |
|---|---|
| **pdv-backend** (API) | Fonte de tudo o que a tela mostra e destino das vendas: catálogo (`GET /catalogo`), registro da venda (`POST /vendas`, com `telefone` e sem `cpf`), vendas de hoje (`GET /vendas/hoje`), entrada e sessão. A página chama `/api/...` no mesmo domínio e a hospedagem repassa ao pdv-backend de produção. **Sem mudança nesta versão**: nenhuma rota nova e o mesmo conteúdo enviado. |
| **ERP Move On** (indireto) | O catálogo mostrado (tipos, produtos, cores, tamanhos, preços e estoques) é o cadastrado no ERP, recebido pelo pdv-backend. |
| **Contrato da API** (`backend/contrato/openapi.yaml`) | Descrição oficial das mensagens trocadas com o pdv-backend; os tipos de dados da tela são gerados a partir dele. |
| **API simulada (MSW)** | Imita o pdv-backend dentro do navegador, só no desenvolvimento e nos testes. Ganhou um servidor de pré-visualização local (porta 5199) para conferir a tela no navegador. |
| **Fonte Inter e ícones Phosphor** | Tipografia e ícones, empacotados com a página (sem serviço externo). |
| **Hospedagem (Vercel)** | Projeto `pdv-loja-frontend`, com Node 22; publica a página pronta e repassa `/api` ao pdv-backend. |
| **Código-fonte (GitHub)** | Repositório `lucoti/pdv-loja-frontend`; o que entra na branch principal é publicado. |

Nenhuma integração nova nesta versão. A publicação é só da página: o pdv-backend de que ela depende (com
`telefone`) já está no ar.

## Dados Gerenciados

A página não tem banco de dados e **não salva nada no aparelho**. Tudo fica só na memória enquanto ela
está aberta:
- o vendedor conectado;
- o pedido em andamento: peças (cada uma é uma variação do ERP) e quantidades, desconto no pedido, nome e
  celular do cliente (o celular só com os números), forma de pagamento e o código do pedido que evita
  duplicidade;
- o que está sendo digitado em "Cliente do pedido", antes de salvar (descartado ao voltar ou trocar de
  aba);
- a peça e o tecido escolhidos e a cor e o tamanho em escolha;
- o catálogo (com os estoques da última busca) e as vendas do dia.

A senha e o celular não são gravados no aparelho nem aparecem no endereço da página. O celular só sai do
aparelho no envio da venda; o aviso de venda e a aba Dia mostram só o nome do cliente. Valores em
centavos, como no servidor.

## Pontos de Atenção

**Mudanças de comportamento aprovadas (Lucas, 2026-10-12):**
- **Sem "−"/"+" de quantidade no Pedido.** Mais uma unidade = adicionar de novo em Produtos; o limite do
  estoque vale no "Adicionar", contando o que já está no pedido.
- **Avisos de estoque na linha** mudaram para "Só N em estoque — tire a peça e adicione de novo" e "Sem
  estoque — tire a peça".
- **"Cancelar pedido" também apaga o cliente** e volta para Produtos (antes voltava para a etapa Cliente).
- **O desconto agora acompanha o valor das peças para baixo**: tirar peça (ou um preço cair) reduz o
  desconto até caber. Antes ele podia ficar acima do valor.
- **Aviso de venda sem o número do pedido.** O número continua na aba Dia ("#N").
- **Corrigido:** o toque numa aba exatamente no fim da carga do catálogo deixava de valer às vezes; agora
  as abas são as mesmas antes e depois da carga.

**Pequenos desvios do design, aceitos na conferência no navegador:**
- A marca da cor escolhida fica **sobre a amostra**, e não ao lado do nome (ao lado, "Marinho" partia ao
  meio na largura de 390 pontos).
- **Abaixo de 380 pontos de largura as abas ficam sem ícone** (não cabiam "Pedido", o ícone e a bolinha).
- **Abaixo de 360 pontos a linha do desconto fica mais compacta** e, com valores muito altos, o título
  pode virar "Desco…".

**Pontos que continuam valendo:**
- **"Nova venda" é o que gera o código do pedido seguinte.** Enquanto o aviso está aberto, o pedido
  registrado continua na memória com o código antigo. Dois toques muito rápidos em "Nova venda" geram dois
  códigos seguidos, sem efeito para o vendedor (vale o último, com o pedido já vazio).
- **Travas contra toque duplo** em "Fechar venda" e "Cancelar pedido" (conferem na hora do toque se já há
  envio em andamento). A troca de aba e o "Nova venda" não têm essa trava, por decisão.
- **Pedido vazio esconde o cliente e o pagamento**, mas eles continuam guardados: se o vendedor tirar
  todas as peças e adicionar outra, o cliente e o pagamento escolhidos antes reaparecem. Para começar do
  zero, use "Cancelar pedido" antes de tirar a última peça.
- **Celular só com 11 números** e **nome com até 120 letras**, as mesmas regras do servidor e da API
  simulada; mudar só de um lado faz o servidor recusar a venda.
- **Desconto por peça saiu só da tela**: o servidor ainda aceita; a página manda sempre zero.
- **Teto do desconto em múltiplos de R$ 5** (com peças de R$ 89,00, o máximo é R$ 85,00).
- **Tecido aberto que sai do catálogo:** a página volta sozinha para peça e tecido. **Peça (tipo) que sai
  do catálogo:** volta para o primeiro tipo.
- **Estoque mostrado é o da última busca do catálogo**: ao abrir o PDV, ao entrar em Produtos ou
  Pedido, ao voltar ao navegador, depois de cada venda e quando o servidor recusa por falta de estoque.
  Não é em tempo real: com a tela de cor e tamanho parada, um tamanho que zerou continua à vista até a
  próxima busca, e a venda é recusada pelo servidor.
- **Modo simulado (desenvolvimento)** filtra o catálogo como o servidor: as variações zeradas do exemplo
  servem só para testar a recusa por falta de estoque.
- **Preço mudado com o pedido aberto:** a cada atualização do catálogo, as peças do pedido passam a usar
  o preço atual do ERP.
- **Pedido perdido se a sessão cair** (meia-noite ou recusa) ou se a página for recarregada.
- **Exige endereço seguro (HTTPS)**: em teste, abrir pelo endereço de rede local (http://192.168…)
  impede montar vendas.
- **A data da aba Dia vem do relógio do celular**, não do horário da loja.
- **Cores do tema num único arquivo** (`src/estilos/tokens.css`, com as cores novas dos botões com
  relevo), exceto a amostra de cor sem tom cadastrado, na tela de cor e tamanho.
- **Grades conferidas por teste** (3 abas, 3 colunas de peças, 2 de tecidos, 2 de cores, 4 de tamanhos, 2
  de pagamentos): os testes automáticos não medem largura, só leem a regra das grades. A tela foi
  conferida no navegador a 390, 360 e 320 pontos, sem nada passar da borda; a 320 pontos "estoque 12"
  quebra em duas linhas.
- **Não há botão "Sair"**, **não há confirmação em "Cancelar pedido"**, **sem impressão de cupom** e
  **sem funcionamento offline**.
- **Versões de teste usam o servidor de produção** e baixam o estoque real do ERP.

**Pendências técnicas registradas (sem efeito para o vendedor):**
- Restos do "−"/"+" de quantidade ainda existem por dentro do código, sem botão na tela; e o cálculo do
  "a partir de" do preço ficou sem uso. Ambos ficam para uma limpeza futura.
- O problema do endereço de rede local (HTTPS) continua sem teste automático.

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
| v11 | 2026-10-12 | **To-be da pdv-mobile-atualizado** (design "PDV Loja Mobile atualizado", estado novo após a refatoração): abas Produtos / Pedido / Dia **no topo**, com o número de peças numa bolinha, e barra de baixo só com o botão da tela; venda começando em **Produtos** (sem etapa Cliente), com cartões "1 Peça" e "2 Tecido" e, na tela seguinte, "3 Cor" (2 colunas, amostra) e "4 Tamanho" (4 colunas, "estoque N"); "Adicionar ao pedido" só com cor e tamanho, apagado sem texto no limite do estoque, e **volta para peça e tecido** depois de adicionar; Pedido com linha do cliente ("Alterar"), peças **só com a lixeira** (sem "−"/"+"), desconto de R$ 5 em R$ 5 que **diminui sozinho** quando o valor das peças cai, pagamento em 2 colunas sem ícones e "Cancelar pedido" no fim (que também apaga o cliente e volta para Produtos); formulário **"Cliente do pedido"** com mensagem de celular incompleto e máscara progressiva, descartado ao voltar ou trocar de aba; aviso de venda com total, peças, pagamento e cliente e o botão **"Nova venda"**, sem o número do pedido; Dia com título e data no conteúdo; botões com relevo; ajustes para telas de 360 e 320 pontos. Corrigido o toque perdido numa aba no fim da carga. Conteúdo enviado ao servidor e tela de entrada sem mudança. Desenvolvida (290 testes automáticos verdes, conferida no navegador); validação final e publicação pendentes (só a página). |
| v12 | 2026-10-13 | Catálogo sempre atualizado e só com estoque: busca de novo ao abrir o PDV, ao entrar em Produtos ou Pedido e quando o celular volta ao navegador (a aba Dia não busca); produto, cor e tamanho sem estoque não aparecem (saem o tamanho tracejado e o "estoque 0"); modo simulado filtra como o servidor. Tipos gerados do contrato 1.1.0. Publicado no `main` (commits `c867f18` e `9a97d93`). |
