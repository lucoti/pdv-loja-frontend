/**
 * Etapa Cliente e aviso de venda (pdv-mobile-refatorado, MI-02 e MI-04).
 * - A venda começa na etapa Cliente (aba Produtos), com nome e celular opcionais.
 * - "Alterar" no cartão Cliente do Pedido reabre a etapa e volta ao Pedido ao salvar.
 * - O celular (11 dígitos) vai no corpo da venda como `telefone`, só com os dígitos (etapa 6).
 * - O aviso de venda sai só com OK e a venda seguinte começa de novo na etapa Cliente.
 */
import { screen, waitFor, within } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { servidor, usarSimulado } from '../apoio';
import { abrirApp, adicionarPeca, botaoFechar, sem_nbsp, TOP_NADADOR_P_VINHO } from './ajuda';

const botao = (nome: RegExp | string) => screen.getByRole('button', { name: nome });
const texto = (el: Element | null | undefined) => sem_nbsp(el?.textContent);
const etapa = () => screen.getByRole('banner').getAttribute('aria-label');
const campoNome = () => screen.getByRole('textbox', { name: 'Nome' });
const campoCelular = () => screen.getByRole('textbox', { name: 'Celular' });
const linhaCliente = () => within(screen.getByRole('region', { name: 'Cliente' })).getByRole('button');

/** Abre o PDV logado e espera a etapa Cliente (primeira tela da venda). */
async function abrirNaEtapaCliente() {
  const simulado = usarSimulado({ sessaoDe: 'carlos' });
  const app = abrirApp();
  await waitFor(() => expect(etapa()).toBe('Cliente'));
  return { ...app, simulado };
}

/** Corpos dos POST /vendas feitos pela tela. */
function capturarVendas() {
  const corpos: Array<Record<string, unknown>> = [];
  servidor.events.on('request:start', async ({ request }) => {
    if (request.method === 'POST' && new URL(request.url).pathname === '/api/vendas') corpos.push(await request.clone().json());
  });
  return corpos;
}

describe('MI-02 — etapa Cliente no começo da venda', () => {
  it('depois do login a venda começa na etapa Cliente, na aba Produtos, com os dois campos vazios', async () => {
    await abrirNaEtapaCliente();
    expect(within(screen.getByRole('banner')).getByRole('heading', { level: 1 })).toHaveTextContent('Cliente');
    expect(screen.getByText('Nova venda · primeiro passo')).toBeInTheDocument();
    expect(botao('Produtos')).toHaveAttribute('aria-current', 'page');
    expect(campoNome()).toHaveValue('');
    expect(campoCelular()).toHaveValue('');
    expect(campoCelular()).toHaveAttribute('type', 'tel');
    expect(botao('Escolher produtos')).toBeEnabled();
    expect(botao('Venda sem cliente')).toBeEnabled();
  });

  it('celular com máscara enquanto digita; incompleto desabilita "Escolher produtos"; completo habilita', async () => {
    const { usuario } = await abrirNaEtapaCliente();
    await usuario.type(campoCelular(), '3198765');
    expect(campoCelular()).toHaveValue('(31) 9876-5');
    expect(botao('Escolher produtos')).toBeDisabled();
    // 10 dígitos (fixo ou celular sem o 9) também não vale: o back exige 11 (pdv-cliente-telefone).
    await usuario.type(campoCelular(), '432');
    expect(campoCelular()).toHaveValue('(31) 9876-5432');
    expect(botao('Escolher produtos')).toBeDisabled();
    await usuario.type(campoCelular(), '1');
    expect(campoCelular()).toHaveValue('(31) 98765-4321');
    expect(botao('Escolher produtos')).toBeEnabled();
    await usuario.type(campoCelular(), '99');
    expect(campoCelular()).toHaveValue('(31) 98765-4321');
  });

  it('"Escolher produtos" leva à lista com o nome do cliente no topo; o Pedido mostra nome e celular', async () => {
    const { usuario } = await abrirNaEtapaCliente();
    await usuario.type(campoNome(), '  Maria Aparecida ');
    await usuario.type(campoCelular(), '31987654321');
    await usuario.click(botao('Escolher produtos'));
    expect(etapa()).toBe('Produtos');
    expect(within(screen.getByRole('banner')).getByText('Maria Aparecida')).toBeInTheDocument();
    expect(botao(/^Bermuda Ciclista/)).toBeInTheDocument();
    await usuario.click(botao('Pedido'));
    expect(texto(linhaCliente())).toBe('Maria Aparecida(31) 98765-4321Alterar');
  });

  it('"Venda sem cliente" segue com os campos descartados: topo e Pedido mostram "Cliente não identificado"', async () => {
    const { usuario } = await abrirNaEtapaCliente();
    await usuario.type(campoNome(), 'Rascunho');
    await usuario.click(botao('Venda sem cliente'));
    expect(etapa()).toBe('Produtos');
    expect(within(screen.getByRole('banner')).getByText('Cliente não identificado')).toBeInTheDocument();
    await usuario.click(botao('Pedido'));
    expect(texto(linhaCliente())).toBe('Cliente não identificadoSem celularAlterar');
  });

  it('"Alterar" reabre a etapa preenchida, com "Salvar cliente", e volta ao Pedido com o cliente novo', async () => {
    const { usuario } = await abrirNaEtapaCliente();
    await usuario.type(campoNome(), 'Maria');
    await usuario.click(botao('Escolher produtos'));
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await usuario.click(screen.getByText('Alterar'));
    expect(etapa()).toBe('Cliente');
    expect(screen.getByText('Alterar o cliente do pedido')).toBeInTheDocument();
    expect(campoNome()).toHaveValue('Maria');
    expect(screen.queryByRole('button', { name: 'Escolher produtos' })).not.toBeInTheDocument();
    await usuario.clear(campoNome());
    await usuario.type(campoNome(), 'Ana');
    await usuario.type(campoCelular(), '11912345678');
    await usuario.click(botao('Salvar cliente'));
    expect(etapa()).toBe('Pedido');
    expect(texto(linhaCliente())).toBe('Ana(11) 91234-5678Alterar');
    // As peças continuam no pedido.
    expect(screen.getAllByTestId('item-pedido')).toHaveLength(1);
  });

  it('o corpo da venda leva o nome sem espaços nas pontas e o celular só com os dígitos, sem `cpf`', async () => {
    const corpos = capturarVendas();
    const { usuario } = await abrirNaEtapaCliente();
    await usuario.type(campoNome(), '  João ');
    await usuario.type(campoCelular(), '31987654321');
    await usuario.click(botao('Escolher produtos'));
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await usuario.click(botao('Pix'));
    await usuario.click(botaoFechar());
    await screen.findByRole('dialog');
    servidor.events.removeAllListeners();
    expect(corpos).toHaveLength(1);
    expect(corpos[0]).toMatchObject({ cliente: 'João', telefone: '31987654321' });
    expect(corpos[0]).not.toHaveProperty('cpf');
  });
});

describe('MI-04 — aviso de venda com OK', () => {
  it('o aviso fica até o OK; o OK começa a venda seguinte na etapa Cliente, com pedido e cliente zerados', async () => {
    const { usuario, simulado } = await abrirNaEtapaCliente();
    await usuario.type(campoNome(), 'Maria');
    await usuario.click(botao('Escolher produtos'));
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await usuario.click(botao('Pix'));
    await usuario.click(botaoFechar());
    const aviso = await screen.findByRole('dialog');
    expect(within(aviso).getByRole('heading', { name: 'Venda registrada' })).toBeInTheDocument();
    expect(texto(within(aviso).getByText(/^Pedido #/))).toBe(`Pedido #${simulado.estado.vendas[0]!.numero} · 1 peça · R$ 55,00 em Pix · Maria`);
    // Sem toque, o aviso continua (não some sozinho).
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(within(aviso).getAllByRole('button').map((b) => texto(b))).toEqual(['OK']);
    await usuario.click(within(aviso).getByRole('button', { name: 'OK' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(etapa()).toBe('Cliente');
    expect(campoNome()).toHaveValue('');
    expect(botao('Pedido')).toBeInTheDocument();
    await usuario.click(botao('Pedido'));
    expect(screen.queryAllByTestId('item-pedido')).toHaveLength(0);
    expect(texto(linhaCliente())).toBe('Cliente não identificadoSem celularAlterar');
  });

  it('com o aviso aberto, a chave da venda registrada continua no pedido; depois do OK a próxima venda usa chave nova', async () => {
    const corpos = capturarVendas();
    const { usuario } = await abrirNaEtapaCliente();
    await usuario.click(botao('Venda sem cliente'));
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await usuario.click(botao('Pix'));
    await usuario.click(botaoFechar());
    await usuario.click(await screen.findByRole('button', { name: 'OK' }));
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await usuario.click(botao('Pix'));
    servidor.use(http.post('*/api/vendas', () => new Response(null, { status: 500 })));
    await usuario.click(botaoFechar());
    await screen.findByRole('alert');
    servidor.events.removeAllListeners();
    expect(corpos).toHaveLength(2);
    expect(corpos[0]!.chaveIdempotencia).not.toBe(corpos[1]!.chaveIdempotencia);
  });
});
