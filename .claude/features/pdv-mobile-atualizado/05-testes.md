# 05 — Testes: PDV Loja — Front-end mobile atualizado (abas no topo, peça → tecido → cor → tamanho)

## Suíte e cobertura
- Suíte: Vitest 5.0.2 + Testing Library + MSW (modo simulado) — já existia. Rodar com Node 22 (`export PATH=/usr/local/bin:$PATH && npx vitest run`).
- Provider de coverage: v8 — thresholds por arquivo: lines 85, functions 85, statements 85, branches 80 (config não alterada).

## Fontes usadas (T0)
- `docs/v11/documentacao.md` (to-be), `02-requisitos.md`, `03-arquitetura.md`, `04-desenvolvimento.md`.

## Pontos de entrada testados (T2)
| Ponto de entrada | Tipo | Situação anterior (completo / incompleto / sem testes) | Ação |
|---|---|---|---|
| Tela `Pdv`/`Venda` (`Abas`, `Produtos`, `Variacoes`, `Pedido`, `Cliente`, `AvisoVenda`, `Dia`) | Tela | incompleto | 10 testes de lacuna em `pdv.atualizado.final.test.tsx` |
| Reducer `carrinho.ts` | Função pública | completo | mantido |
| `formatos.ts` (máscara) | Função pública | completo | mantido |
| `api.registrarVenda` → `POST /vendas` | HTTP | completo | mantido (corpo exato) |
| Leituras da API (catálogo, vendas de hoje, sessão) | HTTP | completo | mantido |
| Tokens e estilos (`tokens.css`, `comum.module.css`, `Pdv.module.css`) | Estilo | incompleto | guardas de CSS novas (barra sticky, grades de 2 colunas, `.tile`) |
| Helpers `tests/telas/ajuda.tsx` | Testes | completo | submetidos à mutação |
| Login | Tela | completo | inalterado (INV-032) |

## Cobertura final por arquivo
| Arquivo | Lines | Functions | Statements | Branches | Meta atingida? |
|---|---|---|---|---|---|
| App.tsx | 100 | 100 | 96 | 86.66 | sim |
| api/cliente.ts | 100 | 91.66 | 100 | 100 | sim |
| dominio/carrinho.ts, catalogo.ts, formatos.ts, precos.ts | 100 | 100 | 100 | 100 | sim |
| simulado/dados.ts, handlers.ts | 100 | 100 | 100 | 100 | sim |
| telas/Avisos.tsx, Folha.tsx, useCarregar.ts | 100 | 100 | 100 | 100 | sim |
| Login/Login.tsx | 100 | 100 | 100 | 96.66 | sim |
| Login/TecladoPin.tsx | 100 | 100 | 100 | 100 | sim |
| Pdv/Abas, AvisoVenda, Cartao, Cliente, Dia, Pedido, Produtos, Variacoes | 100 | 100 | 100 | 100 | sim |
| Pdv/Pdv.tsx | 100 | 100 | 99 | 95.65 | sim (ramos defensivos: guarda do `adicionar`, `pagamentoId ?? ''`, `tipoDoProduto ?? …`) |

## Lacunas
Nenhuma abaixo da meta. INV-021 (`crypto.randomUUID` fora de contexto seguro) continua sem teste — débito técnico, fora do escopo.

## Qualidade real dos testes (T8)
- Sinais de alerta encontrados: 1 — corrigidos: 1 (asserção condicional no teste INV-016 de `pdv.atualizado.caracterizacao`, que nunca rodava depois do MI-23; agora exige a barra "Adicionar" ausente).
- Pontos submetidos a mutação: 44 (36 em `src/`, 4 em helpers, 4 combinações) — 42 mortos. 2 sobreviventes justificados:
  - M13: `recomecar` sem fechar o formulário do cliente — equivalente hoje ("Cancelar" e "Nova venda" só são alcançáveis com o formulário fechado); a linha protege uso futuro (ATENÇÃO em `Pdv.tsx`).
  - H04: `abaAtual` sem exigir uma única aba — afrouxado sozinho passa, mas defeitos reais continuam pegos.
- Falsos-positivos detectados e reescritos: 0.
- Confirmação: nenhuma mutação permanece aplicada no código — sim (shasum de 31 arquivos de `src/` e de `ajuda.tsx` idênticos).

## Validação da caracterização (somente refatoração)
- Suíte de caracterização completa sobre o código refatorado: **verde, 300 testes** (20 arquivos). Conferido pelo orquestrador.
- Comparação com a execução original (d052d97, 285 verdes, reexecutada): 52 testes saíram ou mudaram de nome e 57 entraram; cada remoção/alteração corresponde a MI-20…MI-26, ADR-002/004/005 ou invariante alterado, com conferência equivalente mantida. **Nenhuma asserção perdida sem decisão.**
- Invariantes alterados intencionalmente: INV-011, INV-012, INV-014, INV-020 (registrados em `02-requisitos.md`).
- Comportamentos confirmados pelo Lucas nesta fase (2026-10-12, "manter os dois"):
  - "Cancelar pedido" e "Nova venda" mantêm o tipo (peça) escolhido.
  - O aviso "Só N em estoque" na linha aparece só com quantidade **acima** do saldo; com quantidade igual ao saldo, sem aviso (o "Adicionar" desligado impede passar).

## Problemas encontrados no código
| Problema | Arquivo | Gravidade | Recomendação |
|---|---|---|---|
| `setAba` chega cru em `Venda`; `setEditandoCliente(false)` em `recomecar` hoje redundante | `src/telas/Pdv/Pdv.tsx` | baixa | Manter (ATENÇÃO no código); novos usos devem fechar o formulário |
| Ações `mais`/`menos` e `precoMinimo` sem uso na tela | `src/dominio/carrinho.ts`, `catalogo.ts` | baixa | Remover numa limpeza futura |

## Recomendações gerais
- Tratar INV-021 em feature própria.
- Limpeza futura do débito técnico listado no `04-desenvolvimento.md`.

## Aprendizados aplicados
AP-001 (mutações da trava em ref do `cancelar`, mortas), AP-003 (guardas de CSS e mutações de `minmax`/`sticky`/media query, mortas), AP-004 (comparação teste a teste com d052d97 e mutação dos helpers).

## Resultado

<!-- A linha abaixo é lida literalmente pelo hook de deploy. Use exatamente "sim" ou "não", sem outro texto na linha. -->
Pronto para implantação: sim

## Aprovação
- Aprovado por: Lucas ("manter os dois, pode seguir")
- Data/hora: 2026-10-12 15:59
