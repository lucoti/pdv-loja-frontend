import type { ReactNode } from 'react';
import s from './Pdv.module.css';

/**
 * Cartão numerado das etapas de escolha (MI-22, MI-23): 1 Peça, 2 Tecido, 3 Cor e 4 Tamanho. Cabeçalho
 * com o número num círculo, o título e um complemento opcional à direita; o corpo vem nos filhos.
 * O nome acessível da seção é o título ("Peça", "Tecido"…).
 */
export function Cartao(props: { numero: number; titulo: string; complemento?: string; children: ReactNode }) {
  return (
    <section className={s.cartao} aria-label={props.titulo}>
      <div className={s.cartaoTopo}>
        <span className={s.cartaoNumero} aria-hidden="true">
          {props.numero}
        </span>
        <h2 className={s.cartaoTitulo}>{props.titulo}</h2>
        {props.complemento && <span className={s.cartaoComplemento}>{props.complemento}</span>}
      </div>
      {props.children}
    </section>
  );
}
