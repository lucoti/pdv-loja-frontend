# 02 — Requisitos: PDV Loja — Integração (front + back + deploy)

Fontes:
- `01-planejamento.md` desta feature;
- os checklists `pdv-backend/06-implantacao.md` e `pdv-frontend/06-implantacao.md`;
- o débito registrado em `pdv-frontend/05-testes.md`;
- as decisões do Lucas em 2026-09-27.

**Ajuste aprovado nesta fase (2026-09-27):** o Turso não oferece mais a região São Paulo (`gru`); as regiões disponíveis agora são só as da AWS. Decisões:
- o banco fica em `aws-us-east-1` (Virgínia);
- a função do back volta para `iad1`, ao lado do banco. Assim, cada requisição cruza o continente uma vez só, e não uma vez por consulta;
- o banco é criado na organização Turso `personal`, isolado dos bancos da integração Vercel (`move-on`, `portal-aluno`, `dpl-…`).

Isto substitui "gru/gru1" do 01.

## Requisitos funcionais

### RF-I01 — Banco novo
**Critérios de aceite:**
- [ ] O banco `pdv-loja` existe na organização `personal`, em `aws-us-east-1`.
- [ ] O banco tem o esquema do `backend/db/esquema.sql` e os dados de exemplo (`db:seed`).
- [ ] Existe um token de acesso de uso exclusivo do back.
- [ ] Nenhum valor secreto (URL com token, token) aparece no repositório, nos artefatos ou no chat.
- [ ] Os bancos da organização da integração Vercel não são alterados.

### RF-I02 — PIN real
**Critérios de aceite:**
- [ ] O Lucas escolhe o PIN e gera o hash bcrypt no terminal dele.
- [ ] O Claude aplica o `UPDATE` com o hash, sem conhecer o PIN.
- [ ] Depois da troca, o login com 1234 recebe 401 e o login com o PIN novo recebe 200.

### RF-I03 — Back publicado
**Critérios de aceite:**
- [ ] O `pdv-loja-backend` responde da região `iad1`, ligado ao banco novo.
- [ ] As variáveis `TURSO_*` foram substituídas, `PORT` foi removida e `NODE_ENV=production` está definida.
- [ ] `GET /api/config` responde 200 com FitMoveOn / Unidade Centro.
- [ ] `GET /api/vendedores` responde 200 sem PIN nem hash.
- [ ] O login devolve o cookie `pdv_sessao` com `Secure; HttpOnly; SameSite=Lax` e `Expires` na meia-noite local.
- [ ] Se a compilação dos imports `.js` → `.ts` falhar na função, um passo de build é acrescentado e registrado no 04.

### RF-I04 — Front no mesmo domínio
**Critérios de aceite:**
- [ ] O `vercel.json` do front reescreve `/api/(.*)` para `<URL do back>/api/$1`.
- [ ] `https://pdv-loja-frontend.vercel.app/api/config` devolve a resposta do back.
- [ ] `CORS_ORIGENS` continua vazio (ADR-007).

### RF-I05 — Sessão pelo rewrite
**Critérios de aceite:**
- [ ] O cookie definido pelo back chega ao navegador no domínio do front e é reenviado nas chamadas seguintes.
- [ ] Recarregar a página mantém o vendedor logado até a meia-noite.

### RF-I06 — Correção do App.tsx (débito do pdv-frontend/05)
**Critérios de aceite:**
- [ ] Uma resposta 200 fora do contrato na verificação de sessão mostra "Tentar de novo" e não deixa a tela presa em "Carregando…".
- [ ] Existe um teste que cobre esse caso.
- [ ] A suíte do front continua verde e dentro da meta de cobertura.

### RF-I07 — Venda real ponta a ponta
**Critérios de aceite:**
- [ ] O fluxo login → venda → modal → aba Dia funciona no Chrome (Android) e no Safari (iPhone), em aparelhos reais.
- [ ] Os valores da tela são iguais aos do servidor.
- [ ] A venda de teste é apagada por SQL, para que a primeira venda real seja a #1042.

### RF-I08 — Fechamento
**Critérios de aceite:**
- [ ] pdv-backend e pdv-frontend estão com `Status: implantada`.
- [ ] Cada uma tem o seu `08-metricas.md`.

## Requisitos não funcionais

| ID | Categoria | Requisito | Critério mensurável |
|---|---|---|---|
| RNF-I01 | segurança | Segredos fora do código | `TURSO_AUTH_TOKEN` e a URL do banco ficam só nas variáveis da Vercel (Production e Preview, sensíveis); `git grep` não encontra token |
| RNF-I02 | segurança | Token com escopo mínimo | O token é criado para o banco `pdv-loja`, não para a organização |
| RNF-I03 | desempenho | Banco e função na mesma região | Banco em `aws-us-east-1` e função em `iad1` |
| RNF-I04 | segurança | Nada do simulado em produção | `/mockServiceWorker.js` responde 404 no site publicado |
| RNF-I05 | qualidade | Suítes verdes | Back com 327 testes e front com a suíte completa passando, com cobertura na meta, depois das mudanças |
| RNF-I06 | privacidade | PIN nunca exposto | O PIN real não aparece no chat, em arquivo, em log nem em artefato; só o hash vai ao banco |

## Regras de negócio
Não há regras novas. Continuam valendo as regras do pdv-backend (RN-001 a RN-009) e do pdv-frontend.

## Aprovação
- Aprovado por: Lucas ("pode aprovar, siga"), incluindo o ajuste de região e de organização
- Data/hora: 2026-09-27 14:13
