import { dataBr } from '../../dominio/formatos';
import s from './Pdv.module.css';

/**
 * Cabeçalho fixo (RF-F04). O número do pedido só existe depois de fechar a venda — quem gera é o
 * servidor —, então aqui aparece "pedido novo" (decisão do Lucas, 2026-09-27).
 */
export function Cabecalho({ vendedor }: { vendedor: string }) {
  return (
    <header className={s.cabecalho}>
      <div className={s.cabecalhoTexto}>
        <div className={s.marca}>BALCÃO</div>
        <div className={s.subtitulo}>{vendedor} · pedido novo</div>
      </div>
      <div className={s.data}>{dataBr()}</div>
    </header>
  );
}
