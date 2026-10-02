import type { Catalogo } from '../api/cliente';

/*
 * Leitura do catálogo do ERP na tela de venda (integração PDV-ERP): produto → cor → tamanho, cada
 * combinação é um SKU com preço e saldo próprios. Funções puras, sem estado.
 */

export type Produto = Catalogo['produtos'][number];
export type Sku = Produto['skus'][number];
export type CorSku = Sku['cor'];

// ATENÇÃO: com lista de SKUs vazia, Math.min devolve Infinity. O back nunca manda produto sem SKU ativo
// (GET /catalogo filtra), então aqui não há tratamento; se esse filtro mudar, trate a lista vazia.
/** Menor preço entre os SKUs do produto ("a partir de"). */
export function precoMinimo(produto: Produto): number {
  return Math.min(...produto.skus.map((s) => s.precoCentavos));
}

/** Todos os SKUs com saldo 0: o card mostra "sem estoque" (mas ainda abre, para consulta). */
export function semEstoque(skus: Sku[]): boolean {
  return skus.every((s) => s.saldo <= 0);
}

/** Cores do produto, sem repetição, na ordem do catálogo (número da cor no ERP). */
export function coresDoProduto(produto: Produto): CorSku[] {
  const vistas = new Map<number, CorSku>();
  for (const s of produto.skus) if (!vistas.has(s.cor.id)) vistas.set(s.cor.id, s.cor);
  return [...vistas.values()];
}

/** SKUs de uma cor, na ordem da grade de tamanhos. */
export function skusDaCor(produto: Produto, corId: number): Sku[] {
  return produto.skus.filter((s) => s.cor.id === corId).sort((a, b) => a.tamanho.ordem - b.tamanho.ordem);
}

/** SKU da combinação cor + tamanho (ou undefined). */
export function skuDe(produto: Produto, corId: number | null, tamanho: string | null): Sku | undefined {
  if (corId === null || tamanho === null) return undefined;
  return produto.skus.find((s) => s.cor.id === corId && s.tamanho.sigla === tamanho);
}

// SKU que saiu do catálogo depois de uma recarga (inativado no ERP) não aparece no mapa: quem consulta
// trata a ausência como saldo 0.
/** Saldo atual de cada SKU do catálogo, para limitar as quantidades do pedido. */
export function saldosPorSku(catalogo: Catalogo): Map<number, number> {
  return new Map(catalogo.produtos.flatMap((p) => p.skus.map((s) => [s.id, s.saldo] as const)));
}

// Saldo zero ou negativo vira "estoque 0" (o botão do tamanho também fica desabilitado, em
// Variacoes.tsx, que é o único lugar que usa esta função). Cabe em uma linha do botão do tamanho.
// O "sem estoque" da cor e o do card do produto são textos escritos nas próprias telas, não vêm daqui.
/** "estoque 3" / "estoque 0" — quantidade em estoque exibida em cada tamanho. */
export const textoSaldo = (saldo: number) => `estoque ${Math.max(0, saldo)}`;
