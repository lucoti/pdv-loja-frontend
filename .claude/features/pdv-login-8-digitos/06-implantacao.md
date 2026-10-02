# 06 — Implantação: PDV Loja — Login com senha de 8 números e entrada automática

> **Situação: CONCLUÍDA em 2026-10-01 (passos 3 e 5 confirmados pelo Lucas).**

## Pré-requisitos
- [x] `05-testes.md` com "Pronto para implantação: sim".
- [x] Back e front iguais ao `origin/main` antes do commit (o deploy leva só esta feature; a integração com o ERP já está publicada).
- [x] Loja fechada ou sem ninguém precisando entrar no PDV durante uns 10 minutos.
- [x] Token do Turso de 1 dia para o banco `pdv-loja`, usado só no `pin:trocar`.
- [x] Nova senha de 8 números do Carlos definida pelo Lucas (não pode ser `12345678`).

## Configuração e variáveis de ambiente
Nenhuma variável nova ou alterada na Vercel.

| Variável / config | Ambiente | Nova / alterada |
|---|---|---|
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | terminal do Lucas, só para o `pin:trocar` (token de 1 dia) | temporárias |

## Migrações de dados
Não há migração de esquema. A única alteração de dados é o `pin_hash` de cada vendedor ativo (hoje só `carlos`), feita pelo Lucas com `npm run pin:trocar` — o script também encerra as sessões abertas do vendedor.

## Checklist de deploy (em ordem)
1. [x] Commit no back (`2b0a0e8`) e no front (`f0e3ca6`). — Claude
2. [x] Push do back (`4e951fb..2b0a0e8`, 2026-10-01 22:34) (`lucoti/pdv-loja-backend`, `main`) → deploy de produção na Vercel. Conferir: `/api/vendedores` 200; login com 4 números → 400 "Digite a senha de 8 números.". — Claude
3. [x] `npm run pin:trocar -- carlos` no terminal do Lucas, apontando para o banco de produção. A senha é digitada só pelo Lucas. — Lucas (confirmado pelo Lucas em 2026-10-01 22:49)
4. [x] Push do front (`c559434..f0e3ca6`, 2026-10-01 22:36; **desvio:** feito antes do passo 3, ver abaixo) (`lucoti/pdv-loja-frontend`, `main`) → deploy de produção na Vercel. Conferir a tela: 8 marcadores, sem botão. — Claude
5. [x] Teste no celular: senha errada limpa e avisa; senha certa entra no 8º número. — Lucas (confirmado pelo Lucas em 2026-10-01 22:49)

**Desvio registrado:** o push do front foi feito logo depois de verificar o back, sem esperar o passo 3. Motivo: o passo 3 depende do Lucas e, enquanto isso, deixar o front antigo (4 números) no ar com o back novo só prolongava a inconsistência; com ou sem o front novo, ninguém entra até a senha ser recadastrada.

**Janela sem login:** entre os passos 2 e 4 ninguém faz login novo (front antigo envia 4 números, back novo exige 8). Sessões abertas do vendedor caem no passo 3.

## Verificação pós-deploy
- [x] Back (`pdv-loja-backend.vercel.app`): `/api/config` e `/api/vendedores` 200; login com 4 números → 400 `entrada_invalida` "Digite a senha de 8 números."; login com 8 números errados → 401 `senha_incorreta`.
- [x] Front (`pdv-loja-frontend.vercel.app`): `/` 200 com o pacote novo (sem "Entrar no PDV", instrução com o tamanho da senha); `/api` pelo rewrite respondendo com a regra de 8 números; `/mockServiceWorker.js` 404.
- [x] Celular (Lucas): login com a senha nova, sessão mantida ao recarregar. (confirmado pelo Lucas em 2026-10-01 22:49)

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
