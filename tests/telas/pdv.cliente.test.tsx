/**
 * Cliente do pedido e aviso de venda (pdv-mobile-atualizado, MI-21 e MI-26).
 * - A venda começa direto em Produtos; o cliente é informado pelo "Alterar" da linha do cliente no Pedido,
 *   que abre o formulário "Cliente do pedido" (nome e celular opcionais).
 * - O celular (11 dígitos) vai no corpo da venda como `telefone`, só com os dígitos.
 * - Voltar e trocar de aba descartam a edição.
 * - O aviso de venda sai só com "Nova venda" e a venda seguinte começa em Produtos, com tudo zerado.
 */
import { screen, waitFor, within } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { servidor, usarSimulado } from '../apoio';
import { abrirApp, abrirClienteDoPedido, adicionarPeca, botaoFechar, campoCelularCliente, campoNomeCliente, esperarCatalogo, sem_nbsp, telaAtual, TOP_NADADOR_P_VINHO } from './ajuda';

const botao = (nome: RegExp | string) => screen.getByRole('button', { name: nome });
const texto = (el: Element | null | undefined) => sem_nbsp(el?.textContent);
const linhaCliente = () => screen.getByRole('button', { name: /Alterar$/ });
const mensagemIncompleto = () => screen.queryByText('Complete o celular com DDD (11 números) ou deixe em branco.');

/** Abre o PDV logado, com o catálogo carregado, e põe uma peça no pedido (a linha do cliente só existe com peça). */
async function abrirComPeca() {
  const simulado = usarSimulado({ sessaoDe: 'carlos' });
  const app = abrirApp();
  await esperarCatalogo();
  await adicionarPeca(app.usuario, TOP_NADADOR_P_VINHO);
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

describe('MI-21 — a venda começa em Produtos; cliente pelo "Alterar" do Pedido', () => {
  it('depois do login a tela é Produtos, sem formulário de cliente; pedido vazio não tem linha do cliente', async () => {
    usarSimulado({ sessaoDe: 'carlos' });
    const { usuario } = abrirApp();
    await esperarCatalogo();
    expect(telaAtual()).toBe('Produtos');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Venda sem cliente' })).not.toBeInTheDocument();
    await usuario.click(botao('Pedido'));
    expect(screen.getByText('Nenhuma peça no pedido ainda. Escolha em Produtos.')).toBeInTheDocument();
    expect(screen.queryByText('Alterar')).not.toBeInTheDocument();
  });

  it('linha do cliente com "Cliente não identificado"; "Alterar" abre o formulário vazio, com teclado numérico', async () => {
    const { usuario } = await abrirComPeca();
    expect(texto(linhaCliente())).toBe('Cliente não identificadoAlterar');
    await abrirClienteDoPedido(usuario);
    expect(telaAtual()).toBe('Cliente do pedido');
    expect(screen.getByRole('heading', { level: 1, name: 'Cliente do pedido' })).toBeInTheDocument();
    expect(campoNomeCliente()).toHaveValue('');
    expect(campoNomeCliente()).toHaveAttribute('placeholder', 'Nome do cliente');
    expect(campoCelularCliente()).toHaveValue('');
    expect(campoCelularCliente()).toHaveAttribute('inputmode', 'numeric');
    expect(botao('Salvar cliente')).toBeEnabled();
    expect(botao('Venda sem cliente')).toBeEnabled();
    expect(mensagemIncompleto()).toBeNull();
    // O botão de fechar não aparece com o formulário aberto.
    expect(screen.queryByRole('button', { name: /^(Inclua uma peça|Escolha o pagamento|Fechar venda)/ })).toBeNull();
  });

  it('celular com máscara enquanto digita; incompleto mostra a mensagem e desliga "Salvar cliente"; completo liga', async () => {
    const { usuario } = await abrirComPeca();
    await abrirClienteDoPedido(usuario);
    await usuario.type(campoCelularCliente(), '3198765');
    expect(campoCelularCliente()).toHaveValue('(31) 98765');
    expect(botao('Salvar cliente')).toBeDisabled();
    expect(mensagemIncompleto()).toBeInTheDocument();
    // 10 dígitos (fixo ou celular sem o 9) também não vale: o back exige 11 (pdv-cliente-telefone).
    await usuario.type(campoCelularCliente(), '432');
    expect(campoCelularCliente()).toHaveValue('(31) 98765-432');
    expect(botao('Salvar cliente')).toBeDisabled();
    await usuario.type(campoCelularCliente(), '1');
    expect(campoCelularCliente()).toHaveValue('(31) 98765-4321');
    expect(botao('Salvar cliente')).toBeEnabled();
    expect(mensagemIncompleto()).toBeNull();
    await usuario.type(campoCelularCliente(), '99');
    expect(campoCelularCliente()).toHaveValue('(31) 98765-4321');
  });

  it('"Salvar cliente" volta ao Pedido com "nome · celular" na linha; "Alterar" reabre preenchido; as peças continuam', async () => {
    const { usuario } = await abrirComPeca();
    await abrirClienteDoPedido(usuario);
    await usuario.type(campoNomeCliente(), '  Maria Aparecida ');
    await usuario.type(campoCelularCliente(), '31987654321');
    await usuario.click(botao('Salvar cliente'));
    expect(telaAtual()).toBe('Pedido');
    expect(texto(linhaCliente())).toBe('Maria Aparecida · (31) 98765-4321Alterar');
    await usuario.click(screen.getByText('Alterar'));
    expect(campoNomeCliente()).toHaveValue('Maria Aparecida');
    expect(campoCelularCliente()).toHaveValue('(31) 98765-4321');
    await usuario.clear(campoNomeCliente());
    await usuario.type(campoNomeCliente(), 'Ana');
    await usuario.clear(campoCelularCliente());
    await usuario.click(botao('Salvar cliente'));
    expect(texto(linhaCliente())).toBe('AnaAlterar');
    expect(screen.getAllByTestId('item-pedido')).toHaveLength(1);
  });

  it('"Venda sem cliente" apaga o cliente salvo e volta ao Pedido', async () => {
    const { usuario } = await abrirComPeca();
    await abrirClienteDoPedido(usuario);
    await usuario.type(campoNomeCliente(), 'Maria');
    await usuario.click(botao('Salvar cliente'));
    await usuario.click(screen.getByText('Alterar'));
    await usuario.click(botao('Venda sem cliente'));
    expect(telaAtual()).toBe('Pedido');
    expect(texto(linhaCliente())).toBe('Cliente não identificadoAlterar');
  });

  it('voltar e trocar de aba descartam a edição: o cliente salvo continua o mesmo', async () => {
    const { usuario } = await abrirComPeca();
    await abrirClienteDoPedido(usuario);
    await usuario.type(campoNomeCliente(), 'Maria');
    await usuario.click(botao('Salvar cliente'));

    await usuario.click(screen.getByText('Alterar'));
    await usuario.clear(campoNomeCliente());
    await usuario.type(campoNomeCliente(), 'Rascunho 1');
    await usuario.click(botao('Voltar para o pedido'));
    expect(telaAtual()).toBe('Pedido');
    expect(texto(linhaCliente())).toBe('MariaAlterar');

    await usuario.click(screen.getByText('Alterar'));
    await usuario.clear(campoNomeCliente());
    await usuario.type(campoNomeCliente(), 'Rascunho 2');
    await usuario.click(botao('Dia'));
    await usuario.click(botao(/^Pedido/));
    // Voltar à aba Pedido mostra o pedido, não o formulário.
    expect(telaAtual()).toBe('Pedido');
    expect(texto(linhaCliente())).toBe('MariaAlterar');
  });

  it('o corpo da venda leva o nome sem espaços nas pontas e o celular só com os dígitos, sem `cpf`', async () => {
    const corpos = capturarVendas();
    const { usuario } = await abrirComPeca();
    await abrirClienteDoPedido(usuario);
    await usuario.type(campoNomeCliente(), '  João ');
    await usuario.type(campoCelularCliente(), '31987654321');
    await usuario.click(botao('Salvar cliente'));
    await usuario.click(botao('Pix'));
    await usuario.click(botaoFechar());
    await screen.findByRole('dialog');
    servidor.events.removeAllListeners();
    expect(corpos).toHaveLength(1);
    expect(corpos[0]).toMatchObject({ cliente: 'João', telefone: '31987654321' });
    expect(corpos[0]).not.toHaveProperty('cpf');
  });
});

describe('MI-26 — aviso de venda com "Nova venda"', () => {
  it('o aviso mostra total, peças, pagamento e cliente; fica até "Nova venda", que volta a Produtos com tudo zerado', async () => {
    const { usuario } = await abrirComPeca();
    await abrirClienteDoPedido(usuario);
    await usuario.type(campoNomeCliente(), 'Maria');
    await usuario.click(botao('Salvar cliente'));
    await usuario.click(botao('Pix'));
    await usuario.click(botaoFechar());
    const aviso = await screen.findByRole('dialog', { name: 'Venda registrada' });
    expect(texto(within(aviso).getByText(/^R\$/))).toBe('R$ 55,00');
    expect(texto(within(aviso).getByText(/peça/))).toBe('1 peça · Pix');
    expect(within(aviso).getByText('Maria')).toBeInTheDocument();
    // Sem número do pedido no aviso (MI-26).
    expect(within(aviso).queryByText(/#/)).toBeNull();
    // Sem toque, o aviso continua (não some sozinho).
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(within(aviso).getAllByRole('button').map((b) => texto(b))).toEqual(['Nova venda']);
    await usuario.click(within(aviso).getByRole('button', { name: 'Nova venda' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(telaAtual()).toBe('Produtos');
    await usuario.click(botao('Pedido'));
    expect(screen.queryAllByTestId('item-pedido')).toHaveLength(0);
    // Cliente zerado: com a próxima peça, a linha volta a "Cliente não identificado".
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    expect(texto(linhaCliente())).toBe('Cliente não identificadoAlterar');
  });

  it('venda sem cliente: o aviso diz "Cliente não identificado"', async () => {
    const { usuario } = await abrirComPeca();
    await usuario.click(botao('Pix'));
    await usuario.click(botaoFechar());
    const aviso = await screen.findByRole('dialog', { name: 'Venda registrada' });
    expect(within(aviso).getByText('Cliente não identificado')).toBeInTheDocument();
  });

  it('com o aviso aberto, a chave da venda registrada continua no pedido; depois de "Nova venda" a próxima venda usa chave nova', async () => {
    const corpos = capturarVendas();
    const { usuario } = await abrirComPeca();
    await usuario.click(botao('Pix'));
    await usuario.click(botaoFechar());
    await usuario.click(await screen.findByRole('button', { name: 'Nova venda' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
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
