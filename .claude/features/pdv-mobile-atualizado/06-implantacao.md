# 06 — Implantação: PDV Loja — Front-end mobile atualizado (abas no topo, peça → tecido → cor → tamanho)

## Pré-requisitos
- [x] `05-testes.md` com "Pronto para implantação: sim" (300 testes verdes, aprovado em 2026-10-12 15:59)
- [x] Back com o contrato do `POST /vendas` com `telefone` já em produção (pdv-cliente-telefone) — o corpo enviado não muda nesta feature
- [x] Autorização do Lucas para push direto na `main` (2026-10-12)

## Configuração e variáveis de ambiente
Nenhuma variável nova ou alterada. A Vercel (projeto ligado ao repositório `lucoti/pdv-loja-frontend`, framework Vite, Node 22.x) publica a `main`; `vercel.json` (proxy `/api` para o back) não muda.

| Variável / config | Ambiente | Nova / alterada |
|---|---|---|
| — | — | — |

## Migrações de dados
Não se aplica (só front; o pedido fica em memória, nada no navegador).

## Checklist de deploy (em ordem)
Antes do push, produção está no commit `e62821c` (último da pdv-mobile-refatorado).

1. [ ] Push dos commits da feature (`d052d97` … `119e542` e o commit deste artefato) para `origin/main` — Claude. **Depende de:** nenhum.
2. [ ] Build e deploy automáticos da Vercel a partir da `main`; acompanhar até "Ready" — Claude. **Depende de:** 1.
3. [ ] Conferir que a URL de produção serve o build novo (página carrega, sem erro no console) sem fazer login — Claude. **Depende de:** 2.
4. [ ] **Manual (Lucas):** em cada celular da loja, recarregar o PDV (fechar e abrir a aba/atalho) para pegar o build novo. **Depende de:** 2. Pode rodar em paralelo ao passo 3.
5. [ ] **Manual (Lucas):** num celular, entrar e conferir as telas: abas no topo, Peça → Tecido → Cor → Tamanho, "Adicionar" volta para Peça, Pedido com linha do cliente/lixeira/desconto/pagamento, "Cliente do pedido", Dia. Sem fechar venda de teste (fecharia venda real e baixaria estoque no ERP). **Depende de:** 4.
6. [ ] **Manual (Lucas):** a primeira venda real depois do deploy confirma o fechamento e o aviso com "Nova venda"; conferir a venda na aba Dia. **Depende de:** 5.

## Verificação pós-deploy
- [ ] Deploy da Vercel em "Ready" no commit novo (passo 2).
- [ ] Página de produção carrega o login sem erro (passo 3).
- [ ] Telas conferidas no celular (passo 5) e primeira venda real registrada e listada no Dia (passo 6).

## Plano de rollback
- **Gatilhos para acionar o rollback:** build falhar na Vercel; tela em branco ou erro ao abrir o PDV; venda não fecha (erro diferente dos de estoque/sessão) ou corpo recusado pelo back.
- **Passos (em ordem):**
  1. Na Vercel, promover de novo o deploy de produção anterior (commit `e62821c`) — "Instant Rollback". Depende de: nenhum.
  2. Recarregar o PDV nos celulares. Depende de: 1.
  3. Depois, no repositório, `git revert` dos commits da feature (ou manter a `main` e corrigir para frente), combinando com o Lucas antes.
- **Reversão de dados:** não se aplica (nenhum dado muda; o contrato com o back é o mesmo).

## Comunicação
Lucas avisa a equipe da loja que a tela do PDV mudou (abas no topo, venda começa em Produtos, cliente pelo "Alterar" do Pedido) e pede para recarregar o app.

## Responsáveis
| Nome | Papel no deploy |
|---|---|
| Claude (Claude Code) | Passos 1 a 3; rollback na Vercel se pedido |
| Lucas | Autoriza; passos 4 a 6; comunicação com a loja |

## Aprovação
- Aprovado por: Lucas ("pode fazer push direto na main", 2026-10-12)
- Data/hora: 2026-10-12
