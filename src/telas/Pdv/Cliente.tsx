import { mascararCelular } from '../../dominio/formatos';
import s from './Pdv.module.css';

/** Rascunho da etapa Cliente: o que o vendedor está digitando, antes de confirmar. */
export interface RascunhoCliente {
  nome: string;
  /** Celular com a máscara, como aparece no campo. */
  celular: string;
}

/**
 * Etapa Cliente (design 1a, MI-02): primeiro passo da venda, com nome e celular, os dois opcionais.
 * O componente só desenha os campos; o rascunho fica em `Venda` (Pdv.tsx), porque os botões de
 * confirmar e de seguir sem cliente ficam na barra de baixo, fora daqui.
 */
export function Cliente({ rascunho, aoMudar }: { rascunho: RascunhoCliente; aoMudar: (r: RascunhoCliente) => void }) {
  return (
    <div className={s.coluna18}>
      <label className={s.rotuloCampo}>
        <span>Nome</span>
        <input
          className={s.campo}
          value={rascunho.nome}
          onChange={(e) => aoMudar({ ...rascunho, nome: e.target.value })}
          placeholder="Ex.: Maria da Silva"
          maxLength={120}
          autoComplete="off"
        />
      </label>
      <label className={s.rotuloCampo}>
        <span>Celular</span>
        {/* A máscara é refeita a cada tecla; o pedido guarda só os dígitos. */}
        <input
          className={s.campo}
          value={rascunho.celular}
          onChange={(e) => aoMudar({ ...rascunho, celular: mascararCelular(e.target.value) })}
          placeholder="(31) 99999-9999"
          type="tel"
          inputMode="tel"
          autoComplete="off"
        />
      </label>
    </div>
  );
}
