# Handoff: PDV — Loja de roupas (lançamento de vendas em carrinho)

## Overview
PDV (ponto de venda) para uma loja de roupas fitness/moda praia onde cada modelo tem
três eixos de variação: **tecido**, **tamanho** e **cor**. O vendedor lança a venda
como um carrinho de compras: escolhe o modelo, define as variações, adiciona ao pedido,
ajusta quantidade e descontos, informa cliente e forma de pagamento e fecha a venda.
Há também uma listagem das vendas do dia.

Contexto de uso definido pelo cliente:
- Uso em **celular** (tela estreita, toque).
- Catálogo pequeno: **até ~20 modelos base**.
- Público de vendedores **+50 anos** → tipografia grande, alvos de toque grandes,
  poucos passos, nada escondido em menus.
- Fluxo escolhido: **produto → painel de variações (tecido, tamanho, cor) → adicionar**.
- Cores de produto aparecem como **círculo de cor + nome**.

## About the Design Files
Os arquivos em `design/` são **referências de design feitas em HTML** — protótipos que
mostram a aparência e o comportamento pretendidos. **Não são código de produção para
copiar.** A tarefa é **recriar estas telas no ambiente existente do codebase alvo**
(React/React Native, Vue, Flutter, SwiftUI, nativo Android…) usando os padrões,
componentes e bibliotecas já estabelecidos nele. Se ainda não existe codebase, escolha
o framework mais adequado ao projeto (para celular, sugestão: React + PWA se precisar
rodar no navegador da loja, ou React Native se for app instalado) e implemente as telas lá.

Os arquivos `.dc.html` usam um runtime próprio de prototipagem (`support.js`): a estrutura
é um template HTML com buracos `{{ }}` e uma classe de lógica JavaScript no fim do arquivo.
Leia-os como **especificação de layout + lógica**, não como componentes reutilizáveis.
Para visualizar, abra o `.html` direto no navegador (largura de celular, ~390–460px).

## Fidelity
**High-fidelity (hifi).** Cores, tipografia, espaçamentos, tamanhos de alvo de toque,
estados de botão e toda a copy em português estão definidos e devem ser reproduzidos
fielmente — a escala grande de tipografia e de botões é um requisito de acessibilidade
do projeto, não uma preferência estética. Se o codebase alvo já tem um design system,
mapeie os tokens abaixo para os equivalentes dele, mantendo os **tamanhos mínimos**
(fonte ≥17px, alvo de toque ≥54px).

---

## Design Tokens

### Cores de interface
| Token | Hex | Uso |
|---|---|---|
| `ink` | `#22201C` | Texto principal, header, botões "+" e contorno forte |
| `ink-soft` | `#5C574E` | Texto secundário, rótulos de seção, botões inativos |
| `paper` | `#F6F4F0` | Fundo da área de conteúdo / "folha" do app |
| `paper-2` | `#FFFFFF` | Cartões, campos, teclas |
| `desk` | `#E7E4DE` | Fundo fora da folha, teclas neutras, aba inativa |
| `line` | `#DAD5CB` | Bordas (2px em todo o design) |
| `line-2` | `#BFB9AD` | Borda de marcador de PIN vazio |
| `green` | `#1D5B3F` | Cor primária: seleção, confirmação, preços, CTA |
| `green-soft` | `#E6EFE9` | Fundo de item selecionado |
| `green-hover` | `#16452F` | `a:hover` |
| `disabled-bg` | `#D5D0C6` | Fundo de CTA desabilitado |
| `disabled-fg` | `#8A857C` | Texto de CTA desabilitado e `::placeholder` |
| `danger` | `#8A3A28` | "Excluir", badge de desconto por item |
| `danger-deep` | `#7A2E1C` | Texto da caixa de erro do login |
| `danger-bg` | `#F6E4DE` | Fundo da caixa de erro |
| `danger-line` | `#C98B76` | Borda da caixa de erro |
| `accent-warm` | `#E9B39F` | Linha "Descontos" sobre o painel escuro de total |

### Tipografia
- Família: **Libre Franklin** (Google Fonts, pesos 400/500/600/700), fallback
  `Helvetica, Arial, sans-serif`. `-webkit-font-smoothing: antialiased`.
- Escala usada (px): 16 e 17 (apoio/legendas), 18–19 (rótulos, botões secundários),
  20–21 (corpo, nome de item, inputs), 23–24 (títulos de cartão, CTA, quantidade),
  26 (títulos de tela, total do carrinho), 28–30 (teclado numérico, títulos de sucesso),
  36 (valor total).
- Rótulos de seção: 16px, `font-weight: 700`, `letter-spacing: 0.07em`, MAIÚSCULAS, cor `ink-soft`.
- Números monetários e quantidades: `font-variant-numeric: tabular-nums`.
- Títulos de linha curta: `line-height: 1.15–1.2`; textos corridos: `1.5`.

### Espaçamento e forma
- Grade de espaçamento: 4 / 8 / 10 / 12 / 14 / 16 / 18 / 22 / 24 / 28 px. `gap` em flex/grid
  (não margens por elemento).
- Raio: **12px** (campos, teclas pequenas, botões +/−), **14px** (CTAs, botões de variação),
  **16px** (cartões), **999px** (chips de categoria, círculos de cor, marcadores de PIN).
- Bordas: **2px** padrão; **3px** quando o item está selecionado (tecido, tamanho, cor, pagamento).
- Sombra: apenas `0 0 0 1px rgba(34,32,28,0.08)` na "folha" do app. Sem sombras difusas.
- Largura da folha: `max-width: 460px`, centralizada sobre o fundo `desk`.

### Alvos de toque (mínimos obrigatórios)
- Botão +/− de quantidade e voltar: **58×58**
- Botões de desconto por item: **62×54**
- Botão de tamanho: altura **74**
- Tecla do teclado numérico: altura **76**
- Cartão de produto / vendedor / botão de cor: altura mínima **68–88**
- CTA principal: `padding: 22–24px`, largura total
- Abas inferiores: `padding: 18px 8px`

---

## Modelo de dados (domínio)

```
Categoria      { id, nome }                       // calca | bermuda | top | conj
Modelo         { id, nome, categoriaId, precoBase }
Tecido         { id, nome, acrescimo }            // normal: +0 | light: +12
Tamanho        'P' | 'M' | 'G' | 'GG'
Cor            { nome, hex }
Vendedor       { nome, cargo, senha }             // hoje: apenas Carlos, senha '1234'

ItemPedido     { key, modeloNome, tecidoNome, tamanho, cor, qtd, precoUnit, descPercent }
               // key = `${modeloId}-${tecidoId}-${tamanho}-${cor}` → identifica a variação
Pedido         { numero, itens[], descontoTotalReais, cliente, cpf, pagamento, total, hora }
```

### Regras de negócio
1. **Preço da variação** = `modelo.precoBase + tecido.acrescimo`.
   Tamanho e cor **não** alteram preço. (Suplex Light custa R$ 12 a mais.)
2. **Chave de variação**: adicionar uma combinação que já existe no carrinho **incrementa a
   quantidade** em vez de criar uma segunda linha.
3. **Desconto por item**: percentual escolhido entre `0 | 5 | 10 | 15`.
   Subtotal do item = `precoUnit * qtd * (1 - desc/100)`.
4. **Desconto no total**: valor em reais, ajustado em passos de **R$ 5**, mínimo 0.
5. **Bruto** = soma de `precoUnit * qtd`. **Descontos** = descontos por item + desconto total.
   **Total** = `max(0, bruto - descontos)`.
6. **"−" na quantidade com qtd = 1 remove o item** do carrinho.
7. **Fechar venda** só é habilitado com `itens.length > 0` **e** forma de pagamento escolhida.
8. Ao fechar: o pedido entra na lista do dia com hora `HH:MM`, o carrinho é limpo,
   cliente/CPF/pagamento/descontos são zerados e o **número do pedido incrementa**
   (protótipo começa em `#1042`).
9. **Login**: senha numérica de 4 dígitos; com 1 vendedor cadastrado a tela de seleção é
   omitida e o vendedor já vem selecionado. Senha errada → limpa o PIN e mostra erro.

### Dados de exemplo do protótipo
Categorias: Calças, Bermudas, Tops, Conjuntos.
Modelos (nome / categoria / preço base):
Calça Legging 89 · Calça Flare 99 · Calça Pantalona 109 · Calça Corsário 79 ·
Bermuda Ciclista 59 · Bermuda Longa 69 · Short Saia 65 · Short Curto 55 ·
Top Alça Larga 49 · Top Nadador 55 · Blusa Manga Longa 79 · Regata Básica 45 ·
Conjunto Legging + Top 139 · Conjunto Ciclista + Top 119.
Tecidos: Suplex Normal (+0), Suplex Light (+12).
Tamanhos: P, M, G, GG.
Cores: Preto `#1B1B1B` · Marinho `#26344F` · Grafite `#5A5A5A` · Vinho `#6B2232` ·
Verde Militar `#4A5236` · Rosa Antigo `#B4808A` · Bege `#C7B299` · Off White `#EDE8DE`.
Pagamentos: Dinheiro, Pix, Débito, Crédito.

---

## Screens / Views

### 1. Login (`design/PDV Login.dc.html`)
**Propósito:** proteger o PDV; identificar o vendedor do turno.

**Layout:** folha de 460px em coluna.
- Cabeçalho escuro (`ink`, texto `paper`), `padding: 40px 24px 34px`, coluna com `gap: 8px`:
  "BALCÃO" (26px/700, `letter-spacing: 0.02em`) e "Ponto de venda · {loja}" (19px, opacidade 0.75).
  `loja` é configurável, padrão "Unidade Centro".
- Conteúdo `flex: 1`, `padding: 28px 20px 34px`, `gap: 24px`.
- Rodapé com borda superior 2px `line`, 17px `ink-soft`, centralizado, `line-height: 1.5`:
  "Esqueceu a senha? Peça ao gerente." + "Senha de teste: **1234**"
  (**remover a linha da senha de teste na implementação real**).

**Etapa A — seleção de vendedor** (só aparece se houver mais de um vendedor cadastrado):
título "Quem está vendendo?" (26px/700) e lista de cartões, `gap: 12px`. Cada cartão:
altura mín. 88px, `padding: 18px 20px`, raio 16, borda 2px `line`, fundo branco;
círculo de 56px com a inicial (fundo `green-soft`, borda 2px `green`, texto `green` 23px/700),
nome (23px/700) + cargo (17px `ink-soft`), chevron "›" 30px `green` à direita.
Estado ativo: borda `green`, fundo `green-soft`.

**Etapa B — senha (tela inicial no cenário atual, 1 vendedor):**
- Linha de cabeçalho: botão voltar 58×58 (só com múltiplos vendedores) + nome do vendedor
  (24px/700) e "Digite sua senha de 4 números" (17px `ink-soft`).
- Marcadores de PIN: 4 círculos de 26px centralizados, `gap: 14px`. Preenchido: fundo e
  borda `green`; vazio: transparente com borda 2px `line-2`.
- Caixa de erro (condicional): `padding: 16px 18px`, raio 14, fundo `danger-bg`,
  borda 2px `danger-line`, texto `danger-deep` 19px/600 centralizado —
  "Senha incorreta. Tente de novo."
- Teclado próprio (**não usar o teclado do sistema, não usar `<input>`**):
  grid 3 colunas, `gap: 12px`, teclas de 76px de altura, 28px/700, raio 14, fundo branco,
  borda 2px `line`. Ordem: 1–9, célula vazia (transparente, sem borda, sem clique),
  0, "apagar" (19px, fundo `desk`, texto `ink-soft`).
- CTA "Entrar no PDV": largura total, `padding: 24px`, 23px/700, raio 14.
  Habilitado só com 4 dígitos: fundo `green` / texto branco; desabilitado:
  `disabled-bg` / `disabled-fg` e `cursor: not-allowed`.

**Comportamento:** o PIN aceita no máximo 4 dígitos; digitar limpa o erro.
Senha correta → **navega imediatamente para a tela de venda** (sem tela de boas-vindas
intermediária — isso foi explicitamente removido pelo cliente). Senha errada → limpa o PIN
e mostra a caixa de erro.

---

### 2. PDV — lançamento de venda (`design/PDV Loja Mobile.dc.html`)
Tela única com **3 abas fixas no rodapé** e um CTA contextual acima delas.

**Cabeçalho** (`position: sticky; top: 0`, `z-index: 20`): fundo `ink`, texto `paper`,
`padding: 16px 18px`. À esquerda "BALCÃO" (21px/700) e "{vendedor} · pedido #{numero}"
(16px, opacidade 0.75). À direita a data `DD/MM/AAAA` em pílula 17px,
`padding: 10px 14px`, fundo `rgba(246,244,240,0.15)`.

**Área de conteúdo:** `padding: 18px 16px 150px` (o padding inferior reserva espaço para
a barra fixa).

**Barra inferior** (`position: sticky; bottom: 0`): fundo `paper`, borda superior 2px `line`,
`padding: 14px 16px`, coluna com `gap: 12px`. Contém o CTA da aba atual (quando houver) e,
abaixo, as abas em grid de 3 colunas, `gap: 10px`, cada uma 18px/700, `padding: 18px 8px`,
raio 14; ativa: fundo `ink`/texto `paper`; inativa: fundo `desk`/texto `ink-soft`.
Abas: **Produtos** · **Pedido (n)** (n = total de peças, mostrado só se houver itens) · **Dia**.

#### 2a. Aba Produtos — escolha do modelo
- Chips de categoria: linha que quebra, `gap: 10px`; 19px/600, `padding: 14px 20px`,
  raio 999; ativa fundo `green`/branco, inativa fundo branco/`ink` com borda 2px `line`.
- Lista de modelos da categoria (coluna, `gap: 12px`). Cada linha: altura mín. 84px,
  `padding: 18px 20px`, raio 16, borda 2px `line`, fundo branco; nome 23px/700 +
  "a partir de R$ XX,XX" (17px `ink-soft`); chevron "›" 30px/700 `green` à direita.
  Ativo: borda `green`, fundo `green-soft`.
- Tocar um modelo abre o painel de variações **com o tecido já pré-selecionado em
  "Suplex Normal"** (tamanho e cor em branco).

#### 2b. Aba Produtos — painel de variações
Coluna com `gap: 22px`. Cabeçalho: botão voltar 58×58 (borda 2px `ink`) + nome do modelo (26px/700).
Três blocos, cada um com rótulo de seção (16px/700, `letter-spacing: 0.07em`, `ink-soft`,
`margin-bottom: 10px`):
- **TECIDO** — grid 2 colunas, `gap: 12px`. Cada botão: altura mín. 88px, `padding: 18px 16px`,
  raio 14, coluna alinhada à esquerda com `gap: 4px`: nome (20px/700) e preço já calculado
  para aquele tecido (18px `ink-soft`). Selecionado: borda 3px `green`, fundo `green-soft`.
- **TAMANHO** — grid 4 colunas, `gap: 12px`, botões de 74px de altura, 26px/700, raio 14.
  Selecionado: fundo `green`, texto branco, borda 3px `green`.
- **COR** — grid 2 colunas, `gap: 12px`. Cada botão: altura mín. 68px, `padding: 14px 16px`,
  raio 14, linha com `gap: 12px`: círculo de 30px com a cor real
  (borda 2px `rgba(34,32,28,0.25)`, `flex-shrink: 0`) + nome (19px/600, alinhado à esquerda).
  Selecionado: borda 3px `green`, fundo `green-soft`.

CTA na barra inferior, com uma linha de apoio de 17px `ink-soft` acima:
- incompleto → "Falta escolher: tecido, tamanho, cor" (lista apenas o que falta);
- completo → "Suplex Light · Tam M · Preto — R$ 101,00".
Botão "Adicionar ao pedido" (23px/700, `padding: 22px`) habilitado só quando tecido,
tamanho e cor estão escolhidos. Ao adicionar, a variação é limpa e o app **muda
automaticamente para a aba Pedido**.

#### 2c. Aba Pedido — carrinho / revisão
Coluna com `gap: 18px`. Título "Pedido #{numero}" (26px/700).

1. **Cartão CLIENTE** — raio 16, borda 2px `line`, fundo branco, `padding: 16px`, `gap: 10px`:
   rótulo "CLIENTE" e dois campos de largura total, 21px, `padding: 16px`, raio 12,
   borda 2px `line`, fundo `paper`, `box-sizing: border-box`:
   "Nome do cliente" e "CPF (opcional)" (`inputMode="numeric"`).
2. **Vazio** — se não há itens: bloco centralizado `padding: 44px 16px`, 20px `ink-soft`,
   "Nenhum item ainda. / Volte em Produtos para incluir peças."
3. **Item do carrinho** — cartão raio 16, borda 2px `line`, fundo branco, `padding: 16px`,
   coluna `gap: 14px`:
   - Linha 1: nome do modelo (21px/700) e, abaixo, o detalhe da variação (17px `ink-soft`):
     `"Suplex Light · Tam M · Preto · R$ 101,00"`. À direita, "Excluir" (17px/600,
     `danger`, sublinhado, sem borda, `padding: 8px`).
   - Linha 2: "−" 58×58 (borda 2px `ink`, fundo transparente) · quantidade
     (24px/700, tabular, largura mín. 44px, centralizada) · "+" 58×58 (fundo `ink`,
     texto `paper`) · à direita o subtotal (22px/700, tabular) e, sob ele, quando há
     desconto no item, "−10% aplicado" (16px, `danger`).
   - Linha 3: rótulo "DESCONTO" à esquerda e, à direita, 4 botões 62×54 (18px/700, raio 12):
     "sem", "5%", "10%", "15%". Selecionado: fundo `danger`, texto branco, borda 2px `danger`;
     não selecionado: fundo `paper`, texto `ink-soft`, borda 2px `line`.
4. **Cartão DESCONTO NO TOTAL** — mesmo estilo de cartão. Linha com "−" 58×58,
   valor centralizado (24px/700, tabular) — "sem desconto" ou "− R$ 15,00" — e "+" 58×58
   (fundo `ink`). Passo de R$ 5, mínimo 0.
5. **Cartão FORMA DE PAGAMENTO** — grid 2 colunas, `gap: 12px`; botões 20px/600,
   `padding: 22px 12px`, raio 14, fundo `paper`; selecionado: borda 3px `green`,
   fundo `green-soft`.
6. **Painel de totais** — fundo `ink`, texto `paper`, raio 16, `padding: 18px 16px`,
   `gap: 8px`: linha "N peças" / bruto (19px); linha "Descontos" / "− R$ X" (19px,
   cor `accent-warm`); separador `1px rgba(246,244,240,0.25)` com `padding-top: 12px`;
   "Total" (23px/700) e o valor (36px/700, tabular, `line-height: 1`).
7. **"Cancelar pedido"** — 18px/600, `padding: 16px`, raio 14, borda 2px `line`,
   fundo transparente, texto `ink-soft`. Limpa itens, descontos, cliente, CPF e pagamento
   (mantém o número do pedido).

CTA na barra inferior, com rótulo dinâmico: "Inclua uma peça" (carrinho vazio) →
"Escolha o pagamento" (sem pagamento) → "Fechar venda · R$ XXX,XX". Só habilitado no
terceiro caso.

#### 2d. Aba Dia — vendas do dia
Título "Vendas de hoje" (26px/700). Duas caixas lado a lado, `gap: 12px`:
"Total do dia" (fundo `ink`, texto `paper`, 16px/28px/700 tabular) e "Pedidos"
(cartão branco com borda 2px `line`, rótulo 16px `ink-soft` + número 28px/700).
Abaixo, lista de pedidos fechados (mais recente primeiro): cartão branco, raio 16,
borda 2px `line`, `padding: 18px 16px`; "Pedido #1042 · Maria" (21px/700) e
"14:35 · 3 peça(s) · Pix" (17px `ink-soft`); total à direita (23px/700, tabular).
Estado vazio: "Nenhuma venda registrada ainda." (20px `ink-soft`, centralizado, `padding: 40px 16px`).

#### 2e. Modal de venda registrada
Overlay `rgba(34,32,28,0.6)` em tela cheia, `z-index: 50`, `padding: 22px`, conteúdo centralizado.
Caixa `max-width: 420px`, fundo `paper`, raio 20, `padding: 30px 24px`, centralizada, `gap: 16px`:
"Venda registrada" (28px/700, `green`), resumo (20px `ink-soft`, `line-height: 1.5`) —
"Pedido #1042 · 3 peça(s) · R$ 268,00 em Pix · Maria" — e CTA "Nova venda"
(22px/700, `padding: 22px`, raio 14, fundo `green`, texto branco), que zera tudo,
incrementa o número do pedido e volta para a aba Produtos.

---

### 3. Variante tablet (`design/PDV Loja (tablet).dc.html`)
Versão anterior, em **paisagem com dois painéis** (catálogo à esquerda, carrinho fixo à
direita, 430px) e pagamento em modal. **Não é o alvo da implementação** — está incluída
apenas como referência caso o PDV ganhe depois uma versão de tablet/desktop. Não tem
cliente/CPF nem descontos.

---

## Interactions & Behavior
- **Navegação:** troca de abas é instantânea, sem animação; nenhuma tela fica atrás de menu.
- **Sem hover como informação:** o uso é por toque. Os destaques de seleção são
  `border` + `background`, persistentes — não dependa de `:hover`.
- **Feedback de toque:** cartões de produto/vendedor mudam para borda `green` +
  fundo `green-soft` no estado ativo.
- **Botões desabilitados** são visíveis, mas em `disabled-bg`/`disabled-fg`, com o rótulo
  explicando o que falta ("Escolha o pagamento") em vez de ficarem escondidos.
- **Sem confirmação destrutiva** no protótipo: "Excluir", "Cancelar pedido" e
  "−" com qtd 1 agem na hora. Recomendação para produção: confirmar "Cancelar pedido".
- **Sem animações/transições** por decisão de projeto (clareza para o público +50).
- **Responsividade:** desenhado para 360–460px de largura. Acima disso a folha fica
  centralizada com `max-width: 460px` sobre o fundo `desk` — não esticar a coluna.
- **Datas/horas/moeda:** locale `pt-BR`; moeda formatada como `R$ 1.234,56` (vírgula decimal);
  hora `HH:MM` com dois dígitos.

## State Management
Estado local da tela de venda:
`aba` (`produtos|pedido|dia`) · `categoriaSelecionada` · `modeloSelecionado` ·
`tecido` · `tamanho` · `cor` · `itens[]` · `descontoTotalReais` · `cliente` · `cpf` ·
`pagamento` · `numeroPedido` · `vendasDoDia[]` · `sucesso` (dados do pedido fechado ou nulo).

Transições principais: escolher modelo → entra no painel de variações (tecido = "normal");
adicionar → limpa variação e vai para `pedido`; fechar venda → grava em `vendasDoDia`,
abre o modal; "Nova venda" → zera tudo e incrementa `numeroPedido`.

Estado do login: `vendedor` · `pin` · `erro`.

**Persistência / backend (a definir com o cliente — fora do protótipo):**
catálogo e preços via API; estoque por variação; pedidos enviados ao servidor com
retry/fila offline; autenticação real (o PIN do protótipo é comparado no cliente);
numeração de pedido vinda do servidor; "vendas do dia" hoje é só memória da sessão e deve
virar consulta por vendedor/data; impressão de cupom não está desenhada.

## Assets
Nenhuma imagem ou ícone: os únicos "ícones" são glifos de texto (`←`, `›`, `−`, `+`) e
círculos de cor desenhados com `background` + `border-radius`. Fonte **Libre Franklin**
via Google Fonts — no codebase alvo, use a fonte já empacotada do design system se houver,
ou empacote a Libre Franklin localmente. As fotos de produto **não** fazem parte deste
design (o cliente optou por círculo de cor + nome, sem foto).

## Files
- `design/PDV Login.dc.html` — login com teclado numérico (alvo da implementação)
- `design/PDV Loja Mobile.dc.html` — PDV mobile: produtos, variações, pedido, dia (alvo da implementação)
- `design/PDV Loja (tablet).dc.html` — variante tablet em dois painéis (referência futura)
- `design/support.js` — runtime do protótipo; não portar
