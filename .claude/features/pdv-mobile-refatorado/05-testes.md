# 05 — Testes: PDV Loja — Front-end mobile refatorado (design Nocturne)

Executado pelo subagente `fluxo-testador` (modo `caracterizacao-final`) em 2026-10-06, no branch `pdv-mobile-refatorado`, HEAD 5a228f4. Execução original (2ef7c5b, com o openapi antigo do back 2b0a0e8) rodada numa cópia no scratchpad. Único arquivo criado: `tests/telas/pdv.validacao.test.tsx` (8 testes). Nenhuma alteração em `src/`.

## Suíte e cobertura
- Suíte: Vitest 5.0.2 + Testing Library + MSW — já existia (Node 22.19; `requireAssertions: true`); `tsc --noEmit` e `vite build` ok.
- Provider de coverage: v8 (`@vitest/coverage-v8`) — thresholds por arquivo 85 lines / 85 functions / 85 statements / 80 branches (sem mudança). Fora da medição por configuração: `main.tsx`, `tipos.gerados.ts`, `simulado/navegador.ts`, `*.d.ts`.

## Fontes usadas (T0)
- `docs/v9/documentacao.md` (to-be, fonte primária), `docs/contexto-geral.md`, artefatos 00 a 04, `PDV-loja/.claude/aprendizados.md`.

## Pontos de entrada testados (T2)
| Ponto de entrada | Tipo | Situação anterior (completo / incompleto / sem testes) | Ação |
|---|---|---|---|
| `Pdv.tsx` (fechar, recomeçar, Alterar, Cancelar) | Tela | completo | Mantido; mutações |
| `Cliente.tsx` | Tela | completo (`pdv.cliente`) | Mantido |
| `Produtos.tsx` | Tela | incompleto (corte do tipo em `nomeNaLista` nunca rodava; selo "N no pedido" sem asserção) | Testes criados |
| `Variacoes.tsx` | Tela | completo, sem a amostra de cor sem tom e sem foto | Teste criado |
| `Pedido.tsx` | Tela | completo, sem pagamento sem ícone próprio | Teste criado |
| `Dia`, `BarraInferior`, `Cabecalho`, `AvisoVenda` | Tela | completo | Mantido |
| `carrinho.ts`, `formatos.ts` | Domínio | completo | Mantido |
| `api/cliente.ts` | Cliente HTTP | completo | Mantido |
| `simulado/handlers.ts` × openapi; guardas de CSS (AP-003) | Simulado / layout | completo | Mantido |

## Cobertura final por arquivo
| Arquivo | Lines | Functions | Statements | Branches | Meta atingida? |
|---|---|---|---|---|---|
| src/App.tsx | 100 | 100 | 96 | 86,66 | sim |
| src/api/cliente.ts | 100 | 91,66 | 100 | 100 | sim |
| src/telas/Login/Login.tsx | 100 | 100 | 100 | 96,66 | sim |
| src/telas/Pdv/Pdv.tsx | 100 | 100 | 99,08 | 97,97 | sim |
| src/telas/Pdv/Pedido.tsx | 100 | 100 | 100 | 100 | sim (antes 95,45 br) |
| src/telas/Pdv/Produtos.tsx | 100 | 100 | 100 | 100 | sim (antes 94,44 st / 83,33 br) |
| src/telas/Pdv/Variacoes.tsx | 100 | 100 | 100 | 100 | sim (antes 96,42 br) |
| Demais 15 arquivos medidos (domínio, simulado, telas comuns, Login/TecladoPin, AvisoVenda, BarraInferior, Cabecalho, Cliente, Dia) | 100 | 100 | 100 | 100 | sim |
| **Total** (16 arquivos de teste, 253 testes) | **100** | **99,47** | **99,63** | **98,74** | sim |

## Lacunas
Nenhum arquivo abaixo da meta. Ramos sem cobertura, defensivos ou anteriores à feature: `Pdv.tsx:146` (guarda do `adicionar`, botão já desabilitado), `Pdv.tsx:185` (`pagamentoId ?? ''`, barrado por `podeFechar`), `App.tsx:35-38`, `Login.tsx:45`, uma função de `cliente.ts`.

## Qualidade real dos testes (T8)
- Sinais de alerta encontrados: 3 — corrigidos: 1 (asserção condicional no teste novo, removida antes de rodar); intencionais: `toBeGreaterThan(0)` como espera/pré-condição seguida de asserção exata (mobile.caracterizacao 244/257, caracterizacao 404) e "dois toques: todo envio leva o mesmo corpo" aceitando 1 ou 2 POSTs (idempotência; o teste anterior exige 1).
- Pontos submetidos a mutação: 49 (40 no código + helpers, sozinhos e combinados), todos detectados exceto o equivalente explicado. Destaques: trava lida do estado em vez da ref (AP-001), Cancelar sem trava, recomeçar sem chave nova (4), telefone vazio ou mascarado no corpo (3), `celularValido` com 10 (2), simulado aceitando `cpf` ou telefone inválido (2), grades sem `minmax` (AP-003), 401 sem derrubar a sessão (6), `localStorage` (2); helpers `pularCliente` (100), `topoDoPdv` (6). Helpers afrouxados sozinhos H02a/H03a sobrevivem como já registrado na etapa 0 (regra coberta por testes próprios; combinações morrem).
- Mutante equivalente: M05 (sem `trim` só no `fechar`) — o nome já entra aparado em `confirmarCliente`; M33 (sem os dois) derruba 4.
- Falsos-positivos detectados e reescritos: 2 — selo "N no pedido" (M25 sobrevivia) e corte do tipo em `nomeNaLista` (M23/M24 sobreviviam); cobertos por `pdv.validacao.test.tsx`.
- Confirmação: nenhuma mutação permanece aplicada no código — sim (`diff -r src` contra cópia igual; `git status` só com o teste novo).

## Validação da caracterização (somente refatoração)
- Suíte de caracterização completa sobre o código refatorado: verde (`pdv.mobile.caracterizacao` 17/17, `pdv.caracterizacao` 16/16, `login.caracterizacao` 9/9).
- Comparação com a execução original: 2ef7c5b = 14 arquivos, 224 (223 + 1 `it.fails`) × HEAD = 16 arquivos, 253, teste a teste pelo nome. Iguais: `api/cliente`, `config/implantacao`, `catalogo`, `precos`, `login.caracterizacao`, `login`, `useCarregar`. Cada teste renomeado ou alterado em `pdv.mobile.caracterizacao`, `pdv.caracterizacao`, `carrinho`, `formatos`, `contrato`, `pdv.ajustes`, `pdv.test` está ligado a uma MI-xx ou ao inventário AP-004 da etapa (04). `it.fails` do INV-013(a) virou `it` com 1 POST (ADR-006). Em `pdv.test`, 58 linhas de `expect` removidas e 93 adicionadas, cada remoção com equivalente conferido pela lista do inventário.
- Invariantes INV-001, INV-002, INV-010 a INV-019 verdes (INV-020/021 não se aplicam). Invariantes alterados intencionalmente: INV-001 (`cpf` → `telefone`), INV-014 (`cpf_invalido` → `telefone_invalido`) e o total do pedido de referência (MI-03), registrados no 02.

## Problemas encontrados no código
| Problema | Arquivo | Gravidade | Recomendação |
|---|---|---|---|
| Topo da lista mostra "N modelos" do catálogo inteiro; o grupo mostra os do tipo | `Produtos.tsx` / `Pdv.tsx` | Baixa | Coerente com o design e o 03; confirmar com o Lucas se for o caso |
| Helper `botaoCor` ainda aceita o sufixo "(sem estoque)?" | `tests/telas/ajuda.tsx` | Baixa (só testes) | Inofensivo; limpar quando mexer no helper |

## Recomendações gerais
- **Deploy coordenado, sem janela de compatibilidade (AP-002):** A `db:migrar` do PDV (depende de: nenhum) → B publicar o back da pdv-cliente-telefone (depende de: A) → C publicar este front, logo em seguida (depende de: B) → D passo manual do Lucas: recarregar o PDV em cada celular (depende de: C). Rollback: front e back juntos.
- `tests/simulado/contrato.test.ts` lê `../backend/contrato/openapi.yaml`: fazer o merge do back e do front juntos.
- Layout (contraste, 320px) conferido manualmente no celular real antes do deploy: jsdom não mede largura.

## Aprendizados aplicados
AP-001 (mutações de trava por estado × ref no fechar e no Cancelar), AP-002 (ordem A → B → C → D com "Depende de:"), AP-003 (mutações nas grades de tipos, tamanhos e pagamentos), AP-004 (comparação teste a teste, conferência pelo inventário, mutação dos helpers sozinhos e combinados).

## Resultado

<!-- A linha abaixo é lida literalmente pelo hook de deploy. Use exatamente "sim" ou "não", sem outro texto na linha. -->
Pronto para implantação: sim

Condição: só em deploy coordenado com a pdv-cliente-telefone, na ordem A → B → C → D.

## Aprovação
- Aprovado por: Lucas ("pode gravar")
- Data/hora: 2026-10-06 11:00
