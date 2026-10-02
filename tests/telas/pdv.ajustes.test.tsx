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
const etapaNoTopo = () => texto(screen.getByRole('banner'));

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
    expect(tamanhos.map((b) => texto(b.children[2]))).toEqual(['estoque 3', 'estoque 0', 'estoque 12', 'estoque 7', 'estoque 1', 'estoque 0']);
    for (const b of tamanhos) expect(texto(b)).not.toMatch(/un\.|sem estoque|-\d/);
  });
});

describe('MUD-02 — grade de tamanhos em 3 colunas iguais que encolhem', () => {
  it('os 6 tamanhos são filhos diretos de uma grade de 3 colunas minmax(0, 1fr)', async () => {
    const { usuario } = await abrirPdv(catalogoSeisTamanhos());
    await usuario.click(botao(/^Bermuda Ciclista/));
    await usuario.click(botaoCor('Preto'));
    const tamanhos = within(screen.getByText('TAMANHO').parentElement!).getAllByRole('button');
    expect(tamanhos).toHaveLength(6);
    const grade = tamanhos[0]!.parentElement!;
    // Todos na mesma grade, sem elemento intermediário: 6 tamanhos → 2 linhas de 3.
    expect([...grade.children]).toEqual(tamanhos);
    expect([...grade.classList]).toHaveLength(1);
    const regra = declaracoesDe(grade.classList[0]!);
    expect(regra.display).toBe('grid');
    expect(regra['grid-template-columns']).toBe('repeat(3, minmax(0, 1fr))');
    expect(regra.gap).toBe('12px');
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

  it('a etapa é um texto simples no topo, não um título: o único h1 da tela de cor/tamanho é o produto', async () => {
    const { usuario } = await abrirPdv();
    await usuario.click(botao(/^Bermuda Ciclista/));
    expect(within(screen.getByRole('banner')).queryByRole('heading')).not.toBeInTheDocument();
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
    await screen.findByRole('button', { name: 'Nova venda' });
    conferirSemVendedorNemData();
    await usuario.click(botao('Nova venda'));
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
    expect(topoDoPdv()).toBe(screen.getByRole('banner').firstElementChild);
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
