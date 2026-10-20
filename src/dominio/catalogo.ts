import type { Catalogo } from '../api/cliente';

/*
 * Leitura do catálogo do ERP na tela de venda (integração PDV-ERP): produto → cor → tamanho, cada
 * combinação é um SKU com preço e saldo próprios. Funções puras, sem estado.
 */

export type Produto = Catalogo['produtos'][number];
export type Sku = Produto['skus'][number];
export type CorSku = Sku['cor'];
export type TamanhoSku = Sku['tamanho'];

// ATENÇÃO: com lista de SKUs vazia, Math.min devolve Infinity. O back nunca manda produto sem SKU ativo
// e com saldo (GET /catalogo filtra), então aqui não há tratamento; se esse filtro mudar, trate a lista vazia.
/** Menor preço entre os SKUs do produto ("a partir de"). */
export function precoMinimo(produto: Produto): number {
  return Math.min(...produto.skus.map((s) => s.precoCentavos));
}

/** Cores do produto, sem repetição, na ordem do catálogo (número da cor no ERP). */
export function coresDoProduto(produto: Produto): CorSku[] {
  const vistas = new Map<number, CorSku>();
  for (const s of produto.skus) if (!vistas.has(s.cor.id)) vistas.set(s.cor.id, s.cor);
  return [...vistas.values()];
}

// O GET /catalogo só manda SKUs com saldo: um tamanho zerado em todas as cores não chega aqui e não
// entra na grade. Zerado só em algumas cores, ele entra e a tela o mostra desligado nessas cores.
/** Tamanhos do produto (em qualquer cor), sem repetição, na ordem da grade do ERP. */
export function tamanhosDoProduto(produto: Produto): TamanhoSku[] {
  const vistos = new Map<string, TamanhoSku>();
  for (const s of produto.skus) if (!vistos.has(s.tamanho.sigla)) vistos.set(s.tamanho.sigla, s.tamanho);
  return [...vistos.values()].sort((a, b) => a.ordem - b.ordem);
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

// Sem SKU (o GET /catalogo não manda os zerados) ou com saldo 0 vira "sem estoque"; o botão do tamanho
// fica desligado (Variacoes.tsx, único uso). Cabe em uma linha do botão do tamanho.
/** "estoque 3" / "sem estoque" — quantidade em estoque exibida em cada tamanho. */
export const textoSaldo = (saldo: number | undefined) => (saldo && saldo > 0 ? `estoque ${saldo}` : 'sem estoque');
