# Manifest — PDV Loja — Cliente da venda com telefone no lugar do CPF (back)

Slug: pdv-cliente-telefone
Modo: refatoracao
Fase atual: implantacao
Status: pausada
Incidente atual: nenhum
Criado em: 2026-10-05 23:31
Última atualização: 2026-10-06 01:10

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
| Planejamento | aprovada | Lucas | 2026-10-05 23:34 | 01-planejamento.md |
| Requisitos | aprovada | Lucas | 2026-10-05 23:43 | 02-requisitos.md |
| Arquitetura | aprovada | Lucas | 2026-10-05 23:58 | 03-arquitetura.md |
| Desenvolvimento | aprovada | Lucas | 2026-10-06 00:40 | 04-desenvolvimento.md |
| Documentação | aprovada | Lucas | 2026-10-06 00:50 | backend/docs/v8/documentacao.md |
| Testes | aprovada | Lucas | 2026-10-06 01:10 | 05-testes.md |
| Implantação | pendente | | | 06-implantacao.md |
| Aprendizado (só refatoração) | pendente | | | .claude/aprendizados.md |

<!-- Status de fase: pendente | em_andamento | aprovada | excecao -->

## Exceções registradas

| Data/hora | Fase | Exceção | Risco assumido | Aprovado por |
|---|---|---|---|---|
| 2026-10-06 01:10 | Implantação | Feature pausada antes da Implantação, aguardando a etapa 6, a Documentação e os Testes da pdv-mobile-refatorado | Back publicado sozinho quebra as vendas do front no ar; implantação só conjunta (A → B → C → D) | Lucas ("pode gravar e retornar ao front") |

## Incidentes de manutenção

| Incidente | Data | Resumo | Status | Aprendizado |
|---|---|---|---|---|
| | | | | AP-NNN |

## Referências

- Feature de origem (se for sub-feature): não se aplica (feature irmã no front: pdv-mobile-refatorado, que depende desta). Código no repositório `backend/`; artefatos aqui para as métricas da sessão.
