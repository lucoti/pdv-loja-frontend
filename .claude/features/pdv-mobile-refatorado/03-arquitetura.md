# 03 — Arquitetura (refatoração): PDV Loja — Front-end mobile refatorado (design Nocturne)

## As-is (estado atual)
- Documentação gerada (D1-D3): `docs/v8/documentacao.md` — versão 8 (retrato as-is antes desta refatoração); `docs/contexto-geral.md` atualizado. D1 só inseriu comentários (63 linhas, nenhuma removida, `tsc --noEmit` ok).
- Resumo da estrutura atual:
  - `Pdv.tsx` guarda a aba (`produtos | pedido | dia`), o pedido (`useReducer(reduzirPedido)`) e o catálogo (`useCarregar`). `Venda` guarda tipo escolhido, produto aberto, escolha de cor/tamanho, `enviando`, `erro` e `sucesso`.
  - Telas: `Produtos` (chips + cartões com "a partir de" e "sem estoque"), `Variacoes` (cores em 2 colunas, tamanhos em 3 colunas com sigla/preço/"estoque N"), `Pedido` (cliente + CPF, itens com desconto por item, desconto no total, pagamento, totais, cancelar), `Dia`, `ModalSucesso` ("Venda registrada" → "Nova venda", único caminho que troca a chave depois da venda).
  - `Cabecalho` mostra só o nome da etapa; `BarraInferior` tem o CTA da tela e as 3 abas em texto.
  - Domínio puro em `src/dominio/` (`carrinho.ts`, `precos.ts`, `catalogo.ts`, `formatos.ts`); desconto no total em R$ (passo 500 centavos) já existe, sem teto.
  - Tema claro em `src/estilos/tokens.css` (`--ink`, `--paper`, `--green`…, fonte Libre Franklin via `@fontsource/libre-franklin` em `main.tsx`), usado por `comum.module.css`, `Login.module.css` e `Pdv.module.css`; há cores fixas fora dos tokens (`#ffffff`/rgba em `comum.module.css` e `Pdv.module.css`, `var(--line)` inline em `Variacoes.tsx`, `theme-color` em `index.html`).
  - `Folha` limita a página a 460px centralizada: o tablet já mostra a mesma coluna do celular.

### Problemas do estado atual
| Problema | Onde | Impacto |
|---|---|---|
| Cliente e CPF ficam no fim do fluxo, dentro do Pedido | `Pedido.tsx`, `carrinho.ts` | Cliente é esquecido; CPF será substituído pelo telefone (pdv-cliente-telefone) |
| Desconto por item + desconto no total na mesma tela | `Pedido.tsx` | Tela longa no celular; design quer um desconto só |
| "+" do desconto no total sem teto | `carrinho.ts` (`descontoTotalMais`) | Dá para lançar desconto maior que o pedido (o total para em 0) |
| Cores fixas fora dos tokens | CSS modules, `Variacoes.tsx`, `index.html` | Troca de tema incompleta |
| Testes usam textos que o design tira ("a partir de", "sem estoque", "Venda registrada", "Nova venda", "CPF (opcional)", topo `header div`, botões de tamanho com preço) | `tests/telas/*` | Troca em massa de sinais (AP-004) |

## Conformidade com o CLAUDE.md
Não há `CLAUDE.md` no `frontend/`, no `backend/` nem na raiz. Seguidos os padrões do próprio código: React 19 + TypeScript + Vite, CSS Modules, domínio puro em `src/dominio/`, comentários em pt-BR, testes Vitest + Testing Library em `tests/`. Sem contradições.

## To-be (estado proposto)

### Tema (MI-01, decisão do Lucas: Login também escuro)
- `src/estilos/tokens.css` passa a ter os tokens Nocturne usados pelo design (`--color-bg`, `--color-surface`, `--color-text`, `--color-accent`, `--color-divider`, rampas `--color-neutral-100…900` e `--color-accent-100…900`, `--radius-sm/md/lg`, `--shadow-lg`, `--font-heading`/`--font-body`), copiados do `styles.css` do pacote de handoff. Os tokens antigos saem.
- `comum.module.css`, `Login.module.css` e `Pdv.module.css` passam a usar só os tokens novos; cores fixas saem. No Login muda só cor e fonte, nada de layout nem comportamento.
- Fonte Inter (400/500/600) via `@fontsource/inter`, no lugar de `@fontsource/libre-franklin` (sem depender do Google Fonts em produção). `theme-color` do `index.html` = `#161826`.
- Ícones Phosphor via `@phosphor-icons/react` (só os ícones usados entram no bundle).

### Fluxo da venda
- Estado novo em `Pdv`: `clienteDefinido: boolean` (começa `false`) e `origemCliente: 'inicio' | 'pedido'`. A aba Produtos mostra **Cliente** enquanto `clienteDefinido` for `false`; depois mostra a lista ou cor/tamanho, como hoje.
- **Cliente** (`Cliente.tsx`, novo): rascunho local de nome e celular (máscara (31) 99999-9999, só dígitos guardados). Botão principal "Escolher produtos" (no modo `pedido`, "Salvar cliente") habilitado com celular vazio ou com 10–11 dígitos; botão secundário "Venda sem cliente" limpa os dois e segue. Confirmar grava no pedido (ação `cliente` com `{ nome, telefone }`) e marca `clienteDefinido`.
- **Alterar** (cartão 1 do Pedido): abre Cliente com o rascunho preenchido e `origemCliente = 'pedido'`; ao salvar, volta para o Pedido.
- **Aviso de venda** (`AvisoVenda.tsx`, substitui `ModalSucesso`): `role="dialog"`, texto "Pedido #N registrado · R$ X" (+ cliente se houver), botão **OK** (decisão do Lucas: sai só com toque). OK chama `novaVenda`: chave nova, pedido zerado, `clienteDefinido = false`, aba Produtos → tela Cliente.
- **Cancelar pedido** (topo do Pedido): mesmo efeito de `novaVenda` sem aviso — zera pedido e cliente, chave nova, volta para Cliente.

### Telas
- **Topo por tela** (`Topo.tsx`, substitui `Cabecalho`): `<header>` com título da etapa e linha de apoio, conforme o design: Cliente ("Nova venda · primeiro passo"), Produtos (cliente ou "Cliente não identificado" + "N modelos"), Cor e tamanho (voltar + tipo/tecido), Pedido ("Cancelar pedido"), Vendas de hoje (data "05 out"). `nomeEtapa` passa a cobrir "Cliente" e "Vendas de hoje".
- **Produtos**: tipos em grade `repeat(3, minmax(0,1fr))`; um grupo com o tipo escolhido (título fixo ao rolar + "N modelos") e linhas só com o tecido, selo "N no pedido" (soma das quantidades dos SKUs do produto no pedido) e seta. Sem "a partir de" e sem "sem estoque".
- **Cor e tamanho**: cores em lista de uma coluna (amostra, nome, ícone de marcado); tamanhos em `repeat(4, minmax(0,1fr))` com sigla e "estoque N" (INV-016), sem preço. Rodapé: resumo à esquerda ("Cor · Tam X" ou "Falta escolher: cor e tamanho", ou o aviso de limite) e preço à direita (preço do SKU escolhido; sem SKU, menor preço do produto), botão "Adicionar ao pedido". Depois de adicionar, a tela **fica em Cor e tamanho com cor e tamanho limpos** (MI-11, decisão do Lucas: seguir o design; hoje vai para a aba Pedido). O helper de teste `adicionarPeca` deixa de supor a ida ao Pedido (AP-004).
- **Pedido**: cartões 1 Cliente, 2 Peças (−, qtd, +, "R$ X cada", "Tirar", aviso de limite), 3 Desconto no pedido (−/+ de R$ 5), 4 Pagamento (grade 2 colunas com ícone). Rodapé: peças/bruto, desconto, botão de fechar com rótulo à esquerda e total à direita.
- **Dia**: cartões Total do dia / Pedidos, linhas "#N · cliente" e "hora · N peças · pagamento".
- **BarraInferior**: CTA da tela (como hoje) + 3 abas com ícone, marca no topo da aba ativa e `aria-current`.

### Domínio
- `carrinho.ts`: `cpf` → `telefone` no `Pedido`; ação `cliente` passa a levar `{ nome, telefone }` (ação `cpf` sai). `descontoTotalMais` ganha `limite` (bruto do pedido) e para nele (MI-03). O desconto por item continua no domínio e no contrato (`descPercent`), mas a tela não o oferece: todo item é enviado com 0.
- `precos.ts` sem mudança (espelho do back).

### Contrato (última etapa, depende da pdv-cliente-telefone)
- Depois que a pdv-cliente-telefone mudar o `backend/contrato/openapi.yaml`, roda `npm run gerar:tipos`; `fechar` envia `telefone` (só dígitos) no lugar de `cpf`; `src/simulado/handlers.ts` espelha a validação do back (sai `cpfValido`/`cpf_invalido`).

## Estratégia de migração
- **Estratégia escolhida:** incremental, em etapas pequenas no mesmo branch, com a suíte inteira verde ao fim de cada etapa e um commit por etapa.
- **Justificativa:** as telas são componentes independentes sobre o mesmo domínio; feature flag não compensa (um único front, publicado de uma vez); big bang tornaria impossível saber qual etapa quebrou um invariante. O deploy é um só, no fim, depois do back.

### Etapas
| Etapa | O que muda | Invariantes em risco | Rollback |
|---|---|---|---|
| 0 | Caracterização: completar testes sobre o código ATUAL para INV-010 a INV-019 (Fase 4, passo 1) | — | — |
| 1 | Tema: tokens Nocturne, Inter, ícones Phosphor, troca de cores em todos os CSS (Login incluído), `theme-color` | nenhum (só visual) | `git revert` do commit da etapa |
| 2 | Topo por tela + BarraInferior com ícones; inventário AP-004 do sinal `header div`/`banner` e ajuste de `topoDoPdv`/`esperarPdv` | INV-018, INV-020 | revert |
| 3 | Produtos, Cor e tamanho e Dia no layout novo (MI-05, MI-06, MI-08, MI-11); guardas AP-003 das grades | INV-012, INV-016, INV-017 | revert |
| 4 | Pedido em cartões (MI-03, MI-07): sai o desconto por item da tela, teto no desconto, rótulo + total no botão | INV-012, INV-013, INV-014, INV-015 | revert |
| 5 | Etapa Cliente + Alterar + AvisoVenda + Cancelar → Cliente (MI-02, MI-04); telefone guardado no pedido, contrato ainda com `cpf: ''` | INV-011, INV-013, INV-019 | revert |
| 6 | Contrato `cpf` → `telefone` (tipos gerados, `fechar`, simulado, testes de contrato). **Depende de:** openapi novo da pdv-cliente-telefone | INV-001 | revert |

Deploy (detalhado na Fase 6, AP-002): back da pdv-cliente-telefone primeiro, front depois. A janela "back novo + front antigo" só é segura se o back novo continuar aceitando `cpf` (vazio) por um tempo — requisito a levar para a Arquitetura da pdv-cliente-telefone (o `esquemaVenda` do back é `z.strictObject`).

## Cobertura dos invariantes
| Invariante | Teste de caracterização previsto |
|---|---|
| INV-001 | `tests/simulado/contrato.test.ts` + teste de tela que confere o corpo do `POST /vendas` (campos, sem preço, `descPercent` 0) |
| INV-002 | `tests/api/cliente.test.ts` (rotas e formatos) |
| INV-010 | Teste de tela: 401 ao fechar → login |
| INV-011 | Teste de tela: duas tentativas com erro → mesma chave; depois de venda (OK do aviso) e de "Cancelar pedido" → chave nova |
| INV-012 | `carrinho.test.ts` (soma na linha, limite, "−" em 1) + tela |
| INV-013 | Tela: rótulos do botão; dois toques rápidos no fechar → um único POST (AP-001: toques no mesmo `act`, sem redesenho) |
| INV-014 | Tela: erro do servidor mantém o pedido e some na próxima mudança; 409/400 recarregam catálogo; aviso "Só N em estoque" |
| INV-015 | `carrinho.test.ts` (ação `precos`) + tela: venda recarrega catálogo |
| INV-016 | `pdv.ajustes.test.tsx`: tamanho zerado desabilitado, cor mantém tamanho, "estoque N" |
| INV-017 | Tela: primeiro tipo marcado; recarga sem o tipo volta ao primeiro |
| INV-018 | Tela: aba Dia com catálogo carregando/em falha |
| INV-019 | Teste: nenhuma escrita em `localStorage`/`sessionStorage` durante uma venda |

## Decisões (ADRs)

### ADR-001 — Tokens Nocturne no lugar dos tokens atuais, para o app inteiro
- **Contexto:** o design usa o design system Nocturne (escuro). Os tokens atuais são globais e o Login os usa. O Lucas decidiu que o Login também fica escuro.
- **Decisão:** substituir `tokens.css` pelos tokens Nocturne usados no design e reescrever as cores dos três CSS modules só com eles; nenhuma cor fixa fora de `tokens.css`.
- **Consequências:** um tema só; Login muda de cor sem mudar layout. Testes não dependem de cor. Conferência visual no navegador (celular e tablet).

### ADR-002 — Inter e Phosphor por pacote npm
- **Contexto:** o protótipo carrega Inter do Google Fonts e Phosphor do unpkg. O app já usa `@fontsource` para não depender de CDN.
- **Decisão:** `@fontsource/inter` (400/500/600) e `@phosphor-icons/react`; sai `@fontsource/libre-franklin`.
- **Consequências:** duas dependências novas, sem CDN em produção; ícones como componentes React com `aria-hidden`.

### ADR-003 — Cliente como etapa da aba Produtos, não como aba nova
- **Contexto:** no design a tela Cliente mostra a barra com a aba Produtos ativa; as abas continuam três.
- **Decisão:** `clienteDefinido` em `Pdv` decide se a aba Produtos mostra Cliente ou a lista. Nome e telefone ficam no reducer do pedido (só memória, INV-019); o rascunho fica no componente Cliente.
- **Consequências:** `Aba` não muda. Todo teste que entra no PDV e vai a Produtos passa por Cliente; o helper de teste ganha `pularCliente` (AP-004).

### ADR-004 — Aviso de venda com OK no lugar de "Venda registrada"
- **Contexto:** decisão do Lucas: aviso ao finalizar, sai só com toque, e então volta para Cliente. Hoje a troca de chave depois da venda depende de "Nova venda" (INV-011).
- **Decisão:** `AvisoVenda` (`role="dialog"`, foco no OK). O OK chama `novaVenda` (chave nova, pedido e cliente zerados, Cliente). Enquanto o aviso está aberto, o pedido antigo continua no estado (nada é reenviado).
- **Consequências:** INV-011 preservado com o OK no lugar de "Nova venda"; testes trocam "Nova venda"/"Venda registrada" por OK/"registrado" (inventário AP-004).

### ADR-005 — Teto do desconto no pedido = bruto
- **Contexto:** MI-03; hoje o "+" não tem teto (o total para em 0).
- **Decisão:** ação `descontoTotalMais` recebe `limite` (bruto atual) e não passa dele; se itens saírem e o desconto ficar acima do bruto, o total continua parando em 0 (cálculo atual) e o "+" fica desabilitado.
- **Consequências:** o back não muda (aceita qualquer desconto e para em 0). Novo teste de domínio.

### ADR-006 — Trava contra envio duplo em ref
- **Contexto:** `fechar` lê `enviando` do estado (achado do D1); hoje o `disabled` e a idempotência cobrem. AP-001 recomenda ref para valores lidos no disparo.
- **Decisão:** a trava passa a ser um `useRef`, e o estado `enviando` fica só para desenhar; teste com dois cliques nativos no mesmo `act`.
- **Consequências:** sem mudança visível; elimina a janela entre dois toques antes do redesenho.

## Riscos técnicos
| Risco | Impacto | Mitigação |
|---|---|---|
| Troca em massa de sinais dos testes (topo, "Nova venda", "a partir de", "sem estoque", nome acessível dos tamanhos, CPF, desconto por item) | Alto | AP-004: antes de cada etapa, `04-desenvolvimento.md` lista cada teste em que o sinal carregava informação além do sinal e a asserção equivalente; helpers com `waitFor` sem devolver elemento; T8 com mutação nos helpers |
| jsdom não calcula layout (grades de 3 e 4 colunas, cartões, título fixo do grupo) | Médio | AP-003: teste que lê a regra da classe em uso na mesma etapa + conferência no navegador a 360px e 320px registrada no `04` |
| Etapa Cliente (opcional, mas sempre exibida) como passo extra muda todos os fluxos de teste | Médio | Helper `pularCliente` único; testes de cliente próprios |
| Back novo recusar o front antigo (`strictObject`) ou vice-versa | Alto | Etapa 6 só depois do openapi novo; ordem de deploy com "Depende de:" (AP-002); compatibilidade a definir na pdv-cliente-telefone |
| Contraste do tema escuro em sol/loja | Baixo | Conferência no celular real pelo Lucas antes do deploy |

## Aprendizados aplicados
- AP-001: ADR-006 (trava em ref) e teste de dois toques no mesmo `act` para INV-013.
- AP-002: etapa 6 e deploy com "Depende de:"; compatibilidade back/front levada para a pdv-cliente-telefone.
- AP-003: grades com `minmax(0,1fr)`, guarda automática na mesma etapa e conferência a 360/320px.
- AP-004: inventário por teste antes das etapas 2 a 6; helpers sem guardar elemento.

## Aprovação
- Aprovado por: Lucas ("siga o design e pode gravar"; decisões na fase: Login escuro, aviso só com OK, ficar em Cor e tamanho depois de adicionar)
- Data/hora: 2026-10-05 22:49
