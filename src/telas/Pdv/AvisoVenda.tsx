import type { Venda } from '../../api/cliente';
import { formatarReais, textoPecas } from '../../dominio/formatos';
import s from './Pdv.module.css';

/**
 * Aviso de venda registrada (MI-04), com os valores devolvidos pelo servidor. Sai só com o toque em OK
 * (decisão do Lucas); o OK começa a venda seguinte na etapa Cliente.
 *
 * ATENÇÃO: o OK é o único caminho, depois de uma venda, que troca a chave de idempotência (INV-011,
 * ADR-004). Enquanto o aviso está aberto, o pedido registrado continua no estado com a chave antiga.
 */
export function AvisoVenda({ venda, aoOk }: { venda: Venda; aoOk: () => void }) {
  const resumo =
    `Pedido #${venda.numero} · ${textoPecas(venda.pecas)} · ${formatarReais(venda.totalCentavos)} em ${venda.pagamento.nome}` +
    (venda.cliente ? ` · ${venda.cliente}` : '');

  return (
    <div className={s.sombra}>
      <div className={s.modal} role="dialog" aria-modal="true" aria-labelledby="titulo-aviso">
        <h2 id="titulo-aviso" className={s.modalTitulo}>
          Venda registrada
        </h2>
        <p className={s.modalResumo}>{resumo}</p>
        <button type="button" className={s.ok} onClick={aoOk} autoFocus>
          OK
        </button>
      </div>
    </div>
  );
}
