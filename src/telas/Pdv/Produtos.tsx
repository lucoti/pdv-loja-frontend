import type { Catalogo } from '../../api/cliente';
import { precoMinimo, semEstoque, type Produto } from '../../dominio/catalogo';
import { formatarReais } from '../../dominio/formatos';
import s from './Pdv.module.css';

/** Aba Produtos — chips com os tipos do ERP e lista de produtos do tipo (handoff §2a, RF-F05, RF-002). */
export function Produtos(props: {
  catalogo: Catalogo;
  tipoId: number | null;
  aoEscolherTipo: (id: number) => void;
  aoEscolherProduto: (produto: Produto) => void;
}) {
  const { catalogo, tipoId } = props;
  // Os chips vêm só dos tipos com produto vendável (o back já filtra), então nenhum chip abre lista vazia.
  const produtos = catalogo.produtos.filter((p) => p.tipoId === tipoId);

  // Catálogo do ERP vazio (nenhum produto ativo com SKU ativo): nada para vender ainda.
  if (!catalogo.produtos.length) return <div className={s.vazio}>Nenhum produto cadastrado no ERP.</div>;

  return (
    <div className={s.coluna16}>
      <div className={s.chips}>
        {catalogo.tipos.map((t) => (
          <button key={t.id} type="button" className={s.chip} aria-pressed={t.id === tipoId} onClick={() => props.aoEscolherTipo(t.id)}>
            {t.nome}
          </button>
        ))}
      </div>
      <div className={s.modelos}>
        {produtos.map((p) => (
          <button key={p.id} type="button" className={s.modelo} onClick={() => props.aoEscolherProduto(p)}>
            <span className={s.modeloTexto}>
              <span className={s.modeloNome}>{p.nome}</span>
              {/* ATENÇÃO: o nome acessível do cartão junta nome, tecido, "a partir de", "sem estoque" e a
                  seta; testes de pdv.test.tsx conferem esse texto inteiro e procuram /a partir de/. */}
              <span className={s.modeloPreco}>
                {p.tecidoNome} · a partir de {formatarReais(precoMinimo(p))}
              </span>
              {/* O card continua abrindo: o vendedor pode conferir cores e tamanhos mesmo sem estoque. */}
              {semEstoque(p.skus) && <span className={s.semEstoque}>sem estoque</span>}
            </span>
            <span className={s.seta} aria-hidden="true">
              ›
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
