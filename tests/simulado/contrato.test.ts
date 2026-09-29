/**
 * Contrato do simulado (ADR-F04, RNF-F07): toda resposta que os handlers MSW produzem é validada
 * contra o schema documentado em backend/contrato/openapi.yaml (OpenAPI 3.1 = JSON Schema 2020-12),
 * e as requisições que o front monta (login e VendaEntrada) contra os schemas de entrada.
 * Status que o simulado devolva e o contrato não documente faz o teste falhar.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { api } from '../../src/api/cliente';
import { VENDEDORES } from '../../src/simulado/dados';
import { servidor, usarSimulado } from '../apoio';
import { ajv, doc, ENTRADA_LOGIN, ENTRADA_VENDA, validarEntrada, type Metodo } from '../contrato';

const ponteiro = (s: string) => s.replace(/~/g, '~0').replace(/\//g, '~1');
const exercitados = new Set<string>();

interface Resposta {
  status: number;
  tipo: string | null;
  texto: string;
}

async function chamar(metodo: Metodo, caminho: string, corpo?: unknown): Promise<Resposta> {
  const r = await fetch(`${window.location.origin}/api${caminho}`, {
    method: metodo.toUpperCase(),
    headers: corpo === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: corpo === undefined ? undefined : typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
  });
  return { status: r.status, tipo: r.headers.get('content-type'), texto: await r.text() };
}

/** Valida a resposta contra o schema documentado para rota, método e status. Devolve o corpo. */
function validar(rota: string, metodo: Metodo, res: Resposta): any {
  const op = doc.paths[rota]?.[metodo];
  expect(op, `${metodo} ${rota} não está no contrato`).toBeTypeOf('object');
  const status = String(res.status);
  expect(Object.keys(op!.responses), `status ${status} não documentado em ${metodo.toUpperCase()} ${rota}`).toContain(status);
  exercitados.add(`${metodo.toUpperCase()} ${rota} ${status}`);

  const resposta = op!.responses[status]!;
  const base = resposta.$ref ? `openapi${resposta.$ref}` : `openapi#/paths/${ponteiro(rota)}/${metodo}/responses/${status}`;
  const definicao = resposta.$ref ? doc.components.responses[resposta.$ref.split('/').pop()!]! : resposta;
  if (!definicao.content) {
    expect(res.texto, `${metodo} ${rota} ${status} não deveria ter corpo`).toBe('');
    return undefined;
  }
  expect(res.tipo).toMatch(/^application\/json/);
  const corpo: unknown = JSON.parse(res.texto);
  const validador = ajv.getSchema(`${base}/content/application~1json/schema`);
  expect(validador, `schema de ${metodo} ${rota} ${status}`).toBeTypeOf('function');
  const ok = validador!(corpo);
  expect(ok, `${metodo.toUpperCase()} ${rota} ${status}: ${ajv.errorsText(validador!.errors)}\ncorpo: ${res.texto}`).toBe(true);
  return corpo;
}

/** Id do SKU no catálogo de exemplo (mesma regra do back: produto → cor → tamanho, 3 cores × 4 tamanhos). */
const skuId = (p: number, c: number, t: number) => (p - 1) * 12 + (c - 1) * 4 + t;
// Top Nadador Vinho P (R$ 55, saldo 5).
const linha = { skuId: skuId(2, 3, 1), qtd: 1, descPercent: 0 };
const venda = (extra: Record<string, unknown> = {}) => ({ chaveIdempotencia: crypto.randomUUID(), itens: [linha], pagamentoId: 'pix', ...extra });
const ANA = { id: 'ana', nome: 'Ana', cargo: 'Gerente' };

describe('respostas do simulado × contrato OpenAPI', () => {
  it('os schemas do contrato compilam no ajv', () => {
    for (const nome of ['Erro', 'Vendedor', 'RespostaVendedor', 'Catalogo', 'VendaEntrada', 'Venda', 'RespostaVenda', 'VendasDoDia']) {
      expect(ajv.getSchema(`openapi#/components/schemas/${nome}`), nome).toBeTypeOf('function');
    }
  });

  it('GET /config 200', async () => {
    expect(validar('/config', 'get', await chamar('get', '/config')).loja.unidade).toBe('Unidade Centro');
  });

  it('GET /vendedores 200 (um e vários)', async () => {
    expect(validar('/vendedores', 'get', await chamar('get', '/vendedores')).vendedores).toHaveLength(1);
    usarSimulado({ vendedores: [...VENDEDORES, ANA] });
    expect(validar('/vendedores', 'get', await chamar('get', '/vendedores')).vendedores).toHaveLength(2);
  });

  it('POST /auth/login 200, 400 e 401', async () => {
    const ok = validar('/auth/login', 'post', await chamar('post', '/auth/login', { vendedorId: 'carlos', pin: '1234' }));
    expect(ok.vendedor.id).toBe('carlos');
    // expiraEm = próxima meia-noite em São Paulo (03:00 UTC), no futuro.
    expect(ok.expiraEm).toMatch(/T03:00:00\.000Z$/);
    expect(Date.parse(ok.expiraEm)).toBeGreaterThan(Date.now());
    expect(validar('/auth/login', 'post', await chamar('post', '/auth/login', { vendedorId: 'carlos', pin: '12' })).erro.codigo).toBe('entrada_invalida');
    expect(validar('/auth/login', 'post', await chamar('post', '/auth/login', 'nao é json')).erro.codigo).toBe('entrada_invalida');
    expect(validar('/auth/login', 'post', await chamar('post', '/auth/login', { vendedorId: 7, pin: '1234' })).erro.codigo).toBe('entrada_invalida');
    expect(validar('/auth/login', 'post', await chamar('post', '/auth/login', { vendedorId: 'carlos', pin: '9999' })).erro.codigo).toBe('senha_incorreta');
    expect(validar('/auth/login', 'post', await chamar('post', '/auth/login', { vendedorId: 'ninguem', pin: '1234' })).erro.codigo).toBe('senha_incorreta');
  });

  it('GET /auth/sessao 401 e 200 (depois do login)', async () => {
    expect(validar('/auth/sessao', 'get', await chamar('get', '/auth/sessao')).erro.codigo).toBe('sessao_invalida');
    await chamar('post', '/auth/login', { vendedorId: 'carlos', pin: '1234' });
    expect(validar('/auth/sessao', 'get', await chamar('get', '/auth/sessao')).vendedor.nome).toBe('Carlos');
  });

  it('POST /auth/logout 204 sem corpo e encerra a sessão', async () => {
    const { estado } = usarSimulado({ sessaoDe: 'carlos' });
    validar('/auth/logout', 'post', await chamar('post', '/auth/logout'));
    expect(estado.sessao).toBeNull();
    expect((await chamar('get', '/auth/sessao')).status).toBe(401);
  });

  it('GET /catalogo 401 e 200', async () => {
    expect(validar('/catalogo', 'get', await chamar('get', '/catalogo')).erro.codigo).toBe('sessao_invalida');
    usarSimulado({ sessaoDe: 'carlos' });
    const c = validar('/catalogo', 'get', await chamar('get', '/catalogo'));
    expect(c.tipos.map((t: { nome: string }) => t.nome)).toEqual(['Bermudas', 'Calças', 'Tops']);
    expect(c.produtos.find((p: { numero: number }) => p.numero === 3).skus.map((k: { codigo: string }) => k.codigo)).not.toContain('0003.003.04');
  });

  it('POST /vendas 201 (venda de referência), 200 (mesma chave) e numeração a partir de 1042', async () => {
    const { estado } = usarSimulado({ sessaoDe: 'carlos' });
    const ref = {
      chaveIdempotencia: crypto.randomUUID(),
      itens: [
        { skuId: skuId(1, 1, 2), qtd: 2, descPercent: 10 },
        { skuId: skuId(2, 3, 1), qtd: 1, descPercent: 0 },
      ],
      descontoTotalCentavos: 1500,
      cliente: 'Maria',
      cpf: '529.982.247-25',
      pagamentoId: 'pix',
    };
    validarEntrada(ENTRADA_VENDA, ref);
    const criada = await chamar('post', '/vendas', ref);
    expect(criada.status).toBe(201);
    const v = validar('/vendas', 'post', criada).venda;
    expect([v.numero, v.pecas, v.brutoCentavos, v.descontosCentavos, v.totalCentavos, v.cpf]).toEqual([1042, 3, 23300, 3280, 20020, '52998224725']);
    expect(v.itens.map((i: { subtotalCentavos: number }) => i.subtotalCentavos)).toEqual([16020, 5500]);
    expect(v.itens[0]).toMatchObject({ modeloId: 'produto:1', modeloNome: 'Calça Legging', tecidoNome: 'Suplex', tamanho: 'M', cor: 'Preto', precoUnitCentavos: 8900 });
    // Baixa de saldo no catálogo do simulado (5 → 3 e 5 → 4); o reenvio abaixo não baixa de novo.
    const saldoDe = (id: number) => estado.catalogo.produtos.flatMap((p) => p.skus).find((k) => k.id === id)!.saldo;
    expect([saldoDe(skuId(1, 1, 2)), saldoDe(skuId(2, 3, 1))]).toEqual([3, 4]);

    const repetida = await chamar('post', '/vendas', ref);
    expect(repetida.status).toBe(200);
    expect(validar('/vendas', 'post', repetida).venda).toEqual(v);
    expect(estado.vendas).toHaveLength(1);
    expect(saldoDe(skuId(1, 1, 2))).toBe(3);

    const segunda = validar('/vendas', 'post', await chamar('post', '/vendas', venda({ descontoTotalCentavos: 99500 }))).venda;
    expect([segunda.numero, segunda.totalCentavos, segunda.cliente, segunda.cpf]).toEqual([1043, 0, '', '']);
  });

  it('POST /vendas 400 — todos os códigos que o simulado produz', async () => {
    usarSimulado({ sessaoDe: 'carlos' });
    const casos: Array<[unknown, string]> = [
      ['{nao json', 'entrada_invalida'],
      [{ ...venda(), chaveIdempotencia: 'nao-uuid' }, 'entrada_invalida'],
      [{ chaveIdempotencia: crypto.randomUUID(), pagamentoId: 'pix' }, 'entrada_invalida'],
      [venda({ itens: [] }), 'sem_itens'],
      [venda({ pagamentoId: undefined }), 'sem_pagamento'],
      [venda({ pagamentoId: 'cheque' }), 'sem_pagamento'],
      [venda({ cpf: '123.456.789-00' }), 'cpf_invalido'],
      [venda({ cpf: '111.111.111-11' }), 'cpf_invalido'],
      [venda({ cpf: '5299822472' }), 'cpf_invalido'],
      [venda({ cpf: '529a982.247-25' }), 'cpf_invalido'],
      [venda({ itens: [{ ...linha, skuId: 9999 }] }), 'item_invalido'],
      [venda({ itens: [{ ...linha, skuId: skuId(3, 3, 4) }] }), 'item_invalido'], // SKU inativo (fora do catálogo)
      [venda({ itens: [{ ...linha, qtd: 0 }] }), 'entrada_invalida'],
      [venda({ itens: [{ ...linha, qtd: 1.5 }] }), 'entrada_invalida'],
      [venda({ itens: [{ ...linha, descPercent: 20 }] }), 'entrada_invalida'],
      [venda({ itens: [linha, linha] }), 'item_repetido'],
      [venda({ descontoTotalCentavos: 123 }), 'entrada_invalida'],
      [venda({ descontoTotalCentavos: -500 }), 'entrada_invalida'],
    ];
    const codigos: string[] = [];
    for (const [corpo, esperado] of casos) {
      const res = await chamar('post', '/vendas', corpo);
      expect(res.status, esperado).toBe(400);
      codigos.push(validar('/vendas', 'post', res).erro.codigo);
    }
    expect(codigos).toEqual(casos.map(([, c]) => c));
  });

  it('POST /vendas aceita CPF válido sem pontuação e grava só dígitos', async () => {
    usarSimulado({ sessaoDe: 'carlos' });
    const v = validar('/vendas', 'post', await chamar('post', '/vendas', venda({ cpf: '52998224725' }))).venda;
    expect(v.cpf).toBe('52998224725');
  });

  it('POST /vendas 401 sem sessão', async () => {
    expect(validar('/vendas', 'post', await chamar('post', '/vendas', venda())).erro.codigo).toBe('sessao_invalida');
  });

  it('POST /vendas 409: mesma chave usada por outro vendedor', async () => {
    usarSimulado({ vendedores: [...VENDEDORES, ANA], pins: { carlos: '1234', ana: '5678' }, sessaoDe: 'carlos' });
    const corpo = venda();
    expect((await chamar('post', '/vendas', corpo)).status).toBe(201);
    await chamar('post', '/auth/login', { vendedorId: 'ana', pin: '5678' });
    const conflito = await chamar('post', '/vendas', corpo);
    expect(conflito.status).toBe(409);
    expect(validar('/vendas', 'post', conflito).erro.codigo).toBe('chave_em_uso');
  });

  it('POST /vendas 409 sem_estoque: nomeia as peças e não baixa nada', async () => {
    const { estado } = usarSimulado({ sessaoDe: 'carlos' });
    const res = await chamar('post', '/vendas', venda({ itens: [linha, { skuId: skuId(1, 2, 1), qtd: 2, descPercent: 0 }, { skuId: skuId(2, 3, 4), qtd: 1, descPercent: 0 }] }));
    expect(res.status).toBe(409);
    expect(validar('/vendas', 'post', res).erro).toEqual({
      codigo: 'sem_estoque',
      mensagem: 'Item 2: Calça Legging · Marinho · P — só 1 em estoque; Item 3: Top Nadador · Vinho · GG — sem estoque.',
    });
    expect(estado.vendas).toHaveLength(0);
    const saldos = estado.catalogo.produtos.flatMap((p) => p.skus);
    expect(saldos.find((k) => k.id === linha.skuId)!.saldo).toBe(5);
    expect(saldos.find((k) => k.id === skuId(1, 2, 1))!.saldo).toBe(1);
  });

  it('cada instância do simulado tem sua cópia do catálogo (a baixa não vaza para o CATALOGO nem para outro simulado)', async () => {
    usarSimulado({ sessaoDe: 'carlos' });
    expect((await chamar('post', '/vendas', venda({ itens: [{ skuId: skuId(1, 2, 1), qtd: 1, descPercent: 0 }] }))).status).toBe(201);
    const { estado } = usarSimulado({ sessaoDe: 'carlos' });
    expect(estado.catalogo.produtos.flatMap((p) => p.skus).find((k) => k.id === skuId(1, 2, 1))!.saldo).toBe(1);
  });

  it('GET /vendas/hoje 401, 200 vazio e 200 com vendas (mais recente primeiro, só do vendedor)', async () => {
    expect(validar('/vendas/hoje', 'get', await chamar('get', '/vendas/hoje')).erro.codigo).toBe('sessao_invalida');
    usarSimulado({ vendedores: [...VENDEDORES, ANA], pins: { carlos: '1234', ana: '5678' }, sessaoDe: 'carlos' });
    expect(validar('/vendas/hoje', 'get', await chamar('get', '/vendas/hoje'))).toEqual({ vendas: [], totalDiaCentavos: 0, quantidadePedidos: 0 });
    await chamar('post', '/vendas', venda({ cliente: 'Maria' }));
    await chamar('post', '/vendas', venda({ cliente: 'João', itens: [{ ...linha, qtd: 2 }] }));
    await chamar('post', '/auth/login', { vendedorId: 'ana', pin: '5678' });
    await chamar('post', '/vendas', venda({ cliente: 'Da Ana' }));
    await chamar('post', '/auth/login', { vendedorId: 'carlos', pin: '1234' });
    const dia = validar('/vendas/hoje', 'get', await chamar('get', '/vendas/hoje'));
    expect(dia.vendas.map((v: { numero: number; cliente: string; pecas: number }) => [v.numero, v.cliente, v.pecas])).toEqual([
      [1043, 'João', 2],
      [1042, 'Maria', 1],
    ]);
    expect([dia.totalDiaCentavos, dia.quantidadePedidos]).toEqual([16500, 2]); // 55 + 2 × 55
  });
});

describe('requisições do front × contrato', () => {
  it('api.login envia corpo válido para o schema de entrada do login', async () => {
    const corpos: unknown[] = [];
    servidor.events.on('request:start', async ({ request }) => {
      if (request.url.endsWith('/auth/login')) corpos.push(await request.clone().json());
    });
    await api.login('carlos', '1234');
    servidor.events.removeAllListeners();
    expect(corpos).toHaveLength(1);
    validarEntrada(ENTRADA_LOGIN, corpos[0]);
  });

  it('o schema de VendaEntrada recusa preços (additionalProperties: false)', () => {
    const v = ajv.getSchema(ENTRADA_VENDA)!;
    expect(v({ ...venda(), itens: [{ ...linha, precoUnitCentavos: 1 }] })).toBe(false);
    expect(v({ ...venda(), totalCentavos: 1 })).toBe(false);
  });
  // A VendaEntrada montada pela tela é validada em tests/telas/pdv.test.tsx (fluxo completo).
});

afterAll(() => {
  // Pares rota/status que o simulado produz e que foram conferidos contra o contrato.
  const esperados = [
    'GET /config 200',
    'GET /vendedores 200',
    'POST /auth/login 200',
    'POST /auth/login 400',
    'POST /auth/login 401',
    'GET /auth/sessao 200',
    'GET /auth/sessao 401',
    'POST /auth/logout 204',
    'GET /catalogo 200',
    'GET /catalogo 401',
    'POST /vendas 201',
    'POST /vendas 200',
    'POST /vendas 400',
    'POST /vendas 401',
    'POST /vendas 409',
    'GET /vendas/hoje 200',
    'GET /vendas/hoje 401',
  ];
  const faltando = esperados.filter((p) => !exercitados.has(p));
  if (faltando.length) throw new Error(`pares do simulado não validados: ${faltando.join(', ')}`);
});

