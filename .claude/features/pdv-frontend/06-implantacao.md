# 06 — Implantação: PDV Loja — Front-end (React)

> **Situação: EXECUTADA em 2026-09-27 pela feature pdv-integracao.** Ver `pdv-integracao/06-implantacao.md`
> (log de execução, verificação e desvios: banco em aws-us-east-1 / função em iad1 em vez de gru;
> catálogo de exemplo mantido até a feature do catálogo real).

## Pré-requisitos
- [x] `05-testes.md` com "Pronto para implantação: sim".
- [ ] **Back-end publicado primeiro**, pelo checklist de `.claude/features/pdv-backend/06-implantacao.md`. Isso inclui:
  - catálogo real carregado;
  - PIN trocado.
- [ ] Código no GitHub (`lucoti/PDV-loja`), com commit e push feitos pelo Lucas.
- [ ] Conta Vercel. Já existe login do CLI salvo na máquina; usar `npx vercel`.
- [ ] Node 22.12+ na máquina que roda os comandos (`export PATH=/usr/local/bin:$PATH`).

## Configuração e variáveis de ambiente
Somente nomes. Os valores nunca são registrados aqui.

| Variável / config | Ambiente | Nova / alterada |
|---|---|---|
| Projeto Vercel do front: Root Directory `frontend`, Node.js 22.x, Build `npm run build`, Output `dist` | Vercel | nova |
| `frontend/vercel.json` com rewrite de `/api/(.*)` para o projeto do back (ADR-007) | repositório | nova, criada na pdv-integracao, quando a URL do back for conhecida |
| Nenhuma variável de ambiente | — | O front é estático, e o MSW não entra no build |

O rewrite serve para que, do ponto de vista do navegador, a página e a API fiquem no mesmo domínio:
- o cookie `pdv_sessao` (HttpOnly, Secure, SameSite=Lax, path `/api`) funciona sem CORS;
- `CORS_ORIGENS` do back continua vazia.

## Migrações de dados
Não se aplica: o front não tem banco nem armazenamento no navegador.

## Checklist de deploy (em ordem)
1. [ ] Confirmar que o back está publicado e anotar a URL dele.
2. [ ] Criar `frontend/vercel.json` com o rewrite `/api/(.*)` → `<URL do back>/api/$1`.
3. [ ] Verificação local contra o back real (`npm run dev` em `backend/` e `npm run dev:api` em `frontend/`):
   - login;
   - venda;
   - aba Dia;
   - 401 depois do logout pelo back.
4. [ ] Em `frontend/`, rodar `npx tsc --noEmit` e `npm run test:coverage`. Precisam ficar verdes.
5. [ ] Criar o projeto na Vercel a partir do repositório com a configuração acima.
6. [ ] Fazer o deploy de **preview** e rodar a verificação pós-deploy nele.
7. [ ] Promover para produção.
8. [ ] Tratar o débito do `App.tsx` registrado no 05 (`.then(ok).catch(erro)`) se a integração revelar respostas fora do contrato. A correção deve passar pela suíte.

## Verificação pós-deploy
- [ ] Em aparelho real, **Chrome no Android** e **Safari no iPhone**:
  - a página abre;
  - a fonte é a Libre Franklin;
  - não há rolagem horizontal.
- [ ] O login com o PIN **antigo 1234 é recusado**; com o PIN novo, entra direto na venda.
- [ ] Recarregar a página mantém a sessão, porque ela ainda está válida.
- [ ] Venda de teste completa:
  - valores na tela iguais aos do modal;
  - a venda aparece na aba Dia.
- [ ] **Apagar a venda de teste por SQL**, como no plano do back, para que a primeira venda real seja a #1042.
- [ ] `/<site>/mockServiceWorker.js` **não existe** (404).
- [ ] O cookie `pdv_sessao` tem `Secure` e `HttpOnly`.
- [ ] O console do navegador não mostra erro de aplicação. Respostas 401 esperadas são aceitáveis.

## Plano de rollback
- **Gatilhos:**
  - a página não abre;
  - o login ou a venda não funcionam no aparelho real;
  - as chamadas `/api` não chegam ao back.
- **Passos (em ordem):**
  1. Na Vercel, usar o Instant Rollback para o deploy anterior. No primeiro deploy não há versão anterior: remover o domínio ou despublicar o projeto.
  2. Se já houver uso real, registrar a causa como incidente (Fase 7).
- **Reversão de dados:** não se aplica, porque o front não guarda dados.

## Comunicação
O Lucas avisa a loja quando o PDV estiver no ar:
- informa o endereço da página;
- ensina a abrir no navegador do celular;
- passa o PIN novo pessoalmente, nunca por mensagem de texto.

## Responsáveis
| Nome | Papel no deploy |
|---|---|
| Lucas | Executa o checklist, gerencia a conta Vercel e aprova |
| Claude (Claude Code) | Apoio na execução e na verificação, na pdv-integracao |

## Aprovação
- Aprovado por: Lucas (plano aprovado; execução adiada para a pdv-integracao)
- Data/hora: 2026-09-27 12:28
