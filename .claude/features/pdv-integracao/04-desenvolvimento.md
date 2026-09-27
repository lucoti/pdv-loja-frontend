# 04 — Desenvolvimento: PDV Loja — Integração (front + back + deploy)

<!-- Não registre código aqui: o código vive no repositório. Registre apenas decisões e fatos relevantes. -->

## Testes de caracterização (somente modo refatoração)
Não se aplica.

## Arquivos criados ou alterados
| Arquivo | Repositório | Camada | Criado / alterado |
|---|---|---|---|
| src/scripts/trocar-pin.ts | back | script de operação | criado |
| package.json (script `pin:trocar`; engines `>=22.12 <23`), package-lock.json | back | configuração | alterado |
| vercel.json (`buildCommand`, `outputDirectory`) | back | deploy | alterado |
| public/.gitkeep | back | deploy (saída estática vazia) | criado |
| README.md | back | documentação | alterado |
| src/App.tsx | front | UI / sessão | alterado |
| tests/telas/login.test.tsx | front | testes | alterado |
| vercel.json (rewrite `/api`) | front | deploy | criado |
| package.json (engines `>=22.12 <23`), package-lock.json, .gitignore (`.vercel/`) | front | configuração | alterado |
| README.md | front | documentação | alterado |

## Verificação feita nesta fase
**Script `pin:trocar`** — testado num banco temporário, criado e semeado para o teste:
- sem terminal interativo, recusa;
- PIN 1234, recusa;
- PIN com letra, recusa;
- vendedor inexistente, recusa;
- PINs diferentes, nada é alterado;
- caso válido: o hash é trocado (o PIN novo confere e o 1234 não) e as sessões são encerradas.

**Back:**
- 327/327 testes passando e `tsc` limpo.
- `vercel build` local passou. Todos os `src/**` foram compilados, o que resolve o risco dos imports `.js` → `.ts`.
- A função compilada, rodada localmente, respondeu `/api/config` com 200 e o login com 200 e o cookie correto.
- O runtime ficou em `nodejs22.x`.

**Front:**
- 125/125 testes passando, cobertura na meta e `tsc` limpo.
- O teste novo do RF-I06 falha com o `App.tsx` antigo, o que foi conferido.
- `vercel build` local: a saída estática tem só `index.html` e `assets/`, e a rota `/api` foi reescrita para o back.

## Log de decisões não previstas na arquitetura
| Data | Decisão | Motivo | Impacto |
|---|---|---|---|
| 2026-09-27 | `vercel.json` do back com `buildCommand: npm run typecheck` e `outputDirectory: public` (pasta vazia) | Com o framework "Other", a Vercel roda o `build` (tsc) e exige uma pasta de saída. Sem nenhum build, ela serviria a raiz do projeto (código-fonte) como estático | Só a função `api/` é exposta; o build de deploy checa os tipos |
| 2026-09-27 | `engines.node` = `>=22.12 <23` nos dois repositórios | Com `>=22.12`, a Vercel escolhia Node 24, e os testes foram feitos em 22 | Runtime fixo em Node 22 |
| 2026-09-27 | Na verificação de sessão, um erro que não seja `ErroApi` mostra "Algo deu errado. Tente de novo." em vez de `String(e)` | Não mostrar texto técnico ao vendedor. O caso do RF-I06 geraria "TypeError: …" | O teste existente foi ajustado para a mensagem genérica |

## Mudanças de escopo
Nenhuma.

## Débito técnico
| Item | Motivo | Sugestão de tratamento |
|---|---|---|
| Os tokens do Turso não expiram | O back precisa de um token contínuo | Fazer rotação manual se houver suspeita de vazamento (`turso db tokens invalidate`) |

## Execuções da suíte de caracterização por etapa (somente refatoração)
Não se aplica.

## Documentação (D1-D3)
- [x] D1 — código-fonte comentado (trocar-pin.ts, App.tsx; só comentários)
- [x] D2 — documentação executiva v2 criada (`backend/docs/v2/documentacao.md` e `frontend/docs/v2/documentacao.md`; v1 mantidas como histórico)
- [x] D3 — `docs/contexto-geral.md` atualizado

## Exceções
Nenhuma.

## Pronto para documentação e testes
Sim — confirmado por Lucas ("pode aprovar, siga") em 2026-09-27 15:31.
