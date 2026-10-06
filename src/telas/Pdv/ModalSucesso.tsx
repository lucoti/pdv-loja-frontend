import type { Venda } from '../../api/cliente';
import { formatarReais } from '../../dominio/formatos';
import s from './Pdv.module.css';

/** Modal "Venda registrada" com os valores devolvidos pelo servidor (handoff §2e, RF-F08). */
// Os números vêm da resposta do servidor (não do pedido da tela): se o preço mudou no ERP depois da
// última carga do catálogo, o total aqui é o cobrado de verdade.
// ATENÇÃO: o modal só fecha pelo botão "Nova venda" (sem toque fora nem tecla Esc), e esse botão é o
// que gera a chave de idempotência nova (INV-011). Os testes de tela procuram o papel `dialog` e o
// título "Venda registrada" (pdv.test.tsx) e o botão "Nova venda" (pdv.test.tsx, pdv.ajustes.test.tsx
// e pdv.caracterizacao.test.tsx); trocar o modal por outro aviso exige o inventário do AP-004.
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
