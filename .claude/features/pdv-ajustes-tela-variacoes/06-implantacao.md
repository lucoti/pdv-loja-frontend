# 06 — Implantação: PDV Loja — Ajustes da tela de cor/tamanho e do topo do PDV

> **Situação: EM EXECUÇÃO (iniciada em 2026-10-01).**

## Pré-requisitos
- [x] `05-testes.md` com "Pronto para implantação: sim"
- [x] Front local igual ao `origin/main` antes do commit (`f0e3ca6`); o deploy leva só esta feature.
- [x] Sem janela de manutenção: não há back, banco nem variável de ambiente envolvidos.

## Configuração e variáveis de ambiente
Nenhuma variável nova ou alterada.

| Variável / config | Ambiente | Nova / alterada |
|---|---|---|
| — | — | — |

## Migrações de dados
Não se aplica.

## Checklist de deploy (em ordem)
Ordem aprovada pelo Lucas: 1 → 2 → 3 (Claude) e depois 4 (Lucas). Qualquer mudança de ordem é perguntada antes (AP-002).

1. [ ] Commit no repositório do front (código, testes, `docs/v6`, `docs/v7`, contexto geral, artefatos da feature e o fechamento da pdv-login-8-digitos). — Claude. **Depende de:** nenhum.
2. [ ] Push na `main` de `lucoti/pdv-loja-frontend` → deploy de produção na Vercel. — Claude. **Depende de:** 1.
3. [ ] Conferir por HTTP que o front novo está no ar e que a API continua respondendo pelo `/api`. — Claude. **Depende de:** 2.
4. [ ] **Passo manual do Lucas** — teste no celular: tela de cor/tamanho com 3 colunas sem passar da borda, "estoque N" e topo com a etapa. **Depende de:** 3. Nada roda em paralelo a ele.

## Verificação pós-deploy
- [ ] Front (`pdv-loja-frontend.vercel.app`): `/` 200 com o pacote novo (contém "Cor e tamanho" e "estoque "; não contém "pedido novo").
- [ ] `/api/config` e `/api/vendedores` 200 pelo rewrite do front.
- [ ] Celular (Lucas): passo 4.

## Plano de rollback
- **Gatilhos para acionar o rollback:** tela de venda não abre; grade de tamanhos quebrada no celular; login falhando.
- **Passos (em ordem):**
  1. Instant Rollback da Vercel no projeto `pdv-loja-frontend`.
  2. `git revert` do commit desta feature no front e push.
  3. Registrar um incidente (Fase 7).
- **Reversão de dados:** não se aplica.

## Comunicação
O Lucas avisa o vendedor de que o topo passa a mostrar a etapa e de que o estoque aparece como "estoque N".

## Responsáveis
| Nome | Papel no deploy |
|---|---|
| Lucas | Aprovação e teste no celular |
| Claude (Claude Code) | Commit, push e verificação por HTTP |

## Aprovação
- Aprovado por: Lucas ("sim, aprovo" — passos 1, 2 e 3 nessa ordem)
- Data/hora: 2026-10-01 23:45
