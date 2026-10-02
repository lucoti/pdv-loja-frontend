# 03 — Arquitetura (refatoração): PDV Loja — Ajustes da tela de cor/tamanho e do topo do PDV

## As-is (estado atual)
- Documentação gerada (D1-D3): `frontend/docs/v6/documentacao.md` — versão 6 (as-is); `frontend/docs/contexto-geral.md` atualizado. D1 acrescentou só comentários em `Cabecalho.tsx`, `Variacoes.tsx`, `Pdv.tsx` e `catalogo.ts` (31 linhas, nenhuma de código). Suíte após D1: `npm run typecheck` limpo, `npm test` 11 arquivos, 184/184 verdes (Node 22.19, `PATH=/usr/local/bin:$PATH`).
- Resumo da estrutura atual: `Pdv` desenha `<Cabecalho vendedor>` e, com o catálogo carregado, `<Venda>`; senão, a tela de carregando/falha (ou `Dia`). `Venda` guarda `produtoId`/`escolha` e decide entre `Produtos`, `Variacoes`, `Pedido` e `Dia`. `Variacoes` desenha cores (`.grade2`) e tamanhos (`.grade4`), com o saldo vindo de `textoSaldo`. Página única, folha de até 460px, sem `@media`.

### Problemas do estado atual
| Problema | Onde | Impacto |
|---|---|---|
| `.grade4` é `repeat(4, 1fr)` com gap de 12px; `1fr` não encolhe abaixo do conteúdo | `Pdv.module.css` | A 4ª coluna sai da tela no celular; tamanhos desalinhados |
| "sem estoque" ocupa duas linhas dentro do tamanho | `textoSaldo` em `catalogo.ts` | Botões altos e largos demais |
| Topo mostra "BALCÃO", vendedor e data | `Cabecalho.tsx` | Informação sem uso na venda; a etapa não aparece |
| O topo não sabe a etapa: fica em `Pdv`, fora de `Venda`, que é quem conhece `produtoId` | `Pdv.tsx` | Para mostrar "Cor e tamanho" é preciso mudar quem desenha o topo |
| `.tamanho` e `.mais:disabled` declaradas duas vezes | `Pdv.module.css` (~113 e ~418) | Só legibilidade; fora do escopo, fica como está |

## Conformidade com o CLAUDE.md
Não há `CLAUDE.md` no repositório. Segue as convenções do código existente (CSS Modules, componentes de tela em `src/telas/Pdv`, regras em `src/dominio`). Sem contradições.

## To-be (estado proposto)
- **Grade de tamanhos:** 3 colunas iguais que podem encolher (`repeat(3, minmax(0, 1fr))`). Com 6 tamanhos (caso normal, segundo o Lucas), ficam 3 em cada linha. Letra do preço e do saldo continua em 16px.
- **Saldo:** `textoSaldo(saldo)` devolve `estoque N`, com N = 0 para saldo zero ou negativo.
- **Topo:** `Cabecalho` recebe só `etapa` (texto). `Venda` desenha o topo com a etapa calculada (`naVariacao` → "Cor e tamanho"; senão o nome da aba: "Produtos", "Pedido", "Dia"); o ramo de carregando/falha de `Pdv` desenha o seu pela aba. O texto da etapa não é um título (`h1`): as telas já têm os seus.
- **Limpeza:** saem `.marca`, `.subtitulo`, `.data` e `.cabecalhoTexto` de `Pdv.module.css` (as de mesmo nome do login ficam em outro arquivo e não mudam); sai `dataBr` de `formatos.ts` e os testes dela; `Pdv` deixa de receber `vendedor` (o `App` continua guardando o vendedor no estado da sessão).

## Estratégia de migração
- **Estratégia escolhida:** incremental
- **Justificativa:** são três mudanças pequenas e independentes no mesmo front; em etapas, cada quebra de teste aponta para uma mudança só. Não há dados nem API envolvidos, então feature flag e strangler fig seriam excesso.

### Etapas
| Etapa | O que muda | Invariantes em risco | Rollback |
|---|---|---|---|
| 1 | Testes de caracterização sobre o código atual (nada de código de produção) | nenhum | apagar os testes novos |
| 2 | `textoSaldo` → "estoque N" + testes de MUD-01 | INV-011, INV-013, INV-014 | reverter `catalogo.ts` e os testes |
| 3 | Grade de 3 colunas (`.grade4` → grade de tamanhos) | INV-011, INV-012 | reverter o CSS |
| 4 | Topo com a etapa, helper de teste único para "entrou no PDV", limpeza do que ficou sem uso | INV-016, INV-017, INV-018 | reverter `Cabecalho.tsx`, `Pdv.tsx`, `App.tsx`, CSS e testes |

Depois de cada etapa: `npm run typecheck` e `npm test` verdes antes da próxima. Etapa 3 e 4: conferência no navegador a 360px e 320px com produto de 6 tamanhos e preço de 3 dígitos.

**Rollback em produção:** reverter o commit do front e usar o Instant Rollback da Vercel no projeto `pdv-loja-frontend`. Sem dados nem back.

## Cobertura dos invariantes
| Invariante | Teste de caracterização previsto |
|---|---|
| INV-001 | Testes existentes de contrato e de tela que conferem as chamadas (catálogo, venda, login) seguem sem alteração de corpo/endpoint |
| INV-010 | Tamanho com saldo 0 está `disabled` e o clique não o seleciona |
| INV-011 | Ordem dos botões de tamanho e, em cada um, sigla → preço → saldo |
| INV-012 | Tamanhos só depois da cor; troca de cor mantém o tamanho com saldo e limpa o sem saldo |
| INV-013 | "sem estoque" no botão da cor esgotada (clicável) e no card do produto (abre para consulta) |
| INV-014 | `resumoEscolha` nos três casos; avisos de limite do Pedido |
| INV-015 | Botão "Voltar para os produtos", nome do produto e tecido na tela de variações |
| INV-016 | Três abas, "Pedido (N)", "Adicionar ao pedido" e rótulos do "Fechar venda" |
| INV-017 | Topo (`banner`) presente nas três abas e com o catálogo carregando/em falha; `position: sticky` conferido no navegador |
| INV-018 | Suíte do login (inclusive caracterização) verde; só o sinal "entrou no PDV" muda |

## Decisões (ADRs)

### ADR-001 — Grade de tamanhos com 3 colunas que encolhem
- **Contexto:** a 360px, 4 colunas dariam ~76px cada; "R$ 100,00" a 16px não cabe. As alternativas eram 3 colunas (~104px) ou 4 colunas com letra de ~13px.
- **Decisão:** 3 colunas com `minmax(0, 1fr)` (decisão do Lucas: "3 colunas, normalmente os tamanhos serão 6 tipos, ficarão 3 tamanhos em uma linha e 3 na linha de baixo").
- **Consequências:** letra continua legível; 6 tamanhos seguem em 2 linhas; produto com 4 tamanhos passa de 1 para 2 linhas.

### ADR-002 — `textoSaldo` devolve "estoque N"
- **Contexto:** "sem estoque" quebra em duas linhas; o Lucas pediu "estoque" + quantidade, e "estoque 0" quando zerado.
- **Decisão:** `estoque ${Math.max(0, saldo)}`. O "sem estoque" da cor e do card do produto são textos literais das telas e não mudam (INV-013).
- **Consequências:** uma linha por tamanho; o botão zerado continua desabilitado (INV-010), então "estoque 0" não é a única pista.

### ADR-003 — Quem conhece a etapa desenha o topo
- **Contexto:** `Cabecalho` é desenhado em `Pdv`, mas só `Venda` sabe se há produto aberto. Alternativa: subir `produtoId` para `Pdv`.
- **Decisão:** `Venda` desenha `<Cabecalho etapa>`; o ramo de carregando/falha de `Pdv` desenha o seu pela aba. Uma função única dá o nome da etapa a partir de (aba, naVariacao).
- **Consequências:** nenhum estado muda de lugar; o topo continua primeiro filho da folha nos dois ramos (INV-017). Os testes encontram a etapa pelo papel `banner`, porque "Produtos", "Pedido" e "Dia" também são textos das abas de baixo.

### ADR-004 — Remover o que ficar sem uso
- **Contexto:** sem a data e o vendedor no topo, `dataBr`, quatro classes CSS e a prop `vendedor` de `Pdv` ficam sem uso.
- **Decisão:** remover (aprovado pelo Lucas junto com a arquitetura), inclusive os testes de `dataBr`.
- **Consequências:** menos código morto; se a data voltar um dia, a função é reescrita.

## Riscos técnicos
| Risco | Impacto | Mitigação |
|---|---|---|
| Cerca de 25 testes usam "Carlos · pedido novo" como sinal de login | Troca em massa pode mascarar regressão do login | Helper único de "entrou no PDV" (etapa "Produtos" no `banner`); suíte do login roda inteira a cada etapa; T8 com mutação |
| jsdom não calcula layout | Teste automático não prova que a grade cabe | Conferência no navegador a 360px e 320px (largura do conteúdo x largura da tela), registrada no 04 |
| Nome longo de cor/tamanho fora do padrão (ex.: sigla "EXG") | Pode apertar a coluna | Coluna de ~104px a 360px tem folga; conferir no navegador |

## Aprendizados aplicados
AP-001 considerado: não se aplica (nenhuma ação disparada sem botão). AP-002: a estratégia de migração não tem passo manual do usuário no meio; o checklist da Implantação trará "Depende de:" em cada passo.

## Aprovação
- Aprovado por: Lucas ("Aprovada a arquitetura")
- Data/hora: 2026-10-01 23:14
