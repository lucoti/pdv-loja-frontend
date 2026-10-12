# 04 — Desenvolvimento: PDV Loja — Front-end mobile atualizado (abas no topo, peça → tecido → cor → tamanho)

<!-- Não registre código aqui: o código vive no repositório. Registre apenas decisões e fatos relevantes. -->

## Testes de caracterização (somente modo refatoração)
- Suíte: Vitest 5 + Testing Library + MSW (modo simulado), Node 22 (`export PATH=/usr/local/bin:$PATH && npx vitest run`).
- Resultado sobre o código ATUAL antes de qualquer alteração: **verde, 285 testes** (253 de base + 32 novos), conferido pelo orquestrador em 2026-10-12. Nenhum arquivo de `src/` alterado pela caracterização (só os comentários do as-is).
- Invariantes cobertos: INV-001, INV-002, INV-010 a INV-019, INV-030, INV-031, INV-032; INV-020 caracterizado no comportamento atual (teste "[muda na etapa 4]", a inverter). INV-021 sem teste (fora da tabela de cobertura).
- Testes novos:
  - `tests/telas/pdv.atualizado.caracterizacao.test.tsx` (15, tela): asserções pelo corpo do POST, `simulado.estado`, `aria-current` das abas, `aria-pressed`, `disabled`, "Cliente não identificado", rótulo e total do botão de fechar.
  - `tests/dominio/carrinho.caracterizacao.test.ts` (12, domínio, sem `mais`/`menos`): soma do SKU até o saldo, teto do desconto, `precos` sem mudança devolve o mesmo objeto, só `novo` troca a chave.
  - `tests/config/caracterizacao.atualizado.test.ts` (5, inspeção): INV-019 (nada de armazenamento do navegador) e INV-032 (Login, `global.css`, tokens existentes e regras comuns do Login inalterados; Login sem `.tile`).
  - `tests/telas/ajuda.tsx`: helpers novos que não guardam elemento — `abrirListaDeProdutos`, `abrirProduto`, `escolherVariacao`, `abaAtual`, `abrirClienteDoPedido`, `campoNomeCliente`, `campoCelularCliente`, `tocarDesconto`.
- T8: 24 mutações, todas derrubadas (inclusive nos helpers); 1 falso-positivo reescrito (Cancelar/Nova venda agora conferem "Cliente não identificado" na tela).

### Testes que vão mudar de propósito (por etapa)
| Etapa | Motivo | Testes |
|---|---|---|
| 2 | INV-012 / ADR-004 (saem `mais`/`menos`) | `carrinho.test.ts`: 6 testes de "+"/"−" saem; "Excluir remove na hora" e "nenhuma outra ação troca a chave" ajustados |
| 2 | ADR-005 (máscara) | `formatos.test` "mascararCelular…"; `pdv.cliente` "celular com máscara…" |
| 4 | MI-20 / ADR-002 (sai o `Cabecalho`) | helpers `topoDoPdv`, `esperarPdv`, `esperarTelaDeLogin`; `pdv.ajustes` MUD-03 (3); `pdv.caracterizacao` INV-015, INV-017 (4); `pdv.test` RF-F04 (2); `pdv.validacao` "h1 no topo", "contagem de modelos" |
| 4 | INV-020 (corrigido) | `pdv.atualizado` "[muda na etapa 4]" inverte: mesma `nav` antes e depois da carga |
| 4 | MI-21 (sai a etapa Cliente inicial) | helpers `pularCliente`, `esperarCatalogo`, `informarCliente`; 7 testes de `pdv.cliente`; `pdv.ajustes` INV-018; `pdv.test` "catálogo vazio (depois da etapa Cliente)" e "cartão Cliente com Alterar" |
| 5 | MI-22 | `pdv.validacao` MI-05 (selo); `pdv.test` RF-002 (região do tipo) |
| 5 | MI-23 | `pdv.test` "resumoEscolha…" (import sai); "Falta escolher" em RF-003, `pdv.caracterizacao` INV-010/012 e `adicionarPeca`; "a partir de"/preço em RF-002 e INV-011 (2); MI-11 em `pdv.test` e INV-016; "Só 1 em estoque — já no pedido"; "Voltar para os produtos" |
| 6 | MI-24, INV-012, INV-014 | −/+ das linhas e `Quantidade`: `pdv.test` RF-004 (2), RF-F06 (2), RF-F10 "400…", RF-006 (3); `pdv.caracterizacao` INV-016; `pdv.mobile` INV-001, INV-011, INV-014 "erro some"; textos de saldo ("diminua a quantidade", "exclua o item", "Só 5 em estoque"); cartões numerados, "Sem desconto", "Sem celular", "R$ X cada", "Nenhuma peça ainda…", totais "0 peças"; `pdv.ajustes` MI-07; ícone de pagamento em `pdv.validacao`; "Aumentar desconto no total" em `montarReferencia` e "total nunca negativo" |
| 7 | MI-25 / MI-26 / INV-011 | helper `comecarNovaVenda` ("OK" → "Nova venda", banner "Cliente" → aba Produtos); `pdv.test` "Cancelar… volta para Cliente", RF-F08 (3), RF-F07 (2), RF-006 "409"; `pdv.cliente` MI-04 (2); "Pedido #N" |
| 7 | MI-27 | `pdv.test` RF-F04 título "Vendas de hoje" no banner |

### Inventário AP-004 por arquivo (o que cada teste confere além do sinal)
Legenda: [B] `banner` da etapa · [C] etapa Cliente inicial · [OK] botão OK do aviso · [D] "…desconto no total"/"Sem desconto" · [Q] −/+ e `Quantidade` · [F] "Falta escolher", linha de preço, "a partir de" · [V] "Voltar para os produtos"/MI-11 · [P] "Pedido #N" · [K] cartões do Pedido · [S] textos de saldo · [T] rótulos COR/TAMANHO · [N] "Pedido (N)".

| Arquivo | Sinais | Confere além do sinal (tem de continuar conferindo) |
|---|---|---|
| `pdv.mobile.caracterizacao` (13) | [Q] [D] [B] [OK] [C] | corpo exato e contrato; 7 chaves; nº de POST/vendas; mensagens e GET /catalogo; `venda-dia`; armazenamento |
| `pdv.caracterizacao` (13) | [OK] [C] [T] [F] [B] [V] [N] [Q] | ordem das rotas; `disabled`/`aria-pressed`/ordem dos tamanhos; `aria-current`; rótulos de fechar; Dia com catálogo carregando/em falha |
| `pdv.ajustes` (14) | [T] [B] [OK] [V] [C] | "estoque N"; grades CSS; sem vendedor/data no aviso; login não reconhecido como PDV |
| `pdv.cliente` (7) | [C] [B] [K] [P] [OK] | corpo com `cliente`/`telefone` sem `cpf`; chave nova; peças mantidas depois do "Alterar"; campos zerados |
| `pdv.validacao` (6) | [C] [B] [Q] [V] | `nomeNaLista`; `pagamentoId` no corpo; amostra de cor |
| `pdv.test` (~55) | todos | corpo exato, chaves, nº de vendas, `aria-busy`, `aria-pressed`, `disabled`, mensagens de erro, contagem de GET, lista e totais do Dia, console/armazenamento/URL |
| `login.test` / `login.caracterizacao` | [B] só via helpers | comportamento do login (corpo, vendedor, travas) |
| `pdv.atualizado.caracterizacao` (novo) | só via helpers | ver "Testes novos" acima |

Riscos de nomes nos testes novos: `botaoCor` (nome pode incluir o check), `botaoTamanho` (espera "Mestoque N"), testid `item-pedido` — manter ou ajustar no helper.

## Arquivos criados ou alterados
| Arquivo | Camada | Criado / alterado |
|---|---|---|
| `src/telas/Pdv/Pdv.tsx`, `Pdv.module.css` | Tela | alterado (só comentários, documentação as-is) |
| `tests/telas/pdv.atualizado.caracterizacao.test.tsx` | Teste | criado (caracterização) |
| `tests/dominio/carrinho.caracterizacao.test.ts` | Teste | criado (caracterização) |
| `tests/config/caracterizacao.atualizado.test.ts` | Teste | criado (caracterização) |
| `tests/telas/ajuda.tsx` | Teste | alterado (helpers novos) |

## Log de decisões não previstas na arquitetura
| Data | Decisão | Motivo | Impacto |
|---|---|---|---|
| | | | |

## Mudanças de escopo
nenhuma

## Débito técnico
| Item | Motivo | Sugestão de tratamento |
|---|---|---|
| INV-021 sem teste | `crypto.randomUUID` fora de contexto seguro; fora do escopo | Tratar em feature própria |

## Execuções da suíte de caracterização por etapa (somente refatoração)
| Etapa da migração | Resultado | Observação |
|---|---|---|
| 1 — caracterização | verde, 285 | código atual, 2026-10-12 |

## Documentação (D1-D3)
- [ ] D1 — código-fonte comentado
- [ ] D2 — documentação executiva em `docs/vN/documentacao.md` (versão 11)
- [ ] D3 — `docs/contexto-geral.md` atualizado

## Exceções
nenhuma

## Pronto para documentação e testes
não
