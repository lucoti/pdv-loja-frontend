import s from './Login.module.css';

const DIGITOS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * Teclado numérico da própria tela (handoff §1): nada de <input> nem teclado do sistema.
 * Ordem 1–9, célula vazia (sem clique), 0, "apagar".
 */
export function TecladoPin({ aoDigitar, aoApagar }: { aoDigitar: (d: string) => void; aoApagar: () => void }) {
  return (
    <div className={s.teclado}>
      {DIGITOS.map((d) => (
        <button key={d} type="button" className={s.tecla} onClick={() => aoDigitar(d)}>
          {d}
        </button>
      ))}
      <span className={s.vazia} aria-hidden="true" />
      <button type="button" className={s.tecla} onClick={() => aoDigitar('0')}>
        0
      </button>
      <button type="button" className={`${s.tecla} ${s.apagar}`} onClick={aoApagar}>
        apagar
      </button>
    </div>
  );
}
