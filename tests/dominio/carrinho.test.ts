/** Reducer do pedido (RF-F06, RF-F07, ADR-F02, ADR-F06) — linha = SKU do ERP, limitada ao saldo (RF-004). */
import { describe, expect, it } from 'vitest';
import { calcularPedido, chaveVariacao, pedidoVazio, podeFechar, qtdNoPedido, reduzirPedido, type AcaoPedido, type NovaVariacao, type Pedido } from '../../src/dominio/carrinho';

const legging: NovaVariacao = { skuId: 2, modeloNome: 'Calça Legging', tecidoNome: 'Suplex', tamanho: 'M', cor: 'Preto', precoUnitCentavos: 8900 };
const top: NovaVariacao = { skuId: 21, modeloNome: 'Top Nadador', tecidoNome: 'Suplex', tamanho: 'P', cor: 'Vinho', precoUnitCentavos: 5500 };
const L = '2';
const T = '21';
const MUITO = 99;

function aplicar(p: Pedido, ...acoes: AcaoPedido[]): Pedido {
  return acoes.reduce(reduzirPedido, p);
}
const add = (variacao: NovaVariacao, limite = MUITO): AcaoPedido => ({ tipo: 'adicionar', variacao, limite });
const mais = (chave: string, limite = MUITO): AcaoPedido => ({ tipo: 'mais', chave, limite });

const base = () => pedidoVazio('chave-1');

describe('pedidoVazio, chaveVariacao e qtdNoPedido', () => {
  it('pedido vazio com a chave informada', () => {
    expect(base()).toEqual({ itens: [], descontoTotalCentavos: 0, cliente: '', cpf: '', pagamentoId: null, chaveIdempotencia: 'chave-1' });
  });

  it('chave da linha = id do SKU em texto', () => {
    expect(chaveVariacao(legging)).toBe('2');
    expect(chaveVariacao({ skuId: 145 })).toBe('145');
  });

  it('qtdNoPedido: quantidade do SKU no pedido, 0 se ausente', () => {
    const p = aplicar(base(), add(legging), add(legging), add(top));
    expect(qtdNoPedido(p, 2)).toBe(2);
    expect(qtdNoPedido(p, 21)).toBe(1);
    expect(qtdNoPedido(p, 999)).toBe(0);
    expect(qtdNoPedido(base(), 2)).toBe(0);
  });
});

describe('adicionar (mesmo SKU soma na linha; limite = saldo)', () => {
  it('primeira vez cria linha com qtd 1 e sem desconto', () => {
    const p = aplicar(base(), add(legging, 3));
    expect(p.itens).toEqual([{ ...legging, chave: L, qtd: 1, descPercent: 0 }]);
  });

  it('mesmo SKU soma na linha existente, sem criar outra', () => {
    const p = aplicar(base(), add(legging), add(top), add(legging));
    expect(p.itens.map((i) => [i.chave, i.qtd])).toEqual([
      [L, 2],
      [T, 1],
    ]);
  });

  it('SKU diferente (outra cor/tamanho = outro skuId) cria linha nova', () => {
    const p = aplicar(base(), add(legging), add({ ...legging, skuId: 3, tamanho: 'G' }), add({ ...legging, skuId: 6, cor: 'Marinho' }));
    expect(p.itens.map((i) => i.chave)).toEqual(['2', '3', '6']);
    expect(p.itens.every((i) => i.qtd === 1)).toBe(true);
  });

  it('adicionar de novo no limite do saldo não aumenta a quantidade', () => {
    const p = aplicar(base(), add(legging, 2), add(legging, 2), add(legging, 2), add(legging, 2));
    expect(p.itens).toHaveLength(1);
    expect(p.itens[0]!.qtd).toBe(2);
  });

  it('SKU sem saldo (limite 0) não entra no pedido — devolve o mesmo pedido', () => {
    const antes = aplicar(base(), add(top));
    const depois = reduzirPedido(antes, add(legging, 0));
    expect(depois).toBe(antes);
    expect(depois.itens.map((i) => i.chave)).toEqual([T]);
  });

  it('não altera o pedido original (imutável)', () => {
    const antes = aplicar(base(), add(legging));
    const depois = reduzirPedido(antes, add(legging));
    expect(antes.itens[0]!.qtd).toBe(1);
    expect(depois.itens[0]!.qtd).toBe(2);
  });
});

describe('quantidade e remoção', () => {
  const comDois = () => aplicar(base(), add(legging), add(top));

  it('"+" soma 1 só na linha indicada', () => {
    const p = aplicar(comDois(), mais(L));
    expect(p.itens.map((i) => i.qtd)).toEqual([2, 1]);
  });

  it('"+" para no saldo: com limite 3, três toques extras deixam 3', () => {
    const p = aplicar(comDois(), mais(L, 3), mais(L, 3), mais(L, 3), mais(L, 3));
    expect(p.itens[0]!.qtd).toBe(3);
  });

  it('"+" com saldo caído abaixo da quantidade (catálogo recarregado) não mexe na quantidade', () => {
    const p = aplicar(comDois(), mais(L), mais(L), mais(L, 1));
    expect(p.itens[0]!.qtd).toBe(3);
  });

  it('"−" com qtd > 1 diminui 1', () => {
    const p = aplicar(comDois(), mais(L), mais(L), { tipo: 'menos', chave: L });
    expect(p.itens[0]!.qtd).toBe(2);
  });

  it('"−" com qtd 1 remove o item', () => {
    const p = aplicar(comDois(), { tipo: 'menos', chave: L });
    expect(p.itens.map((i) => i.chave)).toEqual([T]);
  });

  it('"−" com qtd 2 não remove (fica 1)', () => {
    const p = aplicar(comDois(), mais(L), { tipo: 'menos', chave: L });
    expect(p.itens).toHaveLength(2);
    expect(p.itens[0]!.qtd).toBe(1);
  });

  it('"Excluir" remove na hora, qualquer que seja a qtd', () => {
    const p = aplicar(comDois(), mais(L), { tipo: 'remover', chave: L });
    expect(p.itens.map((i) => i.chave)).toEqual([T]);
  });

  it('chave inexistente não muda nada', () => {
    const antes = comDois();
    expect(aplicar(antes, { tipo: 'remover', chave: 'x' }).itens).toEqual(antes.itens);
  });
});

describe('precos (catálogo recarregado)', () => {
  it('atualiza o preço das linhas cujo SKU mudou de preço', () => {
    const p = aplicar(base(), add(legging), add(top), { tipo: 'precos', precos: new Map([[2, 9900], [21, 5500]]) });
    expect(p.itens.map((i) => i.precoUnitCentavos)).toEqual([9900, 5500]);
    expect(calcularPedido(p).totais.brutoCentavos).toBe(9900 + 5500);
  });

  it('sem mudança de preço devolve o mesmo objeto (não re-renderiza)', () => {
    const antes = aplicar(base(), add(legging), add(top));
    expect(reduzirPedido(antes, { tipo: 'precos', precos: new Map([[2, 8900], [21, 5500]]) })).toBe(antes);
    expect(reduzirPedido(antes, { tipo: 'precos', precos: new Map() })).toBe(antes);
    expect(reduzirPedido(base(), { tipo: 'precos', precos: new Map([[2, 1]]) })).toEqual(base());
  });

  it('SKU ausente do catálogo novo (inativado) mantém o preço antigo; os outros atualizam', () => {
    const antes = aplicar(base(), add(legging), add(top));
    const p = reduzirPedido(antes, { tipo: 'precos', precos: new Map([[21, 6000]]) });
    expect(p).not.toBe(antes);
    expect(p.itens.map((i) => i.precoUnitCentavos)).toEqual([8900, 6000]);
    expect(antes.itens[1]!.precoUnitCentavos).toBe(5500);
  });
});

describe('descontos (RN-004)', () => {
  it('desconto por item vale só para a linha indicada', () => {
    const p = aplicar(base(), add(legging), add(top), { tipo: 'desconto', chave: L, descPercent: 10 });
    expect(p.itens.map((i) => i.descPercent)).toEqual([10, 0]);
  });

  it('desconto no total em passos de 500', () => {
    const p = aplicar(base(), { tipo: 'descontoTotalMais' }, { tipo: 'descontoTotalMais' }, { tipo: 'descontoTotalMais' });
    expect(p.descontoTotalCentavos).toBe(1500);
    expect(aplicar(p, { tipo: 'descontoTotalMenos' }).descontoTotalCentavos).toBe(1000);
  });

  it('desconto no total nunca abaixo de 0', () => {
    expect(aplicar(base(), { tipo: 'descontoTotalMenos' }).descontoTotalCentavos).toBe(0);
    expect(aplicar(base(), { tipo: 'descontoTotalMais' }, { tipo: 'descontoTotalMenos' }, { tipo: 'descontoTotalMenos' }).descontoTotalCentavos).toBe(0);
  });
});

describe('cliente, CPF, pagamento e "novo"', () => {
  it('guarda cliente, CPF e pagamento', () => {
    const p = aplicar(base(), { tipo: 'cliente', valor: 'Maria' }, { tipo: 'cpf', valor: '529.982.247-25' }, { tipo: 'pagamento', pagamentoId: 'pix' });
    expect([p.cliente, p.cpf, p.pagamentoId]).toEqual(['Maria', '529.982.247-25', 'pix']);
  });

  it('"novo" zera tudo e troca a chave de idempotência', () => {
    const cheio = aplicar(base(), add(legging), { tipo: 'descontoTotalMais' }, { tipo: 'cliente', valor: 'Maria' }, { tipo: 'cpf', valor: '1' }, { tipo: 'pagamento', pagamentoId: 'pix' });
    expect(aplicar(cheio, { tipo: 'novo', chaveIdempotencia: 'chave-2' })).toEqual(pedidoVazio('chave-2'));
  });

  it('nenhuma outra ação troca a chave de idempotência', () => {
    const p = aplicar(
      base(),
      add(legging),
      mais(L),
      { tipo: 'menos', chave: L },
      { tipo: 'desconto', chave: L, descPercent: 5 },
      { tipo: 'precos', precos: new Map([[2, 1000]]) },
      { tipo: 'descontoTotalMais' },
      { tipo: 'cliente', valor: 'Maria' },
      { tipo: 'pagamento', pagamentoId: 'pix' },
      { tipo: 'remover', chave: L },
    );
    expect(p.chaveIdempotencia).toBe('chave-1');
  });
});

describe('calcularPedido e podeFechar', () => {
  it('pedido de referência (preços do SKU): 3 peças, bruto 23300, descontos 3280, total 20020', () => {
    const p = aplicar(base(), add(legging), add(legging), { tipo: 'desconto', chave: L, descPercent: 10 }, add(top), { tipo: 'descontoTotalMais' }, { tipo: 'descontoTotalMais' }, { tipo: 'descontoTotalMais' });
    const { itens, totais } = calcularPedido(p);
    expect(itens.map((i) => i.subtotalCentavos)).toEqual([16020, 5500]);
    expect(totais).toEqual({ pecas: 3, brutoCentavos: 23300, descontoItensCentavos: 1780, descontoTotalCentavos: 1500, descontosCentavos: 3280, totalCentavos: 20020 });
  });

  it('total nunca negativo com desconto no total maior que o bruto', () => {
    const p = aplicar(base(), add(top), ...Array.from({ length: 20 }, () => ({ tipo: 'descontoTotalMais' as const })));
    expect(calcularPedido(p).totais.totalCentavos).toBe(0);
  });

  it('podeFechar exige item e pagamento', () => {
    expect(podeFechar(base())).toBe(false);
    expect(podeFechar(aplicar(base(), { tipo: 'pagamento', pagamentoId: 'pix' }))).toBe(false);
    expect(podeFechar(aplicar(base(), add(top)))).toBe(false);
    expect(podeFechar(aplicar(base(), add(top), { tipo: 'pagamento', pagamentoId: 'pix' }))).toBe(true);
  });
});
