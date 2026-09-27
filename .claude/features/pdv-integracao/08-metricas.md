# 08 — Métricas: PDV Loja — Integração (front + back + deploy)

- Modo: nova_funcionalidade
- Gerado em: 2026-09-27 17:07
- Fonte: `metricas/metricas.json`
- Situação: concluída

<!-- Nunca estime nem invente números. Fase sem dados: escreva "sem dados coletados" nas duas colunas. -->

| Etapa | Tokens consumidos | Tempo de execução (min) |
|---|---|---|
| Planejamento | 4.764.794 | 3,2 |
| Requisitos | 3.612.006 | 1,8 |
| Arquitetura | 622.867 | 1,1 |
| Desenvolvimento | 5.277.212 | 4,0 |
| Documentação | 1.899.330 | 3,2 |
| Testes | 6.566.548 | 54,5 |
| Implantação | 11.327.352 | 7,1 |
| Aprendizado (refatoração) | não se aplica | não se aplica |
| **Total** | **34.070.109** | **74,9** |

## Observações
- Documentação e Testes foram executados por subagentes (`fluxo-documentador`, `fluxo-testador`); o consumo deles já está incluído.
- Implantação inclui a execução dos checklists 06 do back e do front (banco Turso, variáveis, deploys, verificação e limpeza).
- O relatório foi gerado antes do fechamento do `.active`; o consumo da própria geração deste arquivo pode entrar depois no `metricas.json` sem aparecer aqui.
- Sem incidentes.
