import type { ReactNode } from 'react';
import s from './Pdv.module.css';

export type Aba = 'produtos' | 'pedido' | 'dia';

/** Barra fixa: CTA da tela atual (quando houver) e as 3 abas (handoff §2). */
export function BarraInferior({ aba, pecas, acao, aoTrocarAba }: { aba: Aba; pecas: number; acao?: ReactNode; aoTrocarAba: (aba: Aba) => void }) {
  // A aba Pedido mostra o total de peças (soma das quantidades, não de linhas) só quando há alguma.
  // A aba atual é marcada com aria-current="page" (conferido em pdv.test.tsx e pdv.caracterizacao.test.tsx).
  // `acao` é o botão grande da tela (Adicionar / Fechar), montado por <Venda> e só encaixado aqui.
  const abas: Array<{ id: Aba; nome: string }> = [
    { id: 'produtos', nome: 'Produtos' },
    { id: 'pedido', nome: pecas ? `Pedido (${pecas})` : 'Pedido' },
    { id: 'dia', nome: 'Dia' },
  ];

  return (
    <div className={s.barra}>
      {acao}
      <nav className={s.abas} aria-label="Abas">
        {abas.map((a) => (
          <button key={a.id} type="button" className={s.aba} aria-current={aba === a.id ? 'page' : undefined} onClick={() => aoTrocarAba(a.id)}>
            {a.nome}
          </button>
        ))}
      </nav>
    </div>
  );
}
