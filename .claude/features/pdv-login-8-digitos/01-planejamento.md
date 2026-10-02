# 01 — Planejamento: PDV Loja — Login com senha de 8 números e entrada automática

## Objetivo de negócio
Trocar a senha do vendedor de 4 para 8 números e eliminar o toque no botão "Entrar no PDV": ao digitar o 8º número, o PDV valida a senha sozinho e, se estiver certa, entra. Resultado esperado: senha mais difícil de adivinhar e um passo a menos para o vendedor.

## Contexto
- O PDV está no ar desde 2026-09-27 (features `pdv-backend`, `pdv-frontend` e `pdv-integracao`, todas implantadas).
- **Front:** `TAMANHO_PIN = 4` e botão "Entrar no PDV" em `frontend/src/telas/Login/Login.tsx`; o simulado (`src/simulado/handlers.ts`, `dados.ts`) também valida 4 números.
- **Back:** a API só aceita `^\d{4}$` (`backend/src/esquemas.ts`), o contrato `backend/contrato/openapi.yaml` diz o mesmo, e o script `npm run pin:trocar` exige 4 números.
- **Banco:** a tabela `vendedores` só guarda o hash (bcrypt) da senha; as senhas atuais de 4 números não podem ser convertidas.
- Afetados: os vendedores da loja (público +50 anos) e o Lucas, que cadastra as senhas.

## Escopo
**Inclui:**
- **Front:** 8 marcadores, texto "Digite sua senha de 8 números", envio automático ao digitar o 8º número, teclado travado durante a validação, remoção do botão "Entrar no PDV", simulado e testes ajustados.
- **Back:** validação e mensagens para 8 números, contrato OpenAPI, script `pin:trocar`, senha de exemplo do seed e testes.
- **Tipos:** regenerar os tipos do front a partir do contrato.
- **Implantação:** back e front publicados juntos (back primeiro); o Lucas cadastra a nova senha de cada vendedor com `npm run pin:trocar`.

**Não inclui:**
- Bloqueio por tentativas erradas (exceção já aceita na `pdv-backend`; 8 números reduzem o risco).
- Mudança na sessão, no cookie, na escolha do vendedor ou na tela de venda.
- Período de convivência entre senhas de 4 e de 8 números.
- Qualquer elemento de tela fora do handoff (ex.: botão "Tentar de novo").

## Decisões do Lucas (2026-10-01)
1. O botão "Entrar no PDV" sai da tela.
2. Senha errada: apaga os números e mostra "Senha incorreta. Tente de novo." (como hoje).
3. Falha de rede ou outro erro: apaga os números, mostra o erro e o vendedor digita de novo (hoje os números ficam na tela — mudança intencional).
4. Depois do deploy, as senhas de 4 números deixam de funcionar; todos os vendedores passam a ter senha de 8 números, cadastrada pelo Lucas.

## Viabilidade
- **Técnica:** viável — mudança pequena e localizada (uma tela, um esquema de validação, o contrato e um script).
- **Riscos principais:**
  - Vendedor sem acesso — quem não tiver a senha nova cadastrada não entra depois do deploy — a troca das senhas entra no checklist de implantação.
  - Versões desencontradas — front novo com back antigo (ou o contrário) recusa todo login — deploy coordenado, back primeiro, com rollback dos dois.
  - Envio duplicado — toques rápidos após o 8º número não podem disparar dois logins — teclado travado enquanto valida, coberto por teste.

## Prazo estimado
Uma sessão de trabalho. Premissa: sem mudança de banco (a coluna `pin_hash` continua igual).

## Recursos e pessoas envolvidas
| Nome | Papel | Responsabilidade |
|---|---|---|
| Lucas | Dono do produto / dev | Aprova as fases, faz o deploy e cadastra as senhas novas |
| Claude | Apoio ao desenvolvimento | Conduz o fluxo-dev, implementa, documenta e testa |

## Dependências
- Acesso do Lucas ao Vercel (projetos `pdv-loja-backend` e `pdv-loja-frontend`) e ao banco Turso `pdv-loja` para rodar `pin:trocar`.
- Nenhuma dependência do ERP (o banco `move-on` não é tocado).

## Critérios de sucesso
- Em produção, digitar os 8 números certos entra no PDV sem tocar em botão.
- Senha errada ou falha de rede limpa os números e mostra a mensagem de erro.
- Todo o resto (escolha do vendedor, sessão, cookie, venda) continua igual, comprovado pelos testes de caracterização.

## Aprendizados aplicados
nenhum (`.claude/aprendizados.md` ainda não existe).

## Aprovação
- Aprovado por: Lucas
- Data/hora: 2026-10-01 21:24
