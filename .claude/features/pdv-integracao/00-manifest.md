# Manifest — PDV Loja — Integração (front + back + deploy)

Slug: pdv-integracao
Modo: nova_funcionalidade
Fase atual: implantacao
Status: em_andamento
Incidente atual: nenhum
Criado em: 2026-09-27 13:54
Última atualização: 2026-09-27 16:36

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
| Planejamento | aprovada | Lucas | 2026-09-27 14:11 | 01-planejamento.md |
| Requisitos | aprovada | Lucas | 2026-09-27 14:13 | 02-requisitos.md |
| Arquitetura | aprovada | Lucas | 2026-09-27 14:16 | 03-arquitetura.md |
| Desenvolvimento | aprovada | Lucas | 2026-09-27 15:31 | 04-desenvolvimento.md |
| Documentação | aprovada | Lucas | 2026-09-27 15:39 | backend/docs/v2 + frontend/docs/v2 |
| Testes | aprovada | Lucas | 2026-09-27 16:36 | 05-testes.md |
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

- Feature de origem (se for sub-feature): não se aplica
- Features irmãs: pdv-backend (repo lucoti/pdv-loja-backend) e pdv-frontend (repo lucoti/pdv-loja-frontend), ambas pausadas com 06 aprovado
- Artefatos desta feature versionados no repo do front (frontend/.claude/features/pdv-integracao)
- Vercel: projetos pdv-loja-backend e pdv-loja-frontend (time lucas-reis-projects-cab521b0)
