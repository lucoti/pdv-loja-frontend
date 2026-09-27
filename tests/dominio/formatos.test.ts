/** RNF-F06: moeda R$ pt-BR, data DD/MM/AAAA no fuso da loja e "peça(s)". */
import { describe, expect, it } from 'vitest';
import { dataBr, formatarReais, textoPecas } from '../../src/dominio/formatos';

// O Intl põe espaço não separável (U+00A0) depois do "R$".
const nbsp = ' ';

describe('formatarReais', () => {
  it('centavos → R$ com milhar e vírgula', () => {
    expect(formatarReais(123456)).toBe(`R$${nbsp}1.234,56`);
    expect(formatarReais(22180)).toBe(`R$${nbsp}221,80`);
    expect(formatarReais(5)).toBe(`R$${nbsp}0,05`);
    expect(formatarReais(0)).toBe(`R$${nbsp}0,00`);
  });
});

describe('dataBr', () => {
  it('formata DD/MM/AAAA', () => {
    expect(dataBr(new Date('2026-09-25T15:00:00.000Z'))).toBe('25/09/2026');
  });

  it('usa o fuso de São Paulo: 02:00 UTC ainda é o dia anterior na loja', () => {
    expect(dataBr(new Date('2026-09-26T02:00:00.000Z'))).toBe('25/09/2026');
    expect(dataBr(new Date('2026-09-26T03:00:00.000Z'))).toBe('26/09/2026');
  });

  it('sem argumento usa a data atual', () => {
    expect(dataBr()).toBe(dataBr(new Date()));
    expect(dataBr()).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });
});

describe('textoPecas', () => {
  it('singular e plural', () => {
    expect(textoPecas(1)).toBe('1 peça');
    expect(textoPecas(0)).toBe('0 peças');
    expect(textoPecas(3)).toBe('3 peças');
  });
});
