/**
 * Caracterização da tela de venda (refatoração pdv-ajustes-tela-variacoes): invariantes INV-001,
 * INV-010 a INV-013 e INV-015 a INV-017, escritos sem depender do que a refatoração muda de propósito
 * (MUD-01 a MUD-04): o texto do saldo dentro do tamanho, o conteúdo do topo e o número de colunas.
 * - O saldo do tamanho é conferido só por `mostraSaldo` (ponto único, logo abaixo).
 * - O topo é achado pelo papel `banner`, nunca pelo texto.
 * INV-014 e INV-018 ficam nos testes existentes (pdv.test.tsx e a suíte do login).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { Catalogo } from '../../src/api/cliente';
import { CATALOGO } from '../../src/simulado/dados';
import { servidor, usarSimulado } from '../apoio';
import { ENTRADA_LOGIN, ENTRADA_VENDA, validarEntrada } from '../contrato';
import { abrirApp, adicionarPeca, botaoCor, botaoFechar, botaoTamanho, enviarPin, esperarCatalogo, PIN_CERTO, sem_nbsp, TOP_NADADOR_P_VINHO } from './ajuda';

const botao = (nome: RegExp | string) => screen.getByRole('button', { name: nome });
const texto = (el: Element | null | undefined) => sem_nbsp(el?.textContent);

/**
 * Ponto único que depende de COMO o saldo aparece dentro do tamanho: "estoque N", com "estoque 0"
 * para saldo zerado ou negativo (MUD-01).
 */
const mostraSaldo = (saldo: number) => new RegExp(`^estoque ${Math.max(0, saldo)}$`);

/** Botões de tamanho, na ordem da tela (os botões do bloco TAMANHO). */
const botoesTamanho = () => within(screen.getByText('TAMANHO').parentElement!).getAllByRole('button');

/** PDV já logado (sessão válida), com o catálogo carregado. */
async function abrirPdv(catalogo?: Catalogo) {
  const simulado = usarSimulado({ sessaoDe: 'carlos', ...(catalogo ? { catalogo } : {}) });
  const app = abrirApp();
  await esperarCatalogo();
  return { ...app, simulado };
}

const PRETO = CATALOGO.produtos[0]!.skus.find((k) => k.cor.nome === 'Preto')!.cor;

/**
 * Caso de referência da refatoração: produto com 6 tamanhos e preço de 3 dígitos. Os SKUs vêm fora de
 * ordem, com preço e saldo diferentes em cada tamanho (zerado e negativo incluídos).
 */
const SEIS_TAMANHOS = [
  { sigla: 'G', ordem: 4, precoCentavos: 10400, saldo: 7 },
  { sigla: 'PP', ordem: 1, precoCentavos: 10100, saldo: 3 },
  { sigla: 'XG', ordem: 6, precoCentavos: 10600, saldo: -1 },
  { sigla: 'M', ordem: 3, precoCentavos: 10300, saldo: 12 },
  { sigla: 'P', ordem: 2, precoCentavos: 10200, saldo: 0 },
  { sigla: 'GG', ordem: 5, precoCentavos: 10500, saldo: 1 },
];
function catalogoSeisTamanhos(): Catalogo {
  const catalogo = structuredClone(CATALOGO);
  const bermuda = catalogo.produtos.find((p) => p.numero === 3)!;
  bermuda.tecidoNome = 'Poliamida';
  bermuda.skus = SEIS_TAMANHOS.map((t, i) => ({
    id: 900 + i,
    codigo: `0003.001.${String(t.ordem).padStart(2, '0')}`,
    cor: PRETO,
    tamanho: { sigla: t.sigla, ordem: t.ordem },
    precoCentavos: t.precoCentavos,
    saldo: t.saldo,
  }));
  return catalogo;
}
const NA_ORDEM = [...SEIS_TAMANHOS].sort((a, b) => a.ordem - b.ordem);

describe('INV-001 — chamadas à API', () => {
  it('login → catálogo → venda → recarga do catálogo → vendas do dia: mesmos endpoints, na mesma ordem, e corpos no contrato', async () => {
    const chamadas: string[] = [];
    const corpos: Record<string, any> = {};
    servidor.events.on('request:start', async ({ request }) => {
      const rota = `${request.method} ${new URL(request.url).pathname}`;
      chamadas.push(rota);
      if (request.method === 'POST') corpos[rota] = await request.clone().json();
    });
    const { usuario } = abrirApp();
    await screen.findByRole('button', { name: PIN_CERTO[0]! });
    await enviarPin(usuario);
    await esperarCatalogo();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await usuario.click(botao('Pix'));
    await usuario.click(botaoFechar());
    await usuario.click(await screen.findByRole('button', { name: 'Nova venda' }));
    await waitFor(() => expect(chamadas.filter((c) => c === 'GET /api/catalogo')).toHaveLength(2));
    await usuario.click(botao('Dia'));
    await screen.findByTestId('venda-dia');
    servidor.events.removeAllListeners();

    expect(chamadas).toEqual([
      'GET /api/auth/sessao',
      'GET /api/config',
      'GET /api/vendedores',
      'POST /api/auth/login',
      'GET /api/catalogo',
      'POST /api/vendas',
      'GET /api/catalogo',
      'GET /api/vendas/hoje',
    ]);
    expect(corpos['POST /api/auth/login']).toEqual({ vendedorId: 'carlos', pin: PIN_CERTO });
    validarEntrada(ENTRADA_LOGIN, corpos['POST /api/auth/login']);
    const venda = corpos['POST /api/vendas'];
    expect({ ...venda, chaveIdempotencia: 'x' }).toEqual({
      chaveIdempotencia: 'x',
      itens: [{ skuId: 21, qtd: 1, descPercent: 0 }],
      descontoTotalCentavos: 0,
      cliente: '',
      cpf: '',
      pagamentoId: 'pix',
    });
    validarEntrada(ENTRADA_VENDA, venda);
  });

  it('falha no catálogo: "Tentar de novo" repete o mesmo GET /catalogo e a tela carrega', async () => {
    usarSimulado({ sessaoDe: 'carlos' });
    let falhar = true;
    const chamadas: string[] = [];
    servidor.use(http.get('*/api/catalogo', () => (falhar ? HttpResponse.error() : undefined)));
    servidor.events.on('request:start', ({ request }) => void chamadas.push(`${request.method} ${new URL(request.url).pathname}`));
    const { usuario } = abrirApp();
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão. Tente de novo.');
    falhar = false;
    await usuario.click(botao('Tentar de novo'));
    await esperarCatalogo();
    servidor.events.removeAllListeners();
    expect(chamadas).toEqual(['GET /api/auth/sessao', 'GET /api/catalogo', 'GET /api/catalogo']);
  });
});

describe('INV-010 — tamanho sem saldo fica desabilitado e não pode ser escolhido', () => {
  it('saldo zero ou negativo: botão disabled; o toque não escolhe nem libera "Adicionar ao pedido"; com saldo, escolhe', async () => {
    const { usuario } = await abrirPdv(catalogoSeisTamanhos());
    await usuario.click(botao(/^Bermuda Ciclista/));
    await usuario.click(botaoCor('Preto'));
    const porSigla = Object.fromEntries(botoesTamanho().map((b) => [texto(b.firstElementChild), b]));
    for (const t of SEIS_TAMANHOS) {
      if (t.saldo > 0) expect(porSigla[t.sigla]).toBeEnabled();
      else expect(porSigla[t.sigla]).toBeDisabled();
    }
    for (const sigla of ['P', 'XG']) {
      await usuario.click(porSigla[sigla]!);
      expect(porSigla[sigla]).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByText('Falta escolher: tamanho')).toBeInTheDocument();
      expect(botao('Adicionar ao pedido')).toBeDisabled();
    }
    await usuario.click(porSigla.GG!);
    expect(porSigla.GG).toHaveAttribute('aria-pressed', 'true');
    expect(botao('Adicionar ao pedido')).toBeEnabled();
  });
});

describe('INV-011 — cada tamanho mostra sigla, preço e saldo, nessa ordem; tamanhos na ordem da grade', () => {
  it('6 tamanhos fora de ordem no catálogo aparecem pela ordem da grade, cada um com sigla → preço → saldo', async () => {
    const { usuario } = await abrirPdv(catalogoSeisTamanhos());
    await usuario.click(botao(/^Bermuda Ciclista/));
    await usuario.click(botaoCor('Preto'));
    const botoes = botoesTamanho();
    expect(botoes.map((b) => texto(b.children[0]))).toEqual(['PP', 'P', 'M', 'G', 'GG', 'XG']);
    expect(botoes.map((b) => texto(b.children[1]))).toEqual(['R$ 101,00', 'R$ 102,00', 'R$ 103,00', 'R$ 104,00', 'R$ 105,00', 'R$ 106,00']);
    botoes.forEach((b, i) => {
      expect(b.children).toHaveLength(3);
      expect(texto(b.children[2])).toMatch(mostraSaldo(NA_ORDEM[i]!.saldo));
      // O saldo não se confunde com a sigla nem com o preço: é o terceiro texto, depois dos outros dois.
      expect(texto(b).startsWith(`${NA_ORDEM[i]!.sigla}${texto(b.children[1])}`)).toBe(true);
    });
  });

  it('catálogo de exemplo: P, M, G, GG na Legging Marinho, com o saldo de cada um (P tem 1, os demais 5)', async () => {
    const { usuario } = await abrirPdv();
    await usuario.click(botao('Calças'));
    await usuario.click(botao(/^Calça Legging/));
    await usuario.click(botaoCor('Marinho'));
    const botoes = botoesTamanho();
    expect(botoes.map((b) => `${texto(b.children[0])}|${texto(b.children[1])}`)).toEqual(['P|R$ 89,00', 'M|R$ 89,00', 'G|R$ 89,00', 'GG|R$ 89,00']);
    [1, 5, 5, 5].forEach((saldo, i) => expect(texto(botoes[i]!.children[2])).toMatch(mostraSaldo(saldo)));
    expect(texto(botoes[1]!.children[2])).not.toMatch(mostraSaldo(1));
  });
});

describe('INV-012 — tamanhos só depois da cor; trocar de cor mantém o tamanho que tem saldo', () => {
  it('sem cor não há bloco TAMANHO nem botão de tamanho; com cor aparecem os tamanhos dela', async () => {
    const { usuario } = await abrirPdv();
    await usuario.click(botao(/^Bermuda Ciclista/));
    expect(screen.getByText('COR')).toBeInTheDocument();
    expect(screen.queryByText('TAMANHO')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('button', { name: /^(P|M|G|GG)R\$/ })).toHaveLength(0);
    await usuario.click(botaoCor('Vinho'));
    expect(botoesTamanho().map((b) => texto(b.firstElementChild))).toEqual(['P', 'M', 'G']);
    await usuario.click(botaoCor('Preto'));
    expect(botoesTamanho().map((b) => texto(b.firstElementChild))).toEqual(['P', 'M', 'G', 'GG']);
  });

  it('tamanho escolhido continua na cor nova se ela tem saldo; some se não tem saldo ou não existe na cor', async () => {
    const { usuario } = await abrirPdv();
    await usuario.click(botao('Tops'));
    await usuario.click(botao(/^Top Nadador/));
    await usuario.click(botaoCor('Preto'));
    await usuario.click(botaoTamanho('GG'));
    await usuario.click(botaoCor('Marinho'));
    expect(botaoTamanho('GG')).toHaveAttribute('aria-pressed', 'true');
    expect(botao('Adicionar ao pedido')).toBeEnabled();
    await usuario.click(botaoCor('Vinho')); // Vinho GG tem saldo 0
    expect(botoesTamanho().filter((b) => b.getAttribute('aria-pressed') === 'true')).toHaveLength(0);
    expect(screen.getByText('Falta escolher: tamanho')).toBeInTheDocument();
    expect(botao('Adicionar ao pedido')).toBeDisabled();
    // Voltar para a cor anterior não ressuscita o tamanho.
    await usuario.click(botaoCor('Marinho'));
    expect(botoesTamanho().filter((b) => b.getAttribute('aria-pressed') === 'true')).toHaveLength(0);
  });
});

describe('INV-013 — "sem estoque" na cor e no card do produto, os dois clicáveis', () => {
  it('produto sem estoque: card avisa e abre; cada cor avisa, pode ser tocada e mostra os tamanhos desabilitados', async () => {
    const { usuario } = await abrirPdv();
    const card = botao(/^Short Curto/);
    expect(texto(card)).toContain('sem estoque');
    expect(texto(botao(/^Bermuda Ciclista/))).not.toContain('sem estoque');
    expect(card).toBeEnabled();
    await usuario.click(card);
    expect(screen.getByRole('heading', { name: 'Short Curto' })).toBeInTheDocument();
    for (const cor of ['Preto', 'Marinho', 'Vinho']) {
      expect(texto(botaoCor(cor))).toBe(`${cor}sem estoque`);
      expect(botaoCor(cor)).toBeEnabled();
    }
    await usuario.click(botaoCor('Marinho'));
    expect(botaoCor('Marinho')).toHaveAttribute('aria-pressed', 'true');
    const tamanhos = botoesTamanho();
    expect(tamanhos).toHaveLength(4);
    for (const t of tamanhos) expect(t).toBeDisabled();
    expect(botao('Adicionar ao pedido')).toBeDisabled();
  });

  it('só uma cor zerada: ela avisa "sem estoque" e continua clicável; as outras cores e o card não avisam', async () => {
    const catalogo = structuredClone(CATALOGO);
    for (const k of catalogo.produtos.find((p) => p.numero === 3)!.skus) if (k.cor.nome === 'Preto') k.saldo = 0;
    const { usuario } = await abrirPdv(catalogo);
    expect(texto(botao(/^Bermuda Ciclista/))).not.toContain('sem estoque');
    await usuario.click(botao(/^Bermuda Ciclista/));
    expect(texto(botaoCor('Preto'))).toBe('Pretosem estoque');
    expect(texto(botaoCor('Marinho'))).toBe('Marinho');
    await usuario.click(botaoCor('Preto'));
    expect(botaoCor('Preto')).toHaveAttribute('aria-pressed', 'true');
    for (const t of botoesTamanho()) expect(t).toBeDisabled();
  });
});

describe('INV-015 — voltar, nome do produto e tecido na tela de cor/tamanho', () => {
  it('título com o nome do produto, tecido do produto e "Voltar para os produtos" que volta à lista', async () => {
    const { usuario } = await abrirPdv(catalogoSeisTamanhos());
    await usuario.click(botao(/^Bermuda Ciclista/));
    expect(screen.getByRole('heading', { level: 1, name: 'Bermuda Ciclista' })).toBeInTheDocument();
    // Na tela de cor/tamanho a lista não aparece: o tecido do produto aberto fica no topo (MI-09) e o
    // conteúdo não tem nenhum tecido da lista.
    expect(within(screen.getByRole('banner')).getByText('Poliamida')).toBeInTheDocument();
    expect(within(screen.getByRole('main')).queryByText('Suplex')).not.toBeInTheDocument();
    expect(within(screen.getByRole('main')).queryByText('Poliamida')).not.toBeInTheDocument();
    const voltar = botao('Voltar para os produtos');
    // A seta "←" virou o ícone ArrowLeft do Phosphor (MI-09): o botão continua visível, com o ícone.
    expect(voltar.querySelector('svg')).not.toBeNull();
    await usuario.click(voltar);
    expect(screen.queryByRole('heading', { name: 'Bermuda Ciclista' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Voltar para os produtos' })).not.toBeInTheDocument();
    expect(botao(/^Bermuda Ciclista/)).toBeInTheDocument();
  });
});

describe('INV-016 — abas de baixo, contador "Pedido (N)" e botões principais', () => {
  const abas = () => within(screen.getByRole('navigation', { name: 'Abas' })).getAllByRole('button');
  const nomes = () => abas().map((b) => texto(b));
  const atual = () => abas().filter((b) => b.getAttribute('aria-current') === 'page').map((b) => texto(b));

  it('três abas na ordem Produtos, Pedido, Dia; a aba atual é marcada; o contador soma as peças', async () => {
    const { usuario } = await abrirPdv();
    expect(nomes()).toEqual(['Produtos', 'Pedido', 'Dia']);
    expect(atual()).toEqual(['Produtos']);
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    expect(nomes()).toEqual(['Produtos', 'Pedido (1)', 'Dia']);
    expect(atual()).toEqual(['Pedido (1)']);
    await usuario.click(within(screen.getAllByTestId('item-pedido')[0]!).getByRole('button', { name: 'Aumentar quantidade' }));
    expect(nomes()).toEqual(['Produtos', 'Pedido (2)', 'Dia']);
    await usuario.click(botao('Dia'));
    expect(atual()).toEqual(['Dia']);
    expect(nomes()).toEqual(['Produtos', 'Pedido (2)', 'Dia']);
  });

  it('"Adicionar ao pedido" só na tela de cor/tamanho; "Fechar venda" só na aba Pedido, com os três rótulos', async () => {
    const { usuario } = await abrirPdv();
    const adicionar = () => screen.queryByRole('button', { name: 'Adicionar ao pedido' });
    const fechar = () => screen.queryByRole('button', { name: /^(Inclua uma peça|Escolha o pagamento|Fechar venda)/ });
    expect([adicionar(), fechar()]).toEqual([null, null]);
    await usuario.click(botao(/^Bermuda Ciclista/));
    expect(adicionar()).toBeDisabled();
    expect(fechar()).toBeNull();
    await usuario.click(botao('Pedido'));
    expect(adicionar()).toBeNull();
    expect(texto(fechar())).toBe('Inclua uma peça');
    await usuario.click(botao('Dia'));
    expect([adicionar(), fechar()]).toEqual([null, null]);
    // O produto aberto continua aberto ao voltar para Produtos.
    await usuario.click(botao('Produtos'));
    await usuario.click(botaoCor('Preto'));
    await usuario.click(botaoTamanho('M'));
    await usuario.click(adicionar()!);
    expect(texto(fechar())).toBe('Escolha o pagamento');
    expect(fechar()).toBeDisabled();
    await usuario.click(botao('Pix'));
    expect(texto(fechar())).toBe('Fechar venda · R$ 59,00');
    expect(fechar()).toBeEnabled();
  });
});

describe('INV-017 — o topo aparece em todas as telas do PDV e fica preso no alto', () => {
  /** Um único topo (`banner`), primeiro elemento da folha, antes do conteúdo e das abas. */
  function conferirTopo() {
    const topos = screen.getAllByRole('banner');
    expect(topos).toHaveLength(1);
    const topo = topos[0]!;
    expect(topo.textContent?.trim()).not.toBe('');
    expect(topo.parentElement!.firstElementChild).toBe(topo);
    expect(topo.parentElement).toBe(screen.getByRole('main').parentElement);
    expect(topo.parentElement!.contains(screen.getByRole('navigation', { name: 'Abas' }))).toBe(true);
    return topo;
  }
  const esperarPdv = () => screen.findByRole('navigation', { name: 'Abas' });

  it('catálogo carregado: lista de produtos, cor/tamanho, Pedido e Dia', async () => {
    const { usuario } = await abrirPdv();
    conferirTopo();
    await usuario.click(botao(/^Bermuda Ciclista/));
    conferirTopo();
    await usuario.click(botao('Pedido'));
    expect(screen.getByRole('heading', { name: 'Pedido' })).toBeInTheDocument();
    conferirTopo();
    await usuario.click(botao('Dia'));
    await screen.findByText('Nenhuma venda registrada ainda.');
    conferirTopo();
  });

  it('catálogo ainda carregando: topo nas três abas', async () => {
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
    conferirTopo();
    await usuario.click(botao('Pedido'));
    expect(screen.getByRole('status')).toHaveTextContent('Carregando…');
    conferirTopo();
    await usuario.click(botao('Dia'));
    await screen.findByText('Nenhuma venda registrada ainda.');
    conferirTopo();
    await usuario.click(botao('Produtos'));
    expect(screen.getByRole('status')).toHaveTextContent('Carregando…');
    liberar();
    await esperarCatalogo();
    conferirTopo();
  });

  it('catálogo em falha: topo nas três abas', async () => {
    usarSimulado({ sessaoDe: 'carlos' });
    servidor.use(http.get('*/api/catalogo', () => HttpResponse.error()));
    const { usuario } = abrirApp();
    await esperarPdv();
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão. Tente de novo.');
    conferirTopo();
    await usuario.click(botao('Pedido'));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    conferirTopo();
    await usuario.click(botao('Dia'));
    await screen.findByText('Nenhuma venda registrada ainda.');
    conferirTopo();
  });

  it('o estilo do topo o prende no alto (position: sticky; top: 0)', async () => {
    await abrirPdv();
    // jsdom não aplica o CSS: a regra é lida do arquivo, pela classe que o topo usa na tela.
    const css = readFileSync(resolve(import.meta.dirname, '../../src/telas/Pdv/Pdv.module.css'), 'utf8');
    const classes = [...conferirTopo().classList];
    expect(classes.length).toBeGreaterThan(0);
    const regras = classes.flatMap((cls) => [...css.matchAll(new RegExp(`(?:^|[\\s,}])\\.${cls}\\s*\\{([^}]*)\\}`, 'g'))].map((m) => m[1]!));
    const declaracoes = regras.join(';').replace(/\s+/g, '');
    expect(declaracoes).toContain('position:sticky');
    expect(declaracoes).toMatch(/(^|;)top:0(;|$)/);
  });
});
