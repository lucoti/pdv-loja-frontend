/**
 * RF-I04 / ADR-I01 / RNF-I04 — configuração de publicação do front. O `vercel.json` é lido como está no
 * repositório; o build de produção do Vite é conferido pela própria config (sem rodar o build).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import configVite from '../../vite.config';

const RAIZ = resolve(import.meta.dirname, '../..');
const lerJson = (arquivo: string) => JSON.parse(readFileSync(resolve(RAIZ, arquivo), 'utf8'));

interface Rewrite {
  source: string;
  destination: string;
}

describe('vercel.json do front', () => {
  const vercel = lerJson('vercel.json');

  it('tem um único rewrite: /api/(.*) → back de produção em HTTPS, preservando o caminho', () => {
    expect(vercel.rewrites).toEqual([{ source: '/api/(.*)', destination: 'https://pdv-loja-backend.vercel.app/api/$1' }]);
  });

  it('o destino repassa exatamente o caminho de /api (simulação do padrão da Vercel)', () => {
    const [regra] = vercel.rewrites as Rewrite[];
    // O source da Vercel (path-to-regexp) com grupo explícito equivale a esta regex ancorada.
    const padrao = new RegExp(`^${regra!.source}$`);
    const reescrever = (caminho: string) => {
      const m = padrao.exec(caminho);
      return m ? regra!.destination.replace('$1', m[1]!) : null;
    };
    expect(reescrever('/api/auth/sessao')).toBe('https://pdv-loja-backend.vercel.app/api/auth/sessao');
    expect(reescrever('/api/vendas/dia')).toBe('https://pdv-loja-backend.vercel.app/api/vendas/dia');
    expect(reescrever('/index.html')).toBeNull();
    expect(reescrever('/mockServiceWorker.js')).toBeNull();
  });

  it('não define headers, redirects nem outras rotas que alterem a resposta do back (cookie repassado como veio)', () => {
    expect(Object.keys(vercel).sort()).toEqual(['$schema', 'rewrites']);
  });
});

describe('build de produção do Vite (RNF-I04: nada do simulado publicado)', () => {
  const resolver = (mode: string) =>
    (configVite as (e: { mode: string; command: 'build' | 'serve' }) => { publicDir?: string | false; define?: Record<string, string> })({
      mode,
      command: 'build',
    });

  it('em produção não copia a pasta pública do simulado (mockServiceWorker.js) e desliga o MSW', () => {
    const producao = resolver('production');
    expect(producao.publicDir).toBe(false);
    expect(producao.define?.__API_SIMULADA__).toBe('false');
  });

  it('só o modo de desenvolvimento serve o simulado', () => {
    const dev = resolver('development');
    expect(dev.publicDir).toBe('simulado-publico');
    expect(dev.define?.__API_SIMULADA__).toBe('true');
  });
});

describe('package.json do front', () => {
  it('fixa o Node 22 (engines), como no back', () => {
    expect(lerJson('package.json').engines).toEqual({ node: '>=22.12 <23' });
  });
});
