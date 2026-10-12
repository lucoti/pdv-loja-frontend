import { CheckCircle } from '@phosphor-icons/react';
import type { Venda } from '../../api/cliente';
import { formatarReais, textoPecas } from '../../dominio/formatos';
import c from '../comum.module.css';
import s from './Pdv.module.css';

/**
 * Aviso de venda registrada (MI-26), com os valores devolvidos pelo servidor: total, peças, pagamento e
 * cliente. Sai só com "Nova venda", que zera tudo e volta para Produtos.
 *
 * ATENÇÃO: "Nova venda" é o único caminho, depois de uma venda, que troca a chave de idempotência (INV-011).
 * Enquanto o aviso está aberto, o pedido registrado continua no estado com a chave antiga. Sem trava em ref
 * (ADR-003): dois toques só geram duas chaves seguidas com o pedido já vazio, e vale a última.
 */
export function AvisoVenda({ venda, aoNovaVenda }: { venda: Venda; aoNovaVenda: () => void }) {
  return (
    <div className={s.sombra}>
      <div className={s.modal} role="dialog" aria-modal="true" aria-labelledby="titulo-aviso">
        <CheckCircle size={64} className={s.modalIcone} aria-hidden="true" />
        <h2 id="titulo-aviso" className={s.modalTitulo}>
          Venda registrada
        </h2>
        <div className={s.modalResumo}>
          <span className={`${s.modalTotal} ${c.tabular}`}>{formatarReais(venda.totalCentavos)}</span>
          <span>
            {textoPecas(venda.pecas)} · {venda.pagamento.nome}
          </span>
          {/* O celular do cliente não aparece no aviso, só o nome. */}
          <span>{venda.cliente || 'Cliente não identificado'}</span>
        </div>
        <button type="button" className={s.novaVenda} onClick={aoNovaVenda} autoFocus>
          Nova venda
        </button>
      </div>
    </div>
  );
}
