import { calcularItem, calcularTotais, PASSO_DESCONTO_TOTAL_CENTAVOS, type DescontoItem, type ItemCalculado, type TotaisVenda } from './precos';

/**
 * Pedido em andamento (RF-F06, RF-F07) como reducer puro (ADR-F02). Fica só em memória: nada vai
 * para o armazenamento do navegador (RNF-F08).
 */

/** Uma linha do carrinho; "chave" identifica a variação (modelo + tecido + tamanho + cor). */
export interface ItemCarrinho {
  chave: string;
  modeloId: string;
  modeloNome: string;
  tecidoId: string;
  tecidoNome: string;
  tamanho: string;
  cor: string;
  qtd: number;
  precoUnitCentavos: number;
  descPercent: DescontoItem;
}

export interface Pedido {
  itens: ItemCarrinho[];
  descontoTotalCentavos: number;
  cliente: string;
  cpf: string;
  pagamentoId: string | null;
  /** UUID reenviado em toda tentativa deste pedido; só muda num pedido novo (ADR-F06). */
  chaveIdempotencia: string;
}

export type NovaVariacao = Omit<ItemCarrinho, 'chave' | 'qtd' | 'descPercent'>;

export type AcaoPedido =
  | { tipo: 'adicionar'; variacao: NovaVariacao }
  | { tipo: 'mais'; chave: string }
  | { tipo: 'menos'; chave: string }
  | { tipo: 'remover'; chave: string }
  | { tipo: 'desconto'; chave: string; descPercent: DescontoItem }
  | { tipo: 'descontoTotalMais' }
  | { tipo: 'descontoTotalMenos' }
  | { tipo: 'cliente'; valor: string }
  | { tipo: 'cpf'; valor: string }
  | { tipo: 'pagamento'; pagamentoId: string }
  // "Cancelar pedido" e "Nova venda": tudo zerado e chave nova (gerada fora, para o reducer ser puro).
  | { tipo: 'novo'; chaveIdempotencia: string };

export function pedidoVazio(chaveIdempotencia: string): Pedido {
  return { itens: [], descontoTotalCentavos: 0, cliente: '', cpf: '', pagamentoId: null, chaveIdempotencia };
}

/** Mesma composição de chave que o servidor usa para recusar variação repetida (item_repetido). */
export function chaveVariacao(v: Pick<ItemCarrinho, 'modeloId' | 'tecidoId' | 'tamanho' | 'cor'>): string {
  return [v.modeloId, v.tecidoId, v.tamanho, v.cor].join('|');
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
      // Regra 2 do handoff: a mesma variação soma na linha existente em vez de criar outra.
      const chave = chaveVariacao(acao.variacao);
      if (p.itens.some((i) => i.chave === chave)) return alterarItem(p, chave, (i) => ({ ...i, qtd: i.qtd + 1 }));
      return { ...p, itens: [...p.itens, { ...acao.variacao, chave, qtd: 1, descPercent: 0 }] };
    }
    case 'mais':
      return alterarItem(p, acao.chave, (i) => ({ ...i, qtd: i.qtd + 1 }));
    case 'menos':
      // Regra 6: "−" com quantidade 1 remove o item.
      return alterarItem(p, acao.chave, (i) => (i.qtd > 1 ? { ...i, qtd: i.qtd - 1 } : null));
    case 'remover':
      return alterarItem(p, acao.chave, () => null);
    case 'desconto':
      return alterarItem(p, acao.chave, (i) => ({ ...i, descPercent: acao.descPercent }));
    case 'descontoTotalMais':
      return { ...p, descontoTotalCentavos: p.descontoTotalCentavos + PASSO_DESCONTO_TOTAL_CENTAVOS };
    case 'descontoTotalMenos':
      // Regra 4: mínimo 0.
      return { ...p, descontoTotalCentavos: Math.max(0, p.descontoTotalCentavos - PASSO_DESCONTO_TOTAL_CENTAVOS) };
    case 'cliente':
      return { ...p, cliente: acao.valor };
    case 'cpf':
      return { ...p, cpf: acao.valor };
    case 'pagamento':
      return { ...p, pagamentoId: acao.pagamentoId };
    case 'novo':
      return pedidoVazio(acao.chaveIdempotencia);
  }
}

/** Cálculo de cada linha (para o subtotal exibido) e totais do pedido. */
export function calcularPedido(p: Pedido): { itens: Array<ItemCarrinho & ItemCalculado>; totais: TotaisVenda } {
  const itens = p.itens.map((i) => ({ ...i, ...calcularItem(i.precoUnitCentavos, i.qtd, i.descPercent) }));
  return { itens, totais: calcularTotais(itens, p.descontoTotalCentavos) };
}

/** Regra 7: fechar a venda exige ao menos um item e a forma de pagamento. */
export function podeFechar(p: Pedido): boolean {
  return p.itens.length > 0 && p.pagamentoId !== null;
}
