# Manifest — PDV Loja — Ajustes da tela de cor/tamanho e do topo do PDV

Slug: pdv-ajustes-tela-variacoes
Modo: refatoracao
Fase atual: implantacao
Status: em_andamento
Incidente atual: nenhum
Criado em: 2026-10-01 22:53
Última atualização: 2026-10-01 23:41

<!--
NÃO altere o nome nem o formato das linhas acima. Os hooks de métricas leem "Fase atual:" literalmente.
Valores válidos de "Fase atual": planejamento, requisitos, arquitetura, desenvolvimento, documentacao, testes, implantacao, manutencao, aprendizado
Valores válidos de "Status": em_andamento, pausada, implantada
Valores válidos de "Modo": nova_funcionalidade, refatoracao
Valores válidos de "Incidente atual": número do incidente aberto na Fase 7 (ex.: 001) ou nenhum
-->

## Fases

| Fase | Status | Aprovado por | Data/hora | Artefato |
|---|---|---|---|---|
| Planejamento | aprovada | Lucas | 2026-10-01 23:00 | 01-planejamento.md |
| Requisitos | aprovada | Lucas | 2026-10-01 23:03 | 02-requisitos.md |
| Arquitetura | aprovada | Lucas | 2026-10-01 23:14 | 03-arquitetura.md |
| Desenvolvimento | aprovada | Lucas | 2026-10-01 23:28 | 04-desenvolvimento.md |
| Documentação | aprovada | Lucas (execução autorizada com o Desenvolvimento) | 2026-10-01 23:30 | frontend/docs/v7 (to-be); v6 (as-is) |
| Testes | aprovada | Lucas | 2026-10-01 23:41 | 05-testes.md |
| Implantação | em_andamento | | | 06-implantacao.md |
| Aprendizado (só refatoração) | pendente | | | .claude/aprendizados.md |

<!-- Status de fase: pendente | em_andamento | aprovada | excecao -->

## Exceções registradas

| Data/hora | Fase | Exceção | Risco assumido | Aprovado por |
|---|---|---|---|---|
| | | | | |

## Incidentes de manutenção

| Incidente | Data | Resumo | Status | Aprendizado |
|---|---|---|---|---|
| | | | | AP-NNN |

## Referências

- Feature de origem (se for sub-feature): pdv-frontend (telas do PDV)
- Pedido original do Lucas (2026-10-01, com captura da tela no celular): (1) os tamanhos ficam desalinhados e alguns passam do limite horizontal da tela; (2) "sem estoque" ocupa muito espaço no seletor de tamanho — usar o texto "estoque" e a quantidade; (3) remover o topo com "BALCÃO", nome e data; talvez a única informação relevante no topo seja a etapa do PDV (escolhendo produto, cor, tamanho ou realizando o pagamento).
- Código envolvido (levantado antes do Planejamento): `frontend/src/telas/Pdv/Variacoes.tsx`, `Pdv.module.css`, `Cabecalho.tsx` (usado nas abas Produtos, Pedido e Dia) e `textoSaldo` em `frontend/src/dominio/catalogo.ts`.
