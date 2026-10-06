/** Tela de venda (RF-F04..RF-F10) pela página inteira, contra o simulado. */
import { screen, waitFor, within } from '@testing-library/react';
import { getResponse, http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { api } from '../../src/api/cliente';
import type { Catalogo } from '../../src/api/cliente';
import { CATALOGO } from '../../src/simulado/dados';
import { precoDaEscolha, resumoEscolha } from '../../src/telas/Pdv/Variacoes';
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

/** Monta o pedido de referência do back: 2× Legging Preto M 10%, Top Nadador Vinho P, −R$ 15, Pix. */
async function montarReferencia(usuario: Awaited<ReturnType<typeof abrirPdv>>['usuario']) {
  await adicionarPeca(usuario, LEGGING_M_PRETO);
  await adicionarPeca(usuario, LEGGING_M_PRETO);
  await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
  await usuario.click(within(itensPedido()[0]!).getByRole('button', { name: '10%' }));
  for (let i = 0; i < 3; i++) await usuario.click(screen.getByRole('button', { name: 'Aumentar desconto no total' }));
  await usuario.type(screen.getByRole('textbox', { name: 'Nome do cliente' }), 'Maria');
  await usuario.type(screen.getByRole('textbox', { name: 'CPF (opcional)' }), '529.982.247-25');
  await usuario.click(screen.getByRole('button', { name: 'Pix' }));
}

describe('RF-F04 — cabeçalho', () => {
  // MI-09 (pdv-mobile-refatorado): a etapa é o nome acessível do topo; o texto visível segue o design.
  it('etapa no nome do topo ("Produtos", "Cor e tamanho", "Pedido", "Dia"); sem "BALCÃO", vendedor, data completa ou número do pedido', async () => {
    const { usuario } = await abrirPdv();
    const topo = () => screen.getByRole('banner').getAttribute('aria-label');
    const titulo = () => texto(within(screen.getByRole('banner')).getByRole('heading', { level: 1 }));
    expect(titulo()).toBe('Produtos');
    expect(topo()).toBe('Produtos');
    await usuario.click(aba(/^Bermuda Ciclista/));
    expect(topo()).toBe('Cor e tamanho');
    await usuario.click(aba('Pedido'));
    expect(topo()).toBe('Pedido');
    await usuario.click(aba('Dia'));
    expect(topo()).toBe('Dia');
    expect(titulo()).toBe('Vendas de hoje');
    // Trocar de aba não fecha o produto: ao voltar para Produtos, a etapa volta a ser a de cor/tamanho.
    await usuario.click(aba('Produtos'));
    expect(topo()).toBe('Cor e tamanho');
    await usuario.click(aba('Voltar para os produtos'));
    expect(topo()).toBe('Produtos');
    expect(screen.queryByText('BALCÃO')).not.toBeInTheDocument();
    expect(screen.queryByText(/Carlos/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\d{2}\/\d{2}\/\d{4}/)).not.toBeInTheDocument();
    expect(screen.queryByText(/#\d+/)).not.toBeInTheDocument();
  });

  it('com o catálogo em falha, o topo mostra a etapa pela aba', async () => {
    usarSimulado({ sessaoDe: 'carlos' });
    servidor.use(http.get('*/api/catalogo', () => HttpResponse.json({ erro: { codigo: 'erro_interno', mensagem: 'Falhou.' } }, { status: 500 })));
    const { usuario } = abrirApp();
    await esperarPdv();
    await screen.findByRole('button', { name: /Tentar/ });
    const etapa = () => screen.getByRole('banner').getAttribute('aria-label');
    expect(etapa()).toBe('Produtos');
    await usuario.click(aba('Pedido'));
    expect(etapa()).toBe('Pedido');
    await usuario.click(aba('Dia'));
    expect(etapa()).toBe('Dia');
  });
});

/** Id do SKU no catálogo de exemplo (produto → cor → tamanho; 3 cores × 4 tamanhos). */
const skuId = (p: number, c: number, t: number) => (p - 1) * 12 + (c - 1) * 4 + t;
/** SKU (mutável) no catálogo da instância do simulado: mudar saldo/preço aqui imita uma mudança no ERP. */
const skuNoSimulado = (simulado: { estado: { catalogo: Catalogo } }, id: number) => simulado.estado.catalogo.produtos.flatMap((p) => p.skus).find((k) => k.id === id)!;

describe('RF-002 — aba Produtos com os tipos do ERP', () => {
  // MI-05 (pdv-mobile-refatorado): a lista mostra só o produto e o selo "N no pedido"; preço e
  // "sem estoque" saíram da lista (o preço continua na linha acima de "Adicionar", RF-003).
  it('tipos com produto vendável; primeiro selecionado; lista só com o produto (sem preço nem "sem estoque"); tipos filtram', async () => {
    const { usuario } = await abrirPdv();
    const chips = ['Bermudas', 'Calças', 'Tops'];
    for (const t of chips) expect(aba(t)).toBeInTheDocument();
    expect(aba('Bermudas')).toHaveAttribute('aria-pressed', 'true');
    expect(aba('Calças')).toHaveAttribute('aria-pressed', 'false');
    const lista = () => within(screen.getByRole('region', { name: 'Bermudas' })).getAllByRole('button').map(texto);
    expect(lista()).toEqual(['Bermuda Ciclista', 'Short Curto']);
    await usuario.click(aba('Calças'));
    expect(aba('Calças')).toHaveAttribute('aria-pressed', 'true');
    expect(aba('Bermudas')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('button', { name: /^Bermuda Ciclista/ })).not.toBeInTheDocument();
    expect(texto(aba(/^Calça Legging/))).toBe('Calça Legging');
  });

  // MI-05/MI-06: o "a partir de" saiu da lista e foi para a linha acima de "Adicionar", antes da escolha.
  it('"a partir de" usa o menor preço entre os SKUs (acréscimo por tamanho), na linha de cor/tamanho', async () => {
    const catalogo = structuredClone(CATALOGO);
    const legging = catalogo.produtos.find((p) => p.numero === 1)!;
    for (const k of legging.skus) k.precoCentavos = k.tamanho.sigla === 'P' ? 7900 : 9900;
    usarSimulado({ sessaoDe: 'carlos', catalogo });
    const { usuario } = abrirApp();
    await esperarCatalogo();
    await usuario.click(aba('Calças'));
    await usuario.click(aba(/^Calça Legging/));
    expect(sem_nbsp(screen.getByText(/^a partir de/).textContent)).toBe('a partir de R$ 79,00');
    await usuario.click(botaoCor('Preto'));
    await usuario.click(botaoTamanho('M'));
    expect(screen.queryByText(/^a partir de/)).not.toBeInTheDocument();
    expect(sem_nbsp(screen.getByText(/^R\$ /).textContent)).toBe('R$ 99,00');
  });

  it('produto sem estoque mostra "sem estoque" e abre para consulta, com todos os tamanhos desabilitados', async () => {
    const { usuario } = await abrirPdv();
    await usuario.click(aba(/^Short Curto/));
    expect(screen.getByRole('heading', { name: 'Short Curto' })).toBeInTheDocument();
    await usuario.click(botaoCor('Preto'));
    for (const t of ['P', 'M', 'G', 'GG']) {
      expect(botaoTamanho(t)).toBeDisabled();
      expect(texto(botaoTamanho(t))).toContain('estoque 0');
    }
    expect(aba('Adicionar ao pedido')).toBeDisabled();
  });

  it('catálogo do ERP vazio: aviso "Nenhum produto cadastrado no ERP."', async () => {
    usarSimulado({ sessaoDe: 'carlos', catalogo: { tipos: [], produtos: [], pagamentos: CATALOGO.pagamentos } });
    abrirApp();
    expect(await screen.findByText('Nenhum produto cadastrado no ERP.')).toBeInTheDocument();
  });
});

describe('RF-003 — variações: cor → tamanho', () => {
  // MI-06: o preço saiu do botão do tamanho (fica na linha acima de "Adicionar").
  it('cores do produto com amostra; tamanhos só depois da cor, com sigla e "estoque N"', async () => {
    const { usuario } = await abrirPdv();
    await usuario.click(aba('Calças'));
    await usuario.click(aba(/^Calça Legging/));
    expect(screen.getByRole('heading', { name: 'Calça Legging' })).toBeInTheDocument();
    for (const c of ['Preto', 'Marinho', 'Vinho']) expect(botaoCor(c)).toHaveAttribute('aria-pressed', 'false');
    expect(botaoCor('Vinho').querySelector('span[aria-hidden]')).toHaveStyle({ background: '#6B2232' });
    expect(screen.queryByText('TAMANHO')).not.toBeInTheDocument();
    await usuario.click(botaoCor('Marinho'));
    expect(botaoCor('Marinho')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('button', { name: /^(P|M|G|GG)estoque/ }).map(texto)).toEqual(['Pestoque 1', 'Mestoque 5', 'Gestoque 5', 'GGestoque 5']);
    expect(sem_nbsp(screen.getByText(/^R\$ /).textContent)).toBe('R$ 89,00');
  });

  it('SKU inativo não aparece (Bermuda Vinho sem GG) e tamanho sem saldo aparece desabilitado', async () => {
    const { usuario } = await abrirPdv();
    await usuario.click(aba(/^Bermuda Ciclista/));
    await usuario.click(botaoCor('Vinho'));
    expect(screen.getAllByRole('button', { name: /^(P|M|G|GG)estoque/ }).map((b) => texto(b).split('estoque')[0])).toEqual(['P', 'M', 'G']);
    await usuario.click(aba('Voltar para os produtos'));
    await usuario.click(aba('Tops'));
    await usuario.click(aba(/^Top Nadador/));
    await usuario.click(botaoCor('Vinho'));
    expect(botaoTamanho('GG')).toBeDisabled();
    expect(texto(botaoTamanho('GG'))).toBe('GGestoque 0');
    await usuario.click(botaoTamanho('GG'));
    expect(botaoTamanho('GG')).toHaveAttribute('aria-pressed', 'false');
  });

  // MI-06 (decisão do Lucas: seguir o design): a cor zerada não avisa mais "sem estoque"; o saldo
  // aparece nos tamanhos, todos "estoque 0" e desabilitados.
  it('cor com todos os tamanhos zerados: botão da cor só com o nome; tamanhos "estoque 0" desabilitados', async () => {
    const catalogo = structuredClone(CATALOGO);
    for (const k of catalogo.produtos.find((p) => p.numero === 3)!.skus) if (k.cor.nome === 'Preto') k.saldo = 0;
    usarSimulado({ sessaoDe: 'carlos', catalogo });
    const { usuario } = abrirApp();
    await esperarCatalogo();
    await usuario.click(aba(/^Bermuda Ciclista/));
    expect(texto(botaoCor('Preto'))).toBe('Preto');
    expect(texto(botaoCor('Marinho'))).toBe('Marinho');
    await usuario.click(botaoCor('Preto'));
    for (const t of ['P', 'M', 'G', 'GG']) {
      expect(botaoTamanho(t)).toBeDisabled();
      expect(texto(botaoTamanho(t))).toBe(`${t}estoque 0`);
    }
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

  it('trocar de cor mantém o tamanho se ele tem saldo na cor nova; senão limpa a escolha', async () => {
    const { usuario } = await abrirPdv();
    await usuario.click(aba('Tops'));
    await usuario.click(aba(/^Top Nadador/));
    await usuario.click(botaoCor('Preto'));
    await usuario.click(botaoTamanho('M'));
    await usuario.click(botaoCor('Marinho'));
    expect(botaoTamanho('M')).toHaveAttribute('aria-pressed', 'true');
    await usuario.click(botaoTamanho('GG'));
    await usuario.click(botaoCor('Vinho')); // Vinho GG tem saldo 0
    expect(botaoTamanho('GG')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Falta escolher: tamanho')).toBeInTheDocument();
    expect(aba('Adicionar ao pedido')).toBeDisabled();
  });

  // MI-06: o resumo e o preço ficam lado a lado ("Preto · Tam G" | "R$ 89,00"); "cor e tamanho" como no design.
  it('linha de apoio: "Falta escolher: …"; completa → "Cor · Tam X" com o preço ao lado e botão habilitado', async () => {
    const { usuario } = await abrirPdv();
    await usuario.click(aba('Calças'));
    await usuario.click(aba(/^Calça Legging/));
    const adicionar = aba('Adicionar ao pedido');
    expect(screen.getByText('Falta escolher: cor e tamanho')).toBeInTheDocument();
    expect(adicionar).toBeDisabled();
    await usuario.click(botaoCor('Preto'));
    expect(screen.getByText('Falta escolher: tamanho')).toBeInTheDocument();
    expect(adicionar).toBeDisabled();
    await usuario.click(botaoTamanho('G'));
    const resumo = screen.getByText(/^Preto · Tam G/);
    expect(sem_nbsp(resumo.textContent)).toBe('Preto · Tam G');
    expect(sem_nbsp(resumo.parentElement!.textContent)).toBe('Preto · Tam GR$ 89,00');
    expect(adicionar).toBeEnabled();
  });

  it('resumoEscolha: falta cor e tamanho, só tamanho, ou limite atingido', () => {
    const legging = CATALOGO.produtos.find((p) => p.numero === 1)!;
    expect(resumoEscolha(legging, { corId: null, tamanho: null }, 0)).toBe('Falta escolher: cor e tamanho');
    expect(resumoEscolha(legging, { corId: 1, tamanho: null }, 0)).toBe('Falta escolher: tamanho');
    expect(resumoEscolha(legging, { corId: null, tamanho: 'M' }, 0)).toBe('Falta escolher: cor');
    expect(resumoEscolha(legging, { corId: 2, tamanho: 'P' }, 1)).toBe('Só 1 em estoque — já no pedido');
    expect(sem_nbsp(resumoEscolha(legging, { corId: 2, tamanho: 'P' }, 0))).toBe('Marinho · Tam P');
    expect(sem_nbsp(precoDaEscolha(legging, { corId: 2, tamanho: 'P' }))).toBe('R$ 89,00');
    expect(sem_nbsp(precoDaEscolha(legging, { corId: null, tamanho: null }))).toBe('R$ 89,00');
  });

  it('voltar do painel retorna à lista e descarta a escolha', async () => {
    const { usuario } = await abrirPdv();
    await usuario.click(aba(/^Bermuda Ciclista/));
    await usuario.click(botaoCor('Preto'));
    await usuario.click(botaoTamanho('M'));
    await usuario.click(aba('Voltar para os produtos'));
    expect(screen.queryByRole('heading', { name: 'Bermuda Ciclista' })).not.toBeInTheDocument();
    await usuario.click(aba(/^Bermuda Ciclista/));
    expect(botaoCor('Preto')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Falta escolher: cor e tamanho')).toBeInTheDocument();
  });

  // MI-11 (decisão do Lucas: seguir o design): adicionar fica em cor/tamanho com a escolha limpa.
  it('adicionar fica em cor/tamanho com a escolha limpa; o contador da aba Pedido mostra a peça', async () => {
    const { usuario } = await abrirPdv();
    await usuario.click(aba('Calças'));
    await usuario.click(aba(/^Calça Legging/));
    await usuario.click(botaoCor('Preto'));
    await usuario.click(botaoTamanho('M'));
    await usuario.click(aba('Adicionar ao pedido'));
    expect(screen.getByRole('heading', { name: 'Calça Legging' })).toBeInTheDocument();
    expect(aba('Produtos')).toHaveAttribute('aria-current', 'page');
    expect(aba('Pedido (1)')).toBeInTheDocument();
    expect(botaoCor('Preto')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText('TAMANHO')).not.toBeInTheDocument();
    expect(screen.getByText('Falta escolher: cor e tamanho')).toBeInTheDocument();
    expect(aba('Adicionar ao pedido')).toBeDisabled();
    await usuario.click(aba('Pedido (1)'));
    expect(itensPedido()).toHaveLength(1);
    expect(texto(itensPedido()[0]!)).toContain('Suplex · Tam M · Preto · R$ 89,00');
  });
});

describe('RF-004 — pedido limitado ao estoque', () => {
  const LEGGING_P_MARINHO = { tipo: 'Calças', produto: 'Calça Legging', cor: 'Marinho', tamanho: 'P' }; // saldo 1

  it('"+" para no saldo, fica desabilitado e mostra "Só N em estoque"', async () => {
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, LEGGING_M_PRETO); // saldo 5
    const item = () => itensPedido()[0]!;
    const mais = () => within(item()).getByRole('button', { name: 'Aumentar quantidade' });
    expect(within(item()).queryByText(/em estoque/)).not.toBeInTheDocument();
    for (let i = 0; i < 4; i++) await usuario.click(mais());
    expect(within(item()).getByLabelText('Quantidade')).toHaveTextContent('5');
    expect(mais()).toBeDisabled();
    expect(within(item()).getByText('Só 5 em estoque')).toBeInTheDocument();
    await usuario.click(mais());
    expect(within(item()).getByLabelText('Quantidade')).toHaveTextContent('5');
    await usuario.click(within(item()).getByRole('button', { name: 'Diminuir quantidade' }));
    expect(mais()).toBeEnabled();
    expect(within(item()).queryByText(/em estoque/)).not.toBeInTheDocument();
  });

  it('adicionar de novo o SKU que já está no limite: resumo "Só N em estoque — já no pedido" e botão desabilitado', async () => {
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, LEGGING_P_MARINHO);
    expect(within(itensPedido()[0]!).getByText('Só 1 em estoque')).toBeInTheDocument();
    expect(within(itensPedido()[0]!).getByRole('button', { name: 'Aumentar quantidade' })).toBeDisabled();
    // Com MI-11 o produto continua aberto ao voltar para Produtos.
    await usuario.click(aba('Produtos'));
    expect(screen.getByRole('heading', { name: 'Calça Legging' })).toBeInTheDocument();
    await usuario.click(botaoCor('Marinho'));
    await usuario.click(botaoTamanho('P'));
    expect(screen.getByText('Só 1 em estoque — já no pedido')).toBeInTheDocument();
    expect(aba('Adicionar ao pedido')).toBeDisabled();
    await usuario.click(aba('Adicionar ao pedido'));
    expect(aba('Pedido (1)')).toBeInTheDocument();
  });
});

describe('RF-F06 — carrinho', () => {
  it('vazio: título, mensagem, aba sem contagem e rótulo "Inclua uma peça"', async () => {
    const { usuario } = await abrirPdv();
    expect(aba('Pedido')).toBeInTheDocument();
    await usuario.click(aba('Pedido'));
    expect(screen.getByRole('heading', { name: 'Pedido' })).toBeInTheDocument();
    expect(screen.getByText(/Nenhum item ainda\./)).toHaveTextContent('Nenhum item ainda.Volte em Produtos para incluir peças.');
    expect(botaoFechar()).toHaveTextContent('Inclua uma peça');
    expect(botaoFechar()).toBeDisabled();
  });

  it('mesma variação adicionada de novo soma na linha; aba mostra total de peças', async () => {
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, LEGGING_M_PRETO);
    await adicionarPeca(usuario, LEGGING_M_PRETO);
    expect(itensPedido()).toHaveLength(1);
    expect(within(itensPedido()[0]!).getByLabelText('Quantidade')).toHaveTextContent('2');
    await adicionarPeca(usuario, { ...LEGGING_M_PRETO, cor: 'Vinho' });
    expect(itensPedido()).toHaveLength(2);
    expect(aba('Pedido (3)')).toBeInTheDocument();
  });

  it('"+" e "−" mudam a quantidade; "−" com qtd 1 remove; "Excluir" remove', async () => {
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, LEGGING_M_PRETO);
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    const legging = () => itensPedido()[0]!;
    await usuario.click(within(legging()).getByRole('button', { name: 'Aumentar quantidade' }));
    expect(within(legging()).getByLabelText('Quantidade')).toHaveTextContent('2');
    expect(texto(within(legging()).getByText(/R\$ 178,00/))).toBe('R$ 178,00');
    await usuario.click(within(legging()).getByRole('button', { name: 'Diminuir quantidade' }));
    expect(within(legging()).getByLabelText('Quantidade')).toHaveTextContent('1');
    await usuario.click(within(legging()).getByRole('button', { name: 'Diminuir quantidade' }));
    expect(itensPedido()).toHaveLength(1);
    expect(texto(itensPedido()[0]!)).toContain('Top Nadador');
    await usuario.click(within(itensPedido()[0]!).getByRole('button', { name: 'Excluir' }));
    expect(itensPedido()).toHaveLength(0);
    expect(aba('Pedido')).toBeInTheDocument();
  });

  it('desconto por item: subtotal com desconto e "−N% aplicado"', async () => {
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, LEGGING_M_PRETO);
    await adicionarPeca(usuario, LEGGING_M_PRETO);
    const item = itensPedido()[0]!;
    expect(within(item).getByRole('button', { name: 'sem' })).toHaveAttribute('aria-pressed', 'true');
    await usuario.click(within(item).getByRole('button', { name: '10%' }));
    expect(within(item).getByRole('button', { name: '10%' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(item).getByText('−10% aplicado')).toBeInTheDocument();
    expect(texto(item)).toContain('R$ 160,20');
    await usuario.click(within(item).getByRole('button', { name: 'sem' }));
    expect(within(item).queryByText(/aplicado/)).not.toBeInTheDocument();
    expect(texto(item)).toContain('R$ 178,00');
  });

  it('desconto no total: passos de R$ 5, "sem desconto" e mínimo 0', async () => {
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, LEGGING_M_PRETO);
    const mais = aba('Aumentar desconto no total');
    const menos = aba('Diminuir desconto no total');
    expect(screen.getByText('sem desconto')).toBeInTheDocument();
    await usuario.click(menos);
    expect(screen.getByText('sem desconto')).toBeInTheDocument();
    for (let i = 0; i < 3; i++) await usuario.click(mais);
    const valor = () => texto(mais.previousElementSibling as HTMLElement);
    expect(valor()).toBe('− R$ 15,00');
    await usuario.click(menos);
    expect(valor()).toBe('− R$ 10,00');
  });

  it('cliente, CPF numérico e pagamento em grade com as opções do catálogo', async () => {
    const { usuario } = await abrirPdv();
    await usuario.click(aba('Pedido'));
    expect(screen.getByRole('textbox', { name: 'CPF (opcional)' })).toHaveAttribute('inputmode', 'numeric');
    expect(screen.getByPlaceholderText('Nome do cliente')).toBeInTheDocument();
    for (const p of ['Dinheiro', 'Pix', 'Débito', 'Crédito']) expect(aba(p)).toHaveAttribute('aria-pressed', 'false');
    await usuario.click(aba('Débito'));
    expect(aba('Débito')).toHaveAttribute('aria-pressed', 'true');
    await usuario.type(screen.getByRole('textbox', { name: 'Nome do cliente' }), 'Maria');
    expect(screen.getByRole('textbox', { name: 'Nome do cliente' })).toHaveValue('Maria');
  });

  it('totais do pedido de referência: 3 peças R$ 233,00, descontos − R$ 32,80, total R$ 200,20', async () => {
    const { usuario } = await abrirPdv();
    await montarReferencia(usuario);
    const t = screen.getByTestId('totais');
    expect(texto(t)).toBe('3 peçasR$ 233,00Descontos− R$ 32,80TotalR$ 200,20');
    expect(texto(botaoFechar())).toBe('Fechar venda · R$ 200,20');
  });

  it('total nunca negativo na tela', async () => {
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    for (let i = 0; i < 12; i++) await usuario.click(aba('Aumentar desconto no total'));
    expect(texto(totais().getByText('Total').nextElementSibling as HTMLElement)).toBe('R$ 0,00');
    expect(texto(totais().getByText('Descontos').nextElementSibling as HTMLElement)).toBe('− R$ 60,00');
  });

  it('"Cancelar pedido" limpa itens, descontos, cliente, CPF e pagamento na hora', async () => {
    const { usuario } = await abrirPdv();
    await montarReferencia(usuario);
    await usuario.click(aba('Cancelar pedido'));
    expect(itensPedido()).toHaveLength(0);
    expect(screen.getByText('sem desconto')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Nome do cliente' })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: 'CPF (opcional)' })).toHaveValue('');
    expect(aba('Pix')).toHaveAttribute('aria-pressed', 'false');
    expect(aba('Pedido')).toBeInTheDocument();
    expect(texto(screen.getByTestId('totais'))).toBe('0 peçasR$ 0,00DescontosR$ 0,00TotalR$ 0,00');
  });
});

describe('RF-F07 — fechar venda', () => {
  it('rótulos do botão: vazio → "Inclua uma peça"; sem pagamento → "Escolha o pagamento"; pronto → "Fechar venda · R$ X"', async () => {
    const { usuario } = await abrirPdv();
    await usuario.click(aba('Pedido'));
    expect(botaoFechar()).toHaveTextContent('Inclua uma peça');
    expect(botaoFechar()).toBeDisabled();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    expect(botaoFechar()).toHaveTextContent('Escolha o pagamento');
    expect(botaoFechar()).toBeDisabled();
    await usuario.click(aba('Pix'));
    expect(texto(botaoFechar())).toBe('Fechar venda · R$ 55,00');
    expect(botaoFechar()).toBeEnabled();
    await usuario.click(within(itensPedido()[0]!).getByRole('button', { name: 'Excluir' }));
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
        { skuId: skuId(1, 1, 2), qtd: 2, descPercent: 10 },
        { skuId: skuId(2, 3, 1), qtd: 1, descPercent: 0 },
      ],
      descontoTotalCentavos: 1500,
      cliente: 'Maria',
      cpf: '529.982.247-25',
      pagamentoId: 'pix',
    });
    expect(JSON.stringify(corpo)).not.toMatch(/precoUnit|subtotal|brutoCentavos|totalCentavos|modeloNome|tecidoNome|modeloId|tecidoId/);
    validarEntrada(ENTRADA_VENDA, corpo);
  });

  it('cliente e CPF vão sem espaços nas pontas', async () => {
    const corpos = capturarVendas();
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await usuario.type(screen.getByRole('textbox', { name: 'Nome do cliente' }), '  João  ');
    await usuario.type(screen.getByRole('textbox', { name: 'CPF (opcional)' }), ' 52998224725 ');
    await usuario.click(aba('Dinheiro'));
    await usuario.click(botaoFechar());
    await screen.findByRole('dialog');
    servidor.events.removeAllListeners();
    expect([corpos[0].cliente, corpos[0].cpf]).toEqual(['João', '52998224725']);
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
    expect(texto(modal)).toContain('Pedido #1042');
  });

  it('a chave muda só depois de "Nova venda" ou "Cancelar pedido"', async () => {
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

describe('RF-F08 — venda registrada', () => {
  it('modal com número e valores do servidor; "Nova venda" zera e volta para Produtos', async () => {
    const { usuario } = await abrirPdv();
    await montarReferencia(usuario);
    await usuario.click(botaoFechar());
    const modal = await screen.findByRole('dialog');
    expect(within(modal).getByRole('heading', { name: 'Venda registrada' })).toBeInTheDocument();
    expect(texto(within(modal).getByText(/^Pedido #/))).toBe('Pedido #1042 · 3 peça(s) · R$ 200,20 em Pix · Maria');
    await usuario.click(within(modal).getByRole('button', { name: 'Nova venda' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(aba('Produtos')).toHaveAttribute('aria-current', 'page');
    expect(aba('Pedido')).toBeInTheDocument();
    await usuario.click(aba('Pedido'));
    expect(itensPedido()).toHaveLength(0);
    expect(screen.getByRole('textbox', { name: 'Nome do cliente' })).toHaveValue('');
    expect(aba('Pix')).toHaveAttribute('aria-pressed', 'false');
  });

  it('usa o que o servidor devolve (não o cálculo local); sem cliente não mostra " · "', async () => {
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
    expect(texto(within(modal).getByText(/^Pedido #/))).toBe('Pedido #2001 · 7 peça(s) · R$ 123,45 em Crédito');
  });

  it('resposta 200 (reenvio já gravado) também abre o modal', async () => {
    const { usuario } = await abrirPdv();
    servidor.use(
      http.post('*/api/vendas', () =>
        HttpResponse.json(
          {
            venda: {
              numero: 1042, dataHora: '2026-09-27T14:00:00.000Z', hora: '11:00', vendedor: { id: 'carlos', nome: 'Carlos' }, cliente: 'Ana', cpf: '',
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
    expect(texto(within(await screen.findByRole('dialog')).getByText(/^Pedido #/))).toBe('Pedido #1042 · 1 peça(s) · R$ 55,00 em Pix · Ana');
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
    expect(linhas.map(texto)).toEqual([`#1043${hora} · 1 peça · DinheiroR$ 55,00`, `#1042 · Maria${simulado.estado.vendas[0]!.hora} · 3 peças · PixR$ 200,20`]);
    expect(hora).toMatch(/^\d{2}:\d{2}$/);
    expect(texto(screen.getByText('Total do dia').parentElement!)).toBe('Total do diaR$ 255,20');
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
  it('400 (CPF inválido): mensagem da API acima do botão, pedido mantido; editar apaga a mensagem', async () => {
    const { usuario, simulado } = await abrirPdv();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await usuario.type(screen.getByRole('textbox', { name: 'CPF (opcional)' }), '123.456.789-00');
    await usuario.click(aba('Pix'));
    await usuario.click(botaoFechar());
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('CPF inválido');
    // A caixa fica logo acima do botão de fechar.
    expect(alerta.nextElementSibling).toBe(botaoFechar());
    expect(itensPedido()).toHaveLength(1);
    expect(screen.getByRole('textbox', { name: 'CPF (opcional)' })).toHaveValue('123.456.789-00');
    expect(simulado.estado.vendas).toHaveLength(0);
    await usuario.click(within(itensPedido()[0]!).getByRole('button', { name: 'Aumentar quantidade' }));
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
    await usuario.type(screen.getByRole('textbox', { name: 'Nome do cliente' }), 'x');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await falhar();
    await usuario.click(aba('Aumentar desconto no total'));
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
    // O topo já diz "Pedido" pela aba; o carrinho (totais) só aparece com o catálogo carregado.
    expect(screen.queryByTestId('totais')).not.toBeInTheDocument();
    liberar();
    expect(await screen.findByTestId('totais')).toBeInTheDocument();
  });
});

describe('RF-006 — recarga silenciosa do catálogo (depois da venda, 409 e item_invalido)', () => {
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
    await usuario.click(within(itensPedido()[0]!).getByRole('button', { name: 'Aumentar quantidade' }));
    await usuario.click(aba('Pix'));
    await usuario.click(botaoFechar());
    await screen.findByRole('dialog');
    await waitFor(() => expect(conta.n).toBe(2));
    expect(screen.queryByText('Carregando…')).not.toBeInTheDocument();
    await usuario.click(aba('Nova venda'));
    await usuario.click(aba('Calças'));
    await usuario.click(aba(/^Calça Legging/));
    await usuario.click(botaoCor('Preto'));
    await waitFor(() => expect(texto(botaoTamanho('M'))).toBe('Mestoque 3'));
    servidor.events.removeAllListeners();
  });

  it('409 sem_estoque: mensagem nomeando a peça, pedido mantido, saldos novos no "+" e a mensagem continua', async () => {
    const { usuario, simulado } = await abrirPdv();
    await adicionarPeca(usuario, LEGGING_M_PRETO);
    const item = () => itensPedido()[0]!;
    await usuario.click(within(item()).getByRole('button', { name: 'Aumentar quantidade' }));
    await usuario.click(within(item()).getByRole('button', { name: 'Aumentar quantidade' }));
    await usuario.click(aba('Pix'));
    // Outra venda levou peças: sobrou 1 (o catálogo da tela ainda diz 5).
    skuNoSimulado(simulado, skuId(1, 1, 2)).saldo = 1;
    await usuario.click(botaoFechar());
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Item 1: Calça Legging · Preto · M — só 1 em estoque.');
    expect(within(item()).getByLabelText('Quantidade')).toHaveTextContent('3');
    await within(item()).findByText('Só 1 em estoque — diminua a quantidade');
    expect(within(item()).getByRole('button', { name: 'Aumentar quantidade' })).toBeDisabled();
    // A recarga (e a ação "precos" que ela dispara) não apaga a mensagem nem o pedido.
    expect(screen.getByRole('alert')).toHaveTextContent('em estoque');
    expect(aba('Pix')).toHaveAttribute('aria-pressed', 'true');
    expect(simulado.estado.vendas).toHaveLength(0);
    // Ajusta o pedido: a mensagem some e a venda passa.
    await usuario.click(within(item()).getByRole('button', { name: 'Diminuir quantidade' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await usuario.click(within(item()).getByRole('button', { name: 'Diminuir quantidade' }));
    expect(within(item()).getByText('Só 1 em estoque')).toBeInTheDocument();
    await usuario.click(botaoFechar());
    expect(texto(await screen.findByRole('dialog'))).toContain('Pedido #1042 · 1 peça(s) · R$ 89,00 em Pix');
  });

  it('recarga atualiza o preço das linhas do pedido (preço mudou no ERP)', async () => {
    const { usuario, simulado } = await abrirPdv();
    await adicionarPeca(usuario, LEGGING_M_PRETO);
    await usuario.click(within(itensPedido()[0]!).getByRole('button', { name: 'Aumentar quantidade' }));
    await usuario.click(aba('Pix'));
    const sku = skuNoSimulado(simulado, skuId(1, 1, 2));
    sku.saldo = 1;
    sku.precoCentavos = 9900;
    await usuario.click(botaoFechar());
    await screen.findByRole('alert');
    await waitFor(() => expect(texto(itensPedido()[0]!)).toContain('Suplex · Tam M · Preto · R$ 99,00'));
    expect(texto(totais().getByText('Total').nextElementSibling as HTMLElement)).toBe('R$ 198,00');
    expect(screen.getByRole('alert')).toHaveTextContent('em estoque');
  });

  it('400 item_invalido (SKU inativado): recarrega, item pede exclusão e a mensagem continua', async () => {
    const conta = contarCatalogo();
    const { usuario, simulado } = await abrirPdv();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await usuario.click(aba('Pix'));
    const top = simulado.estado.catalogo.produtos.find((p) => p.numero === 2)!;
    top.skus = top.skus.filter((k) => k.id !== skuId(2, 3, 1));
    await usuario.click(botaoFechar());
    expect(await screen.findByRole('alert')).toHaveTextContent('Item 1: produto indisponível.');
    expect(await within(itensPedido()[0]!).findByText('Sem estoque — exclua o item')).toBeInTheDocument();
    expect(within(itensPedido()[0]!).getByRole('button', { name: 'Aumentar quantidade' })).toBeDisabled();
    // O preço da linha fica o que era (SKU ausente do catálogo novo).
    expect(texto(itensPedido()[0]!)).toContain('R$ 55,00');
    expect(screen.getByRole('alert')).toHaveTextContent('Item 1: produto indisponível.');
    expect(conta.n).toBe(2);
    servidor.events.removeAllListeners();
  });

  it('outros erros (ex.: CPF inválido) não recarregam o catálogo', async () => {
    const conta = contarCatalogo();
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await usuario.type(screen.getByRole('textbox', { name: 'CPF (opcional)' }), '123.456.789-00');
    await usuario.click(aba('Pix'));
    await usuario.click(botaoFechar());
    await screen.findByRole('alert');
    servidor.events.removeAllListeners();
    expect(conta.n).toBe(1);
  });

  it('se o tipo escolhido some na recarga, a aba Produtos volta para o primeiro tipo', async () => {
    const { usuario, simulado } = await abrirPdv();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO); // deixa "Tops" escolhido
    await usuario.click(aba('Produtos'));
    // MI-11: o produto continua aberto depois de adicionar; volta para a lista para ver os tipos.
    await usuario.click(aba('Voltar para os produtos'));
    expect(aba('Tops')).toHaveAttribute('aria-pressed', 'true');
    await usuario.click(aba(/^Pedido/));
    await usuario.click(aba('Pix'));
    // O único Top foi inativado no ERP: sai do catálogo junto com o tipo.
    simulado.estado.catalogo.produtos = simulado.estado.catalogo.produtos.filter((p) => p.numero !== 2);
    simulado.estado.catalogo.tipos = simulado.estado.catalogo.tipos.filter((t) => t.id !== 2);
    await usuario.click(botaoFechar());
    await screen.findByRole('alert');
    await waitFor(() => expect(within(itensPedido()[0]!).getByText('Sem estoque — exclua o item')).toBeInTheDocument());
    await usuario.click(aba('Produtos'));
    expect(screen.queryByRole('button', { name: 'Tops' })).not.toBeInTheDocument();
    expect(aba('Bermudas')).toHaveAttribute('aria-pressed', 'true');
    expect(aba(/^Bermuda Ciclista/)).toBeInTheDocument();
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
    expect(screen.getByRole('heading', { name: 'Pedido' })).toBeInTheDocument();
    expect(screen.queryByText('Sem conexão. Tente de novo.')).not.toBeInTheDocument();
    expect(itensPedido()).toHaveLength(1);
  });
});

describe('RNF-F08 — PIN e CPF só em memória', () => {
  it('login + venda com CPF: nada em console, localStorage, sessionStorage ou URL', async () => {
    const metodos = ['log', 'info', 'warn', 'error', 'debug'] as const;
    const espioes = metodos.map((m) => vi.spyOn(console, m));
    const { usuario } = abrirApp();
    await screen.findByText('Digite sua senha de 8 números');
    for (const d of '12345678') await usuario.click(screen.getByRole('button', { name: d }));
    await esperarCatalogo();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await usuario.type(screen.getByRole('textbox', { name: 'CPF (opcional)' }), '529.982.247-25');
    await usuario.click(aba('Pix'));
    await usuario.click(botaoFechar());
    await screen.findByRole('dialog');
    const registrado = espioes.flatMap((e) => e.mock.calls.map((c) => c.map(String).join(' '))).join('\n');
    espioes.forEach((e) => e.mockRestore());
    expect(registrado).not.toMatch(/12345678|529\.?982|52998224725/);
    expect([localStorage.length, sessionStorage.length]).toEqual([0, 0]);
    expect(window.location.href).not.toMatch(/12345678|529/);
  });
});
