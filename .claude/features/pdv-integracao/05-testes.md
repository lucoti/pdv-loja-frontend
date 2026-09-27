# 05 — Testes: PDV Loja — Integração (front + back + deploy)

Os testes foram executados pelo subagente `fluxo-testador` no modo `validacao`, nos dois repositórios. O orquestrador conferiu o resultado de forma independente:
- `tsc` limpo nos dois repositórios;
- back com 342/342 testes passando;
- front com 131/131 testes passando e cobertura total de 98,97 / 96,12 / 99,32 / 100;
- nenhuma alteração de código de produção feita pelo testador.

## Suíte e cobertura
- **Back:** Vitest 5 + supertest, com thresholds perFile 85/85/85/80. `src/servidor.ts` e `src/scripts/**` ficam fora da coverage.
- **Front:** Vitest 5 + Testing Library + msw/node, com thresholds perFile 85/85/85/80.
- Nenhum pacote foi instalado e nenhum threshold foi alterado. O `backend/vitest.config.ts` teve uma divisão em dois projects experimentada e revertida; o checksum confere com o original.
- **Arquivos de teste criados:**
  - `backend/tests/scripts/trocar-pin.test.ts` (11 testes);
  - `backend/tests/config/implantacao.test.ts` (4 testes);
  - `frontend/tests/config/implantacao.test.ts` (6 testes).

## Fontes usadas (T0)
- `backend/docs/v2/documentacao.md`
- `frontend/docs/v2/documentacao.md`
- `docs/contexto-geral.md`
- `02-requisitos.md`, `03-arquitetura.md` e `04-desenvolvimento.md` desta feature

## Pontos de entrada testados (T2)
| Ponto de entrada | Tipo | Situação anterior | Ação |
|---|---|---|---|
| `npm run pin:trocar` (back) | script | só verificação manual (04) | criado: 11 testes de processo real com pseudo-TTY contra banco temporário |
| `backend/vercel.json` + `public/` + engines | config de deploy | sem testes | criado (4) |
| `frontend/vercel.json` (rewrite `/api`) + build do Vite | config de deploy | sem testes | criado (6) |
| `frontend/src/App.tsx` (RF-I06) | UI / sessão | teste criado na Fase 4 | mantido |
| `vercel build` local (back e front) | build | verificado na Fase 4 | reverificado |

**Casos cobertos no `pin:trocar`:**
- sem TTY;
- vendedor inexistente;
- caso válido:
  - bcrypt com custo 10;
  - o PIN novo confere e o 1234 não;
  - só as sessões do vendedor alvo são apagadas;
  - o PIN não aparece na saída;
- padrão `carlos` quando nenhum vendedor é informado;
- PIN recusado: 1234, 3 dígitos, 5 dígitos ou com letra;
- confirmação diferente;
- Ctrl+C;
- Backspace.

**Função compilada rodando localmente contra banco temporário:**
- `/api/config` → 200;
- `/api/vendedores` → 200, sem hash;
- login → 200 com o cookie `Path=/api; Expires=<meia-noite>; HttpOnly; Secure; SameSite=Lax`;
- PIN errado → 401.

**Build estático do front:** sai só com `index.html`, `assets` e fontes. Não inclui `mockServiceWorker.js`, `.map` nem msw.

## Cobertura final por arquivo
| Arquivo | Lines | Functions | Statements | Branches | Meta atingida? |
|---|---|---|---|---|---|
| frontend/src/App.tsx | 100 | 100 | 96 | 86,66 | sim |
| backend/src/scripts/trocar-pin.ts | fora da coverage (config) | — | — | — | coberto por 11 testes de processo e 9 mutações |
| backend/vercel.json e frontend/vercel.json | não se aplica (config) | — | — | — | coberto por testes de config e mutações |
| Demais arquivos (inalterados) | como em pdv-backend/05 e pdv-frontend/05 | | | | sim |

## Lacunas
- `App.tsx`: os ramos `ativo === false` (efeito descartado antes de a promessa terminar) não têm cobertura observável. O arquivo está acima da meta.
- `trocar-pin.ts` continua fora da coverage, por configuração. A proteção vem dos testes de processo.
- RF-I01, RF-I03, RF-I05 e RF-I07 dependem da publicação. São verificados na Fase 6.

## Qualidade real dos testes (T8)
- **Sinais de alerta:** 0 encontrados e 0 corrigidos. `requireAssertions` está ativo nos dois repositórios.
- **Pontos mutados:** 18, todos detectados.

  | Alvo | Mutações |
  |---|---|
  | `App.tsx` (3) | `.catch` → 2º argumento do `.then`; mensagem genérica → `String(e)`; 401 → 400 |
  | `trocar-pin.ts` (9) | aceitar 1234; não apagar sessões; apagar sessões de todos; ignorar a confirmação; sem checagem de TTY; custo 4; regex sem âncoras; Backspace ignorado; Ctrl+C ignorado |
  | `frontend/vercel.json` (3) | destino sem `/api`; `http`; `source /(.*)` |
  | `vite.config` (1) | `publicDir` sempre ligado |
  | `backend/vercel.json` (3) | sem `outputDirectory`; `outputDirectory "."`; `buildCommand` vazio |

- **Falsos-positivos reescritos:** 0.
- **Nenhuma mutação permanece aplicada:** sim.
  - O testador conferiu por `shasum` contra o snapshot de `src/`, `api/`, `vercel.json`, `package.json`, `public/`, `vite.config.ts` e `vitest.config.ts`.
  - O orquestrador conferiu pelo `git diff`: em `src/`, `api/` e `vercel.json` só aparecem as mudanças da Fase 4.

## Validação da caracterização (somente refatoração)
Não se aplica.

## Problemas encontrados no código
| Problema | Arquivo | Gravidade | Recomendação |
|---|---|---|---|
| Texto depois do Enter no mesmo bloco é descartado: colar "PIN⏎PIN⏎" de uma vez deixa o script parado em "Repita o PIN" | backend/src/scripts/trocar-pin.ts | baixa | **Débito** (decisão do Lucas, 2026-09-27): digitar em vez de colar. Correção futura: guardar o resto do buffer |
| O prompt é escrito antes do `setRawMode(true)`, então uma tecla digitada nesse intervalo de microssegundos sairia com eco | backend/src/scripts/trocar-pin.ts | baixa | **Débito**: inverter a ordem |
| O `@vercel/node` imprime `TS2688 (types 'node')` com TS 7, mas o build conclui | build do back | baixa | Observar o log do build remoto na Fase 6 |
| "socket hang up" intermitente no supertest, em cerca de 3 de 40 execuções | backend/tests (auth, app) | baixa, pré-existente | **Débito**: pode deixar um CI instável |
| O `vercel.json` do back não fixa `regions`; `iad1` depende da configuração do projeto | backend/vercel.json | info | Conferir na Fase 6 |
| `/.gitkeep` vazio acessível como estático no back | backend/public | info | Sem impacto |

## Recomendações gerais
- Opcional: extrair do `trocar-pin.ts` a lógica pura (validação, teclas em modo raw, batch) para `src/`, para colocá-la na coverage e corrigir o primeiro débito com teste unitário.
- Na Fase 6, conferir:
  - a região `iad1`;
  - o log do build remoto;
  - `/mockServiceWorker.js` respondendo 404 no site publicado.

## Aprendizados aplicados
Nenhum. O arquivo `.claude/aprendizados.md` não existe.

## Resultado

<!-- A linha abaixo é lida literalmente pelo hook de deploy. Use exatamente "sim" ou "não", sem outro texto na linha. -->
Pronto para implantação: sim

## Aprovação
- Aprovado por: Lucas ("pode aprovar, siga")
- Data/hora: 2026-09-27 16:36
