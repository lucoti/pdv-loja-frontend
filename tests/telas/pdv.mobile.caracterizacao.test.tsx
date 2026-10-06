/**
 * Caracterização da refatoração pdv-mobile-refatorado (Fase 4, passo 1), escrita sobre o código ANTES
 * da refatoração. Cobre as lacunas dos invariantes INV-001, INV-002, INV-010, INV-011, INV-013,
 * INV-014, INV-018 e INV-019 de 02-requisitos.md; os demais (INV-012, INV-015, INV-016, INV-017) já
 * estão nos testes existentes (ver o relatório da etapa).
 *
 * As asserções miram o comportamento (corpo enviado, quantidade de pedidos HTTP, chave de
 * idempotência, gravação no navegador). Os textos e gestos que o design vai trocar ficam nos helpers
 * de `ajuda.tsx` (comecarNovaVenda, cancelarPedido, informarCliente, aumentarDescontoNoPedido,
 * esperarTelaDeLogin...), nunca repetidos aqui (AP-004).
 */
import { act, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../src/api/cliente';
import { CATALOGO } from '../../src/simulado/dados';
import { servidor, usarSimulado } from '../apoio';
import { ENTRADA_VENDA, validarEntrada } from '../contrato';
import {
  abrirApp,
  adicionarPeca,
  aumentarDescontoNoPedido,
  botaoFechar,
  cancelarPedido,
  comecarNovaVenda,
  enviarPin,
  escolherPagamento,
  esperarCatalogo,
  esperarErroAoFechar,
  esperarPdv,
  esperarTelaDeLogin,
  esperarVendaRegistrada,
  informarCliente,
  itensPedido,
  LEGGING_M_PRETO,
  TOP_NADADOR_P_VINHO,
} from './ajuda';

afterEach(() => {
  servidor.events.removeAllListeners();
  vi.restoreAllMocks();
});

/** PDV já logado (sessão válida), com o catálogo carregado. */
async function abrirPdv() {
  const simulado = usarSimulado({ sessaoDe: 'carlos' });
  const app = abrirApp();
  await esperarCatalogo();
  return { ...app, simulado };
}

/** Registra cada requisição feita pela página: método, caminho e corpo (POST). */
function registrarRequisicoes() {
  const vistas: Array<{ rota: string; corpo?: any }> = [];
  servidor.events.on('request:start', async ({ request }) => {
    const rota = `${request.method} ${new URL(request.url).pathname}`;
    const item: { rota: string; corpo?: any } = { rota };
    vistas.push(item);
    if (request.method === 'POST') item.corpo = await request.clone().json();
  });
  return {
    vendas: () => vistas.filter((v) => v.rota === 'POST /api/vendas').map((v) => v.corpo),
    contar: (rota: string) => vistas.filter((v) => v.rota === rota).length,
  };
}

/** Faz o POST /vendas falhar com 500 enquanto `falhar.agora` for verdadeiro; depois vai ao simulado. */
function falharVendas() {
  const falhar = { agora: true };
  servidor.use(http.post('*/api/vendas', () => (falhar.agora ? HttpResponse.json({ erro: { codigo: 'erro_interno', mensagem: 'Erro interno.' } }, { status: 500 }) : undefined)));
  return falhar;
}

/** Segura o POST /vendas até `liberar()`; depois segue para o simulado. */
function prenderVendas() {
  let liberar = () => {};
  const preso = new Promise<void>((r) => (liberar = r));
  servidor.use(
    http.post('*/api/vendas', async () => {
      await preso;
      return undefined;
    }),
  );
  return { liberar: () => liberar() };
}

/**
 * Dispara N cliques nativos no mesmo elemento dentro de um único `act`, sem redesenho entre eles:
 * reproduz toques mais rápidos que o redesenho (AP-001; mesmo padrão de `tocarSemRedesenhar` em
 * login.test.tsx). userEvent/fireEvent redesenham a cada toque e esconderiam uma trava lida do estado.
 */
function tocarSemRedesenhar(elemento: HTMLElement, vezes: number) {
  act(() => {
    for (let i = 0; i < vezes; i++) elemento.click();
  });
}

const sku = (produto: string, cor: string, tamanho: string) =>
  CATALOGO.produtos.find((p) => p.nome === produto)!.skus.find((k) => k.cor.nome === cor && k.tamanho.sigla === tamanho)!;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Monta e fecha um pedido de uma peça (Top Nadador Vinho P, Pix). */
async function montarUmaPeca(usuario: Awaited<ReturnType<typeof abrirPdv>>['usuario']) {
  await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
  await escolherPagamento(usuario, 'Pix');
}

/**
 * Campos do corpo do POST /vendas hoje. Ponto único que muda com a feature pdv-cliente-telefone
 * (`cpf` → `telefone`, registrada em "Invariantes alterados intencionalmente" quando executada).
 */
const CAMPOS_VENDA = ['chaveIdempotencia', 'cliente', 'cpf', 'descontoTotalCentavos', 'itens', 'pagamentoId'];
const CAMPOS_ITEM = ['descPercent', 'qtd', 'skuId'];

describe('INV-001 — corpo do POST /vendas', () => {
  it('exatamente os campos do contrato, itens só com skuId/qtd/descPercent, descPercent 0 sem desconto por peça, e nenhum preço', async () => {
    const req = registrarRequisicoes();
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, LEGGING_M_PRETO);
    await usuario.click(within(itensPedido()[0]!).getByRole('button', { name: 'Aumentar quantidade' }));
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await aumentarDescontoNoPedido(usuario, 2);
    await informarCliente(usuario, '  Ana  ');
    await escolherPagamento(usuario, 'Dinheiro');
    await usuario.click(botaoFechar());
    await esperarVendaRegistrada();

    const corpos = req.vendas();
    expect(corpos).toHaveLength(1);
    const corpo = corpos[0];
    expect(Object.keys(corpo).sort()).toEqual(CAMPOS_VENDA);
    expect(corpo.itens).toHaveLength(2);
    for (const item of corpo.itens) expect(Object.keys(item).sort()).toEqual(CAMPOS_ITEM);
    expect(corpo.itens).toEqual([
      { skuId: sku('Calça Legging', 'Preto', 'M').id, qtd: 2, descPercent: 0 },
      { skuId: sku('Top Nadador', 'Vinho', 'P').id, qtd: 1, descPercent: 0 },
    ]);
    expect(corpo.chaveIdempotencia).toMatch(UUID);
    expect(corpo.descontoTotalCentavos).toBe(1000);
    expect(corpo.cliente).toBe('Ana');
    expect(corpo.cpf).toBe('');
    expect(corpo.pagamentoId).toBe('dinheiro');
    // Sem preço: nenhum número do corpo é preço unitário, bruto ou total do pedido (89,00 / 55,00 / 233,00 / 223,00).
    const numeros = JSON.stringify(corpo).match(/\d+/g)!.map(Number);
    for (const preco of [8900, 5500, 23300, 22300]) expect(numeros).not.toContain(preco);
    validarEntrada(ENTRADA_VENDA, corpo);
  });
});

describe('INV-002 — leituras da API sem mudança de rota nem de formato', () => {
  it('cada função do cliente chama o método e a rota de hoje, na origem da página, e devolve a resposta sem transformar', async () => {
    const simulado = usarSimulado({ sessaoDe: 'carlos' });
    const vistos: string[] = [];
    servidor.events.on('request:start', ({ request }) => void vistos.push(`${request.method} ${request.url} ${request.credentials}`));
    const origem = window.location.origin;

    expect(await api.sessao()).toEqual({ vendedor: { id: 'carlos', nome: 'Carlos', cargo: 'Vendedor · loja' }, expiraEm: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/) });
    expect(await api.catalogo()).toEqual(simulado.estado.catalogo);
    expect(await api.vendasHoje()).toEqual({ vendas: [], totalDiaCentavos: 0, quantidadePedidos: 0 });
    expect((await api.vendedores()).vendedores.map((v) => v.id)).toEqual(['carlos']);
    expect(await api.config()).toEqual({ loja: { nome: 'FitMoveOn', unidade: 'Unidade Centro' } });
    expect(vistos).toEqual([
      `GET ${origem}/api/auth/sessao same-origin`,
      `GET ${origem}/api/catalogo same-origin`,
      `GET ${origem}/api/vendas/hoje same-origin`,
      `GET ${origem}/api/vendedores same-origin`,
      `GET ${origem}/api/config same-origin`,
    ]);
  });
});

describe('INV-010 — sessão expirada (401) leva ao login', () => {
  it('401 no fechamento: a página volta ao login e nenhuma venda é gravada', async () => {
    const req = registrarRequisicoes();
    const { usuario, simulado } = await abrirPdv();
    await montarUmaPeca(usuario);
    simulado.estado.sessao = null;
    await usuario.click(botaoFechar());
    await esperarTelaDeLogin();
    // Conferido também fora do helper: as abas do PDV saíram da página.
    expect(screen.queryByRole('navigation', { name: 'Abas' })).not.toBeInTheDocument();
    expect(req.vendas()).toHaveLength(1);
    expect(simulado.estado.vendas).toHaveLength(0);
  });
});

describe('INV-011 — chave de idempotência', () => {
  it('igual em toda tentativa do mesmo pedido (mesmo depois de editá-lo); nova depois de "Cancelar pedido" e depois da venda registrada', async () => {
    const req = registrarRequisicoes();
    const { usuario } = await abrirPdv();
    const falhar = falharVendas();
    const tentar = async () => {
      const antes = req.vendas().length;
      await usuario.click(botaoFechar());
      await waitFor(() => expect(req.vendas()).toHaveLength(antes + 1));
      await esperarErroAoFechar();
    };

    // Pedido A: duas tentativas com erro, uma edição, terceira tentativa.
    await montarUmaPeca(usuario);
    await tentar();
    await tentar();
    await usuario.click(within(itensPedido()[0]!).getByRole('button', { name: 'Aumentar quantidade' }));
    await tentar();
    // Pedido B (depois de "Cancelar pedido"): erro e depois sucesso.
    await cancelarPedido(usuario);
    await montarUmaPeca(usuario);
    await tentar();
    falhar.agora = false;
    await usuario.click(botaoFechar());
    await esperarVendaRegistrada();
    // Pedido C (depois da venda registrada).
    await comecarNovaVenda(usuario);
    await montarUmaPeca(usuario);
    falhar.agora = true;
    await tentar();
    await tentar();

    const chaves = req.vendas().map((c) => c.chaveIdempotencia as string);
    expect(chaves).toHaveLength(7);
    for (const c of chaves) expect(c).toMatch(UUID);
    const [a1, a2, a3, b1, b2, c1, c2] = chaves; // b2 = tentativa que deu certo
    expect([a2, a3]).toEqual([a1, a1]);
    expect(req.vendas()[2].itens[0].qtd).toBe(2); // a edição foi enviada com a mesma chave
    expect(b2).toBe(b1);
    expect(b1).not.toBe(a1);
    expect(c2).toBe(c1);
    expect(new Set([a1, b1, c1]).size).toBe(3);
  });
});

describe('INV-013 — sem envio duplo', () => {
  /**
   * Achado da caracterização: com a trava lida do estado do React, dois toques antes do redesenho
   * geravam DOIS POST /vendas (mesma chave; o servidor gravava uma venda só). O ADR-006 passou a trava
   * para um useRef (etapa 4 da pdv-mobile-refatorado) e este teste deixou de ser `it.fails`.
   */
  it('dois toques em "Fechar venda" no mesmo instante, sem redesenho entre eles, geram um único POST /vendas', async () => {
    const req = registrarRequisicoes();
    const { usuario, simulado } = await abrirPdv();
    const { liberar } = prenderVendas();
    await montarUmaPeca(usuario);
    tocarSemRedesenhar(botaoFechar(), 2);
    await waitFor(() => expect(req.vendas().length).toBeGreaterThan(0));
    liberar();
    await esperarVendaRegistrada();
    expect(req.vendas()).toHaveLength(1);
    expect(simulado.estado.vendas).toHaveLength(1);
  });

  it('dois toques no mesmo instante: todo envio leva o mesmo corpo e a mesma chave, e o servidor grava uma única venda', async () => {
    const req = registrarRequisicoes();
    const { usuario, simulado } = await abrirPdv();
    const { liberar } = prenderVendas();
    await montarUmaPeca(usuario);
    tocarSemRedesenhar(botaoFechar(), 2);
    await waitFor(() => expect(req.vendas().length).toBeGreaterThan(0));
    liberar();
    await esperarVendaRegistrada();
    const corpos = req.vendas();
    expect(corpos.length).toBeGreaterThanOrEqual(1);
    expect(corpos.length).toBeLessThanOrEqual(2);
    for (const c of corpos) expect(c).toEqual(corpos[0]);
    expect(simulado.estado.vendas).toHaveLength(1);
    expect(simulado.estado.vendas[0]!.chave).toBe(corpos[0].chaveIdempotencia);
  });

  it('com um envio em andamento, novos toques (com redesenho) não geram outro POST /vendas', async () => {
    const req = registrarRequisicoes();
    const { usuario, simulado } = await abrirPdv();
    const { liberar } = prenderVendas();
    await montarUmaPeca(usuario);
    await usuario.click(botaoFechar());
    await waitFor(() => expect(req.vendas()).toHaveLength(1));
    await usuario.click(botaoFechar());
    await usuario.click(botaoFechar());
    liberar();
    await esperarVendaRegistrada();
    expect(req.vendas()).toHaveLength(1);
    expect(simulado.estado.vendas).toHaveLength(1);
  });

  it('sem peça ou sem pagamento, tocar em fechar não envia nada', async () => {
    const req = registrarRequisicoes();
    const { usuario } = await abrirPdv();
    await usuario.click(screen.getByRole('button', { name: 'Pedido' }));
    tocarSemRedesenhar(botaoFechar(), 1);
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    tocarSemRedesenhar(botaoFechar(), 1);
    await escolherPagamento(usuario, 'Pix');
    await usuario.click(botaoFechar());
    await esperarVendaRegistrada();
    expect(req.vendas()).toHaveLength(1);
  });
});

describe('INV-014 — erro do servidor: pedido intacto e recarga do catálogo só em sem_estoque / item_invalido', () => {
  it.each([
    { caso: '409 sem_estoque', status: 409, codigo: 'sem_estoque', recarrega: true },
    { caso: '400 item_invalido', status: 400, codigo: 'item_invalido', recarrega: true },
    { caso: '400 cpf_invalido', status: 400, codigo: 'cpf_invalido', recarrega: false },
    { caso: '409 chave_em_uso', status: 409, codigo: 'chave_em_uso', recarrega: false },
    { caso: '500 erro_interno', status: 500, codigo: 'erro_interno', recarrega: false },
  ])('$caso: a nova tentativa reenvia o mesmo pedido; recarrega o catálogo = $recarrega', async ({ status, codigo, recarrega }) => {
    const req = registrarRequisicoes();
    const { usuario, simulado } = await abrirPdv();
    let respostas = 0;
    servidor.use(
      http.post('*/api/vendas', () => {
        if (respostas++ > 0) return undefined;
        return HttpResponse.json({ erro: { codigo, mensagem: `Mensagem ${codigo}` } }, { status });
      }),
    );
    await montarUmaPeca(usuario);
    await usuario.click(botaoFechar());
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(`Mensagem ${codigo}`));
    await waitFor(() => expect(req.contar('GET /api/catalogo')).toBe(recarrega ? 2 : 1));
    expect(itensPedido()).toHaveLength(1);
    await usuario.click(botaoFechar());
    await esperarVendaRegistrada();
    const [primeiro, segundo] = req.vendas();
    expect(segundo).toEqual(primeiro);
    expect(simulado.estado.vendas).toHaveLength(1);
  });

  it('a mensagem de erro some na próxima mudança do pedido (tirar a peça)', async () => {
    const { usuario } = await abrirPdv();
    falharVendas();
    await montarUmaPeca(usuario);
    await usuario.click(botaoFechar());
    await esperarErroAoFechar();
    expect(screen.getByRole('alert')).toHaveTextContent('Erro interno.');
    await usuario.click(within(itensPedido()[0]!).getByRole('button', { name: 'Diminuir quantidade' }));
    expect(itensPedido()).toHaveLength(0);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('INV-018 — aba Dia independe do catálogo', () => {
  /** Uma venda já registrada no servidor antes de a página abrir. */
  async function vendaJaRegistrada() {
    await api.registrarVenda({ chaveIdempotencia: crypto.randomUUID(), itens: [{ skuId: sku('Top Nadador', 'Vinho', 'P').id, qtd: 1, descPercent: 0 }], descontoTotalCentavos: 0, cliente: '', cpf: '', pagamentoId: 'pix' });
  }

  it('catálogo carregando: a aba Dia busca as vendas de hoje e mostra a venda do servidor', async () => {
    usarSimulado({ sessaoDe: 'carlos' });
    await vendaJaRegistrada();
    const { liberar } = (() => {
      let l = () => {};
      const preso = new Promise<void>((r) => (l = r));
      servidor.use(
        http.get('*/api/catalogo', async () => {
          await preso;
          return undefined;
        }),
      );
      return { liberar: () => l() };
    })();
    const req = registrarRequisicoes();
    const { usuario } = abrirApp();
    await esperarPdv();
    await usuario.click(screen.getByRole('button', { name: 'Dia' }));
    await waitFor(() => expect(screen.getAllByTestId('venda-dia')).toHaveLength(1));
    expect(req.contar('GET /api/vendas/hoje')).toBe(1);
    expect(req.contar('GET /api/catalogo')).toBe(1);
    liberar();
  });

  it('catálogo em falha: a aba Dia busca as vendas de hoje e mostra a venda do servidor', async () => {
    usarSimulado({ sessaoDe: 'carlos' });
    await vendaJaRegistrada();
    servidor.use(http.get('*/api/catalogo', () => HttpResponse.error()));
    const req = registrarRequisicoes();
    const { usuario } = abrirApp();
    await esperarPdv();
    await waitFor(() => expect(req.contar('GET /api/catalogo')).toBe(1));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    await usuario.click(screen.getByRole('button', { name: 'Dia' }));
    await waitFor(() => expect(screen.getAllByTestId('venda-dia')).toHaveLength(1));
    expect(req.contar('GET /api/vendas/hoje')).toBe(1);
  });
});

describe('INV-019 — pedido só em memória', () => {
  it('login, venda com cliente e desconto, nova venda, cancelar e aba Dia: nenhuma escrita em localStorage/sessionStorage', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem');
    const clear = vi.spyOn(Storage.prototype, 'clear');
    const { usuario } = abrirApp();
    await screen.findByRole('img', { name: /números digitados/ });
    await enviarPin(usuario);
    await esperarCatalogo();
    await adicionarPeca(usuario, LEGGING_M_PRETO);
    await informarCliente(usuario, 'Maria');
    await aumentarDescontoNoPedido(usuario, 1);
    await escolherPagamento(usuario, 'Pix');
    await usuario.click(botaoFechar());
    await comecarNovaVenda(usuario);
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await cancelarPedido(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Dia' }));
    await waitFor(() => expect(screen.getAllByTestId('venda-dia')).toHaveLength(1));
    expect(setItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
    expect(clear).not.toHaveBeenCalled();
    expect([localStorage.length, sessionStorage.length]).toEqual([0, 0]);
  });
});
