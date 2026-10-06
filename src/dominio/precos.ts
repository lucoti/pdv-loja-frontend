/**
 * Regras de preço do handoff (RN-001 a RN-004) em centavos inteiros. Espelho de
 * backend/src/dominio/precos.ts (ADR-F05): a tela usa estas contas só para exibir; o valor gravado
 * é sempre o calculado pelo servidor. Os testes usam os mesmos valores de referência do back.
 */

// RN-004: descontos permitidos por item (%) e passo do desconto no total (R$ 5 = 500 centavos).
// ATENÇÃO: os dois valores precisam ser iguais aos de backend/src/dominio/precos.ts: o back recusa com
// 400 um percentual fora da lista ou um desconto no total que não seja múltiplo do passo.
export const DESCONTOS_ITEM = [0, 5, 10, 15] as const;
export type DescontoItem = (typeof DESCONTOS_ITEM)[number];
export const PASSO_DESCONTO_TOTAL_CENTAVOS = 500;

/** Resultado do cálculo de uma linha: valor cheio, desconto e valor a cobrar. */
export interface ItemCalculado {
  brutoCentavos: number;
  descontoCentavos: number;
  subtotalCentavos: number;
}

/** Totais do pedido; "descontosCentavos" soma os descontos dos itens e o desconto no total. */
export interface TotaisVenda {
  pecas: number;
  brutoCentavos: number;
  descontoItensCentavos: number;
  descontoTotalCentavos: number;
  descontosCentavos: number;
  totalCentavos: number;
}

// O preço unitário vem pronto do SKU do ERP (skus.preco_centavos); aqui só se aplicam os descontos.

/** RN-002: desconto percentual arredondado ao centavo, meio para cima, sem ponto flutuante. */
export function calcularItem(precoUnitCentavos: number, qtd: number, descPercent: number): ItemCalculado {
  const brutoCentavos = precoUnitCentavos * qtd;
  const descontoCentavos = Math.floor((brutoCentavos * descPercent + 50) / 100);
  return { brutoCentavos, descontoCentavos, subtotalCentavos: brutoCentavos - descontoCentavos };
}

/** RN-003: descontos = itens + desconto no total; o total nunca fica negativo. */
export function calcularTotais(itens: Array<ItemCalculado & { qtd: number }>, descontoTotalCentavos: number): TotaisVenda {
  let pecas = 0;
  let brutoCentavos = 0;
  let descontoItensCentavos = 0;
  for (const item of itens) {
    pecas += item.qtd;
    brutoCentavos += item.brutoCentavos;
    descontoItensCentavos += item.descontoCentavos;
  }
  const descontosCentavos = descontoItensCentavos + descontoTotalCentavos;
  return {
    pecas,
    brutoCentavos,
    descontoItensCentavos,
    descontoTotalCentavos,
    descontosCentavos,
    totalCentavos: Math.max(0, brutoCentavos - descontosCentavos),
  };
}
