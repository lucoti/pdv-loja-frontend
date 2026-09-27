import type { Venda } from '../../api/cliente';
import { formatarReais } from '../../dominio/formatos';
import s from './Pdv.module.css';

/** Modal "Venda registrada" com os valores devolvidos pelo servidor (handoff §2e, RF-F08). */
export function ModalSucesso({ venda, aoNovaVenda }: { venda: Venda; aoNovaVenda: () => void }) {
  const resumo =
    `Pedido #${venda.numero} · ${venda.pecas} peça(s) · ${formatarReais(venda.totalCentavos)} em ${venda.pagamento.nome}` +
    (venda.cliente ? ` · ${venda.cliente}` : '');

  return (
    <div className={s.sombra}>
      <div className={s.modal} role="dialog" aria-modal="true" aria-labelledby="titulo-sucesso">
        <h2 id="titulo-sucesso" className={s.modalTitulo}>
          Venda registrada
        </h2>
        <p className={s.modalResumo}>{resumo}</p>
        <button type="button" className={s.novaVenda} onClick={aoNovaVenda} autoFocus>
          Nova venda
        </button>
      </div>
    </div>
  );
}
