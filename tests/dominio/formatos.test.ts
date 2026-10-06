/** RNF-F06: moeda R$ pt-BR e "peça(s)". */
import { describe, expect, it } from 'vitest';
import { celularValido, formatarReais, mascararCelular, somenteDigitos, textoPecas } from '../../src/dominio/formatos';

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

// MI-02 (pdv-mobile-refatorado): celular da etapa Cliente.
describe('celular', () => {
  it('somenteDigitos tira máscara, espaços e letras', () => {
    expect(somenteDigitos('(31) 98765-4321')).toBe('31987654321');
    expect(somenteDigitos(' a1b2 ')).toBe('12');
  });

  it('mascararCelular formata enquanto digita e corta em 11 dígitos', () => {
    expect(mascararCelular('')).toBe('');
    expect(mascararCelular('3')).toBe('3');
    expect(mascararCelular('31')).toBe('31');
    expect(mascararCelular('319')).toBe('(31) 9');
    expect(mascararCelular('319876')).toBe('(31) 9876');
    expect(mascararCelular('3198765')).toBe('(31) 9876-5');
    expect(mascararCelular('3132345678')).toBe('(31) 3234-5678');
    expect(mascararCelular('31987654321')).toBe('(31) 98765-4321');
    expect(mascararCelular('(31) 98765-43219999')).toBe('(31) 98765-4321');
  });

  it('celularValido: vazio ou exatamente 11 dígitos (DDD + celular); fixo de 10 e incompleto não valem', () => {
    expect(celularValido('')).toBe(true);
    expect(celularValido('(31) 3234-5678')).toBe(false);
    expect(celularValido('(31) 98765-4321')).toBe(true);
    expect(celularValido('(31) 9876')).toBe(false);
    expect(celularValido('319876543')).toBe(false);
  });
});
