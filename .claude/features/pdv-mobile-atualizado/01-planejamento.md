# 01 — Planejamento: PDV Loja — Front-end mobile atualizado (abas no topo, peça → tecido → cor → tamanho)

## Objetivo de negócio
Ajustar o front do PDV ao design atualizado (`PDV-loja/PDV Loja Mobile-atualizado.html`): a venda começa direto na escolha da peça, a navegação fica no topo da tela, o fluxo de escolha passa a ser peça → tecido → cor → tamanho, e os botões ficam com cara de botão (relevo) para facilitar o uso no balcão.

## Contexto
O design veio como página única empacotada (bundle do Claude Design, 390 × 844). O protótipo legível foi extraído do bundle (template + script `DCLogic`) para comparação. A base é o front da `main`, entregue pela feature **pdv-mobile-refatorado**, que já está em produção (o deploy foi feito, mas a Fase 6 dela não foi registrada). Esta feature substitui o fluxo daquela: a pdv-mobile-refatorado fica obsoleta e não terá nova etapa.

Telas do design novo: Produtos (1 Peça, 2 Tecido), Cor e tamanho (3 Cor, 4 Tamanho), Pedido (com o formulário "Cliente do pedido"), Dia e o aviso "Venda registrada".

## Escopo
**Inclui:**
- **Navegação**: as 3 abas (Produtos / Pedido / Dia) vão para o topo, em linha, com ícone e nome. O número de peças vira uma bolinha na aba Pedido. Sai o cabeçalho com título de cada tela. A barra de baixo fica só com o botão de ação da tela.
- **Etapa Cliente deixa de abrir a venda**: a venda começa em Produtos. O cliente é informado pela linha do cliente no Pedido ("Alterar"), que abre o formulário "Cliente do pedido" (voltar, Salvar cliente, Venda sem cliente). A mensagem de celular incompleto aparece na tela, a máscara é sempre (DD) 99999-9999 e trocar de aba descarta a edição.
- **Produtos**: cartão 1 Peça (tipos do ERP em grade de 3 colunas) e cartão 2 Tecido (produtos do tipo em grade de 2 colunas, mais "N opções"). Saem a lista com seta e o selo "N no pedido".
- **Cor e tamanho**: voltar e título na própria tela, cartão 3 Cor (grade de 2 colunas, amostra 60×52) e cartão 4 Tamanho (só depois da cor). A barra "Adicionar ao pedido" só aparece com cor e tamanho escolhidos. Depois de adicionar, a tela volta para Peça/Tecido.
- **Pedido**: linha do cliente, lista PEÇAS só com lixeira (sai o −/+ de quantidade), linha Desconto (−/+, o − desligado em zero, o desconto diminui sozinho quando peças saem), PAGAMENTO sem ícones e "Cancelar pedido" no fim do conteúdo. Pedido vazio mostra só a mensagem.
- **Dia**: título "Vendas de hoje" e a data dentro do conteúdo.
- **Aviso de venda**: ícone, total grande, "N peças · pagamento", cliente e botão "Nova venda".
- **Visual**: botões com relevo, escolhido em roxo forte "afundado", indisponível com borda tracejada (tokens novos em `tokens.css`).

**Não inclui:**
- Tela de login.
- Back-end, ERP e contrato do `POST /vendas` (o corpo enviado não muda).
- Tablet com layout próprio (segue o layout de celular, como hoje).

## Viabilidade
- **Técnica:** viável. Só o front muda, e os dados do catálogo já trazem tipo → produto → cor → tamanho.
- **Riscos principais:**
  - Os testes de tela usam o topo com nome da etapa (`banner`) e a etapa Cliente inicial como sinal — impacto alto (quase todos os testes de PDV) — inventário por teste antes da troca e helpers que não guardam elemento (AP-004).
  - Grades e posição fixa no topo e no pé em CSS, que o jsdom não mede — impacto médio — teste lendo a regra da classe e conferência no navegador a 360px e 320px (AP-003).
  - Mudanças de comportamento (Cancelar mantendo o cliente, fim do −/+, desconto que diminui, fim da etapa Cliente inicial) — impacto médio — cada uma vira invariante alterado de propósito, com decisão registrada nos Requisitos.
  - Troca de aba e envio da venda com toques rápidos — impacto baixo — manter as travas em ref já existentes (AP-001).

## Prazo estimado
2 a 3 sessões de trabalho. Implantação só do front.

## Recursos e pessoas envolvidas
| Nome | Papel | Responsabilidade |
|---|---|---|
| Lucas | Dono do produto | Aprova cada fase e testa no celular |
| Claude (Claude Code) | Desenvolvimento | Implementa, testa e publica |

## Dependências
- Back com a pdv-cliente-telefone já em produção (o front atual da `main`, que usa `telefone`, já está em produção).
- Design `PDV-loja/PDV Loja Mobile-atualizado.html`.

## Critérios de sucesso
- Telas iguais ao design a 390px, nada passando da borda a 320px.
- Venda fecha com e sem cliente, com o mesmo corpo de `POST /vendas` de hoje.
- Caracterização verde, com cada mudança intencional registrada.

## Aprendizados aplicados
AP-001 (travas em ref no envio e no cancelar), AP-002 (checklist de deploy com "Depende de:"), AP-003 (guarda automática de regras CSS de layout), AP-004 (inventário de sinais usados pelos testes).

## Aprovação
- Aprovado por: Lucas ("Pode gravar e seguir")
- Data/hora: 2026-10-12 00:20
