# Manifest — PDV Loja — Front-end (React)

Slug: pdv-frontend
Modo: nova_funcionalidade
Fase atual: implantacao
Status: implantada
Incidente atual: nenhum
Criado em: 2026-09-26 00:19
Última atualização: 2026-09-27 17:07

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
| Planejamento | aprovada | Lucas | 2026-09-27 11:07 | 01-planejamento.md |
| Requisitos | aprovada | Lucas | 2026-09-27 11:14 | 02-requisitos.md |
| Arquitetura | aprovada | Lucas | 2026-09-27 11:18 | 03-arquitetura.md |
| Desenvolvimento | aprovada | Lucas | 2026-09-27 11:30 | 04-desenvolvimento.md |
| Documentação | aprovada | Lucas | 2026-09-27 11:40 | frontend/docs/v1/documentacao.md |
| Testes | aprovada | Lucas | 2026-09-27 12:18 | 05-testes.md |
| Implantação | aprovada | Lucas (executada na pdv-integracao) | 2026-09-27 17:07 | 06-implantacao.md |
| Aprendizado (só refatoração) | pendente | | | .claude/aprendizados.md |

<!-- Status de fase: pendente | em_andamento | aprovada | excecao -->

## Exceções registradas

| Data/hora | Fase | Exceção | Risco assumido | Aprovado por |
|---|---|---|---|---|
| 2026-09-27 12:28 | Implantação | Checklist aprovado mas deploy adiado para a feature pdv-integracao (depois do deploy do back); feature pausada até lá | Front não publicado até a integração; débito do App.tsx (05) a tratar na integração | Lucas |

## Incidentes de manutenção

| Incidente | Data | Resumo | Status | Aprendizado |
|---|---|---|---|---|
| | | | | AP-NNN |

## Referências

- Feature de origem (se for sub-feature): não se aplica
- Features irmãs: pdv-backend (API, contrato em backend/contrato/openapi.yaml), pdv-integracao
- Especificação de design: design_handoff_pdv_loja/README.md (telas 1 e 2; tablet fora do alvo)
