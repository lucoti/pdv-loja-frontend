/** Formatação pt-BR usada na tela (RNF-F06). As datas seguem o fuso da loja, como o servidor. */

const FUSO_LOJA = 'America/Sao_Paulo';
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const data = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO_LOJA, day: '2-digit', month: '2-digit', year: 'numeric' });

/**
 * 123456 → "R$ 1.234,56". Mantém o espaço não separável que o Intl põe depois do "R$", para o
 * valor nunca quebrar de linha longe do símbolo.
 */
export function formatarReais(centavos: number): string {
  return moeda.format(centavos / 100);
}

/** Data de hoje (ou a informada) como DD/MM/AAAA no fuso da loja. */
export function dataBr(quando: Date = new Date()): string {
  return data.format(quando);
}

/** Painel de totais do Pedido: "1 peça" / "3 peças". */
export function textoPecas(pecas: number): string {
  return `${pecas} ${pecas === 1 ? 'peça' : 'peças'}`;
}
