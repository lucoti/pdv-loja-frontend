# 05 — Testes: PDV Loja — Front-end (React)

Os testes foram executados pelo subagente `fluxo-testador`, no modo `validacao`.

O orquestrador conferiu o resultado de forma independente:
- 124/124 testes passando, também com `--sequence.shuffle`;
- cobertura acima da meta;
- `tsc --noEmit` limpo;
- regras críticas intactas no código.

## Suíte e cobertura
- **Suíte:** Vitest 5.0.2 + Testing Library + msw/node, instalada na Fase 4. Nada foi instalado nesta fase.
- **Configuração:** `vitest.config.ts`, `tests/preparo.ts` e `tests/apoio.ts` não foram alterados (conferido por checksum).
- **Provider de coverage:** @vitest/coverage-v8, com thresholds por arquivo (`perFile`) de 85% em lines, functions e statements e 80% em branches.
- **Medição:** `src/**`, exceto `src/main.tsx` (entrada), `src/api/tipos.gerados.ts` (gerado), `src/simulado/navegador.ts` (liga o MSW só no navegador) e `*.d.ts`.
- **API nos testes:** o simulado MSW (msw/node) com `onUnhandledRequest: 'error'`. Os testes de tela usam o App inteiro, sem `vi.mock` do módulo sob teste.
- **Arquivos criados em `tests/`:**
  - apoio: `contrato.ts` e `telas/ajuda.tsx`;
  - domínio: `dominio/precos.test.ts`, `dominio/carrinho.test.ts` e `dominio/formatos.test.ts`;
  - API e contrato: `api/cliente.test.ts` e `simulado/contrato.test.ts`;
  - telas: `telas/login.test.tsx` e `telas/pdv.test.tsx`.

## Fontes usadas (T0)
- `frontend/docs/v1/documentacao.md` (primária).
- `docs/contexto-geral.md` (complementar).
- Artefatos 02, 03 e 04 da feature.
- `backend/contrato/openapi.yaml`.
- Nos testes do back:
  - `backend/tests/dominio/precos.test.ts`, de onde vêm os valores de referência;
  - `backend/tests/contrato/openapi.test.ts`, que serviu de modelo para o teste de contrato.

## Pontos de entrada testados (T2)
| Ponto de entrada | Tipo | Situação anterior | Ação |
|---|---|---|---|
| GET /config, GET /vendedores, POST /auth/login, GET /auth/sessao | HTTP (Login/App) | sem testes | criado |
| GET /catalogo, POST /vendas, GET /vendas/hoje | HTTP (PDV) | sem testes | criado |
| POST /auth/logout | HTTP (só no simulado; o front não usa) | sem testes | criado (contrato) |
| Reducer do pedido, preços, formatos | domínio | sem testes | criado |
| Contrato do simulado (ADR-F04) | contrato | sem testes | criado |

Detalhes do teste de contrato:
- 17 pares rota/status do simulado foram validados com ajv 2020 + ajv-formats.
- O teste falha se o simulado usar um status não documentado ou se algum par ficar sem validação.
- As requisições de login e `VendaEntrada` que a tela envia também são validadas contra os schemas.

## Cobertura final por arquivo
| Arquivo | Lines | Functions | Statements | Branches | Meta atingida? |
|---|---|---|---|---|---|
| src/App.tsx | 100 | 100 | 95,83 | 93,33 | sim |
| src/api/cliente.ts | 100 | 91,66 | 100 | 100 | sim |
| src/telas/useCarregar.ts | 100 | 100 | 100 | 83,33 | sim |
| src/telas/Login/Login.tsx | 100 | 100 | 97,56 | 94,28 | sim |
| src/telas/Pdv/Pdv.tsx | 100 | 100 | 96,66 | 90,56 | sim |
| Os outros 15 arquivos (listados abaixo) | 100 | 100 | 100 | 100 | sim |
| **Total** | 100 | 99,32 | 98,97 | 96,51 | sim |

Arquivos com 100% em tudo:
- `src/dominio/`: `carrinho.ts`, `formatos.ts`, `precos.ts`;
- `src/simulado/`: `dados.ts`, `handlers.ts`;
- `src/telas/`: `Avisos.tsx`, `Folha.tsx`, `Login/TecladoPin.tsx`;
- `src/telas/Pdv/`: `BarraInferior.tsx`, `Cabecalho.tsx`, `Dia.tsx`, `ModalSucesso.tsx`, `Pedido.tsx`, `Produtos.tsx`, `Variacoes.tsx`.

124 testes em 7 arquivos, todos passando. A suíte foi rodada 3 vezes seguidas sem nenhum teste instável.

## Lacunas
Nenhum arquivo ficou abaixo da meta. Pontos que a suíte não cobre:
- **Visual** (RNF-F01 a F04 e F09: medidas, tokens, ausência de animação, 360–460 px, grade de 4 colunas): o jsdom não calcula layout. Esses pontos foram conferidos no navegador na Fase 4.
- A função padrão vazia `aoPerderSessao` em `cliente.ts`, que responde pelo 91,66% em functions.

## Qualidade real dos testes (T8)
- **Sinais de alerta:** 1 encontrado e 1 corrigido. Era uma regex confusa no teste de "POST sem preços"; foi trocada por igualdade exata do corpo mais uma lista explícita de campos proibidos.
- **Mutações:** 24 pontos mutados, todos detectados. Cobriram:
  - regras de valor: arredondamento meio para cima e total ≥ 0;
  - carrinho: consolidação por variação, "−" com qtd 1 e desconto no total com mínimo 0;
  - habilitação: `podeFechar`, CTA habilitado e CTA bloqueado durante o envio;
  - chave de idempotência: a chave muda a cada envio, "Nova venda" mantém a chave e "Cancelar" mantém a chave;
  - envio de `precoUnitCentavos`;
  - sessão: 401 sem voltar ao login, qualquer 401 derrubando a sessão e App com 401 inicial;
  - PIN: sem limite e PIN errado sem limpar;
  - login: seleção com 1 vendedor;
  - mensagens: erro que não some ao editar e mensagem de rede;
  - simulado sem idempotência;
  - textos: linha de apoio e plural;
  - modal com total local.
- **Falsos-positivos reescritos:** 0.
- **Nenhuma mutação permanece aplicada no código:** sim.
  - O testador conferiu com `diff -r` de `src/` contra o backup e com checksums.
  - O orquestrador conferiu as regras críticas por conta própria.

## Validação da caracterização (somente refatoração)
Não se aplica.

## Problemas encontrados no código
| Problema | Arquivo | Gravidade | Recomendação |
|---|---|---|---|
| `api.sessao().then(ok, erro)`: se o callback de sucesso lançar exceção (resposta 200 fora do contrato), a rejeição não é tratada e a página fica presa em "Carregando…" sem "Tentar de novo" | src/App.tsx:24-31 | baixa (só com o back violando o contrato) | **Mantido como está por decisão do Lucas (2026-09-27)**. Débito para a pdv-integracao: `.then(ok).catch(erro)` |
| O simulado responde "modelo indisponível" para qualquer item inválido | src/simulado/handlers.ts | baixa | Débito já registrado no 04 |

Nenhum problema funcional foi encontrado nos critérios RF-F01 a RF-F10.

Risco aceito e registrado na documentação: se a sessão expirar no meio de uma venda, o pedido em andamento se perde. O escopo aprovado não salva nada no aparelho, e o Lucas confirmou em 2026-09-27 que isso fica sem alterações.

## Recomendações gerais
- Na pdv-integracao:
  - rodar os fluxos de tela também contra o back real (`npm run dev:api`), porque o teste de contrato garante só o formato das respostas do simulado;
  - tratar o débito do `App.tsx`.
- Manter `npx tsc --noEmit` e `npm run test:coverage` na verificação.

## Aprendizados aplicados
Nenhum. O arquivo `.claude/aprendizados.md` não existe.

## Resultado

<!-- A linha abaixo é lida literalmente pelo hook de deploy. Use exatamente "sim" ou "não", sem outro texto na linha. -->
Pronto para implantação: sim

## Aprovação
- Aprovado por: Lucas ("pode aprovar como está, siga")
- Data/hora: 2026-09-27 12:18
