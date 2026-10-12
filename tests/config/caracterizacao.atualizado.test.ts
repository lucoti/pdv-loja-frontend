/**
 * Caracterização da refatoração pdv-mobile-atualizado (Fase 4, passo 1) por inspeção dos arquivos:
 * - INV-019: o pedido fica só em memória — nenhum código de `src/` usa localStorage/sessionStorage
 *   (o teste de tela em pdv.mobile.caracterizacao.test.tsx confere a mesma coisa em execução).
 * - INV-032: a tela de Login não muda de layout. Os tokens novos do design (ADR-006, `--tile-*`) e a
 *   classe `.tile` podem ENTRAR; o que o Login já usa não pode mudar: o CSS do Login e o global, o valor
 *   de cada token que existe hoje e as regras das classes de `comum.module.css` que o Login (e `Folha` e
 *   `Avisos`, que ele usa) aplicam. Comentários e espaços não contam.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const RAIZ = resolve(import.meta.dirname, '../..');
const ler = (arquivo: string) => readFileSync(resolve(RAIZ, arquivo), 'utf8');
/** Sem comentários e com os espaços colapsados: só o que o navegador aplica. */
const normalizar = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim();
const resumo = (texto: string) => createHash('sha256').update(texto).digest('hex');

function arquivosDe(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    return statSync(caminho).isDirectory() ? arquivosDe(caminho) : [caminho];
  });
}

describe('INV-019 — pedido só em memória (inspeção)', () => {
  it('nenhum arquivo de src/ menciona localStorage nem sessionStorage', () => {
    const arquivos = arquivosDe(resolve(RAIZ, 'src')).filter((f) => /\.(ts|tsx)$/.test(f));
    expect(arquivos.length).toBeGreaterThan(10);
    const comArmazenamento = arquivos.filter((f) => /localStorage|sessionStorage|indexedDB|document\.cookie/.test(readFileSync(f, 'utf8')));
    expect(comArmazenamento).toEqual([]);
  });
});

describe('INV-032 — Login sem mudança de layout (estilos que ele usa)', () => {
  it('Login.module.css e global.css iguais aos de hoje (comentários e espaços à parte)', () => {
    expect(resumo(normalizar(ler('src/telas/Login/Login.module.css')))).toBe('bfc00223bb53af9168258939f3bce5c5743e1260c3e4ecb22100a4fda4b92586');
    expect(resumo(normalizar(ler('src/estilos/global.css')))).toBe('d337f400816def421a9dac2741cf38ab413b39d52bd38c6b55eae6cfc269c1d3');
  });

  it('todo token que existe hoje em tokens.css continua com o mesmo valor (tokens novos podem entrar)', () => {
    const atuais = Object.fromEntries([...normalizar(ler('src/estilos/tokens.css')).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]));
    expect(atuais).toMatchObject({
      '--color-bg': '#161826',
      '--color-surface': '#232532',
      '--color-text': '#e9e9ed',
      '--color-accent': '#9184d9',
      '--color-divider': 'color-mix(in srgb, #e9e9ed 16%, transparent)',
      '--color-neutral-100': '#f3f5fe',
      '--color-neutral-200': '#e4e7f5',
      '--color-neutral-300': '#cfd3e5',
      '--color-neutral-400': '#b2b6ca',
      '--color-neutral-500': '#9397ab',
      '--color-neutral-600': '#75798c',
      '--color-neutral-700': '#595d6c',
      '--color-neutral-800': '#3f424d',
      '--color-neutral-900': '#292b31',
      '--color-accent-100': '#f5f4ff',
      '--color-accent-200': '#e7e5fe',
      '--color-accent-300': '#d2cefd',
      '--color-accent-400': '#b5abfc',
      '--color-accent-500': '#968ae0',
      '--color-accent-600': '#796cbf',
      '--color-accent-700': '#5d5294',
      '--color-accent-800': '#423a6a',
      '--color-accent-900': '#2b2741',
      '--color-danger': '#f2a493',
      '--color-danger-bg': '#3a2126',
      '--color-danger-line': '#8c4a45',
      '--color-veu': 'rgba(8, 9, 15, 0.72)',
      '--font-heading': "'Inter', system-ui, sans-serif",
      '--font-body': "'Inter', system-ui, sans-serif",
      '--radius-sm': '4px',
      '--radius-md': '8px',
      '--radius-lg': '14px',
      '--shadow-sm': '0 0 0 1px #3f424d',
      '--shadow-lg': '0 0 0 1px #9397ab, 0 16px 40px rgba(0, 0, 0, 0.65)',
    });
  });

  it('as classes de comum.module.css usadas pelo Login, pela Folha e pelos Avisos têm as mesmas regras (nenhuma regra a mais nem a menos)', () => {
    const comum = normalizar(ler('src/telas/comum.module.css'));
    const regrasDa = (classe: string) =>
      [...comum.matchAll(new RegExp(`(^|[\\s,}])([^{}]*\\.${classe}(?![\\w-])[^{}]*)\\{([^}]*)\\}`, 'g'))].map((m) => `${m[2]!.trim()} { ${m[3]!.trim()} }`);
    expect(Object.fromEntries(['aviso', 'carregando', 'erro', 'folha', 'fundo', 'tentarDeNovo', 'voltar'].map((c) => [c, regrasDa(c)]))).toEqual({
      aviso: ['.aviso { display: flex; flex-direction: column; gap: 14px; }'],
      carregando: ['.carregando { padding: 40px 16px; text-align: center; color: var(--color-neutral-400); font-size: 20px; }'],
      erro: [
        '.erro { padding: 16px 18px; border-radius: 14px; background: var(--color-danger-bg); border: 2px solid var(--color-danger-line); color: var(--color-danger); font-size: 19px; font-weight: 600; text-align: center; line-height: 1.4; }',
      ],
      folha: [
        '.folha { width: 100%; max-width: 460px; min-height: 100vh; min-height: 100dvh; background: var(--color-bg); color: var(--color-text); display: flex; flex-direction: column; position: relative; box-shadow: var(--shadow-sm); }',
      ],
      fundo: ['.fundo { min-height: 100vh; min-height: 100dvh; display: flex; justify-content: center; background: var(--color-bg); }'],
      tentarDeNovo: [
        '.tentarDeNovo { font-size: 19px; font-weight: 700; padding: 18px; border-radius: 14px; border: 2px solid var(--color-neutral-600); background: transparent; color: var(--color-text); cursor: pointer; }',
      ],
      voltar: [
        '.voltar { width: 58px; height: 58px; flex-shrink: 0; font-size: 26px; font-weight: 700; border-radius: 14px; border: 2px solid var(--color-neutral-600); background: transparent; color: var(--color-text); cursor: pointer; }',
      ],
    });
  });

  it('o Login não usa a classe nova `.tile` nem tokens `--tile-*` (ADR-006)', () => {
    for (const arquivo of ['src/telas/Login/Login.tsx', 'src/telas/Login/TecladoPin.tsx', 'src/telas/Login/Login.module.css']) {
      expect(ler(arquivo)).not.toMatch(/\btile\b|--tile-/);
    }
  });
});
