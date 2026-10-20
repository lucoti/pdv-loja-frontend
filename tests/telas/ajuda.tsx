import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { expect } from 'vitest';
import { App } from '../../src/App';

/** Monta a página inteira (App → sessão → Login/PDV), como o vendedor a vê. */
export function abrirApp() {
  const usuario = userEvent.setup();
  const tela = render(<App />);
  return { usuario, ...tela };
}

export async function digitarPin(usuario: UserEvent, pin: string) {
  for (const d of pin) await usuario.click(screen.getByRole('button', { name: d }));
}

/**
 * Senha de exemplo do simulado (src/simulado/dados.ts) e uma senha errada do mesmo tamanho.
 * Ponto único dos testes de tela que depende do tamanho da senha: mudou a senha de exemplo, ajuste aqui.
 */
export const PIN_CERTO = '12345678';
export const PIN_ERRADO = [...PIN_CERTO].reverse().join('');

/**
 * Uma tentativa de login: digita a senha inteira, sem esperar o resultado.
 * Ponto único dos testes de tela que depende de COMO o login é disparado: o último número da senha
 * dispara a validação (não há botão).
 */
export async function enviarPin(usuario: UserEvent, pin = PIN_CERTO) {
  await digitarPin(usuario, pin);
}

/**
 * Repete o gesto que dispara o login enquanto o primeiro pedido ainda não voltou (toque rápido a mais):
 * mais um toque num número, com o teclado travado pela validação em andamento.
 */
export async function toqueRapidoExtra(usuario: UserEvent) {
  await usuario.click(screen.getByRole('button', { name: PIN_CERTO.slice(-1) }));
}

/** Espera a etapa da senha (marcadores visíveis) e devolve quantos números já foram digitados. */
export async function esperarEtapaSenha(): Promise<number> {
  await screen.findByRole('img', { name: /números digitados/ });
  return numerosDigitados();
}

/** Quantos números a tela mostra como digitados (lido do rótulo dos marcadores, sem depender do total). */
export function numerosDigitados(): number {
  const rotulo = screen.getByRole('img', { name: /números digitados/ }).getAttribute('aria-label') ?? '';
  return Number(/^(\d+) de \d+ números digitados$/.exec(rotulo)?.[1] ?? Number.NaN);
}

/**
 * Tela atual do PDV: o <main> cujo nome acessível é a tela (ADR-002 da pdv-mobile-atualizado). É o sinal
 * de que a página saiu do login: o login não tem `main` com nome de tela. Ponto único dos testes que
 * depende de como o PDV se anuncia. O nome mantido (`topoDoPdv`) vem de quando o sinal era o topo.
 */
const ETAPAS = /^(Produtos|Cor e tamanho|Pedido|Cliente do pedido|Dia)$/;
export const topoDoPdv = () => screen.queryByRole('main', { name: ETAPAS });
/** Nome da tela atual do PDV ("Produtos", "Cor e tamanho", "Pedido", "Cliente do pedido", "Dia"). */
export const telaAtual = () => screen.getByRole('main', { name: ETAPAS }).getAttribute('aria-label');
/**
 * Espera a tela de venda abrir. Confere dentro da espera, sem devolver o elemento: o conteúdo é redesenhado
 * quando o catálogo termina de carregar, e um elemento guardado antes disso já teria saído da página.
 */
export const esperarPdv = () => waitFor(() => expect(topoDoPdv()).toBeInTheDocument());

/** Faz login com um único vendedor (etapa de seleção omitida) e espera a tela de venda. */
export async function entrar(usuario: UserEvent, pin = PIN_CERTO) {
  await enviarPin(usuario, pin);
  await esperarPdv();
}

/**
 * Espera o catálogo carregar e o cartão "2 Tecido" do primeiro tipo ("Bermudas") aparecer. Desde a
 * pdv-mobile-atualizado (MI-21) a venda começa direto em Produtos, sem a etapa Cliente.
 */
export async function esperarCatalogo() {
  await screen.findByRole('button', { name: /^Bermuda Ciclista/ });
}

/** Peça do catálogo de exemplo (simulado/dados.ts): tipo (chip), produto, cor e tamanho. */
export interface Peca {
  tipo?: string;
  produto: string;
  cor: string;
  tamanho: string;
}

/**
 * Botão do tamanho: o nome acessível é a sigla seguida do saldo ("Mestoque 5"). Desde a
 * pdv-mobile-refatorado (MI-06) o preço não fica mais no botão.
 */
export const botaoTamanho = (sigla: string) => screen.getByRole('button', { name: new RegExp(`^${sigla}(estoque \\d+|sem estoque)$`) });
/** Botão da cor: o nome começa pela cor (pode vir seguido de "sem estoque"). */
export const botaoCor = (cor: string) => screen.getByRole('button', { name: new RegExp(`^${cor}(sem estoque)?$`) });

/*
 * Pontos únicos da navegação até uma peça (pdv-mobile-atualizado, caracterização). O design atualizado
 * troca a lista de produtos (cartões "1 Peça"/"2 Tecido"), tira a etapa Cliente inicial e faz "Adicionar"
 * voltar para Peça/Tecido: só estes helpers mudam com isso (AP-004). Nenhum devolve elemento da página.
 */

/** Abre Peça/Tecido na aba Produtos, fechando um produto aberto. */
export async function abrirListaDeProdutos(usuario: UserEvent) {
  const abaProdutos = within(screen.getByRole('navigation', { name: 'Abas' })).getByRole('button', { name: 'Produtos' });
  if (abaProdutos.getAttribute('aria-current') !== 'page') await usuario.click(abaProdutos);
  // Produto aberto de uma peça anterior: volta para Peça/Tecido antes de escolher o próximo.
  const voltar = screen.queryByRole('button', { name: 'Voltar para peça e tecido' });
  if (voltar) await usuario.click(voltar);
}

/** Peça/Tecido → peça (tipo, se informado) → tecido (produto): abre a tela de cor/tamanho do produto. */
export async function abrirProduto(usuario: UserEvent, p: Pick<Peca, 'tipo' | 'produto'>) {
  await abrirListaDeProdutos(usuario);
  if (p.tipo) await usuario.click(within(screen.getByRole('region', { name: 'Peça' })).getByRole('button', { name: p.tipo }));
  await usuario.click(within(screen.getByRole('region', { name: 'Tecido' })).getByRole('button', { name: new RegExp(`^${p.produto}`) }));
}

/** Abre o produto e escolhe cor e tamanho, sem tocar em "Adicionar ao pedido". */
export async function escolherVariacao(usuario: UserEvent, p: Peca) {
  await abrirProduto(usuario, p);
  await usuario.click(botaoCor(p.cor));
  await usuario.click(botaoTamanho(p.tamanho));
}

/**
 * Aba Produtos → peça → tecido → cor → tamanho → "Adicionar ao pedido" → aba Pedido.
 * Desde a pdv-mobile-atualizado (MI-23) "Adicionar" volta para Peça/Tecido; o helper confere isso e então
 * abre a aba Pedido, para os testes seguirem do mesmo ponto de antes.
 */
export async function adicionarPeca(usuario: UserEvent, p: Peca) {
  await escolherVariacao(usuario, p);
  await usuario.click(screen.getByRole('button', { name: 'Adicionar ao pedido' }));
  // MI-23: de volta a Peça/Tecido, sem a barra de adicionar.
  expect(telaAtual()).toBe('Produtos');
  expect(screen.queryByRole('button', { name: 'Adicionar ao pedido' })).not.toBeInTheDocument();
  await usuario.click(within(screen.getByRole('navigation', { name: 'Abas' })).getByRole('button', { name: /^Pedido/ }));
  expect(telaAtual()).toBe('Pedido');
}

// Preços e saldos do catálogo de exemplo: Legging R$ 89 (saldo 5; Marinho P só 1), Top R$ 55 (Vinho GG sem estoque).
export const LEGGING_M_PRETO: Peca = { tipo: 'Calças', produto: 'Calça Legging', cor: 'Preto', tamanho: 'M' };
export const TOP_NADADOR_P_VINHO: Peca = { tipo: 'Tops', produto: 'Top Nadador', cor: 'Vinho', tamanho: 'P' };

/** Linhas do carrinho na aba Pedido. */
export const itensPedido = () => screen.queryAllByTestId('item-pedido');
export const totais = () => within(screen.getByTestId('totais'));

/** Botão principal da aba Pedido (rótulo muda com o estado). */
export const botaoFechar = () => screen.getByRole('button', { name: /^(Inclua uma peça|Escolha o pagamento|Fechar venda)/ });

/** Normaliza o espaço não separável do "R$ " para comparar textos. */
export const sem_nbsp = (s: string | null | undefined) => (s ?? '').replace(/ /g, ' ');

/*
 * Pontos únicos usados pelos testes de caracterização da refatoração pdv-mobile-refatorado
 * (tests/telas/pdv.mobile.caracterizacao.test.tsx). Cada helper concentra UM texto ou gesto que o
 * design novo vai trocar (MI-02, MI-04, MI-07); os testes que os usam conferem comportamento (corpo
 * enviado, quantidade de pedidos, chave). Nenhum devolve elemento da página: a conferência é feita
 * dentro de `waitFor` e o elemento é buscado de novo a cada uso (AP-004).
 */

/** Espera o aviso de venda registrada (`dialog` "Venda registrada", MI-04). */
export const esperarVendaRegistrada = () => waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

/**
 * Fecha o aviso de venda registrada com "Nova venda" e começa a venda seguinte. Confere que o aviso saiu
 * e que a tela voltou para Produtos (MI-26).
 */
export async function comecarNovaVenda(usuario: UserEvent) {
  await esperarVendaRegistrada();
  await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Nova venda' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(telaAtual()).toBe('Produtos');
}

/** "Cancelar pedido" (no fim da aba Pedido, MI-24); a tela volta para Produtos (MI-25). */
export async function cancelarPedido(usuario: UserEvent) {
  await usuario.click(screen.getByRole('button', { name: 'Cancelar pedido' }));
}

/**
 * Informa o cliente pelo "Alterar" da linha do cliente no Pedido (MI-21): abre "Cliente do pedido", troca
 * nome e celular e salva; confere que voltou para o Pedido. A linha só existe com peça no pedido.
 */
export async function informarCliente(usuario: UserEvent, nome: string, celular = '') {
  await abrirClienteDoPedido(usuario);
  const campoNome = campoNomeCliente();
  await usuario.clear(campoNome);
  await usuario.type(campoNome, nome);
  const campoCelular = campoCelularCliente();
  await usuario.clear(campoCelular);
  if (celular) await usuario.type(campoCelular, celular);
  await usuario.click(screen.getByRole('button', { name: 'Salvar cliente' }));
  await waitFor(() => expect(telaAtual()).toBe('Pedido'));
}

/** Toca N vezes no "+" do desconto no pedido (passos de R$ 5). */
export async function aumentarDescontoNoPedido(usuario: UserEvent, vezes: number) {
  for (let i = 0; i < vezes; i++) await usuario.click(screen.getByRole('button', { name: 'Aumentar desconto' }));
}

/** Escolhe a forma de pagamento pelo nome do catálogo (Pix, Dinheiro, Débito, Crédito). */
export async function escolherPagamento(usuario: UserEvent, nome: string) {
  await usuario.click(screen.getByRole('button', { name: nome }));
}

/** Espera a mensagem de erro do fechamento (caixa `alert`). */
export const esperarErroAoFechar = () => waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());

/**
 * Espera a tela de login: o PDV saiu (sem topo com etapa) e os marcadores da senha estão na tela.
 * Não depende do texto da instrução.
 */
export const esperarTelaDeLogin = () =>
  waitFor(() => {
    expect(topoDoPdv()).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: /números digitados/ })).toBeInTheDocument();
  });

/*
 * Pontos únicos da caracterização da pdv-mobile-atualizado (tests/telas/pdv.atualizado.caracterizacao.test.tsx).
 * Usam só o que o design atualizado mantém (abas em `navigation "Abas"` com `aria-current`, "Alterar",
 * "Salvar cliente", campos Nome/Celular) ou aceitam o nome antigo e o novo do mesmo botão. Nenhum devolve
 * elemento da página (AP-004).
 */

/** Nome da aba marcada como atual (`aria-current="page"`) na navegação "Abas"; exige exatamente uma. */
export function abaAtual(): string {
  const atuais = within(screen.getByRole('navigation', { name: 'Abas' }))
    .getAllByRole('button')
    .filter((b) => b.getAttribute('aria-current') === 'page')
    // Nome acessível: a aba Pedido com peças leva o contador no `aria-label` ("Pedido (2)").
    .map((b) => b.getAttribute('aria-label') ?? sem_nbsp(b.textContent));
  expect(atuais).toHaveLength(1);
  return atuais[0]!;
}

/** Abre o formulário do cliente do pedido pelo "Alterar" da aba Pedido. */
export async function abrirClienteDoPedido(usuario: UserEvent) {
  const abaPedido = within(screen.getByRole('navigation', { name: 'Abas' })).getByRole('button', { name: /^Pedido/ });
  if (abaPedido.getAttribute('aria-current') !== 'page') await usuario.click(abaPedido);
  await usuario.click(screen.getByText('Alterar'));
}

/** Campos do formulário do cliente (o rótulo pode ganhar complemento, ex.: "Nome do cliente"). */
export const campoNomeCliente = () => screen.getByRole('textbox', { name: /^Nome/ });
export const campoCelularCliente = () => screen.getByRole('textbox', { name: /^Celular/ });

/**
 * Toca N vezes no "+" ou no "−" do desconto no pedido. Aceita o nome de hoje ("Aumentar desconto no
 * total") e o do design atualizado ("Aumentar desconto"). Botão desligado não é tocado.
 */
export async function tocarDesconto(usuario: UserEvent, acao: 'Aumentar' | 'Diminuir', vezes: number) {
  const nome = new RegExp(`^${acao} desconto( no total)?$`);
  for (let i = 0; i < vezes; i++) {
    const botao = screen.getByRole('button', { name: nome });
    if (!(botao as HTMLButtonElement).disabled) await usuario.click(botao);
  }
}
