import { CalendarBlank, Receipt, TShirt, type Icon } from '@phosphor-icons/react';
import s from './Pdv.module.css';

export type Aba = 'produtos' | 'pedido' | 'dia';

/**
 * Abas no topo da tela (MI-20, ADR-001): Produtos, Pedido e Dia em linha, cada uma com ícone e nome, e o
 * número de peças numa bolinha na aba Pedido. A aba ativa tem `aria-current="page"`.
 *
 * Desenhada uma vez só, em `Pdv`, fora do ramo que depende do catálogo: quando a carga termina, as abas
 * continuam sendo o mesmo elemento e um toque nesse instante não se perde (INV-020 corrigido).
 *
 * O nome acessível da aba Pedido com peças é "Pedido (N)" (`aria-label`), como antes: a bolinha é só visual.
 * ATENÇÃO: os testes de tela procuram a aba por esse nome; mudar o formato do `aria-label` exige ajustar
 * os helpers de teste (AP-004).
 */
export function Abas({ aba, pecas, aoTrocarAba }: { aba: Aba; pecas: number; aoTrocarAba: (aba: Aba) => void }) {
  const abas: Array<{ id: Aba; nome: string; Icone: Icon }> = [
    { id: 'produtos', nome: 'Produtos', Icone: TShirt },
    { id: 'pedido', nome: 'Pedido', Icone: Receipt },
    { id: 'dia', nome: 'Dia', Icone: CalendarBlank },
  ];

  return (
    <nav className={s.abas} aria-label="Abas">
      {abas.map(({ id, nome, Icone }) => {
        const comBolinha = id === 'pedido' && pecas > 0;
        return (
          <button
            key={id}
            type="button"
            className={s.aba}
            aria-current={aba === id ? 'page' : undefined}
            aria-label={comBolinha ? `${nome} (${pecas})` : undefined}
            onClick={() => aoTrocarAba(id)}
          >
            <Icone size={22} aria-hidden="true" />
            <span>{nome}</span>
            {comBolinha && (
              <span className={s.bolinha} aria-hidden="true">
                {pecas}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
