import type { Catalogo, ConfigLoja, Vendedor } from '../api/cliente';

/** Dados de exemplo do handoff — os mesmos do seed do back (backend/src/banco/seed.ts). */

export const CONFIG: ConfigLoja = { loja: { nome: 'FitMoveOn', unidade: 'Unidade Centro' } };

export const VENDEDORES: Vendedor[] = [{ id: 'carlos', nome: 'Carlos', cargo: 'Vendedor · loja' }];

/**
 * PIN de cada vendedor do simulado. Só existe aqui: o front real nunca conhece PINs.
 * ATENÇÃO: precisa ter o tamanho aceito pelo login simulado (8 números, em handlers.ts) e acompanha o
 * PIN de exemplo do seed do back; com outro tamanho, o simulado responde 400 e ninguém entra.
 */
export const PINS: Record<string, string> = { carlos: '12345678' };

/*
 * Catálogo no formato do ERP, igual ao SEED_ERP do back (backend/src/banco/seed.ts): 4 produtos × 3
 * cores × 4 tamanhos, saldo 5 com exceções para exercitar "sem estoque" e "só N em estoque".
 */
const TIPOS = [
  { id: 1, nome: 'Calças' },
  { id: 2, nome: 'Tops' },
  { id: 3, nome: 'Bermudas' },
];
const CORES = [
  { id: 1, nome: 'Preto', hex: '#1B1B1B', fotoUrl: null },
  { id: 2, nome: 'Marinho', hex: '#26344F', fotoUrl: null },
  { id: 3, nome: 'Vinho', hex: '#6B2232', fotoUrl: null },
];
const TAMANHOS = ['P', 'M', 'G', 'GG'];
const PRODUTOS = [
  { numero: 1, nome: 'Calça Legging', tipoId: 1, precoCentavos: 8900 },
  { numero: 2, nome: 'Top Nadador', tipoId: 2, precoCentavos: 5500 },
  { numero: 3, nome: 'Bermuda Ciclista', tipoId: 3, precoCentavos: 5900 },
  { numero: 4, nome: 'Short Curto', tipoId: 3, precoCentavos: 5500 },
];
// ATENÇÃO: estes valores precisam acompanhar o SEED_ERP do back; se divergirem, o modo simulado e os
// testes do back passam a mostrar estoques diferentes.
const SALDOS: Record<string, number> = { '0002.003.04': 0, '0001.002.01': 1 };
const SEM_ESTOQUE = [4];
const INATIVOS = ['0003.003.04'];

const codigo = (p: number, c: number, t: number) => `${String(p).padStart(4, '0')}.${String(c).padStart(3, '0')}.${String(t).padStart(2, '0')}`;

export const CATALOGO: Catalogo = {
  tipos: [...TIPOS].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
  produtos: PRODUTOS.map((p) => ({
    id: p.numero,
    numero: p.numero,
    nome: p.nome,
    tipoId: p.tipoId,
    tecidoNome: 'Suplex',
    // Mesmo id do back: SKUs inseridos produto → cor → tamanho; o inativo fica fora, como no GET /catalogo.
    skus: CORES.flatMap((cor) =>
      TAMANHOS.map((sigla, i) => ({
        id: (p.numero - 1) * 12 + (cor.id - 1) * 4 + i + 1,
        codigo: codigo(p.numero, cor.id, i + 1),
        cor,
        tamanho: { sigla, ordem: i + 1 },
        precoCentavos: p.precoCentavos,
        saldo: SEM_ESTOQUE.includes(p.numero) ? 0 : (SALDOS[codigo(p.numero, cor.id, i + 1)] ?? 5),
      })),
    ).filter((s) => !INATIVOS.includes(s.codigo)),
  })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
  pagamentos: [
    { id: 'dinheiro', nome: 'Dinheiro' },
    { id: 'pix', nome: 'Pix' },
    { id: 'debito', nome: 'Débito' },
    { id: 'credito', nome: 'Crédito' },
  ],
};
