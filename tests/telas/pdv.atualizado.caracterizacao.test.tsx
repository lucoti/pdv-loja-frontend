/**
 * Caracterização da refatoração pdv-mobile-atualizado (Fase 4, passo 1), escrita sobre o código ANTES
 * da refatoração. Fecha as lacunas da tabela "Cobertura dos invariantes" do 03-arquitetura.md que os
 * testes existentes só verificavam por sinais que o design atualizado troca (AP-004): `banner` com a
 * etapa, etapa Cliente inicial, "OK" do aviso, "Aumentar desconto no total", −/+ das linhas, textos
 * "Falta escolher…" e "Só N em estoque — já no pedido".
 *
 * A asserção principal de cada teste é o corpo do POST /vendas capturado no MSW, a quantidade de
 * pedidos, o estado do simulado, `aria-pressed`/`aria-current`/`disabled` ou a regra de domínio. A
 * navegação passa só pelos helpers de `ajuda.tsx` (abrirProduto, escolherVariacao, adicionarPeca,
 * comecarNovaVenda, cancelarPedido, abrirClienteDoPedido, tocarDesconto...), que concentram o que muda.
 *
 * Um teste descreve de propósito um comportamento que vai mudar (INV-020, corrigido pelo ADR-001):
 * está marcado no nome com "[muda na etapa 4]".
 */
import { act, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import { CATALOGO } from '../../src/simulado/dados';
import { servidor, usarSimulado } from '../apoio';
import { ENTRADA_VENDA, validarEntrada } from '../contrato';
import {
  abaAtual,
  abrirApp,
  abrirClienteDoPedido,
  abrirListaDeProdutos,
  abrirProduto,
  adicionarPeca,
  botaoCor,
  botaoFechar,
  botaoTamanho,
  campoCelularCliente,
  campoNomeCliente,
  cancelarPedido,
  comecarNovaVenda,
  escolherPagamento,
  escolherVariacao,
  esperarCatalogo,
  esperarErroAoFechar,
  esperarPdv,
  esperarVendaRegistrada,
  informarCliente,
  itensPedido,
  LEGGING_M_PRETO,
  sem_nbsp,
  tocarDesconto,
  TOP_NADADOR_P_VINHO,
  type Peca,
} from './ajuda';

afterEach(() => {
  servidor.events.removeAllListeners();
});

/** PDV já logado (sessão válida), com o catálogo carregado. */
async function abrirPdv() {
  const simulado = usarSimulado({ sessaoDe: 'carlos' });
  const app = abrirApp();
  await esperarCatalogo();
  return { ...app, simulado };
}

/** Corpos dos POST /vendas e contagem dos GET /catalogo feitos pela página. */
function registrarRequisicoes() {
  const vendas: any[] = [];
  const conta = { catalogo: 0 };
  servidor.events.on('request:start', async ({ request }) => {
    const caminho = new URL(request.url).pathname;
    if (request.method === 'GET' && caminho === '/api/catalogo') conta.catalogo++;
    if (request.method === 'POST' && caminho === '/api/vendas') vendas.push(await request.clone().json());
  });
  return { vendas, conta };
}

/** Faz o POST /vendas falhar com 500 enquanto `falhar.agora` for verdadeiro; depois vai ao simulado. */
function falharVendas() {
  const falhar = { agora: true };
  servidor.use(http.post('*/api/vendas', () => (falhar.agora ? HttpResponse.json({ erro: { codigo: 'erro_interno', mensagem: 'Erro interno.' } }, { status: 500 }) : undefined)));
  return falhar;
}

const sku = (produto: string, cor: string, tamanho: string) =>
  CATALOGO.produtos.find((p) => p.nome === produto)!.skus.find((k) => k.cor.nome === cor && k.tamanho.sigla === tamanho)!;
const ID_LEGGING_M_PRETO = sku('Calça Legging', 'Preto', 'M').id;
const ID_TOP_P_VINHO = sku('Top Nadador', 'Vinho', 'P').id;
/** Saldo 1 no catálogo de exemplo. */
const LEGGING_P_MARINHO: Peca = { tipo: 'Calças', produto: 'Calça Legging', cor: 'Marinho', tamanho: 'P' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Abre a aba Pedido pela navegação "Abas" (mantida no design atualizado). */
const abrirAbaPedido = (usuario: Awaited<ReturnType<typeof abrirPdv>>['usuario']) =>
  usuario.click(within(screen.getByRole('navigation', { name: 'Abas' })).getByRole('button', { name: /^Pedido/ }));

/** Botão "Adicionar ao pedido" (pode não existir sem cor e tamanho no design atualizado, MI-23). */
const botaoAdicionar = () => screen.queryByRole('button', { name: 'Adicionar ao pedido' });

/** Fecha a venda e espera o aviso; devolve o corpo enviado nesta tentativa. */
async function fecharComSucesso(usuario: Awaited<ReturnType<typeof abrirPdv>>['usuario'], req: ReturnType<typeof registrarRequisicoes>) {
  const antes = req.vendas.length;
  await usuario.click(botaoFechar());
  await esperarVendaRegistrada();
  await waitFor(() => expect(req.vendas).toHaveLength(antes + 1));
  return req.vendas[antes];
}

/** Fecha a venda esperando erro; devolve o corpo enviado nesta tentativa. */
async function fecharComErro(usuario: Awaited<ReturnType<typeof abrirPdv>>['usuario'], req: ReturnType<typeof registrarRequisicoes>) {
  const antes = req.vendas.length;
  await usuario.click(botaoFechar());
  await waitFor(() => expect(req.vendas).toHaveLength(antes + 1));
  await esperarErroAoFechar();
  return req.vendas[antes];
}

describe('INV-001 + INV-012 — corpo exato do POST /vendas, sem e com cliente; mesma peça soma na linha', () => {
  it('sem cliente e com cliente (nome + celular) e desconto: corpo igual ao contrato, mesma peça duas vezes vai com qtd 2', async () => {
    const req = registrarRequisicoes();
    const { usuario, simulado } = await abrirPdv();

    // Venda 1: sem cliente, Legging duas vezes (soma na linha, sem −/+), Top uma vez.
    await adicionarPeca(usuario, LEGGING_M_PRETO);
    await adicionarPeca(usuario, LEGGING_M_PRETO);
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await escolherPagamento(usuario, 'Pix');
    const semCliente = await fecharComSucesso(usuario, req);
    expect(semCliente.chaveIdempotencia).toMatch(UUID);
    expect({ ...semCliente, chaveIdempotencia: 'x' }).toEqual({
      chaveIdempotencia: 'x',
      itens: [
        { skuId: ID_LEGGING_M_PRETO, qtd: 2, descPercent: 0 },
        { skuId: ID_TOP_P_VINHO, qtd: 1, descPercent: 0 },
      ],
      descontoTotalCentavos: 0,
      cliente: '',
      telefone: '',
      pagamentoId: 'pix',
    });
    validarEntrada(ENTRADA_VENDA, semCliente);

    // Venda 2: com cliente (nome com espaços nas pontas e celular de 11 dígitos) e R$ 10 de desconto.
    await comecarNovaVenda(usuario);
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await informarCliente(usuario, '  Maria  ', '31987654321');
    await tocarDesconto(usuario, 'Aumentar', 2);
    await escolherPagamento(usuario, 'Crédito');
    const comCliente = await fecharComSucesso(usuario, req);
    expect(comCliente.chaveIdempotencia).toMatch(UUID);
    expect(comCliente.chaveIdempotencia).not.toBe(semCliente.chaveIdempotencia);
    expect({ ...comCliente, chaveIdempotencia: 'x' }).toEqual({
      chaveIdempotencia: 'x',
      itens: [{ skuId: ID_TOP_P_VINHO, qtd: 1, descPercent: 0 }],
      descontoTotalCentavos: 1000,
      cliente: 'Maria',
      telefone: '31987654321',
      pagamentoId: 'credito',
    });
    validarEntrada(ENTRADA_VENDA, comCliente);
    expect(simulado.estado.vendas.map((v) => v.totalCentavos)).toEqual([2 * 8900 + 5500, 5500 - 1000]);
  });
});

describe('INV-012 — "Adicionar ao pedido" não passa do saldo, contando o que já está no pedido', () => {
  it('saldo 1 já no pedido e saldo 5 completo: o botão fica desligado, o toque não soma, e o corpo leva o saldo', async () => {
    const req = registrarRequisicoes();
    const { usuario } = await abrirPdv();

    await adicionarPeca(usuario, LEGGING_P_MARINHO);
    await escolherVariacao(usuario, LEGGING_P_MARINHO);
    expect(botaoAdicionar()).toBeDisabled();
    await usuario.click(botaoAdicionar()!);

    for (let i = 0; i < 5; i++) await adicionarPeca(usuario, LEGGING_M_PRETO);
    await escolherVariacao(usuario, LEGGING_M_PRETO);
    expect(botaoAdicionar()).toBeDisabled();
    await usuario.click(botaoAdicionar()!);
    // Outro tamanho da mesma cor continua liberado (o limite é por SKU).
    await usuario.click(botaoTamanho('G'));
    expect(botaoAdicionar()).toBeEnabled();

    await abrirAbaPedido(usuario);
    await escolherPagamento(usuario, 'Pix');
    const corpo = await fecharComSucesso(usuario, req);
    expect(corpo.itens).toEqual([
      { skuId: sku('Calça Legging', 'Marinho', 'P').id, qtd: 1, descPercent: 0 },
      { skuId: ID_LEGGING_M_PRETO, qtd: 5, descPercent: 0 },
    ]);
  });
});

describe('INV-011 — "Cancelar pedido" e "Nova venda" zeram o pedido (inclusive o cliente) e trocam a chave', () => {
  it('Cancelar: próximo envio sem cliente, sem desconto, sem a peça anterior, sem pagamento escolhido e com chave nova; aba Produtos', async () => {
    const req = registrarRequisicoes();
    const { usuario } = await abrirPdv();
    const falhar = falharVendas();

    await adicionarPeca(usuario, LEGGING_M_PRETO);
    await informarCliente(usuario, 'Maria', '31987654321');
    await tocarDesconto(usuario, 'Aumentar', 1);
    await escolherPagamento(usuario, 'Dinheiro');
    const antes = await fecharComErro(usuario, req);
    expect(antes).toMatchObject({ cliente: 'Maria', telefone: '31987654321', descontoTotalCentavos: 500, pagamentoId: 'dinheiro' });

    await cancelarPedido(usuario);
    expect(abaAtual()).toBe('Produtos');
    await abrirAbaPedido(usuario);
    expect(itensPedido()).toHaveLength(0);
    // Pedido vazio mostra só a mensagem (MI-24): a linha do cliente aparece com a peça nova.
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    expect(screen.getByText('Cliente não identificado')).toBeInTheDocument();
    expect(screen.queryByText(/Maria|98765/)).not.toBeInTheDocument();
    // Pagamento zerado: o botão de fechar pede a forma de pagamento.
    expect(sem_nbsp(botaoFechar().textContent)).toMatch(/^Escolha o pagamento/);
    await escolherPagamento(usuario, 'Pix');
    falhar.agora = false;
    const depois = await fecharComSucesso(usuario, req);
    expect({ ...depois, chaveIdempotencia: 'x' }).toEqual({
      chaveIdempotencia: 'x',
      itens: [{ skuId: ID_TOP_P_VINHO, qtd: 1, descPercent: 0 }],
      descontoTotalCentavos: 0,
      cliente: '',
      telefone: '',
      pagamentoId: 'pix',
    });
    expect(depois.chaveIdempotencia).toMatch(UUID);
    expect(depois.chaveIdempotencia).not.toBe(antes.chaveIdempotencia);
  });

  it('Nova venda: próximo envio sem o cliente da venda anterior, sem desconto e com chave nova; aba Produtos', async () => {
    const req = registrarRequisicoes();
    const { usuario } = await abrirPdv();

    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await informarCliente(usuario, 'Ana', '11912345678');
    await tocarDesconto(usuario, 'Aumentar', 1);
    await escolherPagamento(usuario, 'Pix');
    const primeira = await fecharComSucesso(usuario, req);
    expect(primeira).toMatchObject({ cliente: 'Ana', telefone: '11912345678', descontoTotalCentavos: 500 });

    await comecarNovaVenda(usuario);
    expect(abaAtual()).toBe('Produtos');
    await abrirAbaPedido(usuario);
    expect(itensPedido()).toHaveLength(0);
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    expect(itensPedido()).toHaveLength(1);
    expect(screen.getByText('Cliente não identificado')).toBeInTheDocument();
    expect(screen.queryByText(/Ana|91234/)).not.toBeInTheDocument();
    expect(sem_nbsp(botaoFechar().textContent)).toMatch(/^Escolha o pagamento/);
    await escolherPagamento(usuario, 'Débito');
    const segunda = await fecharComSucesso(usuario, req);
    expect({ ...segunda, chaveIdempotencia: 'x' }).toEqual({
      chaveIdempotencia: 'x',
      itens: [{ skuId: ID_TOP_P_VINHO, qtd: 1, descPercent: 0 }],
      descontoTotalCentavos: 0,
      cliente: '',
      telefone: '',
      pagamentoId: 'debito',
    });
    expect(segunda.chaveIdempotencia).not.toBe(primeira.chaveIdempotencia);
  });

  it('trava em ref (AP-001): "Cancelar pedido" no mesmo instante do "Fechar venda", sem redesenho, não zera o pedido nem troca de aba', async () => {
    const req = registrarRequisicoes();
    const { usuario, simulado } = await abrirPdv();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await informarCliente(usuario, 'Bia');
    await escolherPagamento(usuario, 'Pix');
    const fechar = botaoFechar();
    const cancelar = screen.getByRole('button', { name: 'Cancelar pedido' });
    act(() => {
      fechar.click();
      cancelar.click();
    });
    await esperarVendaRegistrada();
    expect(req.vendas).toHaveLength(1);
    expect(req.vendas[0]).toMatchObject({ cliente: 'Bia', itens: [{ skuId: ID_TOP_P_VINHO, qtd: 1, descPercent: 0 }] });
    expect(simulado.estado.vendas).toHaveLength(1);
    // O Cancelar não passou: a tela continua na aba Pedido (Cancelar levaria para Produtos).
    expect(abaAtual()).toMatch(/^Pedido/);
  });
});

describe('INV-013 — "Cancelar pedido" desligado durante o envio', () => {
  it('com o envio preso, o Cancelar está desligado e o toque não zera o pedido; o reenvio leva o mesmo corpo', async () => {
    const req = registrarRequisicoes();
    const { usuario } = await abrirPdv();
    let liberar!: () => void;
    const preso = new Promise<void>((r) => (liberar = r));
    const segurar = { agora: true };
    servidor.use(
      http.post('*/api/vendas', async () => {
        if (!segurar.agora) return undefined;
        await preso;
        return HttpResponse.json({ erro: { codigo: 'erro_interno', mensagem: 'Erro interno.' } }, { status: 500 });
      }),
    );
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await escolherPagamento(usuario, 'Pix');
    await usuario.click(botaoFechar());
    await waitFor(() => expect(req.vendas).toHaveLength(1));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancelar pedido' })).toBeDisabled());
    await usuario.click(screen.getByRole('button', { name: 'Cancelar pedido' }));
    liberar();
    await esperarErroAoFechar();
    expect(screen.getByRole('button', { name: 'Cancelar pedido' })).toBeEnabled();
    segurar.agora = false;
    const reenvio = await fecharComSucesso(usuario, req);
    expect(reenvio).toEqual(req.vendas[0]);
    expect(reenvio.itens).toEqual([{ skuId: ID_TOP_P_VINHO, qtd: 1, descPercent: 0 }]);
  });
});

describe('INV-014 — o erro do fechamento some na próxima mudança do pedido', () => {
  it('trocar o pagamento apaga o erro; tirar a peça (lixeira) apaga o erro; o pedido continua intacto entre as tentativas', async () => {
    const req = registrarRequisicoes();
    const { usuario } = await abrirPdv();
    falharVendas();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await adicionarPeca(usuario, LEGGING_M_PRETO);
    await escolherPagamento(usuario, 'Pix');
    const primeira = await fecharComErro(usuario, req);
    await escolherPagamento(usuario, 'Débito');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    const segunda = await fecharComErro(usuario, req);
    expect({ ...segunda, pagamentoId: 'pix' }).toEqual(primeira);
    // Lixeira: "Tirar" hoje, "Tirar peça" no design atualizado.
    await usuario.click(within(itensPedido()[0]!).getByRole('button', { name: /^Tirar/ }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(itensPedido()).toHaveLength(1);
    const terceira = await fecharComErro(usuario, req);
    expect(terceira.itens).toEqual([{ skuId: ID_LEGGING_M_PRETO, qtd: 1, descPercent: 0 }]);
    expect(new Set(req.vendas.map((v) => v.chaveIdempotencia)).size).toBe(1);
  });
});

describe('INV-015 — a recarga do catálogo atualiza o preço das linhas', () => {
  it('409 sem_estoque com preço novo no ERP: recarrega o catálogo e o total do botão de fechar usa o preço novo', async () => {
    const req = registrarRequisicoes();
    const { usuario, simulado } = await abrirPdv();
    await adicionarPeca(usuario, LEGGING_M_PRETO);
    await adicionarPeca(usuario, LEGGING_M_PRETO);
    await escolherPagamento(usuario, 'Pix');
    expect(sem_nbsp(botaoFechar().textContent)).toContain('R$ 178,00');
    const noSimulado = simulado.estado.catalogo.produtos.flatMap((p) => p.skus).find((k) => k.id === ID_LEGGING_M_PRETO)!;
    noSimulado.saldo = 1;
    noSimulado.precoCentavos = 9900;
    // Entrar em Produtos/Pedido também busca o catálogo; conta só o que o "Fechar venda" disparou.
    const antes = req.conta.catalogo;
    await fecharComErro(usuario, req);
    await waitFor(() => expect(req.conta.catalogo - antes).toBe(1));
    await waitFor(() => expect(sem_nbsp(botaoFechar().textContent)).toContain('R$ 198,00'));
  });
});

describe('INV-016 — trocar de cor mantém o tamanho que existe na cor nova', () => {
  it('Top Nadador: M continua escolhido de Preto para Marinho; GG some ao ir para Vinho (saldo 0, fora do catálogo); "Adicionar" só com tamanho', async () => {
    const { usuario } = await abrirPdv();
    await abrirProduto(usuario, TOP_NADADOR_P_VINHO);
    await usuario.click(botaoCor('Preto'));
    await usuario.click(botaoTamanho('M'));
    await usuario.click(botaoCor('Marinho'));
    expect(botaoCor('Marinho')).toHaveAttribute('aria-pressed', 'true');
    expect(botaoTamanho('M')).toHaveAttribute('aria-pressed', 'true');
    expect(botaoAdicionar()).toBeEnabled();
    await usuario.click(botaoTamanho('GG'));
    await usuario.click(botaoCor('Vinho'));
    expect(screen.queryByRole('button', { name: /^GGestoque/ })).not.toBeInTheDocument();
    for (const t of ['P', 'M', 'G']) expect(botaoTamanho(t)).toHaveAttribute('aria-pressed', 'false');
    // Sem tamanho escolhido o botão não aparece (MI-23). Antes da refatoração aparecia desligado; a
    // asserção condicional da caracterização foi apertada na validação final (T8).
    expect(botaoAdicionar()).toBeNull();
  });
});

describe('INV-017 — tipo escolhido que some numa recarga volta para o primeiro', () => {
  it('venda de um Top com "Tops" escolhido; a recarga depois da venda tira o tipo; "Bermudas" volta marcado e "Tops" some', async () => {
    const req = registrarRequisicoes();
    const { usuario, simulado } = await abrirPdv();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await escolherPagamento(usuario, 'Pix');
    servidor.use(
      http.get('*/api/catalogo', () => {
        const catalogo = structuredClone(simulado.estado.catalogo);
        catalogo.produtos = catalogo.produtos.filter((p) => p.tipoId !== 2);
        catalogo.tipos = catalogo.tipos.filter((t) => t.id !== 2);
        return HttpResponse.json(catalogo);
      }),
    );
    const antes = req.conta.catalogo;
    await fecharComSucesso(usuario, req);
    await waitFor(() => expect(req.conta.catalogo - antes).toBe(1));
    await comecarNovaVenda(usuario);
    // Sobe para a lista de produtos (Peça/Tecido no design atualizado) sem escolher tipo.
    await abrirListaDeProdutos(usuario);
    expect(screen.queryByRole('button', { name: 'Tops' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bermudas' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Calças' })).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('INV-030 — celular opcional; preenchido, exige 11 dígitos para salvar', () => {
  it('pelo "Alterar": 10 dígitos desligam "Salvar cliente"; 11 ligam; vazio liga; o corpo leva só os dígitos', async () => {
    const req = registrarRequisicoes();
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await abrirClienteDoPedido(usuario);
    const salvar = () => screen.getByRole('button', { name: 'Salvar cliente' });
    expect(salvar()).toBeEnabled(); // vazio vale (opcional)
    await usuario.type(campoNomeCliente(), 'Bia');
    await usuario.type(campoCelularCliente(), '3198765432');
    expect(salvar()).toBeDisabled();
    await usuario.click(salvar());
    // O toque no botão desligado não salva: o formulário continua aberto.
    expect(campoCelularCliente()).toBeInTheDocument();
    await usuario.type(campoCelularCliente(), '1');
    expect(salvar()).toBeEnabled();
    await usuario.clear(campoCelularCliente());
    expect(salvar()).toBeEnabled();
    await usuario.type(campoCelularCliente(), '31987654321');
    // Mais dígitos que 11 são ignorados.
    await usuario.type(campoCelularCliente(), '99');
    expect(salvar()).toBeEnabled();
    await usuario.click(salvar());
    await waitFor(() => expect(abaAtual()).toMatch(/^Pedido/));
    await escolherPagamento(usuario, 'Pix');
    const corpo = await fecharComSucesso(usuario, req);
    expect([corpo.cliente, corpo.telefone]).toEqual(['Bia', '31987654321']);
  });

  it('celular vazio: venda com nome e telefone vazio', async () => {
    const req = registrarRequisicoes();
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await abrirClienteDoPedido(usuario);
    await usuario.type(campoNomeCliente(), 'Caio');
    await usuario.click(screen.getByRole('button', { name: 'Salvar cliente' }));
    await waitFor(() => expect(abaAtual()).toMatch(/^Pedido/));
    await escolherPagamento(usuario, 'Pix');
    const corpo = await fecharComSucesso(usuario, req);
    expect([corpo.cliente, corpo.telefone]).toEqual(['Caio', '']);
  });
});

describe('INV-031 — desconto no pedido em R$, de 5 em 5, nunca acima do bruto', () => {
  it('Legging (R$ 89): "+" até travar e um "−" → R$ 80; Top (R$ 55): "−" no zero não fica negativo, um "+" → R$ 5', async () => {
    const req = registrarRequisicoes();
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, LEGGING_M_PRETO);
    await tocarDesconto(usuario, 'Aumentar', 25);
    expect(screen.getByRole('button', { name: /^Aumentar desconto/ })).toBeDisabled();
    await tocarDesconto(usuario, 'Diminuir', 1);
    expect(screen.getByRole('button', { name: /^Aumentar desconto/ })).toBeEnabled();
    await escolherPagamento(usuario, 'Pix');
    expect((await fecharComSucesso(usuario, req)).descontoTotalCentavos).toBe(8000);

    await comecarNovaVenda(usuario);
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await tocarDesconto(usuario, 'Diminuir', 2);
    await tocarDesconto(usuario, 'Aumentar', 1);
    await escolherPagamento(usuario, 'Pix');
    expect((await fecharComSucesso(usuario, req)).descontoTotalCentavos).toBe(500);
  });

  it('Top (R$ 55): o desconto máximo é o bruto inteiro (R$ 55, múltiplo de 5) e o total vai a zero no servidor', async () => {
    const req = registrarRequisicoes();
    const { usuario, simulado } = await abrirPdv();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await tocarDesconto(usuario, 'Aumentar', 20);
    await escolherPagamento(usuario, 'Pix');
    expect((await fecharComSucesso(usuario, req)).descontoTotalCentavos).toBe(5500);
    expect(simulado.estado.vendas[0]!.totalCentavos).toBe(0);
  });
});

describe('INV-020 — corrigido: o fim da carga do catálogo não remonta mais a navegação (ADR-001)', () => {
  /**
   * Até a pdv-mobile-refatorado a `navigation "Abas"` desenhada com o catálogo carregando saía da página
   * quando ele terminava de carregar, e outra entrava no lugar (um toque nesse instante podia se perder).
   * O ADR-001 desenha as abas uma vez, acima dos ramos: o elemento é o mesmo antes e depois da carga
   * (mudança intencional aprovada pelo Lucas em 2026-10-12).
   */
  it('a navegação de antes da carga é a mesma de depois', async () => {
    let liberar!: () => void;
    const segura = new Promise<void>((r) => (liberar = r));
    usarSimulado({ sessaoDe: 'carlos' });
    servidor.use(
      http.get('*/api/catalogo', async () => {
        await segura;
        return undefined;
      }),
    );
    abrirApp();
    await esperarPdv();
    const antes = screen.getByRole('navigation', { name: 'Abas' });
    liberar();
    await esperarCatalogo();
    const depois = screen.getByRole('navigation', { name: 'Abas' });
    expect(antes.isConnected).toBe(true);
    expect(depois).toBe(antes);
  });
});
