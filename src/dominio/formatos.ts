/** Formatação pt-BR usada na tela (RNF-F06). */

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * 123456 → "R$ 1.234,56". Mantém o espaço não separável que o Intl põe depois do "R$", para o
 * valor nunca quebrar de linha longe do símbolo.
 */
export function formatarReais(centavos: number): string {
  return moeda.format(centavos / 100);
}

/** Painel de totais do Pedido: "1 peça" / "3 peças". */
export function textoPecas(pecas: number): string {
  return `${pecas} ${pecas === 1 ? 'peça' : 'peças'}`;
}

/** Só os dígitos de um texto ("(31) 98765-4321" → "31987654321"). */
export function somenteDigitos(texto: string): string {
  return texto.replace(/\D/g, '');
}

/**
 * Máscara do celular enquanto o vendedor digita, como no design: até 11 dígitos, "(31) 98765-4321".
 * Com 10 dígitos (ainda incompleto para `celularValido`) fica "(31) 9876-5432"; com menos, só o que já dá.
 */
export function mascararCelular(texto: string): string {
  const d = somenteDigitos(texto).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Celular opcional: vazio vale; preenchido precisa de DDD + celular, exatamente 11 dígitos (mesma regra do back). */
export function celularValido(texto: string): boolean {
  const n = somenteDigitos(texto).length;
  return n === 0 || n === 11;
}
