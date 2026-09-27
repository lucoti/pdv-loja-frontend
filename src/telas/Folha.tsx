import type { ReactNode } from 'react';
import c from './comum.module.css';

/** Folha de até 460px centralizada sobre o fundo "desk" (RNF-F04). */
export function Folha({ children }: { children: ReactNode }) {
  return (
    <div className={c.fundo}>
      <div className={c.folha}>{children}</div>
    </div>
  );
}
