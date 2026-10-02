/** Leitura do catálogo do ERP na tela de venda (integração PDV-ERP, RF-002..RF-004). */
import { describe, expect, it } from 'vitest';
import type { Catalogo } from '../../src/api/cliente';
import { coresDoProduto, precoMinimo, saldosPorSku, semEstoque, skuDe, skusDaCor, textoSaldo, type Produto, type Sku } from '../../src/dominio/catalogo';

const PRETO = { id: 1, nome: 'Preto', hex: '#1B1B1B', fotoUrl: null };
const VINHO = { id: 3, nome: 'Vinho', hex: '#6B2232', fotoUrl: null };
const sku = (id: number, cor: Sku['cor'], sigla: string, ordem: number, precoCentavos: number, saldo: number): Sku => ({
  id,
  codigo: `0001.${String(cor.id).padStart(3, '0')}.${String(ordem).padStart(2, '0')}`,
  cor,
  tamanho: { sigla, ordem },
  precoCentavos,
  saldo,
});

// SKUs fora de ordem de propósito: tamanho G antes de P, Vinho antes de Preto.
const produto: Produto = {
  id: 1,
  numero: 1,
  nome: 'Calça Legging',
  tipoId: 1,
  tecidoNome: 'Suplex',
  skus: [sku(11, VINHO, 'G', 3, 9900, 0), sku(1, PRETO, 'G', 3, 9500, 2), sku(9, VINHO, 'P', 1, 8900, 1), sku(2, PRETO, 'P', 1, 8900, 0)],
};

describe('precoMinimo', () => {
  it('menor preço entre os SKUs ("a partir de")', () => {
    expect(precoMinimo(produto)).toBe(8900);
    expect(precoMinimo({ ...produto, skus: [sku(1, PRETO, 'P', 1, 12000, 1), sku(2, PRETO, 'M', 2, 11000, 1)] })).toBe(11000);
  });
});

describe('semEstoque', () => {
  it('só quando todos os SKUs estão com saldo 0 (ou menos)', () => {
    expect(semEstoque(produto.skus)).toBe(false);
    expect(semEstoque([sku(1, PRETO, 'P', 1, 1, 0), sku(2, PRETO, 'M', 2, 1, -1)])).toBe(true);
    expect(semEstoque([sku(1, PRETO, 'P', 1, 1, 0), sku(2, PRETO, 'M', 2, 1, 1)])).toBe(false);
  });
});

describe('coresDoProduto / skusDaCor / skuDe', () => {
  it('cores sem repetição, na ordem em que aparecem', () => {
    expect(coresDoProduto(produto)).toEqual([VINHO, PRETO]);
  });

  it('SKUs de uma cor ordenados pela ordem do tamanho; cor sem SKU → lista vazia', () => {
    expect(skusDaCor(produto, 1).map((s) => s.tamanho.sigla)).toEqual(['P', 'G']);
    expect(skusDaCor(produto, 3).map((s) => s.id)).toEqual([9, 11]);
    expect(skusDaCor(produto, 42)).toEqual([]);
  });

  it('não altera a ordem original dos SKUs do produto', () => {
    skusDaCor(produto, 1);
    expect(produto.skus.map((s) => s.id)).toEqual([11, 1, 9, 2]);
  });

  it('skuDe acha a combinação cor + tamanho; falta de cor, tamanho ou combinação → undefined', () => {
    expect(skuDe(produto, 1, 'G')!.id).toBe(1);
    expect(skuDe(produto, 3, 'P')!.id).toBe(9);
    expect(skuDe(produto, null, 'P')).toBeUndefined();
    expect(skuDe(produto, 1, null)).toBeUndefined();
    expect(skuDe(produto, 1, 'GG')).toBeUndefined();
  });
});

describe('saldosPorSku', () => {
  it('mapa id do SKU → saldo de todos os produtos; SKU ausente fica fora do mapa', () => {
    const catalogo: Catalogo = {
      tipos: [{ id: 1, nome: 'Calças' }],
      produtos: [produto, { ...produto, id: 2, numero: 2, skus: [sku(30, PRETO, 'M', 2, 5500, 7)] }],
      pagamentos: [],
    };
    const m = saldosPorSku(catalogo);
    expect([...m.entries()]).toEqual([
      [11, 0],
      [1, 2],
      [9, 1],
      [2, 0],
      [30, 7],
    ]);
    expect(m.has(999)).toBe(false);
    expect(saldosPorSku({ tipos: [], produtos: [], pagamentos: [] }).size).toBe(0);
  });
});

describe('textoSaldo', () => {
  it('"estoque N" com saldo positivo; "estoque 0" com zero ou negativo', () => {
    expect(textoSaldo(1)).toBe('estoque 1');
    expect(textoSaldo(3)).toBe('estoque 3');
    expect(textoSaldo(0)).toBe('estoque 0');
    expect(textoSaldo(-2)).toBe('estoque 0');
  });
});
