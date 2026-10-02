# 08 — Métricas: PDV Loja — Login com senha de 8 números e entrada automática

- Modo: refatoracao
- Gerado em: 2026-10-01 22:52
- Fonte: `metricas/metricas.json`
- Situação: concluída

<!-- Nunca estime nem invente números. Fase sem dados: escreva "sem dados coletados" nas duas colunas. -->

| Etapa | Tokens consumidos | Tempo de execução (min) |
|---|---|---|
| Planejamento | 190.758 | 0,6 |
| Requisitos | 206.830 | 0,8 |
| Arquitetura | 1.686.638 | 4,9 |
| Desenvolvimento | 6.128.080 | 16,1 |
| Documentação | 1.412.847 | 3,6 |
| Testes | 3.063.718 | 22,1 |
| Implantação | 2.434.480 | 7,5 |
| Aprendizado (refatoração) | 572.971 | 1,4 |
| **Total** | **15.696.322** | **57,0** |

## Observações
- Etapas com subagente (consumo já incluído): Arquitetura, as-is (`fluxo-documentador`, 1.218.536 tokens); Desenvolvimento, caracterização (`fluxo-testador`, 1.705.081); Documentação, to-be (`fluxo-documentador`, 983.153); Testes (`fluxo-testador`, 1.930.837); Aprendizado (`fluxo-aprendizado`, 99.458).
- Compactações: nenhuma compactação registrada (`metricas/compactacoes.jsonl` não existe).
- Os números foram lidos do `metricas.json` antes do fechamento do `.active`; o consumo do turno que gravou as lições e gerou este arquivo pode entrar depois no `metricas.json` sem aparecer aqui.
- Implantação: passos 3 e 5 do checklist foram executados pelo Lucas e confirmados por ele na conversa; desvio de ordem registrado no `06-implantacao.md` (ver AP-002).
- Sem incidentes.
