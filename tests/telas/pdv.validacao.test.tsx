/**
 * Validação final da pdv-mobile-refatorado (Fase 5): lacunas achadas na cobertura do código novo.
 * - Nome do produto na lista sem repetir o tipo (`nomeNaLista`, decisão do Desenvolvimento): o caso em
 *   que o prefixo sai nunca era exercitado, porque nenhum produto do simulado começa pelo nome do tipo.
 * - "1 modelo" no singular (topo e grupo do tipo).
 * - Forma de pagamento sem ícone próprio usa o ícone de carteira e continua escolhível e enviada.
 * - Cor sem tom cadastrado e sem foto usa o token do tema na amostra.
 * - Selo "N no pedido" na linha do produto (MI-05): nenhum teste conferia o selo (sobreviveu à mutação
 *   "selo some" no T8 da validação final).
 * Atualizado na pdv-mobile-atualizado: cartões "1 Peça"/"2 Tecido" com "N opções" no lugar da contagem
 * de modelos (MI-22), pagamento sem ícones e selo removido (MI-22/MI-24).
 */
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Catalogo } from '../../src/api/cliente';
import { CATALOGO } from '../../src/simulado/dados';
import { nomeNaLista } from '../../src/telas/Pdv/Produtos';
import { servidor, usarSimulado } from '../apoio';
import { abrirApp, botaoCor, botaoFechar, botaoTamanho, esperarPdv, sem_nbsp, telaAtual } from './ajuda';

const botao = (nome: RegExp | string) => screen.getByRole('button', { name: nome });
const texto = (el: Element | null | undefined) => sem_nbsp(el?.textContent);
const produto = (nome: string) => ({ ...CATALOGO.produtos[0]!, nome });

/** PDV logado, com o catálogo carregado (cartão "1 Peça" na tela). */
async function abrirPdv(catalogo: Catalogo) {
  const simulado = usarSimulado({ sessaoDe: 'carlos', catalogo });
  const app = abrirApp();
  await esperarPdv();
  await screen.findByRole('region', { name: 'Peça' });
  return { ...app, simulado };
}

describe('nomeNaLista — nome do produto na lista sem repetir o tipo', () => {
  it('tira o nome do tipo do começo, sem diferenciar maiúsculas, e mantém o restante como veio', () => {
    expect(nomeNaLista(produto('Bermuda médio Suplex new zeland'), 'Bermuda médio')).toBe('Suplex new zeland');
    expect(nomeNaLista(produto('BERMUDA MÉDIO Suplex'), 'Bermuda médio')).toBe('Suplex');
  });

  it('nome que não começa pelo tipo (ou que é só o tipo) aparece inteiro', () => {
    expect(nomeNaLista(produto('Bermuda Ciclista'), 'Bermudas')).toBe('Bermuda Ciclista');
    expect(nomeNaLista(produto('Bermudas'), 'Bermudas')).toBe('Bermudas');
    // Só o tipo seguido de espaço: não sobra nada para mostrar, então o nome fica inteiro.
    expect(nomeNaLista(produto('Bermudas '), 'Bermudas')).toBe('Bermudas ');
    // O tipo no meio do nome não é cortado.
    expect(nomeNaLista(produto('Short Bermudas Suplex'), 'Bermudas')).toBe('Short Bermudas Suplex');
  });

  it('na tela: o cartão Tecido e o título da cor/tamanho mostram só o tecido; o Pedido mostra o nome inteiro', async () => {
    const catalogo = structuredClone(CATALOGO);
    catalogo.produtos.find((p) => p.numero === 3)!.nome = 'Bermudas Ciclista Suplex';
    const { usuario } = await abrirPdv(catalogo);
    await usuario.click(botao('Bermudas'));
    const grupo = within(screen.getByRole('region', { name: 'Tecido' }));
    expect(grupo.getAllByRole('button').map((b) => texto(b))).toEqual(['Ciclista Suplex']); // Short Curto zerado não aparece
    await usuario.click(grupo.getByRole('button', { name: 'Ciclista Suplex' }));
    // MI-23: título com a peça (tipo) e, embaixo, o tecido sem repetir o tipo.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Bermudas');
    expect(screen.getByText('Ciclista Suplex')).toBeInTheDocument();
    await usuario.click(botaoCor('Preto'));
    await usuario.click(botaoTamanho('M'));
    await usuario.click(botao('Adicionar ao pedido'));
    await usuario.click(botao(/^Pedido/));
    expect(texto(screen.getByTestId('item-pedido'))).toContain('Bermudas Ciclista Suplex');
  });
});

// MI-22 (pdv-mobile-atualizado): "N modelos" saiu; o cartão Tecido mostra "1 opção"/"N opções" e o
// cartão Peça, o nome do tipo escolhido.
describe('complementos dos cartões Peça e Tecido', () => {
  const complemento = (cartao: string) => texto(within(screen.getByRole('region', { name: cartao })).getByRole('heading').nextElementSibling);

  it('catálogo com um produto: "1 opção" no Tecido e o tipo no Peça', async () => {
    const catalogo = structuredClone(CATALOGO);
    catalogo.produtos = catalogo.produtos.filter((p) => p.numero === 1);
    catalogo.tipos = catalogo.tipos.filter((t) => t.id === catalogo.produtos[0]!.tipoId);
    await abrirPdv(catalogo);
    expect(complemento('Peça')).toBe('Calças');
    expect(complemento('Tecido')).toBe('1 opção');
  });

  it('catálogo de exemplo: o complemento acompanha o tipo escolhido', async () => {
    const catalogo = structuredClone(CATALOGO);
    for (const k of catalogo.produtos.find((p) => p.numero === 4)!.skus) k.saldo = 3; // Short Curto com estoque
    const { usuario } = await abrirPdv(catalogo);
    await usuario.click(botao('Bermudas'));
    expect(complemento('Peça')).toBe('Bermudas');
    expect(complemento('Tecido')).toBe('2 opções');
    expect(screen.queryByText(/modelos?$/)).toBeNull();
  });
});

// MI-24 (pdv-mobile-atualizado): pagamentos sem ícones; forma nova do ERP aparece e funciona igual.
describe('forma de pagamento nova do ERP', () => {
  it('aparece sem ícone, como as outras, pode ser escolhida e vai no corpo da venda', async () => {
    const catalogo = structuredClone(CATALOGO);
    catalogo.pagamentos.push({ id: 'vale', nome: 'Vale-presente' });
    const corpos: Array<Record<string, unknown>> = [];
    servidor.events.on('request:start', async ({ request }) => {
      if (request.method === 'POST' && new URL(request.url).pathname === '/api/vendas') corpos.push(await request.clone().json());
    });
    const { usuario } = await abrirPdv(catalogo);
    await usuario.click(botao('Calças'));
    await usuario.click(botao(/^Calça Legging/));
    await usuario.click(botaoCor('Preto'));
    await usuario.click(botaoTamanho('M'));
    await usuario.click(botao('Adicionar ao pedido'));
    await usuario.click(botao(/^Pedido/));
    const vale = botao('Vale-presente');
    for (const nome of ['Vale-presente', 'Pix', 'Dinheiro']) expect(botao(nome).querySelector('svg')).toBeNull();
    await usuario.click(vale);
    expect(vale).toHaveAttribute('aria-pressed', 'true');
    expect(texto(botaoFechar().firstElementChild)).toBe('Fechar venda');
    await usuario.click(botaoFechar());
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(corpos).toHaveLength(1);
    expect(corpos[0]!.pagamentoId).toBe('vale');
  });
});

describe('amostra da cor', () => {
  it('cor sem tom e sem foto usa o token do tema; com tom, o próprio tom; estampa sem tom, a foto', async () => {
    const catalogo = structuredClone(CATALOGO);
    const legging = catalogo.produtos.find((p) => p.numero === 1)!;
    for (const k of legging.skus) {
      if (k.cor.nome === 'Marinho') k.cor = { ...k.cor, hex: null, fotoUrl: null };
      if (k.cor.nome === 'Vinho') k.cor = { ...k.cor, hex: null, fotoUrl: 'https://exemplo.test/estampa.jpg' };
    }
    const { usuario } = await abrirPdv(catalogo);
    await usuario.click(botao('Calças'));
    await usuario.click(botao(/^Calça Legging/));
    const amostra = (cor: string) => botaoCor(cor).querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(amostra('Marinho').style.background).toBe('var(--color-neutral-800)');
    expect(amostra('Preto').style.background).not.toBe('var(--color-neutral-800)');
    expect(amostra('Preto').style.background).not.toBe('');
    expect(amostra('Vinho').tagName).toBe('IMG');
    expect(amostra('Vinho')).toHaveAttribute('src', 'https://exemplo.test/estampa.jpg');
  });
});

// MI-22/MI-23 (pdv-mobile-atualizado): o selo "N no pedido" saiu; depois de adicionar a tela volta para
// Peça/Tecido com o tipo ainda escolhido, e a bolinha da aba Pedido mostra as peças.
describe('MI-23 — adicionar volta para Peça/Tecido', () => {
  it('a peça escolhida continua marcada; sem selo no tecido; a aba Pedido soma as peças', async () => {
    const { usuario } = await abrirPdv(structuredClone(CATALOGO));
    const tecidos = () => within(screen.getByRole('region', { name: 'Tecido' })).getAllByRole('button').map((b) => texto(b));
    await usuario.click(botao('Calças'));
    for (const [cor, tamanho] of [['Preto', 'M'], ['Preto', 'M'], ['Marinho', 'G']] as const) {
      await usuario.click(botao(/^Calça Legging/));
      await usuario.click(botaoCor(cor));
      await usuario.click(botaoTamanho(tamanho));
      await usuario.click(botao('Adicionar ao pedido'));
      expect(telaAtual()).toBe('Produtos');
      expect(botao('Calças')).toHaveAttribute('aria-pressed', 'true');
    }
    expect(tecidos()).toEqual(['Calça Legging']);
    expect(botao('Pedido (3)')).toBeInTheDocument();
    await usuario.click(botao(/^Pedido/));
    expect(screen.getAllByTestId('item-pedido')).toHaveLength(2);
  });
});
