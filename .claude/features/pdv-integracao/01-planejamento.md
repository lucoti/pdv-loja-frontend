# 01 — Planejamento: PDV Loja — Integração (front + back + deploy)

## Objetivo de negócio
Colocar o PDV no ar:
- o back publicado com um banco Turso novo;
- o front publicado conversando com o back em `/api`, no mesmo domínio;
- o fluxo real (login → venda → dia) conferido em celulares reais.

A loja só passa a usar o PDV depois que o catálogo real for escrito, numa feature futura. Até lá, o sistema no ar serve de validação.

## Contexto
- As features pdv-backend e pdv-frontend estão com as fases 1 a 5 aprovadas e o plano de implantação (06) aprovado, mas **não executado**. As duas estão pausadas até esta feature.
- **Repositórios separados:**

  | Parte | Repositório | Projeto Vercel |
  |---|---|---|
  | Back | `lucoti/pdv-loja-backend` | `pdv-loja-backend` |
  | Front | `lucoti/pdv-loja-frontend` | `pdv-loja-frontend` |

  O repositório único antigo e o projeto Vercel antigo estão obsoletos. A remoção deles fica com o Lucas.
- **Configuração da Vercel** já corrigida em 2026-09-27:
  - Node 22.x nos dois projetos;
  - back com funções em `gru1` e framework "Other".

## Escopo
**Inclui:**
1. **Banco Turso novo** (`pdv-loja`, região `gru`):
   - criação;
   - `db:seed` com o catálogo de exemplo;
   - troca do PIN do vendedor. O PIN 1234 não vai para produção.
2. **Back:**
   - substituir as variáveis `TURSO_*` do projeto pelas do banco novo;
   - remover a variável `PORT`, que não se aplica na Vercel;
   - enviar ao GitHub o commit pendente;
   - deploy de preview, verificação e depois produção, pelo checklist `pdv-backend/06`.
3. **Front:**
   - criar `vercel.json` com o rewrite de `/api` para o back (ADR-007);
   - corrigir o débito do `App.tsx` registrado em `pdv-frontend/05`;
   - verificação local contra o back real (`dev:api`);
   - deploy de preview, verificação e depois produção, pelo checklist `pdv-frontend/06`.
4. **Verificação ponta a ponta** no Chrome de Android e no Safari de iPhone.
5. **Fechamento:**
   - pdv-backend e pdv-frontend passam a `implantada`;
   - cada uma recebe seu `08-metricas.md`.

**Não inclui:**
- catálogo real (feature futura);
- funcionalidades novas, impressão e cadastro administrativo;
- domínio próprio. O endereço fica no padrão da Vercel (`pdv-loja-frontend.vercel.app`);
- apagar o banco antigo e o projeto Vercel antigo. Isso fica a critério do Lucas.

## Viabilidade
**Técnica:** viável. O CLI do Turso será instalado nesta máquina para criar e administrar o banco e as conexões.

**Decisão sobre o banco:** usar um banco novo em vez do antigo. O esquema antigo (`fitmoveon/db/contrato.sql`, no backup) tem problemas:
- tabelas com o mesmo nome e estrutura incompatível: `cores`, `vendas`, `venda_itens`;
- tabelas sem uso: `tamanhos`, `estoque`, `pdv_login_tentativas`;
- faltam `sessoes`, `pagamentos` e `config`;
- o catálogo antigo era gravado por "outro sistema".

Como o `esquema.sql` usa `CREATE TABLE IF NOT EXISTS`, ele pularia as tabelas antigas e a API falharia por falta de colunas.

**Riscos principais:**

| Risco | Consequência | Mitigação |
|---|---|---|
| Os imports `.js` → `.ts` (NodeNext) não compilarem na função Vercel | O back não sobe | Testar primeiro no preview; se falhar, acrescentar um passo de build e registrar |
| As variáveis antigas apontarem para o banco errado | Dados gravados no banco antigo | Substituir as `TURSO_*` antes do primeiro deploy e conferir por `GET /api/config` |
| O rewrite entre projetos não repassar o cookie | Login não se mantém | Verificar `Set-Cookie` e a sessão no preview antes da produção |
| Primeira venda de teste consumir o número #1042 | Numeração não começa em 1042 | Apagar a venda de teste por SQL, como previsto nos 06 |

## Prazo estimado
Cerca de 1 dia, sem data-alvo fixa. Depende da troca do PIN pelo Lucas.

## Recursos e pessoas envolvidas
| Nome | Papel | Responsabilidade |
|---|---|---|
| Lucas | Dono do produto | Aprovações, escolha e gravação do PIN novo, conferência nos celulares |
| Claude (Claude Code) | Apoio de desenvolvimento | Turso via CLI, configuração da Vercel, rewrite, correção do `App.tsx`, deploys e verificação |

## Dependências
- Checklists `pdv-backend/06-implantacao.md` e `pdv-frontend/06-implantacao.md`.
- Conta Turso do Lucas: login no CLI feito por ele.
- Conta Vercel: CLI já autenticado nesta máquina.

## Critérios de sucesso
- `pdv-loja-frontend.vercel.app` abre nos dois celulares.
- Login com o PIN novo funciona, e o PIN 1234 é recusado.
- Uma venda completa aparece na aba Dia, com os valores iguais aos do servidor.
- A sessão persiste ao recarregar a página.
- O cookie é `Secure` e `HttpOnly`.
- Não há `mockServiceWorker.js` publicado.
- O banco fica sem dados de teste: a venda de teste é apagada.

## Aprendizados aplicados
Nenhum. O arquivo `.claude/aprendizados.md` não existe.

## Aprovação
- Aprovado por: Lucas ("pode aprovar, siga")
- Data/hora: 2026-09-27 14:11
