# 01 — Planejamento: PDV Loja — Front-end (React)

## Objetivo de negócio
Entregar o PDV como uma **página na internet**, aberta pelo vendedor no navegador do celular. Ela
deve reproduzir fielmente o design aprovado pelo cliente em `design_handoff_pdv_loja/`, pensado
para um público acima de 50 anos: tipografia grande, alvos de toque grandes, poucos passos e nada
escondido. As vendas são registradas na API do pdv-backend.

## Contexto
O back-end (feature pdv-backend) já está desenvolvido e testado; o contrato HTTP fica em
`backend/contrato/openapi.yaml`, e o deploy foi adiado para a pdv-integracao. Front e back são
desenvolvidos separadamente e integrados depois. Por isso este front é construído e testado
contra um servidor simulado do contrato.

## Escopo
Ressalvas do Lucas na aprovação:
- O PDV é uma página web acessada pelo navegador, não um aplicativo instalável.
- Nenhum extra além do handoff.

**Inclui (somente o que está no handoff):**
- **Login** (`design/PDV Login.dc.html`, handoff §1):
  - etapa "Quem está vendendo?", que só aparece quando há mais de um vendedor ativo;
  - PIN de 4 dígitos com teclado numérico próprio da tela;
  - mensagem de erro "Senha incorreta. Tente de novo.";
  - após o login, a tela de venda abre direto.
- **PDV Mobile** (`design/PDV Loja Mobile.dc.html`, handoff §2):
  - cabeçalho com o vendedor, o número do pedido e a data;
  - aba **Produtos**: chips de categoria, lista de modelos e painel de variações (tecido, tamanho e cor);
  - aba **Pedido**: cliente e CPF, itens com quantidade e desconto, desconto no total, forma de pagamento, totais e "Cancelar pedido";
  - aba **Dia**: total do dia, número de pedidos e lista de vendas;
  - botão de ação na barra inferior, que muda conforme a aba;
  - modal "Venda registrada".
- **Comportamentos exigidos pela API** (não são extras):
  - voltar ao login quando a sessão expira (meia-noite) ou quando a API responde 401;
  - se a rede falhar ao fechar a venda, mostrar erro e permitir tentar de novo com a mesma chave de idempotência, sem duplicar a venda.
- **Desenvolvimento** contra um servidor simulado gerado a partir do `openapi.yaml`.

**Não inclui:**
- Aplicativo instalável (PWA) e funcionamento offline.
- Carrinho salvo no aparelho.
- Confirmação antes de "Cancelar pedido" (fica como está no handoff).
- Impressão de cupom (a loja ainda não tem impressora).
- Botão "Sair" (o handoff não tem).
- Variante tablet e cadastro administrativo.
- Deploy e ligação com a API real (feature pdv-integracao).

## Viabilidade
- **Técnica:** viável.
  - Stack: React + TypeScript + Vite, gerando uma página web estática.
  - Navegadores: Chrome (Android) e Safari (iPhone).
  - Layout: o mobile do handoff, entre 360 e 460 px de largura.
- **Riscos principais:**

  | Risco | Consequência | Mitigação |
  |---|---|---|
  | Público com pouca familiaridade com tecnologia | Erros de uso | Seguir os tamanhos mínimos do handoff: fonte ≥ 17 px, toque ≥ 54 px, sem animação |
  | Divergência de contrato entre front e back | Quebra na integração | Tipos gerados do `openapi.yaml`; servidor simulado validado pelo mesmo contrato |
  | Internet instável na loja | Venda perdida ou duplicada | Mensagem clara e reenvio com a mesma chave de idempotência |
  | Total na tela diferente do calculado pelo servidor | Cobrança divergente | Mesma fórmula em centavos do back, testada com os mesmos valores |

## Prazo estimado
- 4 a 6 dias, sem data-alvo fixa.
- Premissas: contrato do back estável; sem impressão.

## Recursos e pessoas envolvidas
| Nome | Papel | Responsabilidade |
|---|---|---|
| Lucas | Dono do produto e desenvolvedor | Decisões e aprovação de cada fase |
| Claude (Claude Code) | Apoio de desenvolvimento | Condução do fluxo, implementação, documentação e testes |

## Dependências
- Contrato `backend/contrato/openapi.yaml` (pdv-backend).
- Fonte Libre Franklin.
- Integração real, deploy e domínio: feature pdv-integracao.

## Critérios de sucesso
- Telas iguais ao handoff em cores, tamanhos, espaçamentos e textos em pt-BR.
- Regras do carrinho iguais às do servidor nos mesmos valores de referência:
  - preço da variação;
  - consolidação de itens por variação;
  - descontos;
  - total nunca negativo;
  - habilitação do botão de ação.
- Fluxo login → venda → aba Dia funcionando contra o servidor simulado.
- Cobertura de testes de pelo menos 85% por arquivo, com validação de qualidade (T8).

## Aprendizados aplicados
Nenhum. O arquivo `.claude/aprendizados.md` ainda não existe.

## Aprovação
- Aprovado por: Lucas, com ressalvas: página web, sem PWA; nenhum extra além do handoff
- Data/hora: 2026-09-27 11:07
