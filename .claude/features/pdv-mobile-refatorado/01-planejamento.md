# 01 — Planejamento: PDV Loja — Front-end mobile refatorado (design Nocturne)

## Objetivo de negócio
Refazer o front do PDV conforme o design "PDV Mobile Refatorado" (tema escuro Nocturne): a venda começa pelo cliente (nome e celular), a escolha de produtos fica mais simples e o desconto passa a ser aplicado uma vez no pedido inteiro.

## Contexto
O design foi feito no Claude Design (projeto f1d1f3b3-1cda-44f3-bfd6-773a56c810b0, arquivo `PDV Mobile Refatorado.dc.html`, iPhone SE 375 × 667) e entregue como pacote de handoff em `PDV-loja/PDV Mobile Refatorado-handoff.zip`. As duas capturas incluídas no pacote mostram o estado atual (tema claro, tipos em pílulas soltas, desconto por item sem/5/10/15%).

Hoje: tema claro; nome do cliente e CPF opcionais dentro da aba Pedido (`frontend/src/telas/Pdv/Pedido.tsx`, `dominio/carrinho.ts`); desconto por item (`DESCONTOS_ITEM` em `dominio/precos.ts`); CPF validado no back (`backend/src/dominio/cpf.ts`, `esquemas.ts`, coluna `cpf` em `vendas`).

Telas do design: 1a Cliente, 1b Produtos, 1c Cor e tamanho, 1d Pedido, 1e Dia.

## Escopo
**Inclui:**
- Tema escuro Nocturne (tokens de cor, tipografia, ícones Phosphor) no celular e no tablet; layout das telas segue o design de celular.
- Etapa nova **Cliente** (primeiro passo da venda): nome e celular, **opcionais, com botão para pular** (decisão do Lucas). Celular com máscara (31) 99999-9999. O CPF sai do PDV.
- **Produtos**: tipos em **grade de 3 colunas** (decisão do Lucas), lista única do tipo escolhido com selo "N no pedido", nome do cliente sob o título, "N modelos" no topo.
- **Cor e tamanho**: lista de cores com marcação de escolhida, grade de 4 colunas com `minmax(0,1fr)`, **mantendo "estoque N"** (decisão do Lucas, contra "esgotado / só 1 / N un" do design), resumo "Falta escolher…" e botão "Adicionar ao pedido".
- **Pedido**: cartões numerados 1 Cliente (com "Alterar"), 2 Peças (−/+ e "Tirar"), 3 Desconto no pedido, 4 Pagamento. **Desconto em R$, de 5 em 5 com −/+, até o total bruto** (decisão do Lucas). Botão de fechar indica o que falta ("Inclua uma peça" / "Escolha o pagamento" / "Fechar venda"). Link "Cancelar pedido".
- **Dia**: cartões "Total do dia" e "Pedidos" e lista "#N · cliente".
- Barra inferior com 3 abas: Produtos / Pedido (N) / Dia.

**Não inclui:**
- Tela de login.
- Regras de venda e de estoque no back; ERP.
- Troca do CPF pelo telefone no back — feature irmã **pdv-cliente-telefone** (modo refatoração; o celular substitui o CPF por completo, decisão do Lucas).

## Viabilidade
- **Técnica:** viável com ressalvas.
- **Riscos principais:**
  - Desconto por item (%) → desconto único no pedido (R$) muda o cálculo do total — impacto alto — entra como mudança intencional nos invariantes; verificar na Requisitos/Arquitetura como o back recebe o desconto.
  - Dependência do back (telefone) — impacto alto — ordem de deploy back → front, com "Depende de:" por passo (AP-002).
  - Troca em massa de textos/elementos usados como sinal pelos testes — impacto médio — inventário por teste antes da troca (AP-004).
  - Layout em CSS não medido no jsdom — impacto médio — teste lendo a regra + conferência no navegador a 360px e 320px (AP-003).

## Prazo estimado
2 a 3 sessões de trabalho. Deploy só do front, depois do back.

## Recursos e pessoas envolvidas
| Nome | Papel | Responsabilidade |
|---|---|---|
| Lucas | Dono do produto | Aprova cada fase e testa no celular |
| Claude (Claude Code) | Desenvolvimento | Implementa, testa e publica |

## Dependências
- Feature **pdv-cliente-telefone** (back) implantada antes do deploy do front.
- Pacote de handoff do design (`PDV-loja/PDV Mobile Refatorado-handoff.zip`).

## Critérios de sucesso
- As 5 telas iguais ao design a 375px, nada passando da borda a 320px.
- Venda fecha com e sem cliente.
- Desconto no pedido bate com o total calculado pelo back.
- Caracterização verde, com cada mudança intencional registrada.

## Aprendizados aplicados
AP-002 (checklist de deploy com "Depende de:"), AP-003 (guarda automática de regras CSS de layout), AP-004 (inventário de sinais usados pelos testes). AP-001 não se aplica: não há ação disparada sem botão de confirmação.

## Aprovação
- Aprovado por: Lucas ("pode gravar")
- Data/hora: 2026-10-05 22:45
