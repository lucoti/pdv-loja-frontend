/**
 * Validação final da caracterização da pdv-mobile-atualizado (Fase 5): lacunas do código novo que a
 * suíte não conferia na tela.
 * - Desconto que cai sozinho com a recarga de preço (ADR-004/MI-24) e com a lixeira, conferido na tela e
 *   no corpo do POST /vendas.
 * - "Cancelar pedido" e "Nova venda" fecham o produto aberto e voltam para Peça/Tecido com o tipo (peça)
 *   ainda escolhido (comportamento atual de `recomecar`).
 * - Pedido vazio esconde cliente e pagamento, mas os dois continuam guardados e voltam com a próxima peça
 *   (decisão do Lucas registrada no log do 04-desenvolvimento.md).
 * - Trocar para a aba Produtos também descarta a edição do cliente; "Alterar" reabre com o que está salvo.
 * - Guardas de CSS (AP-003) que faltavam: barra presa no pé, grades de Tecido e Cor em 2 colunas que
 *   encolhem e estados do `.tile` (escolhido e indisponível tracejado, MI-28).
 * Nenhum teste guarda elemento da página entre redesenhos (AP-004).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CATALOGO } from '../../src/simulado/dados';
import { servidor, usarSimulado } from '../apoio';
import {
  abaAtual,
  abrirApp,
  abrirClienteDoPedido,
  abrirProduto,
  adicionarPeca,
  botaoCor,
  botaoFechar,
  campoNomeCliente,
  cancelarPedido,
  comecarNovaVenda,
  escolherPagamento,
  esperarCatalogo,
  esperarErroAoFechar,
  esperarVendaRegistrada,
  informarCliente,
  itensPedido,
  LEGGING_M_PRETO,
  sem_nbsp,
  telaAtual,
  TOP_NADADOR_P_VINHO,
} from './ajuda';

afterEach(() => {
  servidor.events.removeAllListeners();
});

const botao = (nome: RegExp | string) => screen.getByRole('button', { name: nome });
const texto = (el: Element | null | undefined) => sem_nbsp(el?.textContent);
/** Valor exibido na linha "Desconto" do Pedido (entre o "−" e o "+"). */
const valorDesconto = () => texto(botao('Aumentar desconto').previousElementSibling);
const abaPedido = () => within(screen.getByRole('navigation', { name: 'Abas' })).getByRole('button', { name: /^Pedido/ });
const linhaCliente = () => screen.getByRole('button', { name: /Alterar$/ });

async function abrirPdv() {
  const simulado = usarSimulado({ sessaoDe: 'carlos' });
  const app = abrirApp();
  await esperarCatalogo();
  return { ...app, simulado };
}

/** Corpos dos POST /vendas e contagem de GET /catalogo. */
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

const ID_TOP_P_VINHO = CATALOGO.produtos.find((p) => p.nome === 'Top Nadador')!.skus.find((k) => k.cor.nome === 'Vinho' && k.tamanho.sigla === 'P')!.id;

describe('ADR-004 / MI-24 — o desconto acompanha o bruto para baixo, na tela e no envio', () => {
  it('409 com preço menor no ERP: o desconto cai para o maior múltiplo de R$ 5 do bruto novo; tirar peça baixa de novo; o corpo leva o desconto ajustado', async () => {
    const req = registrarRequisicoes();
    const { usuario, simulado } = await abrirPdv();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    // Bruto R$ 110,00: o desconto vai até R$ 110,00.
    for (let i = 0; i < 30; i++) if (!(botao('Aumentar desconto') as HTMLButtonElement).disabled) await usuario.click(botao('Aumentar desconto'));
    expect(valorDesconto()).toBe('− R$ 110,00');
    await escolherPagamento(usuario, 'Pix');

    // Outra venda levou peças (sobrou 1) e o preço caiu para R$ 43,20: o 409 recarrega o catálogo.
    const noSimulado = simulado.estado.catalogo.produtos.flatMap((p) => p.skus).find((k) => k.id === ID_TOP_P_VINHO)!;
    noSimulado.saldo = 1;
    noSimulado.precoCentavos = 4320;
    await usuario.click(botaoFechar());
    await esperarErroAoFechar();
    await waitFor(() => expect(req.conta.catalogo).toBe(2));
    // Bruto novo R$ 86,40 → desconto R$ 85,00 (não R$ 86,40, não R$ 110,00).
    await waitFor(() => expect(valorDesconto()).toBe('− R$ 85,00'));
    expect(texto(botaoFechar().lastElementChild)).toBe('R$ 1,40');
    expect(botao('Aumentar desconto')).toBeDisabled();
    expect(botao('Diminuir desconto')).toBeEnabled();
    expect(within(itensPedido()[0]!).getByText('Só 1 em estoque — tire a peça e adicione de novo')).toBeInTheDocument();

    // Tira a linha e adiciona 1 de novo: bruto R$ 43,20 → o desconto (já zerado com o pedido vazio) fica em zero.
    await usuario.click(within(itensPedido()[0]!).getByRole('button', { name: 'Tirar peça' }));
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    expect(valorDesconto()).toBe('R$ 0,00');
    expect(botao('Diminuir desconto')).toBeDisabled();
    for (let i = 0; i < 10; i++) if (!(botao('Aumentar desconto') as HTMLButtonElement).disabled) await usuario.click(botao('Aumentar desconto'));
    expect(valorDesconto()).toBe('− R$ 40,00');
    await usuario.click(botaoFechar());
    await esperarVendaRegistrada();
    await waitFor(() => expect(req.vendas).toHaveLength(2));
    expect(req.vendas[1]).toMatchObject({ itens: [{ skuId: ID_TOP_P_VINHO, qtd: 1, descPercent: 0 }], descontoTotalCentavos: 4000, pagamentoId: 'pix' });
    expect(simulado.estado.vendas.map((v) => v.totalCentavos)).toEqual([320]);
  });

  it('tirar uma de duas linhas com o desconto no teto: a linha Desconto, o resumo e o botão acompanham', async () => {
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, LEGGING_M_PRETO); // R$ 89,00
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO); // R$ 55,00
    for (let i = 0; i < 30; i++) if (!(botao('Aumentar desconto') as HTMLButtonElement).disabled) await usuario.click(botao('Aumentar desconto'));
    expect(valorDesconto()).toBe('− R$ 140,00');
    // Tira o Top (segunda linha): bruto R$ 89,00 → R$ 85,00.
    await usuario.click(within(itensPedido()[1]!).getByRole('button', { name: 'Tirar peça' }));
    expect(valorDesconto()).toBe('− R$ 85,00');
    expect(texto(screen.getByTestId('totais'))).toBe('1 peçaR$ 89,00Desconto− R$ 85,00');
    expect(texto(botaoFechar().lastElementChild)).toBe('R$ 4,00');
    expect(botao('Aumentar desconto')).toBeDisabled();
  });
});

describe('Cancelar pedido / Nova venda — fecham o produto aberto e mantêm a peça (tipo) escolhida', () => {
  it('Cancelar com um produto aberto na aba Produtos: volta para Peça/Tecido, com "Tops" ainda marcado', async () => {
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, LEGGING_M_PRETO);
    // Abre o Top Nadador (tipo Tops) e sai para o Pedido sem adicionar: o produto fica aberto em Produtos.
    await abrirProduto(usuario, TOP_NADADOR_P_VINHO);
    await usuario.click(botaoCor('Vinho'));
    expect(telaAtual()).toBe('Cor e tamanho');
    await usuario.click(abaPedido());
    await cancelarPedido(usuario);
    expect(abaAtual()).toBe('Produtos');
    expect(telaAtual()).toBe('Produtos');
    expect(screen.queryByRole('button', { name: 'Voltar para peça e tecido' })).not.toBeInTheDocument();
    expect(botao('Tops')).toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByRole('region', { name: 'Tecido' })).getAllByRole('button').map((b) => texto(b))).toEqual(['Top Nadador']);
  });

  it('Nova venda com um produto aberto: volta para Peça/Tecido, com "Calças" ainda marcado', async () => {
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await abrirProduto(usuario, LEGGING_M_PRETO);
    expect(telaAtual()).toBe('Cor e tamanho');
    await usuario.click(abaPedido());
    await escolherPagamento(usuario, 'Pix');
    await usuario.click(botaoFechar());
    await comecarNovaVenda(usuario);
    expect(screen.queryByRole('button', { name: 'Voltar para peça e tecido' })).not.toBeInTheDocument();
    expect(botao('Calças')).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('Pedido vazio — cliente e pagamento continuam guardados (decisão registrada no 04-desenvolvimento.md)', () => {
  it('tirar a única peça esconde cliente, desconto e pagamento; com a próxima peça, cliente e pagamento voltam e o desconto fica em zero', async () => {
    const req = registrarRequisicoes();
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await informarCliente(usuario, 'Maria', '31987654321');
    await escolherPagamento(usuario, 'Pix');
    await usuario.click(botao('Aumentar desconto'));
    await usuario.click(within(itensPedido()[0]!).getByRole('button', { name: 'Tirar peça' }));
    expect(screen.getByText('Nenhuma peça no pedido ainda. Escolha em Produtos.')).toBeInTheDocument();
    for (const nome of [/Alterar$/, 'Pix', 'Cancelar pedido', 'Aumentar desconto']) expect(screen.queryByRole('button', { name: nome })).not.toBeInTheDocument();
    expect(texto(botaoFechar())).toBe('Inclua uma peçaR$ 0,00');

    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    expect(texto(linhaCliente())).toBe('Maria · (31) 98765-4321Alterar');
    expect(botao('Pix')).toHaveAttribute('aria-pressed', 'true');
    expect(valorDesconto()).toBe('R$ 0,00');
    await usuario.click(botaoFechar());
    await esperarVendaRegistrada();
    await waitFor(() => expect(req.vendas).toHaveLength(1));
    expect(req.vendas[0]).toMatchObject({ cliente: 'Maria', telefone: '31987654321', pagamentoId: 'pix', descontoTotalCentavos: 0 });
  });
});

describe('MI-21 / ADR-003 — trocar de aba descarta a edição do cliente', () => {
  it('ir para Produtos com o formulário aberto: ao voltar, o Pedido aparece e "Alterar" reabre com o cliente salvo, não com o rascunho', async () => {
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await informarCliente(usuario, 'Bia');
    await abrirClienteDoPedido(usuario);
    await usuario.clear(campoNomeCliente());
    await usuario.type(campoNomeCliente(), 'Rascunho');
    expect(telaAtual()).toBe('Cliente do pedido');
    await usuario.click(within(screen.getByRole('navigation', { name: 'Abas' })).getByRole('button', { name: 'Produtos' }));
    expect(telaAtual()).toBe('Produtos');
    // Nem "Salvar cliente" nem "Venda sem cliente" na barra fora do formulário.
    expect(screen.queryByRole('button', { name: 'Salvar cliente' })).not.toBeInTheDocument();
    await usuario.click(abaPedido());
    expect(telaAtual()).toBe('Pedido');
    expect(texto(linhaCliente())).toBe('BiaAlterar');
    await usuario.click(screen.getByText('Alterar'));
    expect(campoNomeCliente()).toHaveValue('Bia');
  });

  it('só a edição do cliente é descartada: ir a outra aba e voltar mantém o tecido aberto, a cor e o tamanho escolhidos', async () => {
    const { usuario } = await abrirPdv();
    await abrirProduto(usuario, LEGGING_M_PRETO);
    await usuario.click(botaoCor('Preto'));
    await usuario.click(botao(/^Mestoque/));
    await usuario.click(abaPedido());
    await usuario.click(within(screen.getByRole('navigation', { name: 'Abas' })).getByRole('button', { name: 'Produtos' }));
    expect(telaAtual()).toBe('Cor e tamanho');
    expect(botaoCor('Preto')).toHaveAttribute('aria-pressed', 'true');
    expect(botao(/^Mestoque/)).toHaveAttribute('aria-pressed', 'true');
    expect(botao('Adicionar ao pedido')).toBeEnabled();
  });
});

/*
 * Guardas de CSS (AP-003): jsdom não aplica o CSS; a regra é lida do arquivo pela classe em uso na tela.
 */
const semComentarios = (arquivo: string) => readFileSync(resolve(import.meta.dirname, '../../src', arquivo), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
/** Declarações de uma regra (seletor exato) de um arquivo CSS; a última declaração de cada propriedade vence. */
function regra(arquivo: string, seletor: string): Record<string, string> {
  const css = semComentarios(arquivo);
  const escapado = seletor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const corpos = [...css.matchAll(new RegExp(`(?:^|[\\s,}])${escapado}\\s*\\{([^}]*)\\}`, 'g'))].map((m) => m[1]!);
  const pares = corpos.flatMap((r) => r.split(';').map((d) => d.split(/:(.*)/s).slice(0, 2).map((p) => p.trim())).filter((d) => d.length === 2 && d[0]));
  return Object.fromEntries(pares.map(([prop, valor]) => [prop!, valor!.replace(/\s+/g, ' ')]));
}
/** Todas as classes do elemento em Pdv.module.css, juntas. */
const regraDoElemento = (el: Element) => Object.assign({}, ...[...el.classList].map((c) => regra('telas/Pdv/Pdv.module.css', `.${c}`)));

describe('AP-003 — guardas de layout que faltavam', () => {
  it('barra de ação presa no pé (position: sticky; bottom: 0)', async () => {
    const { usuario } = await abrirPdv();
    await usuario.click(abaPedido());
    const barra = botaoFechar().parentElement!;
    const r = regraDoElemento(barra);
    expect([r.position, r.bottom]).toEqual(['sticky', '0']);
  });

  it('Tecido e Cor em grades de 2 colunas que encolhem (minmax(0, 1fr))', async () => {
    const { usuario } = await abrirPdv();
    const tecidos = within(screen.getByRole('region', { name: 'Tecido' })).getAllByRole('button');
    const gradeTecidos = tecidos[0]!.parentElement!;
    expect([...gradeTecidos.children]).toEqual(tecidos);
    expect(regraDoElemento(gradeTecidos)).toMatchObject({ display: 'grid', 'grid-template-columns': 'repeat(2, minmax(0, 1fr))' });
    await usuario.click(tecidos[0]!);
    const cores = within(screen.getByRole('region', { name: 'Cor' })).getAllByRole('button');
    const gradeCores = cores[0]!.parentElement!;
    expect([...gradeCores.children]).toEqual(cores);
    expect(regraDoElemento(gradeCores)).toMatchObject({ display: 'grid', 'grid-template-columns': 'repeat(2, minmax(0, 1fr))' });
  });

  it('MI-28 — `.tile`: escolhido por aria-pressed com os tokens de escolhido; indisponível por disabled com borda tracejada', async () => {
    const tile = regra('telas/comum.module.css', '.tile');
    expect([tile.border, tile.background, tile['box-shadow']]).toEqual(['var(--tile-borda)', 'var(--tile-bg)', 'var(--tile-sombra)']);
    const escolhido = regra('telas/comum.module.css', ".tile[aria-pressed='true']");
    expect([escolhido.border, escolhido.background, escolhido['box-shadow']]).toEqual(['var(--tile-escolhido-borda)', 'var(--tile-escolhido-bg)', 'var(--tile-escolhido-sombra)']);
    const off = regra('telas/comum.module.css', '.tile:disabled');
    expect([off.border, off.color, off['box-shadow']]).toEqual(['var(--tile-off-borda)', 'var(--tile-off-texto)', 'none']);
    const tokens = regra('estilos/tokens.css', ':root');
    expect(tokens['--tile-off-borda']).toMatch(/\bdashed\b/);
    // Os botões de escolha da tela usam a classe (o nome não é embaralhado nos testes: non-scoped).
    const { usuario } = await abrirPdv();
    expect(botao('Bermudas').classList).toContain('tile');
    await usuario.click(botao(/^Bermuda Ciclista/));
    expect(botaoCor('Preto').classList).toContain('tile');
  });
});
