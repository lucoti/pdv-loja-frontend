/** Reducer do pedido (RF-F06, RF-F07, ADR-F02, ADR-F06). */
import { describe, expect, it } from 'vitest';
import { calcularPedido, chaveVariacao, pedidoVazio, podeFechar, reduzirPedido, type NovaVariacao, type Pedido } from '../../src/dominio/carrinho';

const legging: NovaVariacao = {
  modeloId: 'calca-legging',
  modeloNome: 'Calça Legging',
  tecidoId: 'light',
  tecidoNome: 'Suplex Light',
  tamanho: 'M',
  cor: 'Preto',
  precoUnitCentavos: 10100,
};
const top: NovaVariacao = {
  modeloId: 'top-nadador',
  modeloNome: 'Top Nadador',
  tecidoId: 'normal',
  tecidoNome: 'Suplex Normal',
  tamanho: 'P',
  cor: 'Vinho',
  precoUnitCentavos: 5500,
};
const CHAVE_LEGGING = 'calca-legging|light|M|Preto';

function aplicar(p: Pedido, ...acoes: Parameters<typeof reduzirPedido>[1][]): Pedido {
  return acoes.reduce(reduzirPedido, p);
}

const base = () => pedidoVazio('chave-1');

describe('pedidoVazio e chaveVariacao', () => {
  it('pedido vazio com a chave informada', () => {
    expect(base()).toEqual({ itens: [], descontoTotalCentavos: 0, cliente: '', cpf: '', pagamentoId: null, chaveIdempotencia: 'chave-1' });
  });

  it('chave = modelo|tecido|tamanho|cor', () => {
    expect(chaveVariacao(legging)).toBe(CHAVE_LEGGING);
  });
});

describe('adicionar (RN-F01: consolidação por variação)', () => {
  it('primeira vez cria linha com qtd 1 e sem desconto', () => {
    const p = aplicar(base(), { tipo: 'adicionar', variacao: legging });
    expect(p.itens).toEqual([{ ...legging, chave: CHAVE_LEGGING, qtd: 1, descPercent: 0 }]);
  });

  it('mesma variação soma na linha existente, sem criar outra', () => {
    const p = aplicar(base(), { tipo: 'adicionar', variacao: legging }, { tipo: 'adicionar', variacao: top }, { tipo: 'adicionar', variacao: legging });
    expect(p.itens).toHaveLength(2);
    expect(p.itens.map((i) => [i.chave, i.qtd])).toEqual([
      [CHAVE_LEGGING, 2],
      ['top-nadador|normal|P|Vinho', 1],
    ]);
  });

  it('variação diferente em só um atributo (cor, tamanho ou tecido) cria linha nova', () => {
    const p = aplicar(
      base(),
      { tipo: 'adicionar', variacao: legging },
      { tipo: 'adicionar', variacao: { ...legging, cor: 'Vinho' } },
      { tipo: 'adicionar', variacao: { ...legging, tamanho: 'G' } },
      { tipo: 'adicionar', variacao: { ...legging, tecidoId: 'normal', tecidoNome: 'Suplex Normal', precoUnitCentavos: 8900 } },
    );
    expect(p.itens).toHaveLength(4);
    expect(p.itens.every((i) => i.qtd === 1)).toBe(true);
  });

  it('não altera o pedido original (imutável)', () => {
    const antes = aplicar(base(), { tipo: 'adicionar', variacao: legging });
    const depois = reduzirPedido(antes, { tipo: 'adicionar', variacao: legging });
    expect(antes.itens[0]!.qtd).toBe(1);
    expect(depois.itens[0]!.qtd).toBe(2);
  });
});

describe('quantidade e remoção', () => {
  const comLegging = () => aplicar(base(), { tipo: 'adicionar', variacao: legging }, { tipo: 'adicionar', variacao: top });

  it('"+" soma 1 só na linha indicada', () => {
    const p = aplicar(comLegging(), { tipo: 'mais', chave: CHAVE_LEGGING });
    expect(p.itens.map((i) => i.qtd)).toEqual([2, 1]);
  });

  it('"−" com qtd > 1 diminui 1', () => {
    const p = aplicar(comLegging(), { tipo: 'mais', chave: CHAVE_LEGGING }, { tipo: 'mais', chave: CHAVE_LEGGING }, { tipo: 'menos', chave: CHAVE_LEGGING });
    expect(p.itens[0]!.qtd).toBe(2);
  });

  it('"−" com qtd 1 remove o item', () => {
    const p = aplicar(comLegging(), { tipo: 'menos', chave: CHAVE_LEGGING });
    expect(p.itens.map((i) => i.chave)).toEqual(['top-nadador|normal|P|Vinho']);
  });

  it('"−" com qtd 2 não remove (fica 1)', () => {
    const p = aplicar(comLegging(), { tipo: 'mais', chave: CHAVE_LEGGING }, { tipo: 'menos', chave: CHAVE_LEGGING });
    expect(p.itens).toHaveLength(2);
    expect(p.itens[0]!.qtd).toBe(1);
  });

  it('"Excluir" remove na hora, qualquer que seja a qtd', () => {
    const p = aplicar(comLegging(), { tipo: 'mais', chave: CHAVE_LEGGING }, { tipo: 'remover', chave: CHAVE_LEGGING });
    expect(p.itens.map((i) => i.chave)).toEqual(['top-nadador|normal|P|Vinho']);
  });

  it('chave inexistente não muda nada', () => {
    const antes = comLegging();
    expect(aplicar(antes, { tipo: 'remover', chave: 'x' }).itens).toEqual(antes.itens);
  });
});

describe('descontos (RN-004)', () => {
  it('desconto por item vale só para a linha indicada', () => {
    const p = aplicar(base(), { tipo: 'adicionar', variacao: legging }, { tipo: 'adicionar', variacao: top }, { tipo: 'desconto', chave: CHAVE_LEGGING, descPercent: 10 });
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
    const cheio = aplicar(
      base(),
      { tipo: 'adicionar', variacao: legging },
      { tipo: 'descontoTotalMais' },
      { tipo: 'cliente', valor: 'Maria' },
      { tipo: 'cpf', valor: '1' },
      { tipo: 'pagamento', pagamentoId: 'pix' },
    );
    expect(aplicar(cheio, { tipo: 'novo', chaveIdempotencia: 'chave-2' })).toEqual(pedidoVazio('chave-2'));
  });

  it('nenhuma outra ação troca a chave de idempotência', () => {
    const p = aplicar(
      base(),
      { tipo: 'adicionar', variacao: legging },
      { tipo: 'mais', chave: CHAVE_LEGGING },
      { tipo: 'menos', chave: CHAVE_LEGGING },
      { tipo: 'desconto', chave: CHAVE_LEGGING, descPercent: 5 },
      { tipo: 'descontoTotalMais' },
      { tipo: 'cliente', valor: 'Maria' },
      { tipo: 'pagamento', pagamentoId: 'pix' },
      { tipo: 'remover', chave: CHAVE_LEGGING },
    );
    expect(p.chaveIdempotencia).toBe('chave-1');
  });
});

describe('calcularPedido e podeFechar', () => {
  it('pedido de referência: 3 peças, bruto 25700, descontos 3520, total 22180', () => {
    const p = aplicar(
      base(),
      { tipo: 'adicionar', variacao: legging },
      { tipo: 'adicionar', variacao: legging },
      { tipo: 'desconto', chave: CHAVE_LEGGING, descPercent: 10 },
      { tipo: 'adicionar', variacao: top },
      { tipo: 'descontoTotalMais' },
      { tipo: 'descontoTotalMais' },
      { tipo: 'descontoTotalMais' },
    );
    const { itens, totais } = calcularPedido(p);
    expect(itens.map((i) => i.subtotalCentavos)).toEqual([18180, 5500]);
    expect(totais).toEqual({ pecas: 3, brutoCentavos: 25700, descontoItensCentavos: 2020, descontoTotalCentavos: 1500, descontosCentavos: 3520, totalCentavos: 22180 });
  });

  it('total nunca negativo com desconto no total maior que o bruto', () => {
    const p = aplicar(base(), { tipo: 'adicionar', variacao: top }, ...Array.from({ length: 20 }, () => ({ tipo: 'descontoTotalMais' as const })));
    expect(calcularPedido(p).totais.totalCentavos).toBe(0);
  });

  it('podeFechar exige item e pagamento', () => {
    expect(podeFechar(base())).toBe(false);
    expect(podeFechar(aplicar(base(), { tipo: 'pagamento', pagamentoId: 'pix' }))).toBe(false);
    expect(podeFechar(aplicar(base(), { tipo: 'adicionar', variacao: top }))).toBe(false);
    expect(podeFechar(aplicar(base(), { tipo: 'adicionar', variacao: top }, { tipo: 'pagamento', pagamentoId: 'pix' }))).toBe(true);
  });
});
