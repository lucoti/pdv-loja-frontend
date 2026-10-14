/** Tela de venda (RF-F04..RF-F10) pela página inteira, contra o simulado. */
import { act, screen, waitFor, within } from '@testing-library/react';
import { getResponse, http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { api } from '../../src/api/cliente';
import type { Catalogo } from '../../src/api/cliente';
import { CATALOGO } from '../../src/simulado/dados';
import { servidor, usarSimulado } from '../apoio';
import { ENTRADA_VENDA, validarEntrada } from '../contrato';
import {
  abrirApp,
  adicionarPeca,
  botaoCor,
  botaoFechar,
  botaoTamanho,
  esperarCatalogo,
  esperarPdv,
  itensPedido,
  LEGGING_M_PRETO,
  sem_nbsp,
  TOP_NADADOR_P_VINHO,
  topoDoPdv,
  totais,
  informarCliente,
  telaAtual,
} from './ajuda';

/** Abre o PDV já logado (sessão válida) com o catálogo carregado. */
async function abrirPdv(...sobrescritas: Parameters<typeof servidor.use>) {
  const simulado = usarSimulado({ sessaoDe: 'carlos' });
  // Sobrescritas entram depois do simulado (usarSimulado reinicia os handlers).
  if (sobrescritas.length) servidor.use(...sobrescritas);
  const app = abrirApp();
  await esperarCatalogo();
  return { ...app, simulado };
}

/** Captura os corpos de POST /vendas que o front envia (sem interferir na resposta). */
function capturarVendas() {
  const corpos: any[] = [];
  servidor.events.on('request:start', async ({ request }) => {
    if (request.method === 'POST' && request.url.endsWith('/api/vendas')) corpos.push(await request.clone().json());
  });
  return corpos;
}

const aba = (nome: RegExp | string) => screen.getByRole('button', { name: nome });
const texto = (el: HTMLElement) => sem_nbsp(el.textContent);
/** Linha do cliente no Pedido (MI-24): botão com "nome · celular" (ou "Cliente não identificado") e "Alterar". */
const linhaCliente = () => screen.getByRole('button', { name: /Alterar$/ });

/** Monta o pedido de referência do back: 2× Legging Preto M 10%, Top Nadador Vinho P, −R$ 15, Pix. */
async function montarReferencia(usuario: Awaited<ReturnType<typeof abrirPdv>>['usuario']) {
  await adicionarPeca(usuario, LEGGING_M_PRETO);
  await adicionarPeca(usuario, LEGGING_M_PRETO);
  await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
  // MI-03 (pdv-mobile-refatorado): sem desconto por item na tela; o pedido de referência usa só o
  // desconto no pedido (6 × R$ 5 = R$ 30,00). Antes: 10% na legging + R$ 15,00 (total R$ 200,20).
  for (let i = 0; i < 6; i++) await usuario.click(screen.getByRole('button', { name: 'Aumentar desconto' }));
  // MI-21: nome e celular pelo "Alterar" da linha do cliente no Pedido; o CPF saiu do PDV.
  await informarCliente(usuario, 'Maria', '31987654321');
  await usuario.click(screen.getByRole('button', { name: 'Pix' }));
}

// MI-20 / ADR-002 (pdv-mobile-atualizado): o cabeçalho saiu; a tela atual é o nome do `main` e as abas
// ficam no topo.
describe('RF-F04 — tela atual e abas no topo', () => {
  it('tela atual no nome do conteúdo ("Produtos", "Cor e tamanho", "Pedido", "Dia"); sem "BALCÃO", vendedor, data completa ou número do pedido', async () => {
    const { usuario } = await abrirPdv();
    expect(telaAtual()).toBe('Produtos');
    await usuario.click(aba(/^Bermuda Ciclista/));
    expect(telaAtual()).toBe('Cor e tamanho');
    await usuario.click(aba('Pedido'));
    expect(telaAtual()).toBe('Pedido');
    await usuario.click(aba('Dia'));
    expect(telaAtual()).toBe('Dia');
    // MI-27: título "Vendas de hoje" dentro do conteúdo.
    expect(texto(screen.getByRole('heading', { level: 1 }))).toBe('Vendas de hoje');
    // Trocar de aba não fecha o produto: ao voltar para Produtos, a tela volta a ser a de cor/tamanho.
    await usuario.click(aba('Produtos'));
    expect(telaAtual()).toBe('Cor e tamanho');
    await usuario.click(aba('Voltar para peça e tecido'));
    expect(telaAtual()).toBe('Produtos');
    expect(screen.queryByText('BALCÃO')).not.toBeInTheDocument();
    expect(screen.queryByText(/Carlos/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\d{2}\/\d{2}\/\d{4}/)).not.toBeInTheDocument();
    expect(screen.queryByText(/#\d+/)).not.toBeInTheDocument();
  });

  it('com o catálogo em falha, a tela atual segue a aba', async () => {
    usarSimulado({ sessaoDe: 'carlos' });
    servidor.use(http.get('*/api/catalogo', () => HttpResponse.json({ erro: { codigo: 'erro_interno', mensagem: 'Falhou.' } }, { status: 500 })));
    const { usuario } = abrirApp();
    await esperarPdv();
    await screen.findByRole('button', { name: /Tentar/ });
    expect(telaAtual()).toBe('Produtos');
    await usuario.click(aba('Pedido'));
    expect(telaAtual()).toBe('Pedido');
    await usuario.click(aba('Dia'));
    expect(telaAtual()).toBe('Dia');
    expect(texto(screen.getByRole('heading', { level: 1 }))).toBe('Vendas de hoje');
  });
});

/** Id do SKU no catálogo de exemplo (produto → cor → tamanho; 3 cores × 4 tamanhos). */
const skuId = (p: number, c: number, t: number) => (p - 1) * 12 + (c - 1) * 4 + t;
/** SKU (mutável) no catálogo da instância do simulado: mudar saldo/preço aqui imita uma mudança no ERP. */
const skuNoSimulado = (simulado: { estado: { catalogo: Catalogo } }, id: number) => simulado.estado.catalogo.produtos.flatMap((p) => p.skus).find((k) => k.id === id)!;

describe('RF-002 — aba Produtos com os tipos do ERP', () => {
  // MI-22 (pdv-mobile-atualizado): cartão "1 Peça" com os tipos e "2 Tecido" com os produtos do tipo.
  it('tipos com produto vendável; primeiro selecionado; Tecido só com produto com estoque (sem preço); tipos filtram', async () => {
    const { usuario } = await abrirPdv();
    const chips = ['Bermudas', 'Calças', 'Tops'];
    for (const t of chips) expect(aba(t)).toBeInTheDocument();
    expect(aba('Bermudas')).toHaveAttribute('aria-pressed', 'true');
    expect(aba('Calças')).toHaveAttribute('aria-pressed', 'false');
    const lista = () => within(screen.getByRole('region', { name: 'Tecido' })).getAllByRole('button').map(texto);
    expect(lista()).toEqual(['Bermuda Ciclista']); // Short Curto, todo zerado, não aparece
    await usuario.click(aba('Calças'));
    expect(aba('Calças')).toHaveAttribute('aria-pressed', 'true');
    expect(aba('Bermudas')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('button', { name: /^Bermuda Ciclista/ })).not.toBeInTheDocument();
    expect(texto(aba(/^Calça Legging/))).toBe('Calça Legging');
  });

  // MI-23 (pdv-mobile-atualizado): a linha de preço saiu da tela de cor/tamanho; o preço do tamanho
  // escolhido aparece na linha do Pedido.
  it('preço por tamanho: sem preço na tela de cor/tamanho; o Pedido usa o preço do tamanho escolhido', async () => {
    const catalogo = structuredClone(CATALOGO);
    const legging = catalogo.produtos.find((p) => p.numero === 1)!;
    for (const k of legging.skus) k.precoCentavos = k.tamanho.sigla === 'P' ? 7900 : 9900;
    usarSimulado({ sessaoDe: 'carlos', catalogo });
    const { usuario } = abrirApp();
    await esperarCatalogo();
    await usuario.click(aba('Calças'));
    await usuario.click(aba(/^Calça Legging/));
    expect(screen.queryByText(/^a partir de/)).not.toBeInTheDocument();
    await usuario.click(botaoCor('Preto'));
    await usuario.click(botaoTamanho('M'));
    expect(screen.queryByText(/R\$/)).not.toBeInTheDocument();
    await usuario.click(aba('Adicionar ao pedido'));
    await usuario.click(aba(/^Pedido/));
    expect(texto(itensPedido()[0]!)).toContain('R$ 99,00');
  });

  it('catálogo do ERP vazio: aviso "Nenhum produto cadastrado no ERP."', async () => {
    usarSimulado({ sessaoDe: 'carlos', catalogo: { tipos: [], produtos: [], pagamentos: CATALOGO.pagamentos } });
    abrirApp();
    expect(await screen.findByText('Nenhum produto cadastrado no ERP.')).toBeInTheDocument();
  });
});

describe('RF-003 — variações: cor → tamanho', () => {
  // MI-23: cartão "3 Cor" com amostra; cartão "4 Tamanho" só depois da cor; sem preço na tela.
  it('cores do produto com amostra; tamanhos só depois da cor, com sigla e "estoque N"', async () => {
    const { usuario } = await abrirPdv();
    await usuario.click(aba('Calças'));
    await usuario.click(aba(/^Calça Legging/));
    expect(screen.getByRole('heading', { level: 1, name: 'Calças' })).toBeInTheDocument();
    expect(screen.getByText('Calça Legging')).toBeInTheDocument();
    for (const c of ['Preto', 'Marinho', 'Vinho']) expect(botaoCor(c)).toHaveAttribute('aria-pressed', 'false');
    expect(botaoCor('Vinho').querySelector('span[aria-hidden]')).toHaveStyle({ background: '#6B2232' });
    expect(screen.queryByRole('region', { name: 'Tamanho' })).not.toBeInTheDocument();
    await usuario.click(botaoCor('Marinho'));
    expect(botaoCor('Marinho')).toHaveAttribute('aria-pressed', 'true');
    // A escolhida ganha o ícone de marcada.
    expect(botaoCor('Marinho').querySelector('svg')).not.toBeNull();
    expect(botaoCor('Preto').querySelector('svg')).toBeNull();
    expect(screen.getAllByRole('button', { name: /^(P|M|G|GG)estoque/ }).map(texto)).toEqual(['Pestoque 1', 'Mestoque 5', 'Gestoque 5', 'GGestoque 5']);
  });

  it('SKU inativo (Bermuda Vinho GG) e SKU sem saldo (Top Vinho GG) não aparecem', async () => {
    const { usuario } = await abrirPdv();
    await usuario.click(aba(/^Bermuda Ciclista/));
    await usuario.click(botaoCor('Vinho'));
    expect(screen.getAllByRole('button', { name: /^(P|M|G|GG)estoque/ }).map((b) => texto(b).split('estoque')[0])).toEqual(['P', 'M', 'G']);
    await usuario.click(aba('Voltar para peça e tecido'));
    await usuario.click(aba('Tops'));
    await usuario.click(aba(/^Top Nadador/));
    await usuario.click(botaoCor('Vinho'));
    expect(screen.getAllByRole('button', { name: /^(P|M|G|GG)estoque/ }).map((b) => texto(b).split('estoque')[0])).toEqual(['P', 'M', 'G']);
    for (const b of screen.getAllByRole('button', { name: /^(P|M|G|GG)estoque/ })) expect(b).toBeEnabled();
  });

  it('estampa sem hex usa a miniatura da foto como amostra', async () => {
    const catalogo = structuredClone(CATALOGO);
    for (const k of catalogo.produtos.find((p) => p.numero === 3)!.skus) if (k.cor.id === 1) k.cor = { ...k.cor, nome: 'Folhagem', hex: null, fotoUrl: 'https://blob.exemplo/folhagem.jpg' };
    usarSimulado({ sessaoDe: 'carlos', catalogo });
    const { usuario } = abrirApp();
    await esperarCatalogo();
    await usuario.click(aba(/^Bermuda Ciclista/));
    expect(botaoCor('Folhagem').querySelector('img')).toHaveAttribute('src', 'https://blob.exemplo/folhagem.jpg');
    expect(botaoCor('Marinho').querySelector('img')).toBeNull();
  });

  it('trocar de cor mantém o tamanho se ele existe na cor nova; senão limpa a escolha', async () => {
    const { usuario } = await abrirPdv();
    await usuario.click(aba('Tops'));
    await usuario.click(aba(/^Top Nadador/));
    await usuario.click(botaoCor('Preto'));
    await usuario.click(botaoTamanho('M'));
    await usuario.click(botaoCor('Marinho'));
    expect(botaoTamanho('M')).toHaveAttribute('aria-pressed', 'true');
    await usuario.click(botaoTamanho('GG'));
    await usuario.click(botaoCor('Vinho')); // Vinho GG tem saldo 0: não aparece
    expect(screen.queryByRole('button', { name: /^GGestoque/ })).not.toBeInTheDocument();
    for (const t of ['P', 'M', 'G']) expect(botaoTamanho(t)).toHaveAttribute('aria-pressed', 'false');
    // Sem tamanho escolhido não há barra de adicionar (MI-23).
    expect(screen.queryByRole('button', { name: 'Adicionar ao pedido' })).not.toBeInTheDocument();
  });

  // MI-23: a barra "Adicionar ao pedido" só aparece com cor e tamanho; saem "Falta escolher" e o preço.
  it('"Adicionar ao pedido" só aparece com cor e tamanho escolhidos, ligado', async () => {
    const { usuario } = await abrirPdv();
    await usuario.click(aba('Calças'));
    await usuario.click(aba(/^Calça Legging/));
    const adicionar = () => screen.queryByRole('button', { name: 'Adicionar ao pedido' });
    expect(adicionar()).toBeNull();
    await usuario.click(botaoCor('Preto'));
    expect(adicionar()).toBeNull();
    await usuario.click(botaoTamanho('G'));
    expect(adicionar()).toBeEnabled();
    expect(screen.queryByText(/Falta escolher|Tam G/)).not.toBeInTheDocument();
  });


  it('voltar do painel retorna a Peça/Tecido e descarta a escolha', async () => {
    const { usuario } = await abrirPdv();
    await usuario.click(aba(/^Bermuda Ciclista/));
    await usuario.click(botaoCor('Preto'));
    await usuario.click(botaoTamanho('M'));
    await usuario.click(aba('Voltar para peça e tecido'));
    expect(telaAtual()).toBe('Produtos');
    await usuario.click(aba(/^Bermuda Ciclista/));
    expect(botaoCor('Preto')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('region', { name: 'Tamanho' })).not.toBeInTheDocument();
  });

  // MI-23 (pdv-mobile-atualizado): adicionar volta para Peça/Tecido com a peça ainda marcada.
  it('adicionar volta para Peça/Tecido com a peça marcada; a aba Pedido mostra a peça', async () => {
    const { usuario } = await abrirPdv();
    await usuario.click(aba('Calças'));
    await usuario.click(aba(/^Calça Legging/));
    await usuario.click(botaoCor('Preto'));
    await usuario.click(botaoTamanho('M'));
    await usuario.click(aba('Adicionar ao pedido'));
    expect(telaAtual()).toBe('Produtos');
    expect(aba('Calças')).toHaveAttribute('aria-pressed', 'true');
    expect(aba('Produtos')).toHaveAttribute('aria-current', 'page');
    expect(aba('Pedido (1)')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adicionar ao pedido' })).not.toBeInTheDocument();
    await usuario.click(aba('Pedido (1)'));
    expect(itensPedido()).toHaveLength(1);
    // MI-24: o detalhe tem tecido, tamanho e cor; com qtd 1, sem "qtd × preço".
    expect(texto(within(itensPedido()[0]!).getByText(/^Suplex/))).toBe('Suplex · Tam M · Preto');
    expect(texto(itensPedido()[0]!)).toContain('R$ 89,00');
  });
});

describe('RF-004 — pedido limitado ao estoque', () => {
  const LEGGING_P_MARINHO = { tipo: 'Calças', produto: 'Calça Legging', cor: 'Marinho', tamanho: 'P' }; // saldo 1

  // INV-012 alterado (pdv-mobile-atualizado): sem "+" na linha; adicionar de novo soma até o saldo.
  it('adicionar de novo soma na linha até o saldo; no saldo, "Adicionar" fica desligado, sem texto extra', async () => {
    const { usuario } = await abrirPdv();
    for (let i = 0; i < 5; i++) await adicionarPeca(usuario, LEGGING_M_PRETO); // saldo 5
    const item = () => itensPedido()[0]!;
    expect(texto(item())).toContain('5 × R$ 89,00');
    expect(texto(item())).toContain('R$ 445,00');
    // No saldo, sem aviso na linha (o aviso é só para quando o saldo cai abaixo da quantidade).
    expect(within(item()).queryByText(/em estoque/)).not.toBeInTheDocument();
    await usuario.click(aba('Produtos'));
    await usuario.click(aba(/^Calça Legging/));
    await usuario.click(botaoCor('Preto'));
    await usuario.click(botaoTamanho('M'));
    expect(aba('Adicionar ao pedido')).toBeDisabled();
    expect(screen.queryByText(/em estoque/)).not.toBeInTheDocument();
    await usuario.click(aba('Adicionar ao pedido'));
    expect(aba('Pedido (5)')).toBeInTheDocument();
  });

  it('SKU com saldo 1 já no pedido: "Adicionar" desligado ao escolher de novo; outro tamanho liga', async () => {
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, LEGGING_P_MARINHO);
    expect(within(itensPedido()[0]!).queryByText(/em estoque/)).not.toBeInTheDocument();
    await usuario.click(aba('Produtos'));
    await usuario.click(aba(/^Calça Legging/));
    await usuario.click(botaoCor('Marinho'));
    await usuario.click(botaoTamanho('P'));
    expect(aba('Adicionar ao pedido')).toBeDisabled();
    await usuario.click(aba('Adicionar ao pedido'));
    expect(aba('Pedido (1)')).toBeInTheDocument();
    await usuario.click(botaoTamanho('M'));
    expect(aba('Adicionar ao pedido')).toBeEnabled();
  });
});

describe('RF-F06 — carrinho', () => {
  // MI-24: pedido vazio mostra só a mensagem; o botão de fechar aparece desligado.
  it('vazio: só a mensagem, aba sem contagem e rótulo "Inclua uma peça"', async () => {
    const { usuario } = await abrirPdv();
    expect(aba('Pedido')).toBeInTheDocument();
    await usuario.click(aba('Pedido'));
    expect(telaAtual()).toBe('Pedido');
    expect(screen.getByText('Nenhuma peça no pedido ainda. Escolha em Produtos.')).toBeInTheDocument();
    for (const nome of [/Alterar$/, 'Aumentar desconto', 'Pix', 'Cancelar pedido']) expect(screen.queryByRole('button', { name: nome })).not.toBeInTheDocument();
    expect(screen.queryByTestId('totais')).not.toBeInTheDocument();
    expect(botaoFechar()).toHaveTextContent('Inclua uma peça');
    expect(botaoFechar()).toBeDisabled();
  });

  it('mesma variação adicionada de novo soma na linha; aba mostra total de peças', async () => {
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, LEGGING_M_PRETO);
    await adicionarPeca(usuario, LEGGING_M_PRETO);
    expect(itensPedido()).toHaveLength(1);
    expect(texto(itensPedido()[0]!)).toContain('2 × R$ 89,00');
    await adicionarPeca(usuario, { ...LEGGING_M_PRETO, cor: 'Vinho' });
    expect(itensPedido()).toHaveLength(2);
    expect(aba('Pedido (3)')).toBeInTheDocument();
  });

  // MI-24: sem −/+ na linha; só a lixeira ("Tirar peça"), que tira a linha inteira.
  it('cada linha só tem a lixeira, que tira a linha inteira; sem −/+ de quantidade', async () => {
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, LEGGING_M_PRETO);
    await adicionarPeca(usuario, LEGGING_M_PRETO);
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    const legging = () => itensPedido()[0]!;
    expect(within(legging()).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(['Tirar peça']);
    expect(texto(legging())).toContain('R$ 178,00');
    await usuario.click(within(legging()).getByRole('button', { name: 'Tirar peça' }));
    expect(itensPedido()).toHaveLength(1);
    expect(texto(itensPedido()[0]!)).toContain('Top Nadador');
    expect(aba('Pedido (1)')).toBeInTheDocument();
    await usuario.click(within(itensPedido()[0]!).getByRole('button', { name: 'Tirar peça' }));
    expect(itensPedido()).toHaveLength(0);
    expect(aba('Pedido')).toBeInTheDocument();
  });

  // MI-03 (pdv-mobile-refatorado): o desconto por item saiu da tela; o subtotal é sempre o cheio e o
  // item vai com descPercent 0 (corpo conferido em "POST /vendas envia só SKU…").
  it('sem desconto por item: nenhum botão de % na linha; subtotal = preço × quantidade; "qtd × preço" no detalhe', async () => {
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, LEGGING_M_PRETO);
    await adicionarPeca(usuario, LEGGING_M_PRETO);
    const item = itensPedido()[0]!;
    for (const nome of ['sem', '5%', '10%', '15%']) expect(within(item).queryByRole('button', { name: nome })).not.toBeInTheDocument();
    expect(within(item).queryByText(/aplicado/)).not.toBeInTheDocument();
    expect(texto(within(item).getByText(/^Suplex/))).toBe('Suplex · Tam M · Preto · 2 × R$ 89,00');
    expect(texto(item)).toContain('R$ 178,00');
  });

  // MI-24: "−" desligado em zero; valor "R$ 0,00" sem desconto; o desconto diminui quando peças saem.
  it('desconto no pedido: passos de R$ 5, "R$ 0,00", "−" desligado em zero, teto no bruto e queda com o bruto', async () => {
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, LEGGING_M_PRETO);
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    const mais = () => aba('Aumentar desconto');
    const menos = () => aba('Diminuir desconto');
    const valor = () => texto(mais().previousElementSibling as HTMLElement);
    expect(valor()).toBe('R$ 0,00');
    expect(menos()).toBeDisabled();
    for (let i = 0; i < 3; i++) await usuario.click(mais());
    expect(valor()).toBe('− R$ 15,00');
    expect(menos()).toBeEnabled();
    await usuario.click(menos());
    expect(valor()).toBe('− R$ 10,00');
    // Bruto R$ 144,00 → o maior desconto em passos de R$ 5 é R$ 140,00; o "+" desliga.
    for (let i = 0; i < 40; i++) if (!(mais() as HTMLButtonElement).disabled) await usuario.click(mais());
    expect(valor()).toBe('− R$ 140,00');
    expect(mais()).toBeDisabled();
    // Tirar a legging (R$ 89,00): o desconto cai para o maior múltiplo de R$ 5 do bruto novo (R$ 55,00).
    await usuario.click(within(itensPedido()[0]!).getByRole('button', { name: 'Tirar peça' }));
    expect(valor()).toBe('− R$ 55,00');
    expect(texto(botaoFechar().lastElementChild as HTMLElement)).toBe('R$ 0,00');
    await usuario.click(menos());
    expect(mais()).toBeEnabled();
  });

  // MI-21/MI-24: linha do cliente com "Alterar", que abre "Cliente do pedido" (teclado numérico);
  // pagamento em grade com as opções do catálogo, sem ícones. O CPF saiu do PDV.
  it('linha do cliente com "Alterar"; celular com teclado numérico; pagamento em grade com as opções do catálogo', async () => {
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    expect(screen.queryByRole('textbox', { name: 'CPF (opcional)' })).not.toBeInTheDocument();
    expect(texto(linhaCliente())).toBe('Cliente não identificadoAlterar');
    for (const p of ['Dinheiro', 'Pix', 'Débito', 'Crédito']) expect(aba(p)).toHaveAttribute('aria-pressed', 'false');
    await usuario.click(aba('Débito'));
    expect(aba('Débito')).toHaveAttribute('aria-pressed', 'true');
    await usuario.click(screen.getByText('Alterar'));
    expect(screen.getByRole('textbox', { name: 'Celular' })).toHaveAttribute('inputmode', 'numeric');
    expect(screen.getByPlaceholderText('Nome do cliente')).toBeInTheDocument();
    await usuario.click(aba('Salvar cliente'));
    await informarCliente(usuario, 'Maria', '31987654321');
    expect(texto(linhaCliente())).toBe('Maria · (31) 98765-4321Alterar');
    expect(aba('Débito')).toHaveAttribute('aria-pressed', 'true');
  });

  // MI-07: o resumo tem peças/bruto e desconto; o total fica dentro do botão de fechar.
  it('totais do pedido de referência: 3 peças R$ 233,00, desconto − R$ 30,00, total R$ 203,00', async () => {
    const { usuario } = await abrirPdv();
    await montarReferencia(usuario);
    const t = screen.getByTestId('totais');
    expect(texto(t)).toBe('3 peçasR$ 233,00Desconto− R$ 30,00');
    expect(texto(botaoFechar())).toBe('Fechar vendaR$ 203,00');
  });

  it('total nunca negativo na tela: com o teto, o desconto máximo zera o total', async () => {
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    for (let i = 0; i < 12; i++) if (!(aba('Aumentar desconto') as HTMLButtonElement).disabled) await usuario.click(aba('Aumentar desconto'));
    expect(texto(botaoFechar().lastElementChild as HTMLElement)).toBe('R$ 0,00');
    expect(texto(totais().getByText('Desconto').nextElementSibling as HTMLElement)).toBe('− R$ 55,00');
  });

  // MI-25: "Cancelar pedido" zera tudo, inclusive o cliente, e volta para Produtos.
  it('"Cancelar pedido" limpa itens, desconto, cliente, celular e pagamento na hora e volta para Produtos', async () => {
    const { usuario } = await abrirPdv();
    await montarReferencia(usuario);
    await usuario.click(aba('Cancelar pedido'));
    expect(telaAtual()).toBe('Produtos');
    expect(aba('Produtos')).toHaveAttribute('aria-current', 'page');
    expect(aba('Pedido')).toBeInTheDocument();
    await usuario.click(aba('Pedido'));
    expect(itensPedido()).toHaveLength(0);
    expect(texto(botaoFechar())).toBe('Inclua uma peçaR$ 0,00');
    // Com a próxima peça: sem desconto, sem cliente e sem pagamento.
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    expect(texto(aba('Aumentar desconto').previousElementSibling as HTMLElement)).toBe('R$ 0,00');
    expect(texto(linhaCliente())).toBe('Cliente não identificadoAlterar');
    expect(aba('Pix')).toHaveAttribute('aria-pressed', 'false');
    expect(texto(screen.getByTestId('totais'))).toBe('1 peçaR$ 55,00DescontoR$ 0,00');
  });
});

describe('RF-F07 — fechar venda', () => {
  it('rótulos do botão: vazio → "Inclua uma peça"; sem pagamento → "Escolha o pagamento"; pronto → "Fechar venda" com o total ao lado', async () => {
    const { usuario } = await abrirPdv();
    await usuario.click(aba('Pedido'));
    expect(botaoFechar()).toHaveTextContent('Inclua uma peça');
    expect(botaoFechar()).toBeDisabled();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    expect(botaoFechar()).toHaveTextContent('Escolha o pagamento');
    expect(botaoFechar()).toBeDisabled();
    await usuario.click(aba('Pix'));
    expect(texto(botaoFechar().firstElementChild as HTMLElement)).toBe('Fechar venda');
    expect(texto(botaoFechar().lastElementChild as HTMLElement)).toBe('R$ 55,00');
    expect(botaoFechar()).toBeEnabled();
    await usuario.click(within(itensPedido()[0]!).getByRole('button', { name: 'Tirar peça' }));
    expect(botaoFechar()).toHaveTextContent('Inclua uma peça');
    expect(botaoFechar()).toBeDisabled();
  });

  it('POST /vendas envia só SKU, quantidade e desconto (sem preços), no formato de VendaEntrada', async () => {
    const corpos = capturarVendas();
    const { usuario } = await abrirPdv();
    await montarReferencia(usuario);
    await usuario.click(botaoFechar());
    await screen.findByRole('dialog');
    servidor.events.removeAllListeners();
    expect(corpos).toHaveLength(1);
    const corpo = corpos[0];
    expect(corpo.chaveIdempotencia).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect({ ...corpo, chaveIdempotencia: 'x' }).toEqual({
      chaveIdempotencia: 'x',
      itens: [
        { skuId: skuId(1, 1, 2), qtd: 2, descPercent: 0 },
        { skuId: skuId(2, 3, 1), qtd: 1, descPercent: 0 },
      ],
      descontoTotalCentavos: 3000,
      cliente: 'Maria',
      // MI-02 + etapa 6: o celular vai só com os dígitos; o `cpf` saiu do contrato.
      telefone: '31987654321',
      pagamentoId: 'pix',
    });
    expect(JSON.stringify(corpo)).not.toMatch(/precoUnit|subtotal|brutoCentavos|totalCentavos|modeloNome|tecidoNome|modeloId|tecidoId/);
    validarEntrada(ENTRADA_VENDA, corpo);
  });

  // MI-02 + etapa 6 (contrato da pdv-cliente-telefone): o celular vai como `telefone`, só com os dígitos.
  it('cliente vai sem espaços nas pontas; celular vai só com os dígitos; sem `cpf`', async () => {
    const corpos = capturarVendas();
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await informarCliente(usuario, '  João  ', '31987654321');
    await usuario.click(aba('Dinheiro'));
    await usuario.click(botaoFechar());
    await screen.findByRole('dialog');
    servidor.events.removeAllListeners();
    expect([corpos[0].cliente, corpos[0].telefone]).toEqual(['João', '31987654321']);
    expect(corpos[0]).not.toHaveProperty('cpf');
    validarEntrada(ENTRADA_VENDA, corpos[0]);
  });

  it('enquanto envia, o botão fica bloqueado e toque duplo não gera segundo envio', async () => {
    let liberar!: () => void;
    const segura = new Promise<void>((r) => (liberar = r));
    const { usuario, simulado } = await abrirPdv();
    servidor.use(
      http.post('*/api/vendas', async () => {
        await segura;
        return undefined;
      }),
    );
    const corpos = capturarVendas();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await usuario.click(aba('Pix'));
    await usuario.dblClick(botaoFechar());
    await waitFor(() => expect(botaoFechar()).toBeDisabled());
    expect(botaoFechar()).toHaveAttribute('aria-busy', 'true');
    await usuario.click(botaoFechar());
    liberar();
    await screen.findByRole('dialog');
    servidor.events.removeAllListeners();
    expect(corpos).toHaveLength(1);
    expect(simulado.estado.vendas).toHaveLength(1);
  });

  it('"Cancelar pedido" fica desligado durante o envio e volta a valer se o envio falhar', async () => {
    let liberar!: () => void;
    const segura = new Promise<void>((r) => (liberar = r));
    const { usuario } = await abrirPdv();
    servidor.use(
      http.post('*/api/vendas', async () => {
        await segura;
        return new Response(null, { status: 500 });
      }),
    );
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await usuario.click(aba('Pix'));
    const cancelar = screen.getByRole('button', { name: 'Cancelar pedido' });
    expect(cancelar).toBeEnabled();
    await usuario.click(botaoFechar());
    await waitFor(() => expect(cancelar).toBeDisabled());
    await usuario.click(cancelar);
    expect(itensPedido()).toHaveLength(1);
    liberar();
    await screen.findByRole('alert');
    expect(cancelar).toBeEnabled();
    expect(itensPedido()).toHaveLength(1);
  });

  it('toque em "Cancelar pedido" no mesmo instante do "Fechar venda" (sem redesenho) não zera o pedido', async () => {
    const { usuario, simulado } = await abrirPdv();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await usuario.click(aba('Pix'));
    const fecharBotao = botaoFechar();
    const cancelar = screen.getByRole('button', { name: 'Cancelar pedido' });
    // AP-001: os dois toques no mesmo `act`; userEvent redesenharia entre eles e esconderia a trava da ref.
    act(() => {
      fecharBotao.click();
      cancelar.click();
    });
    const aviso = await screen.findByRole('dialog');
    expect(texto(within(aviso).getByText(/peça/))).toBe('1 peça · Pix');
    expect(simulado.estado.vendas).toHaveLength(1);
    // O pedido não foi zerado pelo "Cancelar": a tela continua no Pedido, com a peça.
    expect(telaAtual()).toBe('Pedido');
    expect(itensPedido()).toHaveLength(1);
  });

  it('falha de rede depois de o servidor gravar: reenvio usa a MESMA chave e não duplica a venda', async () => {
    const { usuario, simulado } = await abrirPdv();
    let primeira = true;
    servidor.use(
      http.post('*/api/vendas', async ({ request }) => {
        if (!primeira) return undefined;
        primeira = false;
        // O servidor grava a venda, mas a resposta se perde na rede.
        await getResponse(simulado.handlers, request.clone());
        return HttpResponse.error();
      }),
    );
    const corpos = capturarVendas();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await usuario.click(aba('Pix'));
    await usuario.click(botaoFechar());
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão. Tente de novo.');
    expect(simulado.estado.vendas).toHaveLength(1);
    // Pedido e chave mantidos.
    expect(itensPedido()).toHaveLength(1);
    expect(botaoFechar()).toBeEnabled();
    await usuario.click(botaoFechar());
    const modal = await screen.findByRole('dialog');
    servidor.events.removeAllListeners();
    expect(corpos).toHaveLength(2);
    expect(corpos[1].chaveIdempotencia).toBe(corpos[0].chaveIdempotencia);
    expect(simulado.estado.vendas).toHaveLength(1);
    expect(texto(modal)).toContain('R$ 55,00');
  });

  it('a chave muda só depois de "Nova venda" no aviso de venda ou de "Cancelar pedido"', async () => {
    const corpos = capturarVendas();
    const { usuario } = await abrirPdv();
    const fecharCom = async () => {
      await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
      await usuario.click(aba('Pix'));
      await usuario.click(botaoFechar());
      await usuario.click(await screen.findByRole('button', { name: 'Nova venda' }));
    };
    await fecharCom();
    await fecharCom();
    // Cancelar pedido: o próximo pedido usa chave nova.
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    servidor.use(http.post('*/api/vendas', () => HttpResponse.error()));
    await usuario.click(aba('Pix'));
    await usuario.click(botaoFechar());
    await screen.findByRole('alert');
    await usuario.click(aba('Cancelar pedido'));
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await usuario.click(aba('Pix'));
    await usuario.click(botaoFechar());
    await screen.findByRole('alert');
    servidor.events.removeAllListeners();
    const chaves = corpos.map((c) => c.chaveIdempotencia);
    expect(chaves).toHaveLength(4);
    expect(new Set(chaves).size).toBe(4);
  });
});

// MI-26 (pdv-mobile-atualizado): aviso com total, "N peças · pagamento" e cliente, sem número do pedido;
// sai com "Nova venda", que zera tudo e volta para Produtos.
describe('RF-F08 — venda registrada', () => {
  it('aviso com os valores do servidor; "Nova venda" zera pedido e cliente e volta para Produtos', async () => {
    const { usuario } = await abrirPdv();
    await montarReferencia(usuario);
    await usuario.click(botaoFechar());
    const modal = await screen.findByRole('dialog', { name: 'Venda registrada' });
    expect(within(modal).getByRole('heading', { name: 'Venda registrada' })).toBeInTheDocument();
    expect(texto(within(modal).getByRole('heading').nextElementSibling as HTMLElement)).toBe('R$ 203,003 peças · PixMaria');
    expect(within(modal).queryByText(/#/)).toBeNull();
    await usuario.click(within(modal).getByRole('button', { name: 'Nova venda' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(aba('Produtos')).toHaveAttribute('aria-current', 'page');
    expect(telaAtual()).toBe('Produtos');
    expect(aba('Pedido')).toBeInTheDocument();
    await usuario.click(aba('Pedido'));
    expect(itensPedido()).toHaveLength(0);
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    expect(texto(linhaCliente())).toBe('Cliente não identificadoAlterar');
    expect(aba('Pix')).toHaveAttribute('aria-pressed', 'false');
  });

  it('usa o que o servidor devolve (não o cálculo local); sem cliente, "Cliente não identificado"', async () => {
    const { usuario, simulado } = await abrirPdv();
    servidor.use(
      http.post('*/api/vendas', async ({ request }) => {
        const r = await getResponse(simulado.handlers, request);
        const { venda } = (await r!.json()) as { venda: Record<string, unknown> };
        return HttpResponse.json({ venda: { ...venda, numero: 2001, pecas: 7, totalCentavos: 12345, cliente: '' } }, { status: 201 });
      }),
    );
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await usuario.click(aba('Crédito'));
    await usuario.click(botaoFechar());
    const modal = await screen.findByRole('dialog');
    expect(texto(within(modal).getByRole('heading').nextElementSibling as HTMLElement)).toBe('R$ 123,457 peças · CréditoCliente não identificado');
  });

  it('resposta 200 (reenvio já gravado) também abre o modal', async () => {
    const { usuario } = await abrirPdv();
    servidor.use(
      http.post('*/api/vendas', () =>
        HttpResponse.json(
          {
            venda: {
              numero: 1042, dataHora: '2026-09-27T14:00:00.000Z', hora: '11:00', vendedor: { id: 'carlos', nome: 'Carlos' }, cliente: 'Ana', telefone: '',
              pagamento: { id: 'pix', nome: 'Pix' }, itens: [], pecas: 1, brutoCentavos: 5500, descontoItensCentavos: 0, descontoTotalCentavos: 0, descontosCentavos: 0, totalCentavos: 5500,
            },
          },
          { status: 200 },
        ),
      ),
    );
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await usuario.click(aba('Pix'));
    await usuario.click(botaoFechar());
    const modal = await screen.findByRole('dialog');
    expect(texto(within(modal).getByRole('heading').nextElementSibling as HTMLElement)).toBe('R$ 55,001 peça · PixAna');
  });
});

describe('RF-F09 — aba Dia', () => {
  it('sem vendas: caixas zeradas e "Nenhuma venda registrada ainda."', async () => {
    const { usuario } = await abrirPdv();
    await usuario.click(aba('Dia'));
    expect(await screen.findByText('Nenhuma venda registrada ainda.')).toBeInTheDocument();
    expect(texto(screen.getByText('Total do dia').parentElement!)).toBe('Total do diaR$ 0,00');
    expect(texto(screen.getByText('Pedidos').parentElement!)).toBe('Pedidos0');
  });

  it('reflete as vendas registradas, da mais recente para a mais antiga', async () => {
    const { usuario, simulado } = await abrirPdv();
    await montarReferencia(usuario);
    await usuario.click(botaoFechar());
    await usuario.click(await screen.findByRole('button', { name: 'Nova venda' }));
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await usuario.click(aba('Dinheiro'));
    await usuario.click(botaoFechar());
    await usuario.click(await screen.findByRole('button', { name: 'Nova venda' }));
    await usuario.click(aba('Dia'));
    const linhas = await screen.findAllByTestId('venda-dia');
    const hora = simulado.estado.vendas[1]!.hora;
    // MI-08: "#N · cliente" e "hora · N peças · pagamento", como no design.
    expect(linhas.map(texto)).toEqual([`#1043${hora} · 1 peça · DinheiroR$ 55,00`, `#1042 · Maria${simulado.estado.vendas[0]!.hora} · 3 peças · PixR$ 203,00`]);
    expect(hora).toMatch(/^\d{2}:\d{2}$/);
    expect(texto(screen.getByText('Total do dia').parentElement!)).toBe('Total do diaR$ 258,00');
    expect(texto(screen.getByText('Pedidos').parentElement!)).toBe('Pedidos2');
  });

  it('busca de novo a cada abertura da aba', async () => {
    let buscas = 0;
    servidor.events.on('request:start', ({ request }) => {
      if (request.url.endsWith('/api/vendas/hoje')) buscas++;
    });
    const { usuario } = await abrirPdv();
    await usuario.click(aba('Dia'));
    await screen.findByText('Nenhuma venda registrada ainda.');
    await usuario.click(aba('Produtos'));
    await usuario.click(aba('Dia'));
    await screen.findByText('Nenhuma venda registrada ainda.');
    servidor.events.removeAllListeners();
    expect(buscas).toBe(2);
  });

  it('falha → mensagem e "Tentar de novo"', async () => {
    let falhar = true;
    const { usuario } = await abrirPdv();
    servidor.use(http.get('*/api/vendas/hoje', () => (falhar ? HttpResponse.error() : undefined)));
    await usuario.click(aba('Dia'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão. Tente de novo.');
    falhar = false;
    await usuario.click(aba('Tentar de novo'));
    expect(await screen.findByText('Nenhuma venda registrada ainda.')).toBeInTheDocument();
  });
});

describe('RF-F10 — erros da API', () => {
  // MI-02: sem campo de CPF, o 400 vem de outra validação do servidor (resposta forçada).
  it('400 (entrada inválida): mensagem da API acima do botão, pedido mantido; editar apaga a mensagem', async () => {
    const { usuario, simulado } = await abrirPdv();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await informarCliente(usuario, 'Maria', '31987654321');
    servidor.use(http.post('*/api/vendas', () => HttpResponse.json({ erro: { codigo: 'entrada_invalida', mensagem: 'Nome do cliente muito longo.' } }, { status: 400 })));
    await usuario.click(aba('Pix'));
    await usuario.click(botaoFechar());
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Nome do cliente muito longo.');
    // A caixa fica logo acima do botão de fechar.
    expect(alerta.nextElementSibling).toBe(botaoFechar());
    expect(itensPedido()).toHaveLength(1);
    expect(texto(linhaCliente())).toBe('Maria · (31) 98765-4321Alterar');
    expect(simulado.estado.vendas).toHaveLength(0);
    await usuario.click(aba('Aumentar desconto'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('409 (chave em uso): mensagem da API e pedido mantido', async () => {
    const { usuario } = await abrirPdv();
    servidor.use(http.post('*/api/vendas', () => HttpResponse.json({ erro: { codigo: 'chave_em_uso', mensagem: 'Esta venda já foi registrada por outro vendedor.' } }, { status: 409 })));
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await usuario.click(aba('Pix'));
    await usuario.click(botaoFechar());
    expect(await screen.findByRole('alert')).toHaveTextContent('Esta venda já foi registrada por outro vendedor.');
    expect(itensPedido()).toHaveLength(1);
  });

  it('500: mensagem genérica, pedido mantido e reenvio com a mesma chave', async () => {
    let falhar = true;
    const corpos = capturarVendas();
    const { usuario } = await abrirPdv();
    servidor.use(http.post('*/api/vendas', () => (falhar ? new HttpResponse('erro', { status: 500 }) : undefined)));
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await usuario.click(aba('Pix'));
    await usuario.click(botaoFechar());
    expect(await screen.findByRole('alert')).toHaveTextContent('Algo deu errado. Tente de novo.');
    falhar = false;
    await usuario.click(botaoFechar());
    await screen.findByRole('dialog');
    servidor.events.removeAllListeners();
    expect(corpos[1].chaveIdempotencia).toBe(corpos[0].chaveIdempotencia);
  });

  it('qualquer alteração no pedido apaga o erro (pagamento, cliente, desconto)', async () => {
    const { usuario } = await abrirPdv();
    servidor.use(http.post('*/api/vendas', () => HttpResponse.error()));
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await usuario.click(aba('Pix'));
    const falhar = async () => {
      await usuario.click(botaoFechar());
      await screen.findByRole('alert');
    };
    await falhar();
    await usuario.click(aba('Débito'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await falhar();
    await informarCliente(usuario, 'x');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await falhar();
    await usuario.click(aba('Aumentar desconto'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('erro inesperado (não ErroApi) ao fechar → mensagem genérica', async () => {
    const espiao = vi.spyOn(api, 'registrarVenda').mockRejectedValueOnce(new Error('boom'));
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await usuario.click(aba('Pix'));
    await usuario.click(botaoFechar());
    expect(await screen.findByRole('alert')).toHaveTextContent('Algo deu errado. Tente de novo.');
    espiao.mockRestore();
  });

  it('401 ao fechar a venda volta ao login (pedido não é preservado)', async () => {
    const { usuario, simulado } = await abrirPdv();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await usuario.click(aba('Pix'));
    simulado.estado.sessao = null;
    await usuario.click(botaoFechar());
    expect(await screen.findByText('Digite sua senha de 8 números')).toBeInTheDocument();
    expect(topoDoPdv()).not.toBeInTheDocument();
    expect(simulado.estado.vendas).toHaveLength(0);
  });

  it('401 ao abrir a aba Dia volta ao login', async () => {
    const { usuario, simulado } = await abrirPdv();
    simulado.estado.sessao = null;
    await usuario.click(aba('Dia'));
    expect(await screen.findByText('Digite sua senha de 8 números')).toBeInTheDocument();
  });

  it('catálogo: "Carregando…", falha com "Tentar de novo" e a aba Dia funciona sem catálogo', async () => {
    usarSimulado({ sessaoDe: 'carlos' });
    let falhar = true;
    servidor.use(http.get('*/api/catalogo', () => (falhar ? HttpResponse.error() : undefined)));
    const { usuario } = abrirApp();
    await esperarPdv();
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão. Tente de novo.');
    expect(aba('Pedido')).toBeInTheDocument();
    await usuario.click(aba('Dia'));
    expect(await screen.findByText('Nenhuma venda registrada ainda.')).toBeInTheDocument();
    await usuario.click(aba('Produtos'));
    falhar = false;
    await usuario.click(aba('Tentar de novo'));
    await esperarCatalogo();
    expect(screen.queryByText('Carregando…')).not.toBeInTheDocument();
  });

  it('com o catálogo ainda carregando, aparece "Carregando…" e a aba Pedido não mostra o carrinho', async () => {
    let liberar!: () => void;
    const segura = new Promise<void>((r) => (liberar = r));
    usarSimulado({ sessaoDe: 'carlos' });
    servidor.use(
      http.get('*/api/catalogo', async () => {
        await segura;
        return undefined;
      }),
    );
    const { usuario } = abrirApp();
    await esperarPdv();
    expect(screen.getByRole('status')).toHaveTextContent('Carregando…');
    await usuario.click(aba('Pedido'));
    expect(screen.getByRole('status')).toHaveTextContent('Carregando…');
    // A tela já é "Pedido" pela aba; o pedido (botão de fechar) só aparece com o catálogo carregado.
    expect(telaAtual()).toBe('Pedido');
    expect(screen.queryByRole('button', { name: /^Inclua uma peça/ })).not.toBeInTheDocument();
    liberar();
    expect(await screen.findByRole('button', { name: /^Inclua uma peça/ })).toBeInTheDocument();
  });
});

describe('RF-006 — recarga silenciosa do catálogo (depois da venda, 409 e item_invalido)', () => {
  // A tela também busca o catálogo ao entrar em Produtos/Pedido; por isso os testes medem só as buscas
  // feitas a partir do "Fechar venda" (diferença em relação a `antes`).
  /** Conta os GET /catalogo feitos pela tela. */
  function contarCatalogo() {
    const conta = { n: 0 };
    servidor.events.on('request:start', ({ request }) => {
      if (request.method === 'GET' && request.url.endsWith('/api/catalogo')) conta.n++;
    });
    return conta;
  }

  it('depois da venda o catálogo recarrega sem "Carregando…" e os saldos da tela acompanham a baixa', async () => {
    const conta = contarCatalogo();
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, LEGGING_M_PRETO);
    await adicionarPeca(usuario, LEGGING_M_PRETO);
    await usuario.click(aba('Pix'));
    const antes = conta.n;
    await usuario.click(botaoFechar());
    await screen.findByRole('dialog');
    await waitFor(() => expect(conta.n - antes).toBe(1));
    expect(screen.queryByText('Carregando…')).not.toBeInTheDocument();
    await usuario.click(aba('Nova venda'));
    await usuario.click(aba('Calças'));
    await usuario.click(aba(/^Calça Legging/));
    await usuario.click(botaoCor('Preto'));
    await waitFor(() => expect(texto(botaoTamanho('M'))).toBe('Mestoque 3'));
    servidor.events.removeAllListeners();
  });

  // INV-014 alterado (pdv-mobile-atualizado): sem −/+, a linha acima do saldo pede para tirar a peça e
  // adicionar de novo; o "Adicionar" respeita o saldo novo.
  it('409 sem_estoque: mensagem nomeando a peça, pedido mantido, aviso na linha e a mensagem continua', async () => {
    const { usuario, simulado } = await abrirPdv();
    for (let i = 0; i < 3; i++) await adicionarPeca(usuario, LEGGING_M_PRETO);
    const item = () => itensPedido()[0]!;
    await usuario.click(aba('Pix'));
    // Outra venda levou peças: sobrou 1 (o catálogo da tela ainda diz 5).
    skuNoSimulado(simulado, skuId(1, 1, 2)).saldo = 1;
    await usuario.click(botaoFechar());
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Item 1: Calça Legging · Preto · M — só 1 em estoque.');
    expect(texto(item())).toContain('3 × R$ 89,00');
    await within(item()).findByText('Só 1 em estoque — tire a peça e adicione de novo');
    // A recarga (e a ação "precos" que ela dispara) não apaga a mensagem nem o pedido.
    expect(screen.getByRole('alert')).toHaveTextContent('em estoque');
    expect(aba('Pix')).toHaveAttribute('aria-pressed', 'true');
    expect(simulado.estado.vendas).toHaveLength(0);
    // Ajusta o pedido: tira a peça (a mensagem some) e adiciona 1 de novo; o segundo "Adicionar" fica desligado.
    await usuario.click(within(item()).getByRole('button', { name: 'Tirar peça' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await adicionarPeca(usuario, LEGGING_M_PRETO);
    expect(within(item()).queryByText(/em estoque/)).not.toBeInTheDocument();
    await usuario.click(aba('Produtos'));
    await usuario.click(aba(/^Calça Legging/));
    await usuario.click(botaoCor('Preto'));
    await usuario.click(botaoTamanho('M'));
    expect(aba('Adicionar ao pedido')).toBeDisabled();
    await usuario.click(aba(/^Pedido/));
    await usuario.click(aba('Pix'));
    await usuario.click(botaoFechar());
    expect(texto(await screen.findByRole('dialog'))).toContain('R$ 89,001 peça · Pix');
  });

  it('recarga atualiza o preço das linhas do pedido (preço mudou no ERP)', async () => {
    const { usuario, simulado } = await abrirPdv();
    await adicionarPeca(usuario, LEGGING_M_PRETO);
    await adicionarPeca(usuario, LEGGING_M_PRETO);
    await usuario.click(aba('Pix'));
    const sku = skuNoSimulado(simulado, skuId(1, 1, 2));
    sku.saldo = 1;
    sku.precoCentavos = 9900;
    await usuario.click(botaoFechar());
    await screen.findByRole('alert');
    await waitFor(() => expect(texto(within(itensPedido()[0]!).getByText(/^Suplex/))).toBe('Suplex · Tam M · Preto · 2 × R$ 99,00'));
    expect(texto(botaoFechar().lastElementChild as HTMLElement)).toBe('R$ 198,00');
    expect(screen.getByRole('alert')).toHaveTextContent('em estoque');
  });

  it('400 item_invalido (SKU inativado): recarrega, item pede exclusão e a mensagem continua', async () => {
    const conta = contarCatalogo();
    const { usuario, simulado } = await abrirPdv();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await usuario.click(aba('Pix'));
    const top = simulado.estado.catalogo.produtos.find((p) => p.numero === 2)!;
    top.skus = top.skus.filter((k) => k.id !== skuId(2, 3, 1));
    const antes = conta.n;
    await usuario.click(botaoFechar());
    expect(await screen.findByRole('alert')).toHaveTextContent('Item 1: produto indisponível.');
    expect(await within(itensPedido()[0]!).findByText('Sem estoque — tire a peça')).toBeInTheDocument();
    // O preço da linha fica o que era (SKU ausente do catálogo novo).
    expect(texto(itensPedido()[0]!)).toContain('R$ 55,00');
    expect(screen.getByRole('alert')).toHaveTextContent('Item 1: produto indisponível.');
    expect(conta.n - antes).toBe(1);
    servidor.events.removeAllListeners();
  });

  it('outros erros (ex.: entrada inválida) não recarregam o catálogo', async () => {
    const conta = contarCatalogo();
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    servidor.use(http.post('*/api/vendas', () => HttpResponse.json({ erro: { codigo: 'entrada_invalida', mensagem: 'Dados inválidos.' } }, { status: 400 })));
    await usuario.click(aba('Pix'));
    const antes = conta.n;
    await usuario.click(botaoFechar());
    await screen.findByRole('alert');
    servidor.events.removeAllListeners();
    expect(conta.n - antes).toBe(0);
  });

  it('se o tipo escolhido some na recarga, a aba Produtos volta para o primeiro tipo', async () => {
    const { usuario, simulado } = await abrirPdv();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO); // deixa "Tops" escolhido
    await usuario.click(aba('Produtos'));
    // MI-23: depois de adicionar, a tela já está em Peça/Tecido.
    expect(aba('Tops')).toHaveAttribute('aria-pressed', 'true');
    await usuario.click(aba(/^Pedido/));
    await usuario.click(aba('Pix'));
    // O único Top foi inativado no ERP: sai do catálogo junto com o tipo.
    simulado.estado.catalogo.produtos = simulado.estado.catalogo.produtos.filter((p) => p.numero !== 2);
    simulado.estado.catalogo.tipos = simulado.estado.catalogo.tipos.filter((t) => t.id !== 2);
    await usuario.click(botaoFechar());
    await screen.findByRole('alert');
    await waitFor(() => expect(within(itensPedido()[0]!).getByText('Sem estoque — tire a peça')).toBeInTheDocument());
    await usuario.click(aba('Produtos'));
    expect(screen.queryByRole('button', { name: 'Tops' })).not.toBeInTheDocument();
    expect(aba('Bermudas')).toHaveAttribute('aria-pressed', 'true');
    expect(aba(/^Bermuda Ciclista/)).toBeInTheDocument();
  });

  // O que o ERP cadastra ou dá entrada aparece sem recarregar a página: a tela busca o catálogo ao
  // entrar em Produtos/Pedido e quando o app volta a ficar visível; a aba Dia não busca.
  it('entrar em Produtos ou Pedido e voltar ao app buscam o catálogo; a aba Dia não', async () => {
    const conta = contarCatalogo();
    const { usuario, simulado } = await abrirPdv();
    expect(conta.n).toBe(1);
    // Produto novo no ERP (com estoque) enquanto o PDV está aberto.
    const novo = structuredClone(simulado.estado.catalogo.produtos.find((p) => p.numero === 1)!);
    Object.assign(novo, { id: 99, numero: 99, nome: 'Calça Flare' });
    simulado.estado.catalogo.produtos.push(novo);
    expect(screen.queryByRole('button', { name: /^Calça Flare/ })).not.toBeInTheDocument();
    await usuario.click(aba('Dia'));
    expect(conta.n).toBe(1);
    await usuario.click(aba('Produtos'));
    await waitFor(() => expect(conta.n).toBe(2));
    await usuario.click(aba('Calças'));
    expect(await screen.findByRole('button', { name: /^Calça Flare/ })).toBeInTheDocument();
    await usuario.click(aba(/^Pedido/));
    await waitFor(() => expect(conta.n).toBe(3));
    // O celular saiu do navegador e voltou.
    const visibilidade = vi.spyOn(document, 'visibilityState', 'get');
    visibilidade.mockReturnValue('hidden');
    act(() => void document.dispatchEvent(new Event('visibilitychange')));
    expect(conta.n).toBe(3);
    visibilidade.mockReturnValue('visible');
    act(() => void document.dispatchEvent(new Event('visibilitychange')));
    await waitFor(() => expect(conta.n).toBe(4));
    visibilidade.mockRestore();
    servidor.events.removeAllListeners();
  });

  it('falha na recarga silenciosa mantém o catálogo atual na tela (sem erro de carregamento)', async () => {
    const { usuario, simulado } = await abrirPdv();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await usuario.click(aba('Pix'));
    skuNoSimulado(simulado, skuId(2, 3, 1)).saldo = 0;
    servidor.use(http.get('*/api/catalogo', () => HttpResponse.error()));
    await usuario.click(botaoFechar());
    expect(await screen.findByRole('alert')).toHaveTextContent('em estoque');
    await new Promise((r) => setTimeout(r, 20));
    expect(telaAtual()).toBe('Pedido');
    expect(screen.queryByText('Sem conexão. Tente de novo.')).not.toBeInTheDocument();
    expect(itensPedido()).toHaveLength(1);
  });
});

// MI-02: o dado pessoal da venda passou a ser o celular (o CPF saiu do PDV).
describe('RNF-F08 — PIN e celular só em memória', () => {
  it('login + venda com celular: nada em console, localStorage, sessionStorage ou URL', async () => {
    const metodos = ['log', 'info', 'warn', 'error', 'debug'] as const;
    const espioes = metodos.map((m) => vi.spyOn(console, m));
    const { usuario } = abrirApp();
    await screen.findByText('Digite sua senha de 8 números');
    for (const d of '12345678') await usuario.click(screen.getByRole('button', { name: d }));
    await esperarCatalogo();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await informarCliente(usuario, 'Maria', '31987654321');
    await usuario.click(aba('Pix'));
    await usuario.click(botaoFechar());
    await screen.findByRole('dialog');
    const registrado = espioes.flatMap((e) => e.mock.calls.map((c) => c.map(String).join(' '))).join('\n');
    espioes.forEach((e) => e.mockRestore());
    expect(registrado).not.toMatch(/12345678|31987654321|98765-?4321/);
    expect([localStorage.length, sessionStorage.length]).toEqual([0, 0]);
    expect(window.location.href).not.toMatch(/12345678|9876/);
  });
});
