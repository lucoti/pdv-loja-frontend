# 02 — Requisitos (refatoração): PDV Loja — Login com senha de 8 números e entrada automática

## Motivação
Senha mais difícil de adivinhar (8 números em vez de 4) e um passo a menos para o vendedor: o 8º número dispara a validação, sem botão. Ver `01-planejamento.md`.

## Pontos de entrada afetados
| Ponto de entrada | Tipo (HTTP / evento / fila / job / função pública) | Consumidores |
|---|---|---|
| Tela de login (`frontend/src/telas/Login/Login.tsx`, `TecladoPin.tsx`) | Tela (componente React) | Vendedores, pelo navegador |
| `POST /api/auth/login` (`backend/src/rotas/auth.rotas.ts`, `esquemas.ts`, `contrato/openapi.yaml`) | HTTP | Front do PDV |
| `npm run pin:trocar` (`backend/src/scripts/trocar-pin.ts`) | Script de linha de comando | Lucas |
| Simulado do front (`frontend/src/simulado/handlers.ts`, `dados.ts`) | HTTP simulado (MSW) | Testes e modo simulado do front |
| Seed do back (`backend/src/banco/seed.ts`) | Script | Banco de desenvolvimento/testes |

## Invariantes — o que NÃO pode mudar

### Contratos externos intocáveis
| ID | Contrato | Detalhe (payload, formato, códigos de erro, ordenação...) |
|---|---|---|
| INV-001 | Corpo do login | Continua `{ vendedorId, pin }`, com `pin` como texto (preserva zeros à esquerda) e sem campos extras (objeto estrito). Só o tamanho do `pin` muda (MUD-01). |
| INV-002 | Resposta 200 do login | `{ vendedor, expiraEm }` e cookie `pdv_sessao` igual: HttpOnly, SameSite=Lax, Path=/api, Expires à meia-noite local. |
| INV-003 | 401 do login | Senha errada, vendedor inexistente e vendedor inativo dão exatamente a mesma resposta: 401 `senha_incorreta`, "Senha incorreta. Tente de novo.", sem cookie nem sessão. |
| INV-004 | 400 do login | Entrada inválida continua 400 `entrada_invalida`; as mensagens "Escolha o vendedor.", "Vendedor inválido." e "Campo não permitido: …" não mudam. |
| INV-005 | Demais rotas | `GET /auth/sessao`, `POST /auth/logout` e todas as rotas de venda, catálogo e públicas ficam intocadas. |
| INV-006 | Banco | Mesma tabela `vendedores`, mesma coluna `pin_hash` com bcrypt; nenhuma migração. O banco `move-on` (ERP) não é tocado. |

### Comportamentos que devem ser preservados
| ID | Comportamento | Como verificar |
|---|---|---|
| INV-010 | Com mais de um vendedor aparece "Quem está vendendo?" (inicial, nome, cargo); com um só, a etapa é omitida e não há botão de voltar. | Testes de tela (RF-F01) |
| INV-011 | Trocar de vendedor limpa os números e o erro. | Teste de tela |
| INV-012 | Teclado da própria tela: sem `<input>`, teclas 0–9 e "apagar". | Teste de tela |
| INV-013 | "apagar" remove o último número; digitar ou apagar some com a mensagem de erro. | Teste de tela |
| INV-014 | Senha errada (401) limpa os números e mostra "Senha incorreta. Tente de novo.". | Teste de tela |
| INV-015 | Uma tentativa gera um único pedido de login, mesmo com toques rápidos. | Teste de tela contando requisições |
| INV-016 | Senha certa abre a venda direto ("{vendedor} · pedido novo"); o corpo enviado segue o contrato. | Teste de tela + validação de contrato |
| INV-017 | Cabeçalho "BALCÃO", "Ponto de venda · {unidade}" e rodapé "Esqueceu a senha? Peça ao gerente." iguais; sem linha "Senha de teste". | Teste de tela |
| INV-018 | Sessão existente abre o PDV sem login; 401 `sessao_invalida` volta ao login; falha ao carregar config/vendedores mostra erro com "Tentar de novo". | Testes de tela (RF-F03) |
| INV-019 | `pin:trocar` pede a senha sem eco e grava só o hash bcrypt. | Testes do script |
| INV-020-A | O login leva o mesmo caminho (bcrypt) para vendedor inexistente, sem revelar ids válidos pelo tempo. | Teste do serviço de auth |

### Bugs conhecidos a preservar
| ID | Bug | Quem pode depender dele | Decisão |
|---|---|---|---|
| INV-020 | Sem limite de tentativas de senha (exceção aceita na `pdv-backend`). | Ninguém; risco aceito, reduzido pelos 8 números | preservar (fora de escopo) |
| INV-021 | `pin:trocar` perde o buffer depois do Enter e ecoa antes do modo raw. | Ninguém; débito conhecido | preservar (fora de escopo) |
| INV-022 | "socket hang up" intermitente nos testes do back. | Ninguém; débito conhecido | preservar (fora de escopo) |

## O que pode mudar
- Estrutura interna de `Login.tsx` (estado, funções, CSS do botão removido), nomes privados e constantes.
- Testes existentes que cobrem o botão, o tamanho 4 e a falha de rede (reescritos para o comportamento novo).
- Comentários e documentação.

## Mudanças intencionais de comportamento (decididas no planejamento)
| ID | Mudança | Hoje | Depois |
|---|---|---|---|
| MUD-01 | Tamanho da senha | 4 números (`^\d{4}$`), "Digite a senha de 4 números." / "Digite sua senha de 4 números", 4 marcadores | 8 números (`^\d{8}$`), "Digite a senha de 8 números." / "Digite sua senha de 8 números", 8 marcadores — no front, back, contrato, simulado, seed e `pin:trocar` |
| MUD-02 | Disparo do login | Botão "Entrar no PDV", habilitado com 4 números | Botão removido; o 8º número dispara a validação |
| MUD-03 | Teclado durante a validação | Livre (só o botão trava) | Travado: números e "apagar" não respondem enquanto valida |
| MUD-04 | Falha de rede ou outro erro que não 401 | Números ficam na tela para tentar de novo | Números são apagados e o erro aparece; o vendedor digita de novo |
| MUD-05 | Senha de exemplo (seed e simulado) | `1234` | `12345678` |
| MUD-06 | Senhas existentes | Funcionam | Senhas de 4 números deixam de funcionar após o deploy; o Lucas cadastra as novas com `pin:trocar` |

## Invariantes alterados intencionalmente
<Preenchido durante as Fases 4 e 5 se um teste de caracterização quebrar e a mudança for aceita.>

| ID | Mudança | Motivo | Aprovado por | Data |
|---|---|---|---|---|
| | | | | |

## Aprendizados aplicados
nenhum (`.claude/aprendizados.md` ainda não existe).

## Aprovação
- Aprovado por: Lucas
- Data/hora: 2026-10-01 21:29
