import { CalendarBlank, Receipt, TShirt, type Icon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import s from './Pdv.module.css';

export type Aba = 'produtos' | 'pedido' | 'dia';

/**
 * Barra fixa no pé da tela: o botão de ação da tela atual (quando houver) e as 3 abas, cada uma com
 * ícone e nome, no formato do design (MI-08). A aba ativa tem `aria-current="page"`, que também desenha
 * a marca no alto da aba (CSS).
 * O nome acessível de cada aba é só o texto ("Pedido (2)"): o ícone fica escondido dos leitores de tela.
 */
export function BarraInferior({ aba, pecas, acao, aoTrocarAba }: { aba: Aba; pecas: number; acao?: ReactNode; aoTrocarAba: (aba: Aba) => void }) {
  const abas: Array<{ id: Aba; nome: string; Icone: Icon }> = [
    { id: 'produtos', nome: 'Produtos', Icone: TShirt },
    { id: 'pedido', nome: pecas ? `Pedido (${pecas})` : 'Pedido', Icone: Receipt },
    { id: 'dia', nome: 'Dia', Icone: CalendarBlank },
  ];

  return (
    <div className={s.barra}>
      {acao}
      <nav className={s.abas} aria-label="Abas">
        {abas.map(({ id, nome, Icone }) => (
          <button key={id} type="button" className={s.aba} aria-current={aba === id ? 'page' : undefined} onClick={() => aoTrocarAba(id)}>
            <Icone size={24} aria-hidden="true" />
            <span>{nome}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
