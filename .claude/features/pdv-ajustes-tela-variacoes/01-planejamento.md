# 01 — Planejamento: PDV Loja — Ajustes da tela de cor/tamanho e do topo do PDV

## Objetivo de negócio
A tela de cor/tamanho deve caber no celular sem estourar a largura, com o estoque legível em menos espaço, e o topo do PDV no celular deve mostrar só a etapa em que o vendedor está.

## Contexto
No celular, a grade de tamanhos fica desalinhada e alguns tamanhos passam do limite horizontal da tela (captura enviada pelo Lucas em 2026-10-01, produto com 6 tamanhos). O texto "sem estoque" ocupa muito espaço dentro de cada tamanho. O topo mostra "BALCÃO", o vendedor e a data, que não ajudam na venda; a informação útil ali é a etapa do PDV.

Código envolvido (levantado antes do Planejamento): `frontend/src/telas/Pdv/Variacoes.tsx`, `Pdv.module.css`, `Cabecalho.tsx` (usado nas abas Produtos, Pedido e Dia) e `textoSaldo` em `frontend/src/dominio/catalogo.ts` (hoje devolve "N un." ou "sem estoque").

## Escopo
**Inclui:**
- Grade de tamanhos alinhada e dentro da largura da tela no celular.
- Saldo de cada tamanho como "estoque N", inclusive "estoque 0" (o botão continua desabilitado quando zerado).
- Topo no celular: saem "BALCÃO", vendedor e data; entra o nome da etapa: "Produtos", "Cor e tamanho", "Pedido", "Pagamento" ou "Dia" (nomes confirmados pelo Lucas).
- Nome do vendedor e data deixam de aparecer no PDV do celular; não vão para nenhuma outra tela (decisão do Lucas).

**Não inclui:**
- Topo do tablet, que fica como está hoje (decisão do Lucas: mudança do topo "apenas para celular").
- "sem estoque" no cartão da cor e na lista de produtos, que ficam como estão (decisão do Lucas).
- Back, regras de venda e tela de login.

## Viabilidade
- **Técnica:** viável.
- **Riscos principais:** o topo é um componente compartilhado entre celular e tablet — mudar o celular pode alterar o tablet sem querer — a separação por largura de tela é decidida na Arquitetura e coberta por teste. Pendência para Requisitos: confirmar no código se "Pagamento" é uma etapa separada da aba Pedido; se não for, levar ao Lucas como a etapa aparece no topo.

## Prazo estimado
Uma sessão de trabalho. Deploy só do front, sem migração de dados.

## Recursos e pessoas envolvidas
| Nome | Papel | Responsabilidade |
|---|---|---|
| Lucas | Dono do produto | Aprova cada fase e testa no celular |
| Claude (Claude Code) | Desenvolvimento | Implementa, testa e publica |

## Dependências
Nenhuma externa. Repositório `frontend/` (git e projeto Vercel próprios).

## Critérios de sucesso
- Nenhum tamanho passa da borda nem fica desalinhado na largura de um celular.
- Todo tamanho mostra "estoque N".
- O topo do celular mostra só a etapa.
- O tablet não muda.
- Os testes existentes do PDV seguem verdes, com as mudanças intencionais de texto registradas.

## Aprendizados aplicados
AP-002 será aplicado na Implantação (checklist com "Depende de:"). AP-001 não se aplica: não há ação disparada sem botão de confirmação.

## Aprovação
- Aprovado por: Lucas ("pode gravar")
- Data/hora: 2026-10-01 23:00
