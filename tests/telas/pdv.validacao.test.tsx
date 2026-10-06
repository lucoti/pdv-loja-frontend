/**
 * Validação final da pdv-mobile-refatorado (Fase 5): lacunas achadas na cobertura do código novo.
 * - Nome do produto na lista sem repetir o tipo (`nomeNaLista`, decisão do Desenvolvimento): o caso em
 *   que o prefixo sai nunca era exercitado, porque nenhum produto do simulado começa pelo nome do tipo.
 * - "1 modelo" no singular (topo e grupo do tipo).
 * - Forma de pagamento sem ícone próprio usa o ícone de carteira e continua escolhível e enviada.
 * - Cor sem tom cadastrado e sem foto usa o token do tema na amostra.
 * - Selo "N no pedido" na linha do produto (MI-05): nenhum teste conferia o selo (sobreviveu à mutação
 *   "selo some" no T8 da validação final).
 */
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Catalogo } from '../../src/api/cliente';
import { CATALOGO } from '../../src/simulado/dados';
import { nomeNaLista } from '../../src/telas/Pdv/Produtos';
import { servidor, usarSimulado } from '../apoio';
import { abrirApp, botaoCor, botaoFechar, botaoTamanho, pularCliente, sem_nbsp } from './ajuda';

const botao = (nome: RegExp | string) => screen.getByRole('button', { name: nome });
const texto = (el: Element | null | undefined) => sem_nbsp(el?.textContent);
const produto = (nome: string) => ({ ...CATALOGO.produtos[0]!, nome });

/** PDV logado, etapa Cliente pulada; espera o primeiro tipo do catálogo marcado. */
async function abrirPdv(catalogo: Catalogo) {
  const simulado = usarSimulado({ sessaoDe: 'carlos', catalogo });
  const app = abrirApp();
  await pularCliente();
  await waitFor(() => expect(screen.getByRole('banner')).toHaveAttribute('aria-label', 'Produtos'));
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

  it('na tela: a linha mostra só o tecido; o topo da cor/tamanho e o Pedido mostram o nome inteiro', async () => {
    const catalogo = structuredClone(CATALOGO);
    catalogo.produtos.find((p) => p.numero === 3)!.nome = 'Bermudas Ciclista Suplex';
    const { usuario } = await abrirPdv(catalogo);
    await usuario.click(botao('Bermudas'));
    const grupo = within(screen.getByRole('region', { name: 'Bermudas' }));
    expect(grupo.getAllByRole('button').map((b) => texto(b))).toEqual(['Ciclista Suplex', 'Short Curto']);
    await usuario.click(grupo.getByRole('button', { name: 'Ciclista Suplex' }));
    expect(within(screen.getByRole('banner')).getByRole('heading', { level: 1 })).toHaveTextContent('Bermudas Ciclista Suplex');
    await usuario.click(botaoCor('Preto'));
    await usuario.click(botaoTamanho('M'));
    await usuario.click(botao('Adicionar ao pedido'));
    await usuario.click(botao(/^Pedido/));
    expect(texto(screen.getByTestId('item-pedido'))).toContain('Bermudas Ciclista Suplex');
  });
});

describe('contagem de modelos', () => {
  it('catálogo com um produto: "1 modelo" no topo e no grupo; com vários, "N modelos"', async () => {
    const catalogo = structuredClone(CATALOGO);
    catalogo.produtos = catalogo.produtos.filter((p) => p.numero === 1);
    catalogo.tipos = catalogo.tipos.filter((t) => t.id === catalogo.produtos[0]!.tipoId);
    await abrirPdv(catalogo);
    expect(texto(within(screen.getByRole('banner')).getByText(/modelos?$/))).toBe('1 modelo');
    expect(texto(within(screen.getByRole('region', { name: 'Calças' })).getByText(/modelos?$/))).toBe('1 modelo');
  });

  it('catálogo de exemplo: topo com o total do catálogo e grupo com os do tipo escolhido', async () => {
    const { usuario } = await abrirPdv(structuredClone(CATALOGO));
    expect(texto(within(screen.getByRole('banner')).getByText(/modelos?$/))).toBe(`${CATALOGO.produtos.length} modelos`);
    await usuario.click(botao('Bermudas'));
    expect(texto(within(screen.getByRole('region', { name: 'Bermudas' })).getByText(/modelos?$/))).toBe('2 modelos');
  });
});

describe('forma de pagamento sem ícone próprio', () => {
  it('aparece com o ícone de carteira, pode ser escolhida e vai no corpo da venda', async () => {
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
    expect(vale.querySelector('svg')).not.toBeNull();
    // O ícone de carteira é diferente do ícone do Pix (QrCode) e do dinheiro.
    expect(vale.querySelector('svg')!.innerHTML).not.toBe(botao('Pix').querySelector('svg')!.innerHTML);
    expect(vale.querySelector('svg')!.innerHTML).not.toBe(botao('Dinheiro').querySelector('svg')!.innerHTML);
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

describe('MI-05 — selo "N no pedido" na lista de produtos', () => {
  it('soma as peças de todos os tamanhos e cores do produto, só nele, e acompanha as mudanças do pedido', async () => {
    const { usuario } = await abrirPdv(structuredClone(CATALOGO));
    const linhas = (tipo: string) => within(screen.getByRole('region', { name: tipo })).getAllByRole('button').map((b) => texto(b));
    await usuario.click(botao('Calças'));
    expect(linhas('Calças')).toEqual(['Calça Legging']);
    await usuario.click(botao(/^Calça Legging/));
    for (const [cor, tamanho] of [['Preto', 'M'], ['Preto', 'M'], ['Marinho', 'G']] as const) {
      await usuario.click(botaoCor(cor));
      await usuario.click(botaoTamanho(tamanho));
      await usuario.click(botao('Adicionar ao pedido'));
    }
    await usuario.click(botao('Voltar para os produtos'));
    expect(linhas('Calças')).toEqual(['Calça Legging3 no pedido']);
    await usuario.click(botao('Tops'));
    expect(linhas('Tops')).toEqual(['Top Nadador']);
    // "−" numa linha do pedido: o selo acompanha.
    await usuario.click(botao(/^Pedido/));
    await usuario.click(within(screen.getAllByTestId('item-pedido')[0]!).getByRole('button', { name: 'Diminuir quantidade' }));
    await usuario.click(botao('Produtos'));
    await usuario.click(botao('Calças'));
    expect(linhas('Calças')).toEqual(['Calça Legging2 no pedido']);
  });
});
