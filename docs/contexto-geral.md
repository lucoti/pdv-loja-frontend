# Contexto geral do ambiente — PDV Loja (FitMoveOn)

Visão única de todas as aplicações do ambiente PDV Loja e de como elas se conectam. Este arquivo é
atualizado a cada entrega; o detalhe de cada aplicação fica na documentação versionada dela
(`<app>/docs/vN/documentacao.md`). O arquivo vive no repositório do front
(`frontend/docs/contexto-geral.md`); `docs/contexto-geral.md` na pasta do ambiente é um link para ele.

Última atualização: 2026-10-06 (feature **pdv-mobile-refatorado**, **to-be** pós-desenvolvimento:
pdv-frontend docs v9 — design "PDV Mobile Refatorado", tema escuro Nocturne em todas as telas (Login só
com cores e fonte), fonte Inter e ícones Phosphor empacotados (sem CDN); etapa **Cliente** no começo da
venda com nome e celular opcionais ("Venda sem cliente") e "Alterar" no Pedido; celular com máscara e
**exatamente 11 dígitos**, mesma regra do back; desconto por peça fora da tela (`descPercent` sempre 0) e
desconto no pedido de R$ 5 em R$ 5 com teto no bruto; aviso de venda com **OK**, que troca a chave de
idempotência e volta para Cliente. **O front agora envia `telefone` (só dígitos, ou `''`) e não envia
mais `cpf`** no `POST /vendas` (etapa 6, tipos regerados do `openapi.yaml` da pdv-cliente-telefone); a API
simulada espelha o back (`telefone_invalido`, corpo com `cpf` → 400). Branch `pdv-mobile-refatorado` do
front, **não publicado**; validação final (Fase 5) pendente. **Nenhuma integração nova**, nenhuma rota
nova, nenhuma mudança de banco além da coluna `vendas.telefone` da feature irmã. Front e back novos só
vão ao ar juntos, **sem janela de compatibilidade**, na ordem A `db:migrar` → B back → C front → D
recarregar os celulares; ver "Implantação coordenada pdv-cliente-telefone + pdv-mobile-refatorado").
Anterior: 2026-10-06 (feature **pdv-cliente-telefone**, **to-be** pós-desenvolvimento:
pdv-backend docs v8 — o `POST /vendas` aceita `telefone` (opcional, exatamente 11 dígitos, gravado só com
dígitos na coluna nova `vendas.telefone`) no lugar de `cpf`; erro 400 `telefone_invalido` ("Celular
inválido") no lugar de `cpf_invalido`; corpo com `cpf` → 400 `entrada_invalida` "Campo não permitido:
cpf."; `Venda.telefone` na resposta; cupom com `dados.telefoneCliente` e a linha "Tel: (31) 98765-4321"
(telefone completo). Desenvolvido no branch `pdv-cliente-telefone` do back, **ainda não publicado**.
**Nenhuma integração nova**; mudança de banco aditiva (coluna `vendas.telefone`, que o ERP não lê). O
**front ainda não envia `telefone`** (etapa 6 da pdv-mobile-refatorado, pendente): o back novo só pode
ir ao ar em deploy coordenado com o front novo, **sem janela de compatibilidade**). Anterior:
2026-10-05 (feature **pdv-cliente-telefone**, Fase 3, retrato **as-is** antes da
refatoração: pdv-backend docs v7, que descreve o back como está no ar — cliente e CPF opcionais no
`POST /vendas`, CPF validado pelos dígitos, gravado só com números em `vendas.cpf` e mascarado no cupom;
só comentários no código, **nenhuma mudança de comportamento, nenhuma integração nova** nem mudança de
banco. Decidido para o to-be: troca **sem janela de compatibilidade** — corpo com `cpf` passa a ser
recusado (400) — e **coluna nova `vendas.telefone`**; deploy coordenado back → front; ver "Mudanças
planejadas"). Anterior: 2026-10-05 (feature **pdv-mobile-refatorado**, retrato **as-is** antes da
refatoração: pdv-frontend docs v8, que descreve a tela de venda como está no ar — tema claro, cliente e
CPF opcionais na aba Pedido, desconto por peça e desconto no total, modal "Venda registrada"; só
comentários no código, **nenhuma mudança de comportamento, nenhuma integração nova** nem mudança de
banco. Planejado: o front será refeito no design "Nocturne" (tema escuro, etapa Cliente com nome e
celular, desconto único no pedido) e a feature irmã **pdv-cliente-telefone**, no back, trocará o
`cpf` pelo `telefone` no `POST /vendas`; ver "Mudanças planejadas"). Anterior: 2026-10-01 (feature
pdv-ajustes-tela-variacoes, **to-be** pós-desenvolvimento:
pdv-frontend docs v7 — tamanhos em 3 colunas que cabem no celular, saldo do tamanho como "estoque N" e
topo do PDV só com a etapa, sem "BALCÃO", vendedor e data; só o front é afetado, desenvolvido e **ainda
não publicado**; **nenhuma integração nova**, nenhuma chamada à API alterada, nenhuma mudança de banco;
o pdv-backend não foi tocado). Anterior: 2026-10-01 (mesma feature, retrato **as-is** antes da
refatoração: pdv-frontend docs v6, que detalha o topo da tela de venda e a tela de cor e tamanho; só o
front é afetado, sem mudança de comportamento, **nenhuma integração nova** nem mudança de banco. A
coluna "Situação" do pdv-backend e do pdv-frontend foi atualizada conforme o registro de implantação
da feature pdv-login-8-digitos, concluída em 2026-10-01). Anterior: 2026-10-01 (feature pdv-login-8-digitos, **to-be** pós-desenvolvimento: PIN de
**8 números** e login disparado pelo 8º número, sem o botão "Entrar no PDV"; pdv-backend docs v6 e
pdv-frontend docs v5, desenvolvidos e **ainda não publicados**; nenhuma integração nova nem mudança de
banco). Anterior: 2026-10-01 (mesma feature, retrato **as-is** antes da refatoração: pdv-backend docs
v5 e pdv-frontend docs v4, sem mudança de comportamento). Anterior: 2026-09-29 (feature integracao-pdv-erp do ERP, pós-desenvolvimento: o PDV passa a
vender pelo catálogo do ERP e a baixar o estoque do ERP na mesma transação da venda — ADR-017 do ERP,
que revisa o ADR-A01; pdv-backend v4 e pdv-frontend v3 desenvolvidos, **ainda não publicados**).
Anteriores: 2026-09-29 (feature erp-move-on: ERP publicado no mesmo banco `pdv-loja`; PDV v3 com
`pdv_cores`/`pdv_tecidos` publicado); 2026-09-27 (feature pdv-integracao: PDV publicado em
https://pdv-loja-frontend.vercel.app, com catálogo de exemplo).

A visão do ambiente pelo lado do ERP está em `ERP-loja/docs/contexto-geral.md`.

## Aplicações no Ambiente

| Aplicação | Responsabilidade | Localização | Situação |
|---|---|---|---|
| **pdv-backend** | API do PDV: entrada do vendedor por senha (PIN de 8 números desde a v6), sessão diária, **catálogo lido do ERP** (tipos, produtos, SKUs com preço e saldo), registro de vendas com cálculo e numeração no servidor **e baixa do estoque do ERP na mesma transação** (409 `sem_estoque`), vendas do dia e conteúdo do cupom não fiscal; script `pin:trocar` | `backend/` — repositório `lucoti/pdv-loja-backend`, projeto Vercel `pdv-loja-backend` (docs: `backend/docs/v8/documentacao.md`, to-be da pdv-cliente-telefone; as-is anterior em `backend/docs/v7/`; contrato: `backend/contrato/openapi.yaml`) | v6 (PIN de 8 números) **no ar** desde 2026-10-01 (`pdv-loja-backend.vercel.app`, função em iad1), sobre a v4 (integração com o ERP), já publicada. Docs v8 (2026-10-06) é o to-be da feature **pdv-cliente-telefone** (refatoração **desenvolvida**, branch `pdv-cliente-telefone`, **não publicada**; falta a Fase 5): o celular do cliente (11 dígitos) substitui o CPF por completo no `POST /vendas`, na `Venda` e no cupom, sem janela de compatibilidade, com coluna nova `vendas.telefone`. Testes da feature aprovados (2026-10-06). Só pode ir ao ar junto com o front que envia `telefone` (pdv-mobile-refatorado, docs v9 do front, desenvolvido e não publicado) |
| **pdv-frontend** | Página web do vendedor no navegador do celular (React 19 + TypeScript + Vite, página estática; não é PWA): login com PIN de 8 números e entrada automática no 8º número (sem botão); no to-be (docs v9): tema escuro Nocturne, etapa **Cliente** (nome e celular de 11 dígitos, opcionais) no começo da venda, aba Produtos com tipos do ERP em grade de 3 colunas e escolha cor → tamanho com saldo ("estoque N", 4 colunas), Pedido em cartões (cliente com "Alterar", peças limitadas ao estoque, desconto único no pedido em R$ com teto no bruto, pagamento), fechamento com idempotência e tratamento do 409, aviso de venda com OK e aba Dia. Página única (o tablet mostra a coluna do celular) | `frontend/` — repositório `lucoti/pdv-loja-frontend`, projeto Vercel `pdv-loja-frontend` (docs: `frontend/docs/v9/documentacao.md`, to-be da pdv-mobile-refatorado; as-is anterior em `frontend/docs/v8/`; guia técnico: `frontend/README.md`) | v7 (ajustes da tela de cor/tamanho e do topo, tema claro, venda com `cpf`) **no ar** desde 2026-10-01 em https://pdv-loja-frontend.vercel.app (rewrite `/api`), sobre a v5 (login de 8 números) e a v3 (catálogo do ERP). Docs v9 (2026-10-06) é o to-be da feature **pdv-mobile-refatorado** (refatoração **desenvolvida**, etapas 1 a 6, branch `pdv-mobile-refatorado`, **não publicada**; falta a Fase 5): envia `telefone` e não envia `cpf`. Só pode ir ao ar junto com o back da pdv-cliente-telefone (ordem A → B → C → D) |
| **API simulada (MSW)** | Imitação do pdv-backend em memória (vendedor Carlos, PIN 12345678, pedidos a partir de 1042), com catálogo de exemplo no formato do ERP igual ao `SEED_ERP` do back e baixa de saldo a cada venda; desde a pdv-mobile-refatorado (front docs v9), venda com `telefone` (11 dígitos, `telefone_invalido`) e corpo com `cpf` recusado, como o back novo. Usada no `npm run dev` do front e nos testes; fica fora do build de produção | `frontend/src/simulado/` e `frontend/simulado-publico/` | Parte do pdv-frontend |
| **Banco Turso `pdv-loja`** (serviço externo) | Banco de dados libSQL em produção, **compartilhado com o ERP** (cada tabela tem um único dono; ver "Tabelas por dono") | Turso, organização `personal`, região `aws-us-east-1` | Em uso pelo PDV e pelo ERP |
| **erp-backend** (sistema irmão) | API do ERP (NestJS): catálogo, grade de SKUs, preços, estoque, lotes, contagem, etiquetas, IA de estampas e painel de vendas. **Lê** as vendas do PDV; é dono do catálogo e do estoque que o PDV usa; cria o usuário técnico "PDV" (migração 0006) | `ERP-loja/backend/` — repositório `lucoti/erp-loja-backend`, projeto Vercel `erp-loja-backend` (docs: `ERP-loja/docs/v2/documentacao.md`) | v1 **no ar** desde 2026-09-29; v2 (integração) desenvolvida, **não publicada** |
| **erp-frontend** (sistema irmão) | Página web do ERP (React + Vite) para desktop e celular | `ERP-loja/frontend/` — repositório `lucoti/erp-loja-frontend`, projeto Vercel `erp-loja-frontend` | v1 **no ar** desde 2026-09-29 |
| *design_handoff_pdv_loja* | Especificação de design aprovada (não é aplicação) | `design_handoff_pdv_loja/` | Referência |

### Tabelas por dono no banco `pdv-loja`
- **PDV:** `vendedores`, `sessoes`, `categorias`, `modelos`, `pdv_tecidos`, `pdv_cores`, `pagamentos`,
  `config`, `vendas`, `itens_venda` (DDL em `backend/db/esquema.sql`). Desde a pdv-cliente-telefone
  (back docs v8, desenvolvida, não publicada): `vendas.telefone TEXT NOT NULL DEFAULT ''`, última coluna
  da tabela (no `esquema.sql` e por ALTER condicional `adicionarColunaTelefone` no `db:migrar` do PDV,
  idempotente); `vendas.cpf` continua na tabela, sem novos valores. Até o ajuste de 2026-09-29 as
  tabelas `pdv_tecidos`/`pdv_cores` se chamavam `tecidos`/`cores`; esses nomes passaram a ser do ERP.
  Desde a integração, `categorias`/`modelos`/`pdv_tecidos`/`pdv_cores` não são usadas na venda (ficam
  pelas vendas antigas) e `itens_venda` ganhou `sku_id`/`sku_codigo` (NULL nas vendas antigas).
- **ERP:** catálogo (`tipos`, `tecidos`, `tamanhos`, `cores`, `produtos`, `skus`…), estoque
  (`movimentacoes`, lotes, contagens), usuários (`usuarios`, `sessoes_usuario`…) e IA — lista completa
  em `ERP-loja/docs/contexto-geral.md`.
- Regra (ADR-017 do ERP, revisa o ADR-A01): o ERP **nunca** escreve em tabela do PDV; só lê `vendas`,
  `itens_venda`, `modelos`, `categorias` e `pdv_cores`. O PDV lê `tipos`, `produtos`, `skus`, `cores`,
  `tamanhos`, `tecidos` e `usuarios` (só o técnico, por e-mail) e **escreve só** `skus.saldo`/
  `atualizado_em` (`saldo = saldo - q`) e INSERT em `movimentacoes` (tipo `venda`), dentro do batch da
  venda. **Mudanças nas colunas de `vendas`/`itens_venda` precisam ser combinadas com o ERP** (o painel
  depende delas), e **mudanças nessas tabelas do ERP exigem revisar o PDV** (cópia em
  `backend/db/erp-esquema.sql`, usada nos testes).

### Repositórios e projetos Vercel
Front e back são **dois repositórios git separados**, cada um com seu projeto Vercel (branch de
produção `main`, Node 22.x; `engines.node` = `>=22.12 <23` nos dois `package.json`):

| Pasta local | Repositório | Projeto Vercel | Endereço previsto | Observação |
|---|---|---|---|---|
| `backend/` | `lucoti/pdv-loja-backend` | `pdv-loja-backend` | `pdv-loja-backend.vercel.app` | Função Express em `iad1`, framework "Other"; `vercel.json` com `buildCommand: npm run typecheck` e `outputDirectory: public` (vazia), para expor só a função `api/` |
| `frontend/` | `lucoti/pdv-loja-frontend` | `pdv-loja-frontend` | `pdv-loja-frontend.vercel.app` | Página estática; `vercel.json` reescreve `/api/(.*)` para `https://pdv-loja-backend.vercel.app/api/$1` |

Variáveis de ambiente do back na Vercel (Production e Preview, marcadas como sensíveis):
`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` (token com escopo só do banco `pdv-loja`) e
`NODE_ENV=production`. `PORT` não é usada na Vercel e `CORS_ORIGENS` fica vazio. Os valores nunca
vão para o repositório nem para a documentação.

A publicação segue a ordem: preview do back → produção do back → preview do front → produção do
front (ADR-I02 da pdv-integracao). Publicação **executada em 2026-09-27** (o primeiro deploy do back foi
direto para produção, por ser o primeiro do projeto). O banco está sem vendas; o próximo pedido é o #1042.

### Obsoletos (não usados)
- O **repositório único antigo** do PDV e o **projeto Vercel antigo** foram substituídos pelos dois
  repositórios/projetos acima. A remoção deles fica a critério do Lucas.

### ERP (projeto irmão)
- O **ERP Move On** (`ERP-loja/`, feature erp-move-on) foi publicado em 2026-09-29. Nele ficam o
  catálogo real (produtos, cores/estampas, grade de SKUs, preços), o estoque, as etiquetas, a contagem
  de inventário e o painel de vendas. Desde a integração, é também o catálogo de venda do PDV.
- **Mudou em relação ao plano anterior:** o ERP usa o **mesmo banco `pdv-loja`** do PDV (decisão do
  Lucas, 2026-09-28), e não o banco `move-on`. O **banco Turso `move-on`** fica sem uso; **preservar**
  até decisão do Lucas.
- **Integração PDV × catálogo do ERP (feature integracao-pdv-erp, ADR-017; ponto 11 do `docs/11`
  resolvido):** o PDV vende por SKU do ERP (preço `skus.preco_centavos`, sem vender sem saldo) e, no
  mesmo batch da venda, baixa `skus.saldo` e grava uma `movimentacao` `venda` por item, com o usuário
  técnico "PDV" (`pdv@sistema.interno`), `venda_numero` e chave `<chave>:<linha>`. O ERP continua só
  lendo `vendas`/`itens_venda`. Vendedores do PDV continuam separados dos usuários do ERP.
- **Ordem de publicação da integração:** migração `0006` do ERP (usuário técnico) → `db:migrar` do PDV
  (colunas `sku_id`/`sku_codigo`) → pdv-backend v4 e pdv-frontend v3 juntos (o contrato mudou). Sem o
  usuário técnico, toda venda falha sem gravar nada. Catálogo real e saldos precisam estar no ERP antes
  do uso na loja.
- **Implantação coordenada (ADR-A09 do ERP):** o `db:migrar` do ERP renomeia `cores`/`tecidos` do PDV
  para `pdv_cores`/`pdv_tecidos`; em seguida deve ser publicada a versão do pdv-backend que já usa os
  nomes novos (entre os dois passos o catálogo do PDV fica indisponível). O `db:migrar` do PDV faz a
  mesma renomeação se rodar antes. Rollback: renomear de volta e reverter o deploy do PDV.
- O banco `portal-aluno` e os projetos `portal-aluno-*` pertencem a outro sistema em produção, sem
  relação com o PDV. Não devem ser alterados.

### Como rodar localmente
Node 22.12+ nas duas aplicações (nesta máquina: `export PATH=/usr/local/bin:$PATH`).

| Cenário | Comandos | Endereço |
|---|---|---|
| Só o front, com API simulada | `npm run dev` em `frontend/` | http://localhost:5173 (Carlos, PIN 12345678) |
| Front + back reais | `npm run dev` em `backend/` (porta 3001) e `npm run dev:api` em `frontend/` | http://localhost:5173 (o Vite repassa `/api` para a porta 3001). Banco local novo: Carlos, PIN 12345678; banco local criado antes da v6 continua com o PIN antigo (apagar `backend/dados/pdv.db` e rodar `db:seed`, ou usar `pin:trocar`) |
| Build de produção do front | `npm run build` em `frontend/` | página estática em `frontend/dist/` |
| Trocar o PIN de um vendedor | `npm run pin:trocar -- <vendedorId>` em `backend/`, num terminal interativo com as variáveis `TURSO_*` do banco-alvo no ambiente | — (PIN de 8 números, digitado sem eco; só o hash bcrypt vai ao banco; o PIN de exemplo 12345678 é recusado) |

## Mapa de Integrações

```
 [Navegador do celular do vendedor]
   pdv-frontend (página estática React)
        │
        │  HTTPS em pdv-loja-frontend.vercel.app (CDN Vercel)
        │  /api/* reescrito pelo frontend/vercel.json (ADR-007, ADR-I01)
        │  cookie de sessão pdv_sessao (HttpOnly, gravado no domínio do front; o front não lê)
        ▼
   pdv-backend em pdv-loja-backend.vercel.app/api/* (Node.js 22 + Express, função Vercel em iad1)
        │
        │  libSQL (URL + token, variáveis sensíveis da Vercel)
        ▼
   Turso "pdv-loja" (org personal, aws-us-east-1)  ◄── compartilhado com o ERP
     │  pdv-backend: LÊ tipos / produtos / skus / cores / tamanhos / tecidos (catálogo do ERP)
     │  pdv-backend: ESCREVE skus.saldo + movimentacoes (só no batch da venda, ADR-017)
        ▲
        │  libSQL; só LEITURA de vendas / itens_venda / modelos / categorias / pdv_cores
        │  (escrita apenas nas tabelas do próprio ERP)
   erp-backend (NestJS, função Vercel iad1) ◄──/api── erp-frontend (SPA da equipe)
        ├──► Vercel Blob (fotos de tecido)
        └──► Anthropic / Claude (IA de estampas)

 Operação (máquina local → Turso "pdv-loja", fora do fluxo do vendedor):
   db:seed (carga inicial), pin:trocar (troca de PIN), SQL de limpeza da venda de teste
   ERP: db:migrar (inclui a renomeação cores/tecidos → pdv_cores/pdv_tecidos), admin:criar

 Em desenvolvimento:
   npm run dev      → pdv-frontend ──/api──► API simulada (MSW, no próprio navegador)
   npm run dev:api  → pdv-frontend ──/api──► proxy do Vite ──► pdv-backend em localhost:3001
```

A página do vendedor só fala com a API; do lado do PDV, a API é a única que acessa o banco. A integração
com o ERP é toda pelo banco compartilhado, sem chamada HTTP: o pdv-backend lê o catálogo do ERP e baixa
o estoque na venda; o ERP só lê as tabelas de venda do PDV. O contrato
`backend/contrato/openapi.yaml` é a fonte única do formato das mensagens: o front gera os tipos a
partir dele (`npm run gerar:tipos`, arquivo `frontend/src/api/tipos.gerados.ts`) e não há código
compartilhado entre as aplicações (ADR-001/ADR-002 do back, ADR-F03 do front). A regra de desconto
existe nos dois lados, de propósito: o front só a usa para exibir totais; o valor oficial é o do
back (ADR-F05). O preço unitário é o do SKU no ERP, lido pelo back.

A impressão do cupom não faz parte da v1 do front (a loja ainda não tem impressora). A rota de
cupom do back existe, mas ainda não é consumida.

## Detalhamento das Conexões

### pdv-frontend → pdv-backend
- **De:** pdv-frontend (página no navegador do celular)
- **Para:** pdv-backend
- **Como:** HTTP/JSON sob o prefixo `/api`, sempre na mesma origem da página
  (`credentials: 'same-origin'`). Em produção, o `frontend/vercel.json` reescreve `/api/(.*)` para
  `https://pdv-loja-backend.vercel.app/api/$1` (rewrite externo entre os dois projetos Vercel;
  ADR-007 do back, ADR-I01 da pdv-integracao). Para o navegador, página e API têm a mesma origem, por
  isso o cookie de sessão funciona sem liberação entre domínios. Os previews do front também apontam
  para o back de produção. A sessão viaja num cookie protegido (`pdv_sessao`, restrito a `/api`) e expira à
  meia-noite de São Paulo; qualquer 401 `sessao_invalida` leva o front de volta ao login. Em
  desenvolvimento, `npm run dev:api` usa o proxy do Vite (sem CORS); se o front rodar em outra
  origem, a API libera acesso pela variável `CORS_ORIGENS`.
- **O quê (usado pelo front):** `GET /config` e `GET /vendedores` (tela de entrada, sem sessão);
  `POST /auth/login` e `GET /auth/sessao`; `GET /catalogo` (desde a v3: `tipos`, `produtos` com `skus`
  — cor, tamanho, `precoCentavos`, `saldo` — e `pagamentos`; recarregado em silêncio após cada venda e
  após 409/400 `item_invalido`); `POST /vendas` (itens `{skuId, qtd, descPercent}`, sem preços, com chave
  de idempotência UUID gerada no aparelho e repetida nos reenvios; 409 `sem_estoque` nomeia as peças);
  `GET /vendas/hoje`. Não usados na
  v1: `POST /auth/logout` (não há botão "Sair") e `GET /vendas/{n}/cupom` (sem impressão).
  Formato e erros definidos em `backend/contrato/openapi.yaml`.
- **Autenticação (to-be da feature pdv-login-8-digitos, 2026-10-01; desenvolvida, não publicada):**
  não há serviço de autenticação central; o próprio pdv-backend autentica. A tela escolhe o vendedor
  (etapa omitida com um só) e coleta o PIN de **8 números** num teclado próprio. **Não há mais o botão
  "Entrar no PDV":** o 8º número dispara `POST /auth/login` com `{ vendedorId, pin }` (PIN como texto).
  Enquanto valida, o teclado e "Trocar vendedor" ficam travados, o que garante um único pedido por
  tentativa. O back valida o formato (`^\d{8}$`, objeto estrito → 400 `entrada_invalida`), compara com
  `vendedores.pin_hash` (bcrypt) e responde 200 `{ vendedor, expiraEm }` com o cookie `pdv_sessao`, ou
  401 `senha_incorreta` idêntico para PIN errado, vendedor inexistente e inativo. No banco fica só o
  SHA-256 do token (`sessoes`). Na tela, **qualquer erro** (401, falha de rede ou outro) limpa o PIN e
  mostra a mensagem. Não há limite de tentativas. Formato do corpo, respostas, cookie e banco não
  mudaram em relação ao as-is (docs v5 do back e v4 do front); só o tamanho do PIN e o disparo.
- **Tamanho do PIN:** uma constante por repositório — `TAMANHO_PIN` em `backend/src/esquemas.ts` (usada
  pelo login e pelo `pin:trocar`) e em `frontend/src/telas/Login/Login.tsx` — mais o `pattern` de
  `backend/contrato/openapi.yaml` e a regra da API simulada (`frontend/src/simulado/handlers.ts`). Os
  testes de contrato dos dois lados acusam divergência.
- **Implantação do PIN de 8 números (pendente):** big bang coordenado, com a loja fechada — back v6 →
  `pin:trocar` de cada vendedor no banco de produção → front v5. Os PINs de 4 números deixam de
  funcionar (os hashes não são convertíveis). Entre publicar o back e o front, nenhum login novo
  funciona (sessões abertas seguem até a meia-noite ou até a troca do PIN do vendedor). Rollback:
  redeploy das versões anteriores dos dois projetos e recadastro de PINs de 4 números com o script
  antigo. Não há migração de banco.

- **Cliente na venda (as-is, docs v8 do front; é o que está no ar):** o `POST /vendas` leva `cliente` (nome, até 120
  caracteres) e `cpf` (texto livre até 20 caracteres, `''` quando vazio), ambos digitados na aba Pedido e
  enviados com as pontas cortadas. O front não valida o CPF; o back confere os dígitos e responde 400
  `cpf_invalido` (a API simulada repete a regra). O esquema do back é objeto estrito: campo desconhecido
  volta 400 `entrada_invalida`.
- **Cliente na venda no back to-be (pdv-cliente-telefone, docs v8 do back, 2026-10-06; desenvolvido,
  não publicado):** o `POST /vendas` aceita `telefone` (opcional, até 20 caracteres no esquema; só
  dígitos, espaços, parênteses e hífen, e **exatamente 11 dígitos** depois de limpar, regra em
  `backend/src/dominio/telefone.ts`; senão 400 `telefone_invalido` "Celular inválido"), gravado só com
  os dígitos em `vendas.telefone`. Ordem das recusas: `sem_itens` → `sem_pagamento` →
  `telefone_invalido` → `item_invalido`/`item_repetido` → `sem_estoque`. `cpf_invalido` deixou de
  existir; corpo com `cpf` → 400 `entrada_invalida` "Campo não permitido: cpf.", inclusive no reenvio de
  venda já gravada. A `Venda` devolvida traz `telefone` (dígitos ou vazio) no lugar de `cpf`; o cupom
  traz `dados.telefoneCliente` (formatado, ou vazio) e a linha "Tel: (31) 98765-4321" com o telefone
  completo, visível a qualquer vendedor logado. `GET /vendas/hoje` não expõe o telefone. Contrato
  `openapi.yaml` atualizado. O front que acompanha essa mudança é o da pdv-mobile-refatorado (próximo
  item); o back novo não pode ir ao ar sozinho: dependência de deploy coordenado, sem janela de
  compatibilidade.
- **Cliente na venda no front to-be (pdv-mobile-refatorado, docs v9 do front, 2026-10-06; desenvolvido,
  não publicado):** nome e celular são coletados na etapa **Cliente**, no começo da venda (os dois
  opcionais; "Venda sem cliente" envia os dois vazios), e podem ser alterados pelo cartão 1 do Pedido. O
  nome vai com as pontas cortadas (campo limitado a 120 caracteres, igual ao back). O celular é digitado
  com máscara "(31) 98765-4321", validado na tela com **exatamente 11 dígitos** (`celularValido` em
  `frontend/src/dominio/formatos.ts`, mesma regra de `backend/src/dominio/telefone.ts`; com o celular
  incompleto o botão de seguir fica desabilitado) e enviado **só com os dígitos** no campo `telefone`
  (`''` sem celular). **O corpo não leva mais `cpf`.** Os itens vão com `descPercent` 0 (o desconto por
  peça saiu da tela) e o desconto no pedido continua em `descontoTotalCentavos`, múltiplo de R$ 5, com o
  "+" limitado ao bruto. Tipos regerados (`npm run gerar:tipos`) do `openapi.yaml` do commit `2e78243` do
  back. O 400 `telefone_invalido` é tratado como os demais erros de negócio (mensagem na tela, pedido
  intacto, sem recarregar o catálogo). Rotas e demais campos não mudam; o aviso de venda e a aba Dia
  mostram só o nome do cliente.
- **Mudanças planejadas (2026-10-05):** a feature **pdv-cliente-telefone** (back, refatoração; docs v7
  do back = as-is, docs v8 = to-be, desenvolvido) troca `cpf` por `telefone` no corpo do `POST /vendas`, na venda devolvida, no
  cupom e no contrato `openapi.yaml`. Decisões do Lucas: `telefone` opcional, aceita máscara e grava só
  os dígitos, **exatamente 11 dígitos** (senão 400 `telefone_invalido`; `cpf_invalido` deixa de
  existir); cupom com o telefone completo ("Tel: (31) 98765-4321"); **sem janela de compatibilidade** —
  como o esquema é objeto estrito, corpo com `cpf` volta 400 `entrada_invalida`, inclusive o reenvio de
  venda já gravada (o parse vem antes da idempotência). Banco: **coluna nova `vendas.telefone`**; `cpf`
  fica no banco com as vendas antigas. Mudança de coluna em `vendas` precisa ser combinada com o ERP:
  o ERP **não lê** `cpf` (busca em `ERP-loja/backend/src` e `frontend/src`, 2026-10-05) e a coluna nova
  não muda nada do que ele lê; único ponto sensível é o `semear-dev.ts` do ERP (só desenvolvimento), que
  faz `INSERT INTO vendas VALUES (...)` posicional sobre a cópia `db/pdv-esquema-teste.sql`. A feature
  **pdv-mobile-refatorado** (front) passa a coletar nome e celular numa etapa "Cliente" no início da
  venda e envia só o desconto no total (`descPercent` sempre 0); rotas e demais campos não mudam.
  Situação em 2026-10-06: as duas features estão **desenvolvidas** (back com testes aprovados; front com a
  etapa 6 concluída e os tipos já regerados), **nada publicado**.
- **Implantação coordenada pdv-cliente-telefone + pdv-mobile-refatorado (pendente, sem janela de
  compatibilidade):** front novo com back antigo recusa toda venda (`telefone` é campo desconhecido no
  back antigo, objeto estrito); back novo com front antigo também recusa toda venda que leve `cpf`
  (decisão do Lucas). Ordem obrigatória, em horário sem venda:

  | Passo | O quê | Quem | Depende de |
  |---|---|---|---|
  | A | `db:migrar` do PDV no Turso `pdv-loja` (coluna `vendas.telefone`, ALTER idempotente) | técnico | nenhum (pode rodar antes, em paralelo a qualquer outro trabalho; o back antigo ignora a coluna) |
  | B | Deploy de produção do pdv-backend com a pdv-cliente-telefone | técnico | A |
  | C | Deploy de produção do pdv-frontend com a pdv-mobile-refatorado (docs v9; tipos já regerados) | técnico | B (logo em seguida: entre B e C nenhuma venda fecha) |
  | D | **Passo manual do Lucas:** recarregar o PDV em cada celular da loja | Lucas | C (a página antiga aberta continua mandando `cpf` até ser recarregada) |

  Nada roda em paralelo a B, C e D. Rollback: reverter os deploys do back e do front juntos; a coluna
  `vendas.telefone` pode ficar no banco (aditiva, o ERP não a lê). O checklist detalhado fica na Fase 6
  das duas features.

### pdv-frontend → API simulada (somente desenvolvimento e testes)
- **De:** pdv-frontend
- **Para:** handlers MSW em `frontend/src/simulado/handlers.ts`
- **Como:** no `npm run dev`, um service worker intercepta `/api` no navegador; nos testes, o
  `msw/node` faz o mesmo. O build de produção não inclui nada do MSW.
- **O quê:** as mesmas rotas, formatos, regras e códigos de erro do pdv-backend, em memória
  (recarregar a página zera sessão e vendas). Desde a pdv-mobile-refatorado (front docs v9): `telefone`
  com a mesma regra do back (máscara + 11 dígitos, gravado só com dígitos), `telefone_invalido` na mesma
  ordem das recusas e corpo com `cpf` → 400 `entrada_invalida` antes da idempotência; a regra é copiada
  (não importada) de `backend/src/dominio/telefone.ts`. Deve ser mantida alinhada ao contrato; a validação
  das respostas contra os schemas do `openapi.yaml` está prevista nos testes (ADR-F04, Fase 5).

### pdv-backend → Turso
- **De:** pdv-backend
- **Para:** banco Turso (libSQL)
- **Como:** cliente `@libsql/client`, configurado por `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN`. Em
  produção, banco `pdv-loja` (organização `personal`, `aws-us-east-1`), na mesma região da função
  (`iad1`) para que cada requisição cruze o continente uma só vez (ADR-I03). Em desenvolvimento usa
  um arquivo local (`file:./dados/pdv.db`); nos testes, banco em memória. O banco novo recebe
  esquema e dados de exemplo por `npm run db:seed`.
- **O quê:** vendedores, sessões, pagamentos, dados da loja, vendas e itens vendidos. O `db:migrar` do
  PDV renomeia `tecidos`/`cores` antigas (formato do PDV) e acrescenta `itens_venda.sku_id`/`sku_codigo`
  e, desde a pdv-cliente-telefone (back v8), `vendas.telefone` em bancos existentes. Em dev/testes, o `db:seed` cria um catálogo de exemplo no formato do ERP
  (`db/erp-esquema.sql`) só se a tabela `skus` não existir.

### pdv-backend → tabelas do ERP (catálogo e estoque)
- **De:** pdv-backend
- **Para:** tabelas do ERP no banco compartilhado `pdv-loja`
- **Como:** a mesma conexão `@libsql/client` do PDV (nenhuma credencial do ERP). Catálogo num batch de
  leitura; venda num único batch de escrita: INSERT em `vendas`/`itens_venda`, `UPDATE skus SET saldo =
  saldo - ?` e INSERT em `movimentacoes` (usuário técnico localizado por e-mail no próprio batch). O
  `CHECK (saldo >= 0)` do ERP desfaz tudo quando falta saldo (resposta 409, inclusive em corrida entre
  dois caixas); a falta do usuário técnico (NOT NULL) também desfaz tudo.
- **O quê:** leitura de `tipos`, `produtos`, `skus`, `cores`, `tamanhos`, `tecidos`; escrita só de
  `skus.saldo`/`atualizado_em` e de `movimentacoes` tipo `venda`. O ERP mostra essas movimentações no
  histórico do SKU como "Venda · pedido #N".

### erp-backend → Turso `pdv-loja` (leitura das vendas do PDV)
- **De:** erp-backend (ERP Move On, painel da tela Início)
- **Para:** tabelas do PDV no banco compartilhado `pdv-loja`
- **Como:** `@libsql/client` com as credenciais do projeto `erp-loja-backend`; só consultas de leitura.
  Não há chamada HTTP entre ERP e PDV.
- **O quê:** `vendas` (pedidos, `total_centavos`, `pecas`, `data_local`), `itens_venda` (modelo,
  tecido, cor, tamanho, quantidade e, nas vendas novas, `sku_id`), peças por tipo (tipo do ERP via
  `sku_id` nas vendas novas; `modelos`/`categorias` nas antigas) e `pdv_cores` (cor dos "mais vendidos").
  Não lê `vendas.cpf` nem `cliente`; a coluna nova `vendas.telefone` (back v8) também não entra no painel.
  O ERP escreve só nas tabelas dele. Detalhes em `ERP-loja/docs/contexto-geral.md`.

### Máquina local → Turso (operação)
- **De:** terminal do operador, na pasta `backend/`
- **Para:** banco Turso `pdv-loja`
- **Como:** mesmos `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`, apenas como variáveis de shell durante o
  comando (o `.env` local continua apontando para o arquivo local).
- **O quê:** carga inicial (`db:seed`), troca de PIN (`pin:trocar`, PIN de 8 números: `UPDATE vendedores.pin_hash` e
  `DELETE` das sessões do vendedor, numa transação) e limpeza da venda de teste da verificação.

### Impressora térmica (fora da v1)
- A conexão pdv-frontend → impressora térmica (80 mm ou 58 mm) com o texto do cupom devolvido pela
  API fica para uma feature futura, quando a loja tiver impressora.
