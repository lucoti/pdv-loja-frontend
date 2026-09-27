import type { Catalogo } from '../../api/cliente';
import { formatarReais } from '../../dominio/formatos';
import s from './Pdv.module.css';

type Modelo = Catalogo['modelos'][number];

/** Aba Produtos — chips de categoria e lista de modelos (handoff §2a, RF-F05). */
export function Produtos(props: {
  catalogo: Catalogo;
  categoriaId: string;
  aoEscolherCategoria: (id: string) => void;
  aoEscolherModelo: (modelo: Modelo) => void;
}) {
  const { catalogo, categoriaId } = props;
  const modelos = catalogo.modelos.filter((m) => m.categoriaId === categoriaId);

  return (
    <div className={s.coluna16}>
      <div className={s.chips}>
        {catalogo.categorias.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={s.chip}
            aria-pressed={cat.id === categoriaId}
            onClick={() => props.aoEscolherCategoria(cat.id)}
          >
            {cat.nome}
          </button>
        ))}
      </div>
      <div className={s.modelos}>
        {modelos.map((m) => (
          <button key={m.id} type="button" className={s.modelo} onClick={() => props.aoEscolherModelo(m)}>
            <span className={s.modeloTexto}>
              <span className={s.modeloNome}>{m.nome}</span>
              <span className={s.modeloPreco}>a partir de {formatarReais(m.precoBaseCentavos)}</span>
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
