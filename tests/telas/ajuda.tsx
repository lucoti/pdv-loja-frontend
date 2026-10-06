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
 * Topo do PDV (o <header> com a etapa). É o sinal de que a página saiu do login: o topo do login não
 * mostra etapa nenhuma. Ponto único dos testes que depende de como o PDV se anuncia.
 */
const ETAPAS = /^(Produtos|Cor e tamanho|Pedido|Dia)$/;
export const topoDoPdv = () => screen.queryByText(ETAPAS, { selector: 'header div' });
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

/** Espera o catálogo carregar (lista do primeiro tipo, "Bermudas", visível). */
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

/** Botão do tamanho: o nome acessível começa pela sigla, seguida do preço ("MR$ 89,00estoque 5"). */
export const botaoTamanho = (sigla: string) => screen.getByRole('button', { name: new RegExp(`^${sigla}R\\$`) });
/** Botão da cor: o nome começa pela cor (pode vir seguido de "sem estoque"). */
export const botaoCor = (cor: string) => screen.getByRole('button', { name: new RegExp(`^${cor}(sem estoque)?$`) });

/** Aba Produtos → chip do tipo → produto → cor → tamanho → "Adicionar ao pedido" (vai para a aba Pedido). */
export async function adicionarPeca(usuario: UserEvent, p: Peca) {
  const abaProdutos = screen.getByRole('button', { name: 'Produtos' });
  if (abaProdutos.getAttribute('aria-current') !== 'page') await usuario.click(abaProdutos);
  if (p.tipo) await usuario.click(screen.getByRole('button', { name: p.tipo }));
  await usuario.click(screen.getByRole('button', { name: new RegExp(`^${p.produto}`) }));
  await usuario.click(botaoCor(p.cor));
  await usuario.click(botaoTamanho(p.tamanho));
  await usuario.click(screen.getByRole('button', { name: 'Adicionar ao pedido' }));
  expect(screen.getByRole('heading', { name: 'Novo pedido' })).toBeInTheDocument();
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

/** Espera o aviso de venda registrada (hoje o modal `dialog` "Venda registrada"). */
export const esperarVendaRegistrada = () => waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

/**
 * Fecha o aviso de venda registrada e começa a venda seguinte. Hoje: botão "Nova venda" do modal
 * (ADR-004 troca pelo OK do aviso). Confere que o aviso saiu.
 */
export async function comecarNovaVenda(usuario: UserEvent) {
  await esperarVendaRegistrada();
  await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Nova venda' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
}

/** "Cancelar pedido" (hoje no fim da aba Pedido; MI-07 leva para o topo). */
export async function cancelarPedido(usuario: UserEvent) {
  await usuario.click(screen.getByRole('button', { name: 'Cancelar pedido' }));
}

/** Informa o nome do cliente (hoje no campo da aba Pedido; MI-02 leva para a etapa Cliente). */
export async function informarCliente(usuario: UserEvent, nome: string) {
  await usuario.type(screen.getByRole('textbox', { name: 'Nome do cliente' }), nome);
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
