import { render, screen, within } from '@testing-library/react';
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

/** Faz login com um único vendedor (etapa de seleção omitida) e espera a tela de venda. */
export async function entrar(usuario: UserEvent, pin = PIN_CERTO) {
  await enviarPin(usuario, pin);
  await screen.findByText(/pedido novo/);
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

/** Botão do tamanho: o nome acessível começa pela sigla, seguida do preço ("MR$ 89,005 un."). */
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
