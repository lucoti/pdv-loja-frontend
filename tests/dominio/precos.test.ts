/**
 * RN-001..RN-004 (ADR-F05): mesmos valores de referência de backend/tests/dominio/precos.test.ts,
 * para garantir que a conta exibida na tela é a mesma que o servidor grava.
 */
import { describe, expect, it } from 'vitest';
import { calcularItem, calcularTotais, DESCONTOS_ITEM, PASSO_DESCONTO_TOTAL_CENTAVOS } from '../../src/dominio/precos';

// precoVariacao (RN-001) saiu com a integração PDV-ERP: o preço unitário vem do SKU do ERP.

describe('calcularItem (RN-002)', () => {
  it('sem desconto: subtotal = preço × qtd', () => {
    expect(calcularItem(5500, 3, 0)).toEqual({ brutoCentavos: 16500, descontoCentavos: 0, subtotalCentavos: 16500 });
  });

  it('desconto exato: 2 × 10100 com 10% → desconto 2020, subtotal 18180', () => {
    expect(calcularItem(10100, 2, 10)).toEqual({ brutoCentavos: 20200, descontoCentavos: 2020, subtotalCentavos: 18180 });
  });

  it('arredonda o desconto meio centavo para cima (4990 × 5% = 249,5 → 250)', () => {
    expect(calcularItem(4990, 1, 5)).toEqual({ brutoCentavos: 4990, descontoCentavos: 250, subtotalCentavos: 4740 });
  });

  it('meio para cima também quando o inteiro abaixo é par (2490 × 5% = 124,5 → 125)', () => {
    expect(calcularItem(2490, 1, 5).descontoCentavos).toBe(125);
  });

  it('abaixo do meio arredonda para baixo (1233 × 5% → 62; 1221 × 5% → 61)', () => {
    expect(calcularItem(1233, 1, 5).descontoCentavos).toBe(62);
    expect(calcularItem(1221, 1, 5).descontoCentavos).toBe(61);
  });

  it('15% sobre várias peças', () => {
    expect(calcularItem(13900, 3, 15)).toEqual({ brutoCentavos: 41700, descontoCentavos: 6255, subtotalCentavos: 35445 });
  });

  it('resultado sempre inteiro em centavos e subtotal = bruto − desconto', () => {
    for (const preco of [1, 99, 4999, 10101, 13900]) {
      for (const d of DESCONTOS_ITEM) {
        const r = calcularItem(preco, 7, d);
        expect(Number.isInteger(r.descontoCentavos)).toBe(true);
        expect(r.subtotalCentavos).toBe(r.brutoCentavos - r.descontoCentavos);
      }
    }
  });
});

describe('calcularTotais (RN-003)', () => {
  const legging = { ...calcularItem(10100, 2, 10), qtd: 2 };
  const top = { ...calcularItem(5500, 1, 0), qtd: 1 };

  it('valores de referência: bruto 25700, descontos 3520, total 22180, 3 peças', () => {
    expect(calcularTotais([legging, top], 1500)).toEqual({
      pecas: 3,
      brutoCentavos: 25700,
      descontoItensCentavos: 2020,
      descontoTotalCentavos: 1500,
      descontosCentavos: 3520,
      totalCentavos: 22180,
    });
  });

  it('total nunca negativo: desconto maior que o bruto → 0', () => {
    const t = calcularTotais([top], 10000);
    expect(t.brutoCentavos).toBe(5500);
    expect(t.descontosCentavos).toBe(10000);
    expect(t.totalCentavos).toBe(0);
  });

  it('desconto igual ao bruto → total 0', () => {
    expect(calcularTotais([top], 5500).totalCentavos).toBe(0);
  });

  it('desconto um centavo abaixo do bruto mantém total positivo', () => {
    expect(calcularTotais([{ ...calcularItem(501, 1, 0), qtd: 1 }], 500).totalCentavos).toBe(1);
  });

  it('lista vazia: tudo zero', () => {
    expect(calcularTotais([], 0)).toEqual({
      pecas: 0,
      brutoCentavos: 0,
      descontoItensCentavos: 0,
      descontoTotalCentavos: 0,
      descontosCentavos: 0,
      totalCentavos: 0,
    });
  });
});

describe('constantes RN-004', () => {
  it('descontos por item 0/5/10/15 e passo de R$ 5', () => {
    expect(DESCONTOS_ITEM).toEqual([0, 5, 10, 15]);
    expect(PASSO_DESCONTO_TOTAL_CENTAVOS).toBe(500);
  });
});
