/**
 * Caracterização da tela de venda (refatoração pdv-ajustes-tela-variacoes): invariantes INV-001,
 * INV-010 a INV-013 e INV-015 a INV-017, escritos sem depender do que a refatoração muda de propósito
 * (MUD-01 a MUD-04): o texto do saldo dentro do tamanho, o conteúdo do topo e o número de colunas.
 * - O saldo do tamanho é conferido só por `mostraSaldo` (ponto único, logo abaixo).
 * - Desde a pdv-mobile-atualizado o topo são as abas (`navigation "Abas"`); a tela é o `main` com nome.
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

/** Botões de tamanho, na ordem da tela (os botões do cartão "4 Tamanho", pdv-mobile-atualizado). */
const botoesTamanho = () => within(screen.getByRole('region', { name: 'Tamanho' })).getAllByRole('button');
/** Barra "Adicionar ao pedido": só aparece com cor e tamanho escolhidos (MI-23). */
const adicionar = () => screen.queryByRole('button', { name: 'Adicionar ao pedido' });

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
    await waitFor(() => expect(chamadas.filter((c) => c === 'GET /api/catalogo')).toHaveLength(3));
    await usuario.click(botao('Dia'));
    await screen.findByTestId('venda-dia');
    servidor.events.removeAllListeners();

    expect(chamadas).toEqual([
      'GET /api/auth/sessao',
      'GET /api/config',
      'GET /api/vendedores',
      'POST /api/auth/login',
      'GET /api/catalogo',
      'GET /api/catalogo', // entrar na aba Pedido busca o catálogo de novo
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
      // pdv-cliente-telefone (MI-01): `cpf` → `telefone`, vazio sem celular.
      telefone: '',
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
      expect(adicionar()).toBeNull();
    }
    await usuario.click(porSigla.GG!);
    expect(porSigla.GG).toHaveAttribute('aria-pressed', 'true');
    expect(botao('Adicionar ao pedido')).toBeEnabled();
  });
});

// MI-23 (pdv-mobile-atualizado): a linha de preço acima de "Adicionar" saiu; o preço aparece no Pedido.
describe('INV-011 — cada tamanho mostra sigla e saldo, nessa ordem; tamanhos na ordem da grade', () => {
  it('6 tamanhos fora de ordem no catálogo aparecem pela ordem da grade, cada um com sigla → saldo', async () => {
    const { usuario } = await abrirPdv(catalogoSeisTamanhos());
    await usuario.click(botao(/^Bermuda Ciclista/));
    await usuario.click(botaoCor('Preto'));
    const botoes = botoesTamanho();
    expect(botoes.map((b) => texto(b.children[0]))).toEqual(['PP', 'P', 'M', 'G', 'GG', 'XG']);
    botoes.forEach((b, i) => {
      expect(b.children).toHaveLength(2);
      expect(texto(b.children[1])).toMatch(mostraSaldo(NA_ORDEM[i]!.saldo));
      // O saldo não se confunde com a sigla: é o segundo texto, logo depois dela.
      expect(texto(b)).toBe(`${NA_ORDEM[i]!.sigla}${texto(b.children[1])}`);
    });
    // Sem linha de preço na tela de cor/tamanho (MI-23).
    expect(screen.queryByText(/^a partir de/)).toBeNull();
    await usuario.click(botaoTamanho('M'));
    expect(screen.queryByText(/^R\$ /)).toBeNull();
  });

  it('catálogo de exemplo: P, M, G, GG na Legging Marinho, com o saldo de cada um (P tem 1, os demais 5)', async () => {
    const { usuario } = await abrirPdv();
    await usuario.click(botao('Calças'));
    await usuario.click(botao(/^Calça Legging/));
    await usuario.click(botaoCor('Marinho'));
    const botoes = botoesTamanho();
    expect(botoes.map((b) => texto(b.children[0]))).toEqual(['P', 'M', 'G', 'GG']);
    [1, 5, 5, 5].forEach((saldo, i) => expect(texto(botoes[i]!.children[1])).toMatch(mostraSaldo(saldo)));
    expect(texto(botoes[1]!.children[1])).not.toMatch(mostraSaldo(1));
  });
});

describe('INV-012 — tamanhos só depois da cor; trocar de cor mantém o tamanho que tem saldo', () => {
  it('sem cor não há cartão Tamanho nem botão de tamanho; com cor aparecem os tamanhos dela', async () => {
    const { usuario } = await abrirPdv();
    await usuario.click(botao(/^Bermuda Ciclista/));
    expect(screen.getByRole('region', { name: 'Cor' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Tamanho' })).not.toBeInTheDocument();
    expect(screen.queryAllByRole('button', { name: /^(P|M|G|GG)estoque/ })).toHaveLength(0);
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
    expect(adicionar()).toBeNull();
    // Voltar para a cor anterior não ressuscita o tamanho.
    await usuario.click(botaoCor('Marinho'));
    expect(botoesTamanho().filter((b) => b.getAttribute('aria-pressed') === 'true')).toHaveLength(0);
  });
});

// MI-05/MI-06 (decisão do Lucas: seguir o design): cartão do produto e botão da cor não avisam mais
// "sem estoque"; continuam clicáveis e o saldo zerado aparece nos tamanhos desabilitados.
describe('INV-013 — produto e cor sem estoque continuam clicáveis; o saldo aparece nos tamanhos', () => {
  it('produto sem estoque: card abre; cada cor pode ser tocada e mostra os tamanhos desabilitados', async () => {
    const { usuario } = await abrirPdv();
    const card = botao(/^Short Curto/);
    expect(texto(card)).toBe('Short Curto');
    expect(texto(botao(/^Bermuda Ciclista/))).toBe('Bermuda Ciclista');
    expect(card).toBeEnabled();
    await usuario.click(card);
    // Título: a peça (tipo) e, embaixo, o tecido (nome do produto sem o tipo) — MI-23.
    expect(screen.getByRole('heading', { level: 1, name: 'Bermudas' })).toBeInTheDocument();
    expect(screen.getByText('Short Curto')).toBeInTheDocument();
    for (const cor of ['Preto', 'Marinho', 'Vinho']) {
      expect(texto(botaoCor(cor))).toBe(cor);
      expect(botaoCor(cor)).toBeEnabled();
    }
    await usuario.click(botaoCor('Marinho'));
    expect(botaoCor('Marinho')).toHaveAttribute('aria-pressed', 'true');
    const tamanhos = botoesTamanho();
    expect(tamanhos).toHaveLength(4);
    for (const t of tamanhos) {
      expect(t).toBeDisabled();
      expect(texto(t.children[1])).toBe('estoque 0');
    }
    expect(adicionar()).toBeNull();
  });

  it('só uma cor zerada: ela continua clicável, sem aviso no botão; os tamanhos dela ficam desabilitados', async () => {
    const catalogo = structuredClone(CATALOGO);
    for (const k of catalogo.produtos.find((p) => p.numero === 3)!.skus) if (k.cor.nome === 'Preto') k.saldo = 0;
    const { usuario } = await abrirPdv(catalogo);
    expect(texto(botao(/^Bermuda Ciclista/))).toBe('Bermuda Ciclista');
    await usuario.click(botao(/^Bermuda Ciclista/));
    expect(texto(botaoCor('Preto'))).toBe('Preto');
    expect(texto(botaoCor('Marinho'))).toBe('Marinho');
    await usuario.click(botaoCor('Preto'));
    expect(botaoCor('Preto')).toHaveAttribute('aria-pressed', 'true');
    for (const t of botoesTamanho()) expect(t).toBeDisabled();
  });
});

describe('INV-015 — voltar, peça e tecido na tela de cor/tamanho', () => {
  it('título com a peça (tipo) e o tecido (produto) e "Voltar para peça e tecido" que volta a Peça/Tecido', async () => {
    const { usuario } = await abrirPdv(catalogoSeisTamanhos());
    await usuario.click(botao(/^Bermuda Ciclista/));
    // MI-23: título com a peça (tipo do ERP) e, embaixo, o tecido como aparece no cartão "2 Tecido".
    expect(screen.getByRole('heading', { level: 1, name: 'Bermudas' })).toBeInTheDocument();
    expect(screen.getByText('Bermuda Ciclista')).toBeInTheDocument();
    // Peça/Tecido não aparece junto: nenhum outro tecido do tipo na tela.
    expect(screen.queryByRole('region', { name: 'Tecido' })).not.toBeInTheDocument();
    expect(screen.queryByText('Short Curto')).not.toBeInTheDocument();
    const voltar = botao('Voltar para peça e tecido');
    expect(voltar.querySelector('svg')).not.toBeNull();
    await usuario.click(voltar);
    expect(screen.queryByRole('heading', { level: 1, name: 'Bermudas' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Voltar para peça e tecido' })).not.toBeInTheDocument();
    expect(botao(/^Bermuda Ciclista/)).toBeInTheDocument();
    // O tipo continua escolhido.
    expect(botao('Bermudas')).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('INV-016 — abas no topo, contador "Pedido (N)" e botões principais', () => {
  const abas = () => within(screen.getByRole('navigation', { name: 'Abas' })).getAllByRole('button');
  // Nome acessível: o contador fica numa bolinha visual e entra no nome pelo `aria-label` ("Pedido (2)").
  const nomeDe = (b: HTMLElement) => b.getAttribute('aria-label') ?? texto(b);
  const nomes = () => abas().map(nomeDe);
  const atual = () => abas().filter((b) => b.getAttribute('aria-current') === 'page').map(nomeDe);

  it('três abas na ordem Produtos, Pedido, Dia; a aba atual é marcada; o contador soma as peças', async () => {
    const { usuario } = await abrirPdv();
    expect(nomes()).toEqual(['Produtos', 'Pedido', 'Dia']);
    expect(atual()).toEqual(['Produtos']);
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    expect(nomes()).toEqual(['Produtos', 'Pedido (1)', 'Dia']);
    expect(atual()).toEqual(['Pedido (1)']);
    // Sem −/+ na linha (MI-24): a mesma peça de novo soma na linha e no contador.
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    expect(nomes()).toEqual(['Produtos', 'Pedido (2)', 'Dia']);
    expect(within(abas()[1]!).getByText('2')).toBeInTheDocument();
    await usuario.click(botao('Dia'));
    expect(atual()).toEqual(['Dia']);
    expect(nomes()).toEqual(['Produtos', 'Pedido (2)', 'Dia']);
  });

  it('"Adicionar ao pedido" só com cor e tamanho escolhidos; "Fechar venda" só na aba Pedido, com os três rótulos', async () => {
    const { usuario } = await abrirPdv();
    const fechar = () => screen.queryByRole('button', { name: /^(Inclua uma peça|Escolha o pagamento|Fechar venda)/ });
    expect([adicionar(), fechar()]).toEqual([null, null]);
    await usuario.click(botao(/^Bermuda Ciclista/));
    expect(adicionar()).toBeNull();
    expect(fechar()).toBeNull();
    await usuario.click(botao('Pedido'));
    expect(adicionar()).toBeNull();
    // MI-07: o botão traz o rótulo e o total; o rótulo é o primeiro texto.
    expect(texto(fechar()!.firstElementChild)).toBe('Inclua uma peça');
    await usuario.click(botao('Dia'));
    expect([adicionar(), fechar()]).toEqual([null, null]);
    // O produto aberto continua aberto ao voltar para Produtos.
    await usuario.click(botao('Produtos'));
    await usuario.click(botaoCor('Preto'));
    await usuario.click(botaoTamanho('M'));
    await usuario.click(adicionar()!);
    // MI-23: adicionar volta para Peça/Tecido; o botão de fechar só existe na aba Pedido.
    expect(adicionar()).toBeNull();
    expect(fechar()).toBeNull();
    await usuario.click(botao(/^Pedido/));
    expect(texto(fechar()!.firstElementChild)).toBe('Escolha o pagamento');
    expect(fechar()).toBeDisabled();
    await usuario.click(botao('Pix'));
    expect(texto(fechar()!.firstElementChild)).toBe('Fechar venda');
    expect(texto(fechar()!.lastElementChild)).toBe('R$ 59,00');
    expect(fechar()).toBeEnabled();
  });
});

// MI-20 / ADR-001 (pdv-mobile-atualizado): o topo com o nome da etapa saiu; as abas ficam no topo,
// desenhadas uma vez, antes do conteúdo. O invariante passa a ser: abas no alto em todas as telas.
describe('INV-017 — as abas aparecem no alto de todas as telas do PDV e ficam presas no alto', () => {
  /** Uma única navegação "Abas", primeiro elemento da folha, antes do conteúdo (`main`). */
  function conferirTopo() {
    const navs = screen.getAllByRole('navigation', { name: 'Abas' });
    expect(navs).toHaveLength(1);
    const topo = navs[0]!;
    expect(topo.parentElement!.firstElementChild).toBe(topo);
    expect(topo.parentElement).toBe(screen.getByRole('main').parentElement);
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    return topo;
  }
  const esperarPdv = () => screen.findByRole('navigation', { name: 'Abas' });

  it('catálogo carregado: Peça/Tecido, cor/tamanho, Pedido e Dia', async () => {
    const { usuario } = await abrirPdv();
    conferirTopo();
    await usuario.click(botao(/^Bermuda Ciclista/));
    conferirTopo();
    await usuario.click(botao('Pedido'));
    expect(screen.getByRole('main', { name: 'Pedido' })).toBeInTheDocument();
    conferirTopo();
    await usuario.click(botao('Dia'));
    await screen.findByText('Nenhuma venda registrada ainda.');
    conferirTopo();
  });

  it('catálogo ainda carregando: abas nas três telas', async () => {
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

  it('catálogo em falha: abas nas três telas', async () => {
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

  it('o estilo das abas as prende no alto (position: sticky; top: 0)', async () => {
    await abrirPdv();
    // jsdom não aplica o CSS: a regra é lida do arquivo, pela classe que as abas usam na tela.
    const css = readFileSync(resolve(import.meta.dirname, '../../src/telas/Pdv/Pdv.module.css'), 'utf8');
    const classes = [...conferirTopo().classList];
    expect(classes.length).toBeGreaterThan(0);
    const regras = classes.flatMap((cls) => [...css.matchAll(new RegExp(`(?:^|[\\s,}])\\.${cls}\\s*\\{([^}]*)\\}`, 'g'))].map((m) => m[1]!));
    const declaracoes = regras.join(';').replace(/\s+/g, '');
    expect(declaracoes).toContain('position:sticky');
    expect(declaracoes).toMatch(/(^|;)top:0(;|$)/);
  });
});
