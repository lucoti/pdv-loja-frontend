# 04 — Desenvolvimento: PDV Loja — Front-end (React)

<!-- Não registre código aqui: o código vive no repositório. Registre apenas decisões e fatos relevantes. -->

## Testes de caracterização (somente modo refatoração)
Não se aplica: a feature é nova.

## Arquivos criados ou alterados
| Arquivo | Camada | Criado / alterado |
|---|---|---|
| frontend/package.json, package-lock.json, .nvmrc, .gitignore | configuração | criado |
| frontend/tsconfig.json, vite.config.ts, vitest.config.ts, index.html | configuração | criado |
| frontend/README.md | documentação | criado |
| frontend/src/main.tsx, src/App.tsx, src/ambiente.d.ts | entrada / sessão | criado |
| frontend/src/api/cliente.ts | API (cliente HTTP) | criado |
| frontend/src/api/tipos.gerados.ts | API (tipos gerados do contrato) | criado |
| frontend/src/dominio/precos.ts, carrinho.ts, formatos.ts | domínio | criado |
| frontend/src/telas/Folha.tsx, Avisos.tsx, useCarregar.ts, comum.module.css | UI compartilhada | criado |
| frontend/src/telas/Login/Login.tsx, TecladoPin.tsx, Login.module.css | UI — login | criado |
| frontend/src/telas/Pdv/Pdv.tsx, Cabecalho.tsx, Produtos.tsx, Variacoes.tsx, Pedido.tsx, Dia.tsx, BarraInferior.tsx, ModalSucesso.tsx, Pdv.module.css | UI — PDV | criado |
| frontend/src/estilos/tokens.css, global.css | estilos | criado |
| frontend/src/simulado/dados.ts, handlers.ts, navegador.ts | API simulada (MSW) | criado |
| frontend/simulado-publico/mockServiceWorker.js | API simulada (gerado pelo MSW) | criado |
| frontend/tests/preparo.ts, tests/apoio.ts | infraestrutura de testes | criado |
| .claude/launch.json | preview local (Node 22) | criado |

## Verificação feita nesta fase
Verificado no navegador em 414 e 360 px de largura, contra o simulado:
- **Login:** o PIN errado mostra a mensagem de erro e limpa o PIN; o PIN 1234 entra direto no PDV.
- **Venda de referência:** usa os mesmos valores dos testes do back e dá 3 peças, bruto R$ 257,00, descontos − R$ 35,20 e total R$ 221,80, na tela e na resposta do simulado.
- **Carrinho:** adicionar uma variação que já está no pedido soma a quantidade na linha existente.
- **Botão de fechar venda:** os estados do rótulo estão corretos.
- **CPF inválido:** a mensagem da API aparece e some quando o pedido é editado.
- **Modal de venda registrada:** mostra o pedido #1042. "Nova venda" limpa o pedido e volta para Produtos.
- **Aba Dia:** atualizada com a venda.
- **Layout:** sem rolagem horizontal em 360 px.

Checagens de build e testes:
- `tsc --noEmit` limpo.
- `npm run build` gera a página em `dist/` sem nenhum código do MSW.
- A infraestrutura de testes (Vitest + Testing Library + msw/node) foi conferida com um teste de fumaça temporário. Ele passou e foi removido; os testes definitivos são da Fase 5.

## Log de decisões não previstas na arquitetura
| Data | Decisão | Motivo | Impacto |
|---|---|---|---|
| 2026-09-27 | `gerar:tipos` roda o openapi-typescript via `npx` com TypeScript 5 junto, fora das dependências | O openapi-typescript 7 exige TS 5 como peer, e o projeto usa TS 7 | O projeto continua em TS 7; gerar os tipos baixa o TS 5 sob demanda |
| 2026-09-27 | `mockServiceWorker.js` fica em `simulado-publico/`, servido só no modo `development` (`publicDir` condicional) | Não publicar arquivo do simulado em produção | O `dist/` não leva nada do MSW |
| 2026-09-27 | Na linha "DESCONTO" do item, os 4 botões passam para baixo do rótulo quando não cabem (`flex-wrap`) | Os tamanhos fixos do handoff (62×54) não cabem ao lado do rótulo abaixo de ~430 px; o próprio protótipo transborda | Tamanhos preservados e sem rolagem horizontal (RNF-F04) |
| 2026-09-27 | O valor em reais mantém o espaço não separável depois de "R$" | Evitar "R$" numa linha e o valor na outra | Só visual |
| 2026-09-27 | Falha de rede no login mantém o PIN digitado; só o 401 limpa | Com rede instável, o vendedor não precisa redigitar | Comportamento do handoff mantido para PIN errado |
| 2026-09-27 | Se a verificação de sessão ao abrir a página falhar por rede, aparece "Tentar de novo" em vez do login | Não mandar para o login quem pode estar com sessão válida | Estado extra em `App.tsx` |
| 2026-09-27 | A aba Dia funciona enquanto o catálogo carrega ou falha | A aba Dia não depende do catálogo | Só navegação |

## Mudanças de escopo
Nenhuma.

## Débito técnico
| Item | Motivo | Sugestão de tratamento |
|---|---|---|
| O simulado responde "modelo indisponível" para qualquer item inválido | Simplificação; o back distingue modelo, tecido, tamanho e cor | Alinhar a mensagem se algum teste depender dela |
| Sem linter (ESLint) | O back também não tem; fora do escopo | Avaliar num ajuste de ferramentas comum aos dois projetos |

## Execuções da suíte de caracterização por etapa (somente refatoração)
Não se aplica.

## Documentação (D1-D3)
- [x] D1 — código-fonte comentado (6 arquivos; só comentários, conferido por diff)
- [x] D2 — documentação executiva em `frontend/docs/v1/documentacao.md` (versão 1)
- [x] D3 — `docs/contexto-geral.md` atualizado

## Exceções
Nenhuma.

## Pronto para documentação e testes
Sim — confirmado por Lucas ("pode aprovar, siga") em 2026-09-27 11:30.
