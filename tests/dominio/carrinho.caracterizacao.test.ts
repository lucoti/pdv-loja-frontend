/**
 * Caracterização do domínio para a refatoração pdv-mobile-atualizado (Fase 4, passo 1), sem usar as
 * ações `mais`/`menos`, que saem na etapa 2 (INV-012 alterado). O ADR-004 vai limitar o desconto ao bruto
 * no fim de toda ação; estes testes fixam o que não pode mudar com isso:
 * - INV-015: a ação `precos` sem mudança devolve o MESMO objeto, também com desconto, cliente e pagamento.
 * - INV-031: desconto de R$ 5 em R$ 5, nunca acima do bruto, pelo caminho que a tela usa (o "+" só quando
 *   `podeAumentarDescontoTotal`).
 * - INV-011/INV-012: só `novo` troca a chave; `adicionar` soma no mesmo SKU sem passar do saldo.
 */
import { describe, expect, it } from 'vitest';
import { calcularPedido, pedidoVazio, podeAumentarDescontoTotal, reduzirPedido, type AcaoPedido, type NovaVariacao, type Pedido } from '../../src/dominio/carrinho';
import { PASSO_DESCONTO_TOTAL_CENTAVOS } from '../../src/dominio/precos';

const legging: NovaVariacao = { skuId: 2, modeloNome: 'Calça Legging', tecidoNome: 'Suplex', tamanho: 'M', cor: 'Preto', precoUnitCentavos: 8900 };
const top: NovaVariacao = { skuId: 21, modeloNome: 'Top Nadador', tecidoNome: 'Suplex', tamanho: 'P', cor: 'Vinho', precoUnitCentavos: 5500 };
const aplicar = (p: Pedido, ...acoes: AcaoPedido[]) => acoes.reduce(reduzirPedido, p);
const add = (variacao: NovaVariacao, limite = 99): AcaoPedido => ({ tipo: 'adicionar', variacao, limite });
const bruto = (p: Pedido) => calcularPedido(p).totais.brutoCentavos;

/** Toca o "+" do desconto como a tela faz: só enquanto ele está ligado, com o bruto atual como limite. */
function aumentarAteTravar(p: Pedido): Pedido {
  let atual = p;
  for (let i = 0; i < 1000 && podeAumentarDescontoTotal(atual); i++) atual = reduzirPedido(atual, { tipo: 'descontoTotalMais', limite: bruto(atual) });
  return atual;
}

describe('INV-015 — ação `precos`', () => {
  const cheio = () =>
    aplicar(
      pedidoVazio('chave-1'),
      add(legging),
      add(legging),
      add(top),
      { tipo: 'descontoTotalMais', limite: 99_999 },
      { tipo: 'descontoTotalMais', limite: 99_999 },
      { tipo: 'cliente', nome: 'Maria', telefone: '31987654321' },
      { tipo: 'pagamento', pagamentoId: 'pix' },
    );

  it('sem mudança de preço devolve o MESMO objeto, com desconto, cliente e pagamento preenchidos', () => {
    const antes = cheio();
    expect(antes.descontoTotalCentavos).toBe(1000);
    expect(reduzirPedido(antes, { tipo: 'precos', precos: new Map([[2, 8900], [21, 5500]]) })).toBe(antes);
    // SKUs fora do pedido ou ausentes do mapa também não contam como mudança.
    expect(reduzirPedido(antes, { tipo: 'precos', precos: new Map([[999, 1], [2, 8900]]) })).toBe(antes);
    expect(reduzirPedido(antes, { tipo: 'precos', precos: new Map() })).toBe(antes);
  });

  it('pedido vazio com desconto zero: `precos` devolve o mesmo objeto', () => {
    const vazio = pedidoVazio('chave-1');
    expect(reduzirPedido(vazio, { tipo: 'precos', precos: new Map([[2, 1]]) })).toBe(vazio);
  });

  it('com mudança, atualiza só o preço das linhas e mantém quantidade, desconto (dentro do bruto novo), cliente, pagamento e chave', () => {
    const antes = cheio();
    const depois = reduzirPedido(antes, { tipo: 'precos', precos: new Map([[2, 9900]]) });
    expect(depois).not.toBe(antes);
    expect(depois.itens.map((i) => [i.skuId, i.qtd, i.precoUnitCentavos])).toEqual([
      [2, 2, 9900],
      [21, 1, 5500],
    ]);
    expect({ ...depois, itens: [] }).toEqual({ ...antes, itens: [] });
    expect(bruto(depois)).toBe(2 * 9900 + 5500);
    // O pedido original não muda (imutável).
    expect(antes.itens[0]!.precoUnitCentavos).toBe(8900);
  });
});

describe('INV-031 — desconto no pedido de R$ 5 em R$ 5, nunca acima do bruto', () => {
  it('o passo é R$ 5', () => {
    expect(PASSO_DESCONTO_TOTAL_CENTAVOS).toBe(500);
  });

  it.each([
    { caso: 'Legging R$ 89', itens: [legging], maximo: 8500 },
    { caso: 'Top R$ 55 (bruto múltiplo de 5)', itens: [top], maximo: 5500 },
    { caso: '2 Legging + Top R$ 233', itens: [legging, legging, top], maximo: 23000 },
    { caso: 'peça de R$ 4,99', itens: [{ ...top, skuId: 50, precoUnitCentavos: 499 }], maximo: 0 },
  ])('$caso: o "+" trava no maior múltiplo de R$ 5 que cabe no bruto ($maximo)', ({ itens, maximo }) => {
    const p = aumentarAteTravar(aplicar(pedidoVazio('k'), ...itens.map((i) => add(i))));
    expect(p.descontoTotalCentavos).toBe(maximo);
    expect(p.descontoTotalCentavos % 500).toBe(0);
    expect(p.descontoTotalCentavos).toBeLessThanOrEqual(bruto(p));
    expect(podeAumentarDescontoTotal(p)).toBe(false);
    // Um "+" a mais, mesmo forçado, não passa do bruto.
    expect(reduzirPedido(p, { tipo: 'descontoTotalMais', limite: bruto(p) }).descontoTotalCentavos).toBe(maximo);
  });

  it('cada passo soma ou tira exatamente R$ 5; o "−" para em zero', () => {
    let p = aplicar(pedidoVazio('k'), add(legging));
    const vistos: number[] = [];
    for (let i = 0; i < 3; i++) {
      p = reduzirPedido(p, { tipo: 'descontoTotalMais', limite: bruto(p) });
      vistos.push(p.descontoTotalCentavos);
    }
    for (let i = 0; i < 5; i++) {
      p = reduzirPedido(p, { tipo: 'descontoTotalMenos' });
      vistos.push(p.descontoTotalCentavos);
    }
    expect(vistos).toEqual([500, 1000, 1500, 1000, 500, 0, 0, 0]);
  });

  it('pedido vazio: sem bruto não há desconto', () => {
    expect(podeAumentarDescontoTotal(pedidoVazio('k'))).toBe(false);
    expect(aumentarAteTravar(pedidoVazio('k')).descontoTotalCentavos).toBe(0);
  });
});

describe('INV-011 / INV-012 — chave e soma no mesmo SKU (sem mais/menos)', () => {
  it('adicionar, remover, desconto, cliente, pagamento e precos não trocam a chave; `novo` troca e zera tudo', () => {
    const p = aplicar(
      pedidoVazio('chave-1'),
      add(legging),
      add(top),
      { tipo: 'remover', chave: '21' },
      { tipo: 'descontoTotalMais', limite: 99_999 },
      { tipo: 'descontoTotalMenos' },
      { tipo: 'cliente', nome: 'Maria', telefone: '31987654321' },
      { tipo: 'pagamento', pagamentoId: 'pix' },
      { tipo: 'precos', precos: new Map([[2, 1000]]) },
    );
    expect(p.chaveIdempotencia).toBe('chave-1');
    expect(reduzirPedido(p, { tipo: 'novo', chaveIdempotencia: 'chave-2' })).toEqual(pedidoVazio('chave-2'));
  });

  it('o mesmo SKU soma na linha até o saldo; outro SKU abre linha nova', () => {
    const p = aplicar(pedidoVazio('k'), add(legging, 3), add(top, 1), add(legging, 3), add(legging, 3), add(legging, 3), add(top, 1));
    expect(p.itens.map((i) => [i.skuId, i.qtd])).toEqual([
      [2, 3],
      [21, 1],
    ]);
  });
});
