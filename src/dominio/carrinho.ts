import { calcularItem, calcularTotais, PASSO_DESCONTO_TOTAL_CENTAVOS, type DescontoItem, type ItemCalculado, type TotaisVenda } from './precos';

/**
 * Pedido em andamento (RF-F06, RF-F07) como reducer puro (ADR-F02). Fica só em memória: nada vai
 * para o armazenamento do navegador (RNF-F08).
 */

/**
 * Uma linha do carrinho = um SKU do ERP; "chave" é o id do SKU em texto. Os nomes e o preço servem
 * só para exibir: ao fechar, o front manda apenas skuId, qtd e desconto.
 */
// O preço da linha é copiado do catálogo quando ela entra no pedido e é refeito pela ação "precos" a cada
// recarga do catálogo, para o total exibido ser o que o servidor vai cobrar (o preço do SKU no ERP).
export interface ItemCarrinho {
  chave: string;
  skuId: number;
  modeloNome: string;
  tecidoNome: string;
  tamanho: string;
  cor: string;
  qtd: number;
  precoUnitCentavos: number;
  descPercent: DescontoItem;
}

// Cliente e CPF são texto livre, como o vendedor digitou (sem máscara nem validação aqui): o corte
// de espaços é feito no envio (Pdv.tsx) e a conferência do CPF, só no servidor.
// Cliente da venda (MI-02): nome e celular, os dois opcionais, informados na etapa Cliente. O celular
// fica só com os dígitos; a máscara é coisa da tela. O CPF saiu do PDV (pdv-mobile-refatorado).
export interface Pedido {
  itens: ItemCarrinho[];
  descontoTotalCentavos: number;
  cliente: string;
  /** Celular só com dígitos (10 ou 11), ou vazio. */
  telefone: string;
  pagamentoId: string | null;
  /** UUID reenviado em toda tentativa deste pedido; só muda num pedido novo (ADR-F06). */
  chaveIdempotencia: string;
}

export type NovaVariacao = Omit<ItemCarrinho, 'chave' | 'qtd' | 'descPercent'>;

// "limite" = saldo do SKU no catálogo: adicionar e "+" nunca passam dele (RN-24 do ERP, RF-004).
export type AcaoPedido =
  | { tipo: 'adicionar'; variacao: NovaVariacao; limite: number }
  | { tipo: 'mais'; chave: string; limite: number }
  | { tipo: 'menos'; chave: string }
  | { tipo: 'remover'; chave: string }
  | { tipo: 'desconto'; chave: string; descPercent: DescontoItem }
  // "limite" = valor bruto atual do pedido: o desconto no total não passa dele (ADR-005).
  | { tipo: 'descontoTotalMais'; limite: number }
  | { tipo: 'descontoTotalMenos' }
  // Confirmação da etapa Cliente: grava nome e celular juntos.
  | { tipo: 'cliente'; nome: string; telefone: string }
  | { tipo: 'pagamento'; pagamentoId: string }
  // Catálogo recarregado: preço atual de cada SKU (skuId → centavos).
  | { tipo: 'precos'; precos: ReadonlyMap<number, number> }
  // "Cancelar pedido" e "Nova venda": tudo zerado e chave nova (gerada fora, para o reducer ser puro).
  | { tipo: 'novo'; chaveIdempotencia: string };

export function pedidoVazio(chaveIdempotencia: string): Pedido {
  return { itens: [], descontoTotalCentavos: 0, cliente: '', telefone: '', pagamentoId: null, chaveIdempotencia };
}

/** Um SKU = uma linha: é o mesmo critério do servidor para recusar peça repetida (item_repetido). */
export function chaveVariacao(v: Pick<ItemCarrinho, 'skuId'>): string {
  return String(v.skuId);
}

/** Quantidade do SKU já no pedido (0 se não estiver). */
export function qtdNoPedido(p: Pedido, skuId: number): number {
  return p.itens.find((i) => i.skuId === skuId)?.qtd ?? 0;
}

/** Troca a linha da chave pelo retorno de `mudar`; `null` remove a linha. Sempre devolve objetos novos (imutável). */
function alterarItem(p: Pedido, chave: string, mudar: (i: ItemCarrinho) => ItemCarrinho | null): Pedido {
  const itens = p.itens.flatMap((i) => {
    if (i.chave !== chave) return [i];
    const novo = mudar(i);
    return novo ? [novo] : [];
  });
  return { ...p, itens };
}

/** Reducer do pedido: cada ação corresponde a um toque na tela (regras 2, 4, 6 e 7 do handoff). */
export function reduzirPedido(p: Pedido, acao: AcaoPedido): Pedido {
  switch (acao.tipo) {
    case 'adicionar': {
      // Regra 2 do handoff: o mesmo SKU soma na linha existente em vez de criar outra.
      const chave = chaveVariacao(acao.variacao);
      if (p.itens.some((i) => i.chave === chave)) return alterarItem(p, chave, (i) => ({ ...i, qtd: i.qtd < acao.limite ? i.qtd + 1 : i.qtd }));
      // Linha nova só entra se houver ao menos 1 em estoque (defesa extra: a tela já desabilita o botão).
      if (acao.limite < 1) return p;
      return { ...p, itens: [...p.itens, { ...acao.variacao, chave, qtd: 1, descPercent: 0 }] };
    }
    case 'mais':
      // No limite o "+" não faz nada (o botão já aparece desabilitado). Se o saldo caiu abaixo da
      // quantidade (catálogo recarregado), a quantidade fica como está até o vendedor diminuir.
      return alterarItem(p, acao.chave, (i) => ({ ...i, qtd: i.qtd < acao.limite ? i.qtd + 1 : i.qtd }));
    case 'menos':
      // Regra 6: "−" com quantidade 1 remove o item.
      return alterarItem(p, acao.chave, (i) => (i.qtd > 1 ? { ...i, qtd: i.qtd - 1 } : null));
    case 'remover':
      return alterarItem(p, acao.chave, () => null);
    case 'desconto':
      return alterarItem(p, acao.chave, (i) => ({ ...i, descPercent: acao.descPercent }));
    case 'descontoTotalMais': {
      // Teto no bruto (MI-03, ADR-005): o passo de R$ 5 só entra se o desconto novo não passar do valor
      // das peças. O desconto continua múltiplo de R$ 5, como o servidor exige.
      const novo = p.descontoTotalCentavos + PASSO_DESCONTO_TOTAL_CENTAVOS;
      return novo <= acao.limite ? { ...p, descontoTotalCentavos: novo } : p;
    }
    case 'descontoTotalMenos':
      // Regra 4: mínimo 0.
      return { ...p, descontoTotalCentavos: Math.max(0, p.descontoTotalCentavos - PASSO_DESCONTO_TOTAL_CENTAVOS) };
    case 'cliente':
      return { ...p, cliente: acao.nome, telefone: acao.telefone };
    case 'pagamento':
      return { ...p, pagamentoId: acao.pagamentoId };
    case 'precos': {
      // SKU fora do catálogo novo (inativado) mantém o preço antigo: o servidor recusa com item_invalido.
      // Sem nenhuma mudança devolve o mesmo objeto, para não disparar render à toa.
      const mudou = p.itens.some((i) => { const novo = acao.precos.get(i.skuId); return novo !== undefined && novo !== i.precoUnitCentavos; });
      if (!mudou) return p;
      return { ...p, itens: p.itens.map((i) => ({ ...i, precoUnitCentavos: acao.precos.get(i.skuId) ?? i.precoUnitCentavos })) };
    }
    case 'novo':
      return pedidoVazio(acao.chaveIdempotencia);
  }
}

/** Cálculo de cada linha (para o subtotal exibido) e totais do pedido. */
export function calcularPedido(p: Pedido): { itens: Array<ItemCarrinho & ItemCalculado>; totais: TotaisVenda } {
  const itens = p.itens.map((i) => ({ ...i, ...calcularItem(i.precoUnitCentavos, i.qtd, i.descPercent) }));
  return { itens, totais: calcularTotais(itens, p.descontoTotalCentavos) };
}

/** O "+" do desconto no pedido só vale se mais R$ 5 não passarem do valor bruto (ADR-005). */
export function podeAumentarDescontoTotal(p: Pedido): boolean {
  return p.descontoTotalCentavos + PASSO_DESCONTO_TOTAL_CENTAVOS <= calcularPedido(p).totais.brutoCentavos;
}

/** Regra 7: fechar a venda exige ao menos um item e a forma de pagamento. */
export function podeFechar(p: Pedido): boolean {
  return p.itens.length > 0 && p.pagamentoId !== null;
}
