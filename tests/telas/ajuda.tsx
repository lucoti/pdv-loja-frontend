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
 * Topo do PDV: o <header> (papel `banner`) cujo nome acessível é a etapa. É o sinal de que a página saiu
 * do login: o topo do login não tem nome de etapa. Ponto único dos testes que depende de como o PDV se
 * anuncia. Desde a pdv-mobile-refatorado (MI-09) o texto visível do topo segue o design ("Vendas de
 * hoje", nome do produto…); a etapa fica só no `aria-label`.
 */
const ETAPAS = /^(Cliente|Produtos|Cor e tamanho|Pedido|Dia)$/;
export const topoDoPdv = () => screen.queryByRole('banner', { name: ETAPAS });
/**
 * Espera a tela de venda abrir. Confere dentro da espera, sem devolver o elemento: o topo é redesenhado
 * quando o catálogo termina de carregar, e um elemento guardado antes disso já teria saído da página.
 */
export const esperarPdv = () => waitFor(() => expect(topoDoPdv()).toBeInTheDocument());

/** Faz login com um único vendedor (etapa de seleção omitida) e espera a tela de venda. */
export async function entrar(usuario: UserEvent, pin = PIN_CERTO) {
  await enviarPin(usuario, pin);
  await esperarPdv();
}

/**
 * Pula a etapa Cliente (MI-02) com "Venda sem cliente". A etapa só aparece com o catálogo carregado, e
 * é a primeira tela do PDV depois do login e depois de cada venda ou "Cancelar pedido". Sem `usuario`,
 * usa a API direta do user-event (mesmo efeito de um toque).
 */
export async function pularCliente(usuario: Pick<UserEvent, 'click'> = userEvent) {
  await waitFor(() => expect(screen.getByRole('banner')).toHaveAttribute('aria-label', 'Cliente'));
  await usuario.click(screen.getByRole('button', { name: 'Venda sem cliente' }));
}

/**
 * Espera o catálogo carregar e a lista do primeiro tipo ("Bermudas") aparecer. Desde a
 * pdv-mobile-refatorado a lista vem depois da etapa Cliente, que este helper pula (venda sem cliente).
 */
export async function esperarCatalogo() {
  await pularCliente();
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
export const botaoTamanho = (sigla: string) => screen.getByRole('button', { name: new RegExp(`^${sigla}estoque \\d+$`) });
/** Botão da cor: o nome começa pela cor (pode vir seguido de "sem estoque"). */
export const botaoCor = (cor: string) => screen.getByRole('button', { name: new RegExp(`^${cor}(sem estoque)?$`) });

/**
 * Aba Produtos → tipo → produto → cor → tamanho → "Adicionar ao pedido" → aba Pedido.
 * Desde a pdv-mobile-refatorado (MI-11) "Adicionar" deixa a tela em cor/tamanho com a escolha limpa;
 * o helper confere isso e então abre a aba Pedido, para os testes seguirem do mesmo ponto de antes.
 */
export async function adicionarPeca(usuario: UserEvent, p: Peca) {
  const abaProdutos = screen.getByRole('button', { name: 'Produtos' });
  if (abaProdutos.getAttribute('aria-current') !== 'page') await usuario.click(abaProdutos);
  // Venda nova (depois do login, de uma venda ou de "Cancelar pedido") começa na etapa Cliente.
  if (screen.getByRole('banner').getAttribute('aria-label') === 'Cliente') await pularCliente(usuario);
  // Produto aberto de uma peça anterior: volta para a lista antes de escolher o próximo.
  const voltar = screen.queryByRole('button', { name: 'Voltar para os produtos' });
  if (voltar) await usuario.click(voltar);
  if (p.tipo) await usuario.click(screen.getByRole('button', { name: p.tipo }));
  await usuario.click(screen.getByRole('button', { name: new RegExp(`^${p.produto}`) }));
  await usuario.click(botaoCor(p.cor));
  await usuario.click(botaoTamanho(p.tamanho));
  await usuario.click(screen.getByRole('button', { name: 'Adicionar ao pedido' }));
  // MI-11: continua em cor/tamanho, sem cor nem tamanho escolhidos.
  expect(screen.getByRole('banner')).toHaveAttribute('aria-label', 'Cor e tamanho');
  expect(screen.getByText('Falta escolher: cor e tamanho')).toBeInTheDocument();
  await usuario.click(screen.getByRole('button', { name: /^Pedido/ }));
  expect(screen.getByRole('heading', { name: 'Pedido' })).toBeInTheDocument();
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
 * Fecha o aviso de venda registrada com o OK (ADR-004) e começa a venda seguinte. Confere que o aviso
 * saiu e que a tela voltou para a etapa Cliente (MI-04).
 */
export async function comecarNovaVenda(usuario: UserEvent) {
  await esperarVendaRegistrada();
  await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'OK' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(screen.getByRole('banner')).toHaveAttribute('aria-label', 'Cliente');
}

/** "Cancelar pedido" (no topo da aba Pedido, MI-07); a tela volta para a etapa Cliente (MI-04). */
export async function cancelarPedido(usuario: UserEvent) {
  await usuario.click(screen.getByRole('button', { name: 'Cancelar pedido' }));
}

/**
 * Informa o cliente pelo "Alterar" do cartão Cliente do Pedido (MI-02): abre a etapa Cliente, troca nome
 * e celular e salva; confere que voltou para o Pedido.
 */
export async function informarCliente(usuario: UserEvent, nome: string, celular = '') {
  if (screen.getByRole('banner').getAttribute('aria-label') !== 'Pedido') await usuario.click(screen.getByRole('button', { name: /^Pedido/ }));
  await usuario.click(screen.getByText('Alterar'));
  const campoNome = screen.getByRole('textbox', { name: 'Nome' });
  await usuario.clear(campoNome);
  await usuario.type(campoNome, nome);
  const campoCelular = screen.getByRole('textbox', { name: 'Celular' });
  await usuario.clear(campoCelular);
  if (celular) await usuario.type(campoCelular, celular);
  await usuario.click(screen.getByRole('button', { name: 'Salvar cliente' }));
  await waitFor(() => expect(screen.getByRole('banner')).toHaveAttribute('aria-label', 'Pedido'));
}

/** Toca N vezes no "+" do desconto no pedido (passos de R$ 5). */
export async function aumentarDescontoNoPedido(usuario: UserEvent, vezes: number) {
  for (let i = 0; i < vezes; i++) await usuario.click(screen.getByRole('button', { name: 'Aumentar desconto no total' }));
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
