import type { Catalogo, ConfigLoja, Vendedor } from '../api/cliente';

/** Dados de exemplo do handoff — os mesmos do seed do back (backend/src/banco/seed.ts). */

export const CONFIG: ConfigLoja = { loja: { nome: 'FitMoveOn', unidade: 'Unidade Centro' } };

export const VENDEDORES: Vendedor[] = [{ id: 'carlos', nome: 'Carlos', cargo: 'Vendedor · loja' }];

/** PIN de cada vendedor do simulado. Só existe aqui: o front real nunca conhece PINs. */
export const PINS: Record<string, string> = { carlos: '1234' };

export const CATALOGO: Catalogo = {
  categorias: [
    { id: 'calca', nome: 'Calças' },
    { id: 'bermuda', nome: 'Bermudas' },
    { id: 'top', nome: 'Tops' },
    { id: 'conj', nome: 'Conjuntos' },
  ],
  modelos: [
    { id: 'calca-legging', nome: 'Calça Legging', categoriaId: 'calca', precoBaseCentavos: 8900 },
    { id: 'calca-flare', nome: 'Calça Flare', categoriaId: 'calca', precoBaseCentavos: 9900 },
    { id: 'calca-pantalona', nome: 'Calça Pantalona', categoriaId: 'calca', precoBaseCentavos: 10900 },
    { id: 'calca-corsario', nome: 'Calça Corsário', categoriaId: 'calca', precoBaseCentavos: 7900 },
    { id: 'bermuda-ciclista', nome: 'Bermuda Ciclista', categoriaId: 'bermuda', precoBaseCentavos: 5900 },
    { id: 'bermuda-longa', nome: 'Bermuda Longa', categoriaId: 'bermuda', precoBaseCentavos: 6900 },
    { id: 'short-saia', nome: 'Short Saia', categoriaId: 'bermuda', precoBaseCentavos: 6500 },
    { id: 'short-curto', nome: 'Short Curto', categoriaId: 'bermuda', precoBaseCentavos: 5500 },
    { id: 'top-alca-larga', nome: 'Top Alça Larga', categoriaId: 'top', precoBaseCentavos: 4900 },
    { id: 'top-nadador', nome: 'Top Nadador', categoriaId: 'top', precoBaseCentavos: 5500 },
    { id: 'blusa-manga-longa', nome: 'Blusa Manga Longa', categoriaId: 'top', precoBaseCentavos: 7900 },
    { id: 'regata-basica', nome: 'Regata Básica', categoriaId: 'top', precoBaseCentavos: 4500 },
    { id: 'conj-legging-top', nome: 'Conjunto Legging + Top', categoriaId: 'conj', precoBaseCentavos: 13900 },
    { id: 'conj-ciclista-top', nome: 'Conjunto Ciclista + Top', categoriaId: 'conj', precoBaseCentavos: 11900 },
  ],
  tecidos: [
    { id: 'normal', nome: 'Suplex Normal', acrescimoCentavos: 0 },
    { id: 'light', nome: 'Suplex Light', acrescimoCentavos: 1200 },
  ],
  tamanhos: ['P', 'M', 'G', 'GG'],
  cores: [
    { nome: 'Preto', hex: '#1B1B1B' },
    { nome: 'Marinho', hex: '#26344F' },
    { nome: 'Grafite', hex: '#5A5A5A' },
    { nome: 'Vinho', hex: '#6B2232' },
    { nome: 'Verde Militar', hex: '#4A5236' },
    { nome: 'Rosa Antigo', hex: '#B4808A' },
    { nome: 'Bege', hex: '#C7B299' },
    { nome: 'Off White', hex: '#EDE8DE' },
  ],
  pagamentos: [
    { id: 'dinheiro', nome: 'Dinheiro' },
    { id: 'pix', nome: 'Pix' },
    { id: 'debito', nome: 'Débito' },
    { id: 'credito', nome: 'Crédito' },
  ],
};
