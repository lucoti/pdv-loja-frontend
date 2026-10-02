# 06 — Implantação: PDV Loja — Login com senha de 8 números e entrada automática

> **Situação: EM EXECUÇÃO (iniciada em 2026-10-01).**

## Pré-requisitos
- [x] `05-testes.md` com "Pronto para implantação: sim".
- [x] Back e front iguais ao `origin/main` antes do commit (o deploy leva só esta feature; a integração com o ERP já está publicada).
- [ ] Loja fechada ou sem ninguém precisando entrar no PDV durante uns 10 minutos.
- [ ] Token do Turso de 1 dia para o banco `pdv-loja`, usado só no `pin:trocar`.
- [ ] Nova senha de 8 números do Carlos definida pelo Lucas (não pode ser `12345678`).

## Configuração e variáveis de ambiente
Nenhuma variável nova ou alterada na Vercel.

| Variável / config | Ambiente | Nova / alterada |
|---|---|---|
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | terminal do Lucas, só para o `pin:trocar` (token de 1 dia) | temporárias |

## Migrações de dados
Não há migração de esquema. A única alteração de dados é o `pin_hash` de cada vendedor ativo (hoje só `carlos`), feita pelo Lucas com `npm run pin:trocar` — o script também encerra as sessões abertas do vendedor.

## Checklist de deploy (em ordem)
1. [ ] Commit no back e no front (código, testes, docs e artefatos da feature). — Claude
2. [ ] Push do back (`lucoti/pdv-loja-backend`, `main`) → deploy de produção na Vercel. Conferir: `/api/vendedores` 200; login com 4 números → 400 "Digite a senha de 8 números.". — Claude
3. [ ] `npm run pin:trocar -- carlos` no terminal do Lucas, apontando para o banco de produção. A senha é digitada só pelo Lucas. — Lucas
4. [ ] Push do front (`lucoti/pdv-loja-frontend`, `main`) → deploy de produção na Vercel. Conferir a tela: 8 marcadores, sem botão. — Claude
5. [ ] Teste no celular: senha errada limpa e avisa; senha certa entra no 8º número. — Lucas

**Janela sem login:** entre os passos 2 e 4 ninguém faz login novo (front antigo envia 4 números, back novo exige 8). Sessões abertas do vendedor caem no passo 3.

## Verificação pós-deploy
- [ ] Back: `/api/config` e `/api/vendedores` 200; login com 4 números → 400 `entrada_invalida`; login com 8 números errados → 401 `senha_incorreta`.
- [ ] Front: `/` 200 com a tela nova; `/api` pelo rewrite respondendo.
- [ ] Celular (Lucas): login com a senha nova, sessão mantida ao recarregar.

## Plano de rollback
- **Gatilhos para acionar o rollback:** login com a senha certa falhando; respostas 500; tela de login sem responder.
- **Passos (em ordem):**
  1. Instant Rollback da Vercel no projeto afetado (`pdv-loja-frontend` e/ou `pdv-loja-backend`). Front e back precisam ficar na mesma versão (os dois novos ou os dois antigos).
  2. Se o back voltar à versão anterior: recadastrar a senha de 4 números com o `pin:trocar` da versão anterior (checkout do commit `4e951fb` no back).
  3. Registrar um incidente (Fase 7).
- **Reversão de dados:** só o `pin_hash` do vendedor (passo 2 do rollback).

## Comunicação
O Lucas passa a senha nova ao vendedor pessoalmente, nunca por mensagem.

## Responsáveis
| Nome | Papel no deploy |
|---|---|
| Lucas | Aprovação, token do Turso, troca da senha, teste no celular |
| Claude (Claude Code) | Commits, pushes, verificação por HTTP |

## Aprovação
- Aprovado por: Lucas ("pode fazer os passos 1, 2 e 4. aprovado")
- Data/hora: 2026-10-01 22:32
