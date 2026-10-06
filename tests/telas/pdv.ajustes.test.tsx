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
import { nomeEtapa } from '../../src/telas/Pdv/Cabecalho';
import { servidor, usarSimulado } from '../apoio';
import { abrirApp, adicionarPeca, botaoCor, botaoFechar, enviarPin, esperarCatalogo, esperarEtapaSenha, esperarPdv, PIN_ERRADO, sem_nbsp, TOP_NADADOR_P_VINHO, topoDoPdv } from './ajuda';

const botao = (nome: RegExp | string) => screen.getByRole('button', { name: nome });
const texto = (el: Element | null | undefined) => sem_nbsp(el?.textContent);
// Etapa = nome acessível do topo (aria-label); o título visível segue o design (MI-09).
const etapaNoTopo = () => screen.getByRole('banner').getAttribute('aria-label');

async function abrirPdv(catalogo?: Catalogo) {
  usarSimulado({ sessaoDe: 'carlos', ...(catalogo ? { catalogo } : {}) });
  const app = abrirApp();
  await esperarCatalogo();
  return app;
}

/** Caso de referência (MUD-02): 6 tamanhos, preço de 3 dígitos; saldos positivo, zero e negativo. */
const SALDOS = [3, 0, 12, 7, 1, -4];
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

describe('MUD-01 — saldo do tamanho como "estoque N"', () => {
  it('cada tamanho mostra "estoque N"; zerado e negativo mostram "estoque 0"; nada de "un." nem "sem estoque" no tamanho', async () => {
    const { usuario } = await abrirPdv(catalogoSeisTamanhos());
    await usuario.click(botao(/^Bermuda Ciclista/));
    await usuario.click(botaoCor('Preto'));
    const tamanhos = within(screen.getByText('TAMANHO').parentElement!).getAllByRole('button');
    expect(tamanhos.map((b) => texto(b.children[1]))).toEqual(['estoque 3', 'estoque 0', 'estoque 12', 'estoque 7', 'estoque 1', 'estoque 0']);
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
    const tamanhos = within(screen.getByText('TAMANHO').parentElement!).getAllByRole('button');
    expect(tamanhos).toHaveLength(6);
    const grade = tamanhos[0]!.parentElement!;
    // Todos na mesma grade, sem elemento intermediário: 6 tamanhos → uma linha de 4 e outra de 2.
    expect([...grade.children]).toEqual(tamanhos);
    expect([...grade.classList]).toHaveLength(1);
    const regra = declaracoesDe(grade.classList[0]!);
    expect(regra.display).toBe('grid');
    expect(regra['grid-template-columns']).toBe('repeat(4, minmax(0, 1fr))');
    expect(regra.gap).toBe('6px');
    // A 320px "estoque 12" não cabe numa linha: o saldo pode quebrar e o botão cresce (nada de nowrap
    // nem altura fixa, que fariam o texto passar da borda do botão).
    const saldo = declaracoesDe(tamanhos[0]!.children[1]!.classList[0]!);
    expect(saldo['white-space']).toBeUndefined();
    expect(saldo['overflow-wrap']).toBe('anywhere');
    const botaoRegra = declaracoesDe(tamanhos[0]!.classList[0]!);
    expect(botaoRegra.height).toBeUndefined();
    expect(botaoRegra['min-height']).toBe('64px');
  });
});

describe('MUD-03 — topo com o nome da etapa', () => {
  it('nomeEtapa: as três abas e a tela de cor/tamanho', () => {
    expect(nomeEtapa('produtos')).toBe('Produtos');
    expect(nomeEtapa('pedido')).toBe('Pedido');
    expect(nomeEtapa('dia')).toBe('Dia');
    expect(nomeEtapa('produtos', false)).toBe('Produtos');
    expect(nomeEtapa('produtos', true)).toBe('Cor e tamanho');
  });

  it('catálogo ainda carregando: o topo mostra a etapa pela aba e, depois da carga, a etapa da venda', async () => {
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

  // MI-09 (pdv-mobile-refatorado): o título da tela passou para o topo; a etapa fica no nome acessível.
  it('a etapa é o nome do topo; o único h1 da tela de cor/tamanho é o produto, dentro do topo', async () => {
    const { usuario } = await abrirPdv();
    await usuario.click(botao(/^Bermuda Ciclista/));
    expect(etapaNoTopo()).toBe('Cor e tamanho');
    expect(within(screen.getByRole('banner')).getByRole('heading', { level: 1 })).toHaveTextContent('Bermuda Ciclista');
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => texto(h))).toEqual(['Bermuda Ciclista']);
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
    await usuario.click(botao('Voltar para os produtos'));
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    conferirSemVendedorNemData();
    await usuario.click(botao('Pix'));
    await usuario.click(botaoFechar());
    await screen.findByRole('button', { name: 'OK' });
    conferirSemVendedorNemData();
    await usuario.click(botao('OK'));
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
  it('a tela de login tem topo (banner) com "BALCÃO", mas `topoDoPdv` não a reconhece e `esperarPdv` não se cumpre', async () => {
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
    // Senha certa: o topo passa a ser o do PDV, com a etapa, e o do login some.
    await enviarPin(usuario);
    await esperarPdv();
    expect(topoDoPdv()).toBe(screen.getByRole('banner'));
    // MI-02: a venda começa na etapa Cliente.
    expect(etapaNoTopo()).toBe('Cliente');
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
    expect([...grade.classList]).toHaveLength(1);
    const regra = declaracoesDe(grade.classList[0]!);
    expect(regra.display).toBe('grid');
    expect(regra['grid-template-columns']).toBe('repeat(3, minmax(0, 1fr))');
    expect(declaracoesDe(tipos[0]!.classList[0]!)['overflow-wrap']).toBe('anywhere');
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

// MI-07 (pdv-mobile-refatorado): pagamento em 2 colunas dentro do cartão e "Tirar" só com o ícone
// abaixo de 360px (AP-003: a regra é lida do CSS da classe em uso).
describe('MI-07 — layout do Pedido em celular estreito', () => {
  it('formas de pagamento numa grade de 2 colunas minmax(0, 1fr), mesmo dentro do corpo do cartão (flex)', async () => {
    const { usuario } = await abrirPdv();
    await usuario.click(botao(/^Pedido/));
    const pix = botao('Pix');
    const grade = pix.parentElement!;
    expect(grade.children).toHaveLength(4);
    const classes = [...grade.classList];
    expect(classes).toHaveLength(2);
    // As duas classes juntas: a regra combinada `.cartaoCorpo.grade2` precisa devolver o display de grade.
    const css = readFileSync(resolve(import.meta.dirname, '../../src/telas/Pdv/Pdv.module.css'), 'utf8');
    expect(css).toMatch(new RegExp(`\\.${classes[0]}\\.${classes[1]}\\s*\\{\\s*display:\\s*grid;`));
    expect(declaracoesDe(classes[1]!)['grid-template-columns']).toBe('repeat(2, minmax(0, 1fr))');
  });

  it('"Tirar" tem o texto num span que some abaixo de 360px; o nome acessível continua "Tirar"', async () => {
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    const tirar = within(screen.getByTestId('item-pedido')).getByRole('button', { name: 'Tirar' });
    const span = tirar.querySelector('span')!;
    expect(span).toHaveTextContent('Tirar');
    const css = readFileSync(resolve(import.meta.dirname, '../../src/telas/Pdv/Pdv.module.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const media = /@media \(max-width: 359px\)\s*\{([\s\S]*?\})\s*\}/.exec(css)?.[1] ?? '';
    expect(media).toContain(`.${span.classList[0]}`);
    expect(media).toMatch(/clip: rect\(0 0 0 0\)/);
  });
});
