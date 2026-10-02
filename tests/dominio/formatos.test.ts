/** RNF-F06: moeda R$ pt-BR e "peça(s)". */
import { describe, expect, it } from 'vitest';
import { formatarReais, textoPecas } from '../../src/dominio/formatos';

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

describe('textoPecas', () => {
  it('singular e plural', () => {
    expect(textoPecas(1)).toBe('1 peça');
    expect(textoPecas(0)).toBe('0 peças');
    expect(textoPecas(3)).toBe('3 peças');
  });
});
