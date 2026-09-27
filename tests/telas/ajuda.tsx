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

/** Faz login com um único vendedor (etapa de seleção omitida) e espera a tela de venda. */
export async function entrar(usuario: UserEvent, pin = '1234') {
  await digitarPin(usuario, pin);
  await usuario.click(screen.getByRole('button', { name: 'Entrar no PDV' }));
  await screen.findByText(/pedido novo/);
}

/** Espera o catálogo carregar (lista de modelos visível). */
export async function esperarCatalogo() {
  await screen.findByRole('button', { name: /Calça Legging/ });
}

export interface Peca {
  categoria?: string;
  modelo: string;
  tecido?: string;
  tamanho: string;
  cor: string;
}

/** Aba Produtos → modelo → tecido/tamanho/cor → "Adicionar ao pedido" (vai para a aba Pedido). */
export async function adicionarPeca(usuario: UserEvent, p: Peca) {
  const abaProdutos = screen.getByRole('button', { name: 'Produtos' });
  if (abaProdutos.getAttribute('aria-current') !== 'page') await usuario.click(abaProdutos);
  if (p.categoria) await usuario.click(screen.getByRole('button', { name: p.categoria }));
  await usuario.click(screen.getByRole('button', { name: new RegExp(`^${p.modelo}`) }));
  if (p.tecido) await usuario.click(screen.getByRole('button', { name: new RegExp(`^${p.tecido}`) }));
  await usuario.click(screen.getByRole('button', { name: p.tamanho }));
  await usuario.click(screen.getByRole('button', { name: p.cor }));
  await usuario.click(screen.getByRole('button', { name: 'Adicionar ao pedido' }));
  expect(screen.getByRole('heading', { name: 'Novo pedido' })).toBeInTheDocument();
}

export const LEGGING_LIGHT_M_PRETO: Peca = { modelo: 'Calça Legging', tecido: 'Suplex Light', tamanho: 'M', cor: 'Preto' };
export const TOP_NADADOR_P_VINHO: Peca = { categoria: 'Tops', modelo: 'Top Nadador', tamanho: 'P', cor: 'Vinho' };

/** Linhas do carrinho na aba Pedido. */
export const itensPedido = () => screen.queryAllByTestId('item-pedido');
export const totais = () => within(screen.getByTestId('totais'));

/** Botão principal da aba Pedido (rótulo muda com o estado). */
export const botaoFechar = () => screen.getByRole('button', { name: /^(Inclua uma peça|Escolha o pagamento|Fechar venda)/ });

/** Normaliza o espaço não separável do "R$ " para comparar textos. */
export const sem_nbsp = (s: string | null | undefined) => (s ?? '').replace(/ /g, ' ');
