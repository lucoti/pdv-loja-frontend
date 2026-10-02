import s from './Login.module.css';

const DIGITOS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * Teclado numérico da própria tela (handoff §1): nada de <input> nem teclado do sistema.
 * Ordem 1–9, célula vazia (sem clique), 0, "apagar". Com "desabilitado" nenhuma tecla responde
 * (usado enquanto a senha está sendo validada). Como o último número dispara o login sozinho, travar
 * as teclas evita que um toque a mais mude a senha ou gere um segundo pedido no meio da validação.
 */
export function TecladoPin({
  aoDigitar,
  aoApagar,
  desabilitado = false,
}: {
  aoDigitar: (d: string) => void;
  aoApagar: () => void;
  desabilitado?: boolean;
}) {
  return (
    <div className={s.teclado}>
      {DIGITOS.map((d) => (
        <button key={d} type="button" className={s.tecla} disabled={desabilitado} onClick={() => aoDigitar(d)}>
          {d}
        </button>
      ))}
      <span className={s.vazia} aria-hidden="true" />
      <button type="button" className={s.tecla} disabled={desabilitado} onClick={() => aoDigitar('0')}>
        0
      </button>
      <button type="button" className={`${s.tecla} ${s.apagar}`} disabled={desabilitado} onClick={aoApagar}>
        apagar
      </button>
    </div>
  );
}
