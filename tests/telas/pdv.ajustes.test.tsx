/**
 * Mudanças intencionais da refatoração pdv-ajustes-tela-variacoes (MUD-01 a MUD-04) e o sinal
 * "entrou no PDV" usado pelos testes do login (INV-018). Complementa pdv.test.tsx (RF-F04) e
 * pdv.caracterizacao.test.tsx (invariantes).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { Catalogo } from '../../src/api/cliente';
import { CATALOGO } from '../../src/simulado/dados';
import { servidor, usarSimulado } from '../apoio';
import { abrirApp, adicionarPeca, botaoCor, botaoFechar, enviarPin, esperarCatalogo, esperarEtapaSenha, esperarPdv, PIN_ERRADO, sem_nbsp, telaAtual, TOP_NADADOR_P_VINHO, topoDoPdv } from './ajuda';

const botao = (nome: RegExp | string) => screen.getByRole('button', { name: nome });
const texto = (el: Element | null | undefined) => sem_nbsp(el?.textContent);
// Tela = nome acessível do `main` (ADR-002 da pdv-mobile-atualizado).
const etapaNoTopo = telaAtual;
/** Botões de tamanho, na ordem da tela (cartão "4 Tamanho"). */
const botoesTamanho = () => within(screen.getByRole('region', { name: 'Tamanho' })).getAllByRole('button');

async function abrirPdv(catalogo?: Catalogo) {
  usarSimulado({ sessaoDe: 'carlos', ...(catalogo ? { catalogo } : {}) });
  const app = abrirApp();
  await esperarCatalogo();
  return app;
}

/** Caso de referência (MUD-02): 6 tamanhos, preço de 3 dígitos; saldos positivo, zero e negativo. */
const SALDOS = [3, 2, 12, 7, 1, 4];
function catalogoSeisTamanhos(): Catalogo {
  const catalogo = structuredClone(CATALOGO);
  const bermuda = catalogo.produtos.find((p) => p.numero === 3)!;
  const preto = bermuda.skus.find((k) => k.cor.nome === 'Preto')!.cor;
  bermuda.skus = ['PP', 'P', 'M', 'G', 'GG', 'XG'].map((sigla, i) => ({
    id: 900 + i,
    codigo: `0003.001.0${i + 1}`,
    cor: preto,
    tamanho: { sigla, ordem: i + 1 },
    precoCentavos: 10000 + i * 100,
    saldo: SALDOS[i]!,
  }));
  return catalogo;
}

/** Declarações de uma classe em Pdv.module.css (jsdom não aplica o CSS: a regra é lida do arquivo). */
function declaracoesDe(classe: string): Record<string, string> {
  const css = readFileSync(resolve(import.meta.dirname, '../../src/telas/Pdv/Pdv.module.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const regras = [...css.matchAll(new RegExp(`(?:^|[\\s,}])\\.${classe}\\s*\\{([^}]*)\\}`, 'g'))].map((m) => m[1]!);
  // Regras repetidas da mesma classe: vale a última declaração de cada propriedade, como no navegador.
  const pares = regras.flatMap((r) => r.split(';').map((d) => d.split(':').map((p) => p.trim())).filter((d) => d.length === 2));
  return Object.fromEntries(pares.map(([prop, valor]) => [prop!, valor!.replace(/\s+/g, ' ')]));
}

/**
 * Declarações de todas as classes do elemento em Pdv.module.css, juntas (a última vence). Desde a
 * pdv-mobile-atualizado os botões levam `.tile` (comum.module.css) e uma classe de tamanho do PDV, e as
 * grades ficam no corpo do cartão (`.cartaoCorpo` + a classe da grade).
 */
function declaracoesDoElemento(el: Element): Record<string, string> {
  return Object.assign({}, ...[...el.classList].map(declaracoesDe));
}

describe('MUD-01 — saldo do tamanho como "estoque N"', () => {
  it('cada tamanho mostra "estoque N"; nada de "un." nem "sem estoque" no tamanho', async () => {
    const { usuario } = await abrirPdv(catalogoSeisTamanhos());
    await usuario.click(botao(/^Bermuda Ciclista/));
    await usuario.click(botaoCor('Preto'));
    const tamanhos = botoesTamanho();
    expect(tamanhos.map((b) => texto(b.children[1]))).toEqual(['estoque 3', 'estoque 2', 'estoque 12', 'estoque 7', 'estoque 1', 'estoque 4']);
    for (const b of tamanhos) expect(texto(b)).not.toMatch(/un\.|sem estoque|-\d/);
  });
});

// MI-06 (pdv-mobile-refatorado): a grade passou de 3 para 4 colunas, como no design; continua com
// minmax(0, 1fr) para encolher em vez de estourar a tela (AP-003).
describe('MUD-02 — grade de tamanhos em 4 colunas iguais que encolhem', () => {
  it('os 6 tamanhos são filhos diretos de uma grade de 4 colunas minmax(0, 1fr)', async () => {
    const { usuario } = await abrirPdv(catalogoSeisTamanhos());
    await usuario.click(botao(/^Bermuda Ciclista/));
    await usuario.click(botaoCor('Preto'));
    const tamanhos = botoesTamanho();
    expect(tamanhos).toHaveLength(6);
    const grade = tamanhos[0]!.parentElement!;
    // Todos na mesma grade, sem elemento intermediário: 6 tamanhos → uma linha de 4 e outra de 2.
    expect([...grade.children]).toEqual(tamanhos);
    const regra = declaracoesDoElemento(grade);
    expect(regra.display).toBe('grid');
    expect(regra['grid-template-columns']).toBe('repeat(4, minmax(0, 1fr))');
    expect(regra.gap).toBe('8px');
    // A 320px "estoque 12" não cabe numa linha: o saldo pode quebrar e o botão cresce (nada de nowrap
    // nem altura fixa, que fariam o texto passar da borda do botão).
    const saldo = declaracoesDe(tamanhos[0]!.children[1]!.classList[0]!);
    expect(saldo['white-space']).toBeUndefined();
    expect(saldo['overflow-wrap']).toBe('anywhere');
    const botaoRegra = declaracoesDoElemento(tamanhos[0]!);
    expect(botaoRegra.height).toBeUndefined();
    expect(botaoRegra['min-height']).toBe('64px');
  });
});

// MI-20 / ADR-002 (pdv-mobile-atualizado): o topo com a etapa saiu; a tela atual é o nome do `main`.
describe('MUD-03 — tela atual no nome do conteúdo (`main`)', () => {
  it('catálogo ainda carregando: o nome segue a aba e, depois da carga, a tela da venda', async () => {
    let liberar!: () => void;
    const segura = new Promise<void>((r) => (liberar = r));
    usarSimulado({ sessaoDe: 'carlos' });
    servidor.use(
      http.get('*/api/catalogo', async () => {
        await segura;
        return undefined;
      }),
    );
    const { usuario } = abrirApp();
    await screen.findByRole('navigation', { name: 'Abas' });
    expect(screen.getByRole('status')).toHaveTextContent('Carregando…');
    expect(etapaNoTopo()).toBe('Produtos');
    await usuario.click(botao('Pedido'));
    expect(etapaNoTopo()).toBe('Pedido');
    await usuario.click(botao('Dia'));
    expect(etapaNoTopo()).toBe('Dia');
    await usuario.click(botao('Produtos'));
    expect(etapaNoTopo()).toBe('Produtos');
    liberar();
    await esperarCatalogo();
    expect(etapaNoTopo()).toBe('Produtos');
    await usuario.click(botao(/^Bermuda Ciclista/));
    expect(etapaNoTopo()).toBe('Cor e tamanho');
  });

  it('o único h1 da tela de cor/tamanho é a peça (tipo); Dia tem "Vendas de hoje"; sem `banner` no PDV', async () => {
    const { usuario } = await abrirPdv();
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    await usuario.click(botao(/^Bermuda Ciclista/));
    expect(etapaNoTopo()).toBe('Cor e tamanho');
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => texto(h))).toEqual(['Bermudas']);
    await usuario.click(botao('Dia'));
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => texto(h))).toEqual(['Vendas de hoje']);
  });
});

describe('MUD-04 — vendedor, data e "BALCÃO" não aparecem em nenhuma tela do PDV', () => {
  const HOJE = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  function conferirSemVendedorNemData() {
    const pagina = texto(document.body);
    expect(pagina).not.toMatch(/BALCÃO/i);
    expect(pagina).not.toContain('Carlos');
    expect(pagina).not.toContain('pedido novo');
    expect(pagina).not.toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(pagina).not.toContain(HOJE);
  }

  it('lista, cor/tamanho, Pedido, venda fechada e Dia (com venda registrada)', async () => {
    const { usuario } = await abrirPdv();
    conferirSemVendedorNemData();
    await usuario.click(botao(/^Bermuda Ciclista/));
    conferirSemVendedorNemData();
    await usuario.click(botao('Voltar para peça e tecido'));
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    conferirSemVendedorNemData();
    await usuario.click(botao('Pix'));
    await usuario.click(botaoFechar());
    await screen.findByRole('button', { name: 'Nova venda' });
    conferirSemVendedorNemData();
    await usuario.click(botao('Nova venda'));
    conferirSemVendedorNemData();
    await usuario.click(botao('Dia'));
    await screen.findByTestId('venda-dia');
    conferirSemVendedorNemData();
  });

  it('catálogo em falha: também sem vendedor, data ou "BALCÃO"', async () => {
    usarSimulado({ sessaoDe: 'carlos' });
    servidor.use(http.get('*/api/catalogo', () => HttpResponse.error()));
    const { usuario } = abrirApp();
    await screen.findByRole('alert');
    conferirSemVendedorNemData();
    await usuario.click(botao('Pedido'));
    conferirSemVendedorNemData();
  });
});

describe('INV-018 — o sinal "entrou no PDV" não confunde a tela de login com o PDV', () => {
  it('a tela de login tem topo (banner) com "BALCÃO", mas `topoDoPdv` (o `main` com nome de tela) não a reconhece', async () => {
    const { usuario } = abrirApp();
    await esperarEtapaSenha();
    expect(screen.getByRole('banner')).toHaveTextContent('BALCÃO');
    expect(topoDoPdv()).toBeNull();
    await expect(esperarPdv()).rejects.toThrow();
    // Senha errada: continua no login, e o sinal continua negativo.
    await enviarPin(usuario, PIN_ERRADO);
    expect(await screen.findByRole('alert')).toHaveTextContent('Senha incorreta. Tente de novo.');
    expect(screen.getByRole('banner')).toHaveTextContent('BALCÃO');
    expect(topoDoPdv()).toBeNull();
    // Senha certa: o PDV abre (conteúdo com nome de tela) e o topo do login some.
    await enviarPin(usuario);
    await esperarPdv();
    expect(topoDoPdv()).toBe(screen.getByRole('main'));
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    // MI-21: a venda começa direto em Produtos.
    expect(etapaNoTopo()).toBe('Produtos');
    expect(screen.queryByText('BALCÃO')).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /números digitados/ })).not.toBeInTheDocument();
  });

  it('telas de "verificando" e de falha na verificação da sessão não são reconhecidas como PDV', async () => {
    usarSimulado({ sessaoDe: 'carlos' });
    servidor.use(http.get('*/api/auth/sessao', () => HttpResponse.error()));
    abrirApp();
    expect(topoDoPdv()).toBeNull();
    await screen.findByRole('button', { name: 'Tentar de novo' });
    expect(topoDoPdv()).toBeNull();
    expect(screen.queryByRole('navigation', { name: 'Abas' })).not.toBeInTheDocument();
  });
});

// MI-05 (pdv-mobile-refatorado): tipos em grade de 3 colunas que encolhem (AP-003). jsdom não calcula
// layout: a regra é lida do CSS da classe que a tela usa de fato.
describe('MI-05 — grade de tipos em 3 colunas iguais que encolhem', () => {
  it('os tipos são filhos diretos de uma grade de 3 colunas minmax(0, 1fr), e o nome longo pode quebrar', async () => {
    await abrirPdv();
    const tipos = ['Bermudas', 'Calças', 'Tops'].map((t) => botao(t));
    const grade = tipos[0]!.parentElement!;
    expect([...grade.children]).toEqual(tipos);
    const regra = declaracoesDoElemento(grade);
    expect(regra.display).toBe('grid');
    expect(regra['grid-template-columns']).toBe('repeat(3, minmax(0, 1fr))');
    expect(declaracoesDoElemento(tipos[0]!)['overflow-wrap']).toBe('anywhere');
  });
});

// MI-08: os dois cartões do dia dividem a largura sem estourar a tela (AP-003).
describe('MI-08 — cartões do dia em grade que encolhe', () => {
  it('"Total do dia" e "Pedidos" ficam numa grade minmax(0, 1.6fr) minmax(0, 1fr)', async () => {
    const { usuario } = await abrirPdv();
    await usuario.click(botao('Dia'));
    const total = (await screen.findByText('Total do dia')).parentElement!;
    const grade = total.parentElement!;
    expect(grade.children).toHaveLength(2);
    const regra = declaracoesDe([...grade.classList][0]!);
    expect(regra.display).toBe('grid');
    expect(regra['grid-template-columns']).toBe('minmax(0, 1.6fr) minmax(0, 1fr)');
  });
});

// MI-24 (pdv-mobile-atualizado): pagamento em 2 colunas que encolhem e lixeira só com ícone, 44px
// (AP-003: a regra é lida do CSS das classes em uso).
describe('MI-24 — layout do Pedido em celular estreito', () => {
  it('formas de pagamento numa grade de 2 colunas minmax(0, 1fr)', async () => {
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    const grade = botao('Pix').parentElement!;
    expect(grade.children).toHaveLength(4);
    const regra = declaracoesDoElemento(grade);
    expect(regra.display).toBe('grid');
    expect(regra['grid-template-columns']).toBe('repeat(2, minmax(0, 1fr))');
  });

  it('a lixeira é um botão de 44×44 só com o ícone, com o nome acessível "Tirar peça"', async () => {
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    const tirar = within(screen.getByTestId('item-pedido')).getByRole('button', { name: 'Tirar peça' });
    expect(texto(tirar)).toBe('');
    expect(tirar.querySelector('svg')).not.toBeNull();
    const regra = declaracoesDoElemento(tirar);
    expect([regra.width, regra.height, regra.flex]).toEqual(['44px', '44px', 'none']);
  });
});

// AP-003 (pdv-mobile-atualizado): ajustes de tela estreita achados na conferência a 360px e 320px.
// jsdom não aplica o CSS nem media queries: as regras são lidas do arquivo, pelas classes em uso.
describe('MI-20 / MI-24 — abas e linha do desconto em celular estreito', () => {
  const css = () => readFileSync(resolve(import.meta.dirname, '../../src/telas/Pdv/Pdv.module.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const media = (largura: number) => new RegExp(`@media \\(max-width: ${largura}px\\)\\s*\\{([\\s\\S]*?\\})\\s*\\}`).exec(css())?.[1] ?? '';

  it('abas: 3 colunas iguais que encolhem, presas no alto; abaixo de 380px o ícone some e o nome fica', async () => {
    await abrirPdv();
    const nav = screen.getByRole('navigation', { name: 'Abas' });
    const regra = declaracoesDoElemento(nav);
    expect(regra['grid-template-columns']).toBe('repeat(3, minmax(0, 1fr))');
    expect([regra.position, regra.top]).toEqual(['sticky', '0']);
    const aba = within(nav).getByRole('button', { name: 'Produtos' });
    expect(aba.querySelector('svg')).not.toBeNull();
    expect(media(379)).toMatch(new RegExp(`\\.${aba.classList[0]} svg\\s*\\{\\s*display: none;`));
  });

  it('linha do desconto: abaixo de 360px folgas e fontes menores; o título corta com reticências em vez de vazar', async () => {
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    const linha = screen.getByRole('region', { name: 'Desconto no pedido' });
    const titulo = within(linha).getByRole('heading', { name: 'Desconto' });
    const t = declaracoesDoElemento(titulo);
    expect([t['white-space'], t.overflow, t['text-overflow'], t['min-width']]).toEqual(['nowrap', 'hidden', 'ellipsis', '0']);
    const m = media(359);
    expect(m).toContain(`.${linha.classList[0]}`);
    expect(m).toContain(`.${titulo.classList[0]}`);
  });
});
