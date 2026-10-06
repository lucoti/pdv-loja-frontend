# 01 — Planejamento: PDV Loja — Cliente da venda com telefone no lugar do CPF (back)

## Objetivo de negócio
A venda passa a registrar o celular do cliente no lugar do CPF, para a loja poder voltar a falar com o cliente. O CPF sai do PDV por completo.

## Contexto
Feature irmã da **pdv-mobile-refatorado** (front), que já tem a etapa Cliente com nome e celular (etapas 1 a 5 prontas no branch `pdv-mobile-refatorado` do front) e só pode publicar depois deste contrato novo (etapa 6 do front). Código no repositório `backend/` (`lucoti/pdv-loja-backend`); artefatos nesta pasta do front para as métricas da sessão.

Hoje o CPF passa por: `src/esquemas.ts` (`esquemaVenda`, `z.strictObject`), `src/servicos/vendas.service.ts` (validação módulo 11, código `cpf_invalido`), `src/dominio/cpf.ts`, `src/repositorios/vendas.ts` (coluna `vendas.cpf`), `src/servicos/cupom.service.ts` e `src/dominio/cupom.ts` (CPF mascarado no cupom) e `contrato/openapi.yaml`. Cerca de 30 testes citam CPF. O ERP lê `vendas`, mas não a coluna `cpf` (busca por "cpf" em `ERP-loja/backend/src` e `ERP-loja/frontend/src` sem resultado, 2026-10-05).

## Escopo
**Inclui:**
- `POST /vendas` com o campo `telefone` (opcional) no lugar de `cpf`: aceita máscara/espaços e grava só os dígitos; **exatamente 11 dígitos** (DDD + celular — decisão do Lucas); fora disso, 400 `telefone_invalido`.
- Corpo com `cpf` é recusado com 400 (sem janela de compatibilidade — decisão do Lucas).
- Coluna nova `vendas.telefone` (ALTER condicional em `src/banco/migrar.ts`, padrão `adicionarColunasSku`); a coluna `cpf` fica no banco com as vendas antigas e deixa de ser preenchida.
- Venda devolvida, vendas do dia e cupom com `telefone`; o cupom mostra o **telefone completo** (ex.: "Tel: (31) 98765-4321" — decisão do Lucas).
- `contrato/openapi.yaml` atualizado para o front gerar os tipos (`npm run gerar:tipos`).
- Saem `src/dominio/cpf.ts`, o código `cpf_invalido` e o CPF mascarado do cupom.

**Não inclui:**
- Apagar ou migrar CPFs já gravados.
- Mudanças no ERP.
- Mudanças no front (ficam na pdv-mobile-refatorado, etapa 6 — inclusive a validação de 11 dígitos na tela Cliente, que hoje aceita 10 ou 11).

## Viabilidade
- **Técnica:** viável.
- **Riscos principais:**
  - Sem janela de compatibilidade: entre o deploy do back e o do front, toda venda do front no ar volta 400 — impacto alto — publicar os dois em seguida, em horário sem venda, com checklist "Depende de:" e passos manuais marcados (AP-002).
  - Tabela `vendas` compartilhada com o ERP (regra: mudanças de coluna combinadas com o ERP) — impacto baixo — o ERP não lê `cpf` e a coluna nova não muda nada para ele; registrado como verificado.
  - Troca em massa nos testes do back (~30 citações de CPF) — impacto médio — inventário AP-004 na Arquitetura.

## Prazo estimado
Uma sessão de trabalho. Deploy coordenado com o front (pdv-mobile-refatorado).

## Recursos e pessoas envolvidas
| Nome | Papel | Responsabilidade |
|---|---|---|
| Lucas | Dono do produto | Aprova cada fase e faz/acompanha o deploy coordenado |
| Claude (Claude Code) | Desenvolvimento | Implementa, testa e publica |

## Dependências
- Repositório `backend/` e banco Turso `pdv-loja` (ALTER na tabela `vendas`).
- Front pdv-mobile-refatorado para o deploy coordenado.

## Critérios de sucesso
- Venda com celular válido grava os dígitos e devolve o telefone.
- Celular inválido → 400 `telefone_invalido`; corpo com `cpf` → 400.
- Cupom mostra o telefone completo.
- Contrato (`openapi.yaml`) bate com as respostas (teste de contrato).
- Caracterização do back verde, com cada mudança intencional registrada.

## Aprendizados aplicados
AP-002 (checklist de deploy com "Depende de:" e passos manuais), AP-004 (inventário dos testes que usam CPF). AP-001 e AP-003 não se aplicam (sem ação automática nem CSS).

## Aprovação
- Aprovado por: Lucas ("sim, 11 digitos, pode gravar")
- Data/hora: 2026-10-05 23:34
