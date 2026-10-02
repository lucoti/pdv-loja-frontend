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
