# 02 — Requisitos: PDV Loja — Front-end (React)

Fontes:
- `design_handoff_pdv_loja/README.md` (telas 1 e 2a–2e, regras 1–9, tokens);
- contrato `backend/contrato/openapi.yaml`;
- decisões do Lucas nas Fases 1 e 2.

O escopo é o handoff mais o que a API exige, sem extras.

## Requisitos funcionais

### RF-F01 — Login: escolha do vendedor
**Como** vendedor, **quero** escolher meu nome, **para** entrar no PDV com a minha senha.

**Critérios de aceite:**
- [ ] **Dado** mais de um vendedor ativo (`GET /api/vendedores`), **quando** o login abre, **então** aparece a etapa "Quem está vendendo?".
  - Cada vendedor é um cartão com a inicial, o nome e o cargo.
- [ ] **Dado** um único vendedor ativo, **quando** o login abre, **então** a etapa de seleção é omitida e ele já vem selecionado.
- [ ] **Dado** vários vendedores, **quando** estou na etapa do PIN, **então** o botão voltar (58×58) retorna à seleção.
  - Com um único vendedor, o botão voltar não aparece.
- [ ] O cabeçalho mostra "BALCÃO" e "Ponto de venda · {unidade}", com a unidade vinda de `GET /api/config`.

### RF-F02 — Login: PIN
**Como** vendedor, **quero** digitar minha senha de 4 números num teclado grande, **para** entrar sem usar o teclado do celular.

**Critérios de aceite:**
- [ ] O teclado é próprio da tela, sem `<input>` e sem o teclado do sistema.
  - Teclas 1–9, uma célula vazia sem clique, 0 e "apagar".
  - Os 4 marcadores mostram quantos dígitos já foram digitados.
- [ ] O PIN aceita no máximo 4 dígitos.
- [ ] "Entrar no PDV" só fica habilitado com 4 dígitos. Desabilitado, aparece visível em `disabled-bg`/`disabled-fg`.
- [ ] **Dado** PIN errado (401), **então** o PIN é limpo e aparece "Senha incorreta. Tente de novo.".
  - Digitar um novo dígito apaga o erro.
- [ ] **Dado** PIN certo, **então** a tela de venda abre direto, sem tela intermediária.
- [ ] O rodapé mostra só "Esqueceu a senha? Peça ao gerente.".
  - A linha "Senha de teste: 1234" é removida, conforme o handoff.

### RF-F03 — Sessão
**Como** vendedor, **quero** continuar logado enquanto a sessão vale, **para** não digitar a senha a cada acesso.

**Critérios de aceite:**
- [ ] **Dado** sessão válida (`GET /api/auth/sessao` → 200), **quando** a página é aberta ou recarregada, **então** vai direto para a venda.
- [ ] **Dado** sessão inexistente ou expirada, **quando** a página abre, **então** mostra o login.
- [ ] **Dado** qualquer chamada protegida que responda 401 (por exemplo, depois da meia-noite), **então** o app volta ao login.
  - O pedido em andamento não é preservado: não há persistência, por decisão de escopo.

### RF-F04 — Cabeçalho do PDV
**Critérios de aceite:**
- [ ] O cabeçalho é fixo no topo e mostra "BALCÃO" e "{vendedor} · pedido novo".
- [ ] A data de hoje aparece em DD/MM/AAAA, numa pílula.
- [ ] O número do pedido não é mostrado antes de fechar a venda, porque é o servidor que o gera ao registrar.
  - *Decisão do Lucas em 2026-09-27; o design mostrava "#1042".*

### RF-F05 — Produtos e painel de variações
**Como** vendedor, **quero** escolher o modelo e depois tecido, tamanho e cor, **para** incluir a peça certa no pedido.

**Critérios de aceite:**
- [ ] O catálogo vem de `GET /api/catalogo`.
- [ ] Os chips de categoria filtram a lista. A primeira categoria já vem selecionada.
- [ ] Cada modelo mostra o nome e "a partir de R$ XX,XX", que é o preço base.
- [ ] **Dado** um toque num modelo, **então** abre o painel de variações.
  - O tecido já vem em "Suplex Normal", o primeiro tecido do catálogo.
  - Tamanho e cor vêm em branco.
- [ ] Cada tecido mostra o preço já calculado (preço base + acréscimo).
- [ ] O tamanho fica numa grade de 4 colunas. A cor aparece como círculo com a cor real mais o nome.
- [ ] A linha de apoio do botão mostra:
  - com a escolha incompleta, "Falta escolher: …", listando só o que falta;
  - com a escolha completa, "{tecido} · Tam {t} · {cor} — R$ X".
- [ ] "Adicionar ao pedido" só fica habilitado com tecido, tamanho e cor escolhidos.
- [ ] Ao adicionar, a variação é limpa e o app vai para a aba Pedido.
- [ ] O botão voltar do painel retorna à lista de modelos.

### RF-F06 — Carrinho (aba Pedido)
**Como** vendedor, **quero** revisar o pedido, ajustar quantidades e descontos e informar o cliente e o pagamento, **para** fechar a venda correta.

**Critérios de aceite:**
- [ ] O título da aba é "Novo pedido".
- [ ] A aba no rodapé mostra "Pedido (n)", com n = total de peças; "(n)" só aparece quando há itens.
- [ ] **Dado** uma variação que já está no carrinho, **quando** adicionada de novo, **então** a quantidade da linha aumenta, sem criar uma linha nova.
- [ ] Os botões "+" e "−" alteram a quantidade. "−" com quantidade 1 remove o item. "Excluir" remove o item na hora.
- [ ] Desconto por item: "sem", "5%", "10%" ou "15%".
  - O subtotal aparece com o desconto aplicado e a linha "−N% aplicado".
- [ ] Desconto no total:
  - os botões "−" e "+" alteram o valor em passos de R$ 5, com mínimo 0;
  - sem desconto, aparece "sem desconto";
  - com desconto, aparece o valor, por exemplo "− R$ 15,00".
- [ ] Campos "Nome do cliente" e "CPF (opcional)". O CPF abre o teclado numérico (`inputMode="numeric"`).
- [ ] A forma de pagamento é escolhida numa grade de 2 colunas, com as opções vindas do catálogo.
- [ ] O painel de totais mostra "N peças" com o valor bruto, os "Descontos" e o "Total".
  - O total nunca fica negativo.
- [ ] "Cancelar pedido" limpa na hora, sem confirmação: itens, descontos, cliente, CPF e pagamento.
- [ ] Com o carrinho vazio aparece "Nenhum item ainda. / Volte em Produtos para incluir peças.".

### RF-F07 — Fechar venda
**Critérios de aceite:**
- [ ] O botão da aba Pedido muda conforme o estado:

  | Estado | Rótulo | Habilitado |
  |---|---|---|
  | Carrinho vazio | "Inclua uma peça" | não |
  | Sem pagamento | "Escolha o pagamento" | não |
  | Pronto | "Fechar venda · R$ X" | sim |

- [ ] Ao fechar, o app chama `POST /api/vendas`.
  - Envia uma `chaveIdempotencia` (UUID), os itens (ids, tamanho, cor, qtd, descPercent), `descontoTotalCentavos`, cliente, CPF e `pagamentoId`.
  - **Não envia preços.**
- [ ] Enquanto a venda é enviada, o botão fica bloqueado, para evitar toque duplo.
- [ ] A chave de idempotência é a mesma em todos os reenvios do mesmo pedido.
  - Uma chave nova só é gerada depois de "Nova venda" ou de "Cancelar pedido".

### RF-F08 — Venda registrada
**Critérios de aceite:**
- [ ] **Dado** uma resposta 201 ou 200, **então** abre o modal "Venda registrada".
  - O modal mostra "Pedido #{numero} · N peça(s) · R$ X em {pagamento} · {cliente}".
  - Os valores são os devolvidos pelo servidor, e o número do pedido é o real.
- [ ] "Nova venda" zera o pedido, gera uma chave nova e volta para a aba Produtos.

### RF-F09 — Aba Dia
**Critérios de aceite:**
- [ ] Ao abrir a aba, os dados vêm de `GET /api/vendas/hoje`.
- [ ] Mostra as caixas "Total do dia" e "Pedidos".
- [ ] A lista vem da mais recente para a mais antiga.
  - Cada linha mostra "Pedido #N · Cliente", "HH:MM · N peça(s) · Pagamento" e o total.
- [ ] Sem vendas, aparece "Nenhuma venda registrada ainda.".
- [ ] Depois de uma venda registrada, a aba reflete a nova venda.

### RF-F10 — Erros da API
**Critérios de aceite:**
- [ ] **Dado** um erro 400 ou 409 da API ao fechar a venda (por exemplo, "CPF inválido" ou item indisponível):
  - a mensagem da API aparece numa caixa no estilo da caixa de erro do login, acima do botão;
  - o pedido é mantido.
- [ ] **Dado** uma falha de rede ou um erro 500:
  - aparece "Sem conexão. Tente de novo." ou a mensagem genérica da API;
  - o pedido e a chave são mantidos;
  - tocar de novo reenvia sem duplicar a venda.
- [ ] **Dado** uma falha ao carregar o catálogo, as vendas do dia ou a configuração, aparece uma mensagem de erro e um botão "Tentar de novo".
- [ ] Enquanto um dado carrega, aparece "Carregando…" em texto simples.
- [ ] Qualquer alteração no pedido apaga a mensagem de erro.

## Requisitos não funcionais

| ID | Categoria | Requisito | Critério mensurável |
|---|---|---|---|
| RNF-F01 | acessibilidade | Escala do handoff (público 50+) | Fonte ≥ 17 px (exceto rótulos de seção e legendas de 16 px definidos no handoff); alvos de toque ≥ 54 px; medidas de cada componente conforme o handoff |
| RNF-F02 | fidelidade | Visual igual ao design | Tokens de cor, tipografia, raios, bordas e espaçamentos do handoff; copy pt-BR idêntica |
| RNF-F03 | usabilidade | Sem animação e sem hover como informação | Nenhuma transição/animação CSS; seleção por borda + fundo persistentes |
| RNF-F04 | layout | Folha centralizada | `max-width: 460px` sobre fundo `desk`; funciona de 360 a 460 px sem rolagem horizontal |
| RNF-F05 | compatibilidade | Página web | Chrome (Android) e Safari (iOS) atuais, acessada pelo navegador; não é instalável |
| RNF-F06 | formatação | Locale pt-BR | Moeda `R$ 1.234,56`, data `DD/MM/AAAA`, hora `HH:MM` |
| RNF-F07 | contrato | Aderência à API | Tipos derivados de `openapi.yaml`; o servidor simulado segue o mesmo contrato |
| RNF-F08 | privacidade | Dados sensíveis | PIN e CPF nunca no console, `localStorage` ou URL |
| RNF-F09 | recursos | Fonte local | Libre Franklin (400/500/600/700) empacotada com a página |

## Regras de negócio
São as mesmas do pdv-backend, usadas no front só para exibição; o servidor é quem define os valores gravados.
- **RN-001:** preço da variação = preço base do modelo + acréscimo do tecido. Tamanho e cor não alteram o preço.
- **RN-002:** subtotal do item = `precoUnit × qtd × (1 − desc/100)`, arredondado para o centavo (meio para cima).
- **RN-003:** bruto = soma de `precoUnit × qtd`; descontos = descontos dos itens + desconto no total; total = `max(0, bruto − descontos)`.
- **RN-004:** desconto por item ∈ {0, 5, 10, 15}%. O desconto no total vai em passos de R$ 5, com mínimo 0.
- **RN-005:** a venda exige pelo menos 1 item e uma forma de pagamento.
- **RN-007:** valores em centavos inteiros. A formatação em reais é feita só na exibição.
- **RN-F01:** a mesma variação (modelo + tecido + tamanho + cor) ocupa uma única linha do carrinho (regra 2 do handoff; o servidor rejeita linhas repetidas).

## Fora de escopo (confirmado)
- Aplicativo instalável (PWA) e funcionamento offline.
- Carrinho salvo no aparelho.
- Confirmação antes de cancelar o pedido.
- Impressão de cupom.
- Botão "Sair".
- Variante tablet e tela de administração.
- Deploy e integração real (ficam na pdv-integracao).

## Aprovação
- Aprovado por: Lucas ("pode aprovar, siga")
- Data/hora: 2026-09-27 11:14
