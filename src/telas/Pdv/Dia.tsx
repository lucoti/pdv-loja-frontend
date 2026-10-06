import { api } from '../../api/cliente';
import { formatarReais, textoPecas } from '../../dominio/formatos';
import { Carregando, FalhaAoCarregar } from '../Avisos';
import c from '../comum.module.css';
import { useCarregar } from '../useCarregar';
import s from './Pdv.module.css';

/** Aba Dia — vendas de hoje do vendedor logado, buscadas na API a cada abertura (handoff §2d, RF-F09). */
export function Dia() {
  // Busca de novo toda vez que a aba é montada (sem cache): a lista inclui a venda que acabou de fechar.
  // O cliente aparece só pelo nome: a rota /vendas/hoje não devolve o celular, que fica só na venda
  // gravada e no cupom.
  const [carga, tentarDeNovo] = useCarregar(api.vendasHoje);

  return (
    <div className={s.coluna14}>
      {carga.situacao === 'carregando' && <Carregando />}
      {carga.situacao === 'erro' && <FalhaAoCarregar mensagem={carga.mensagem} aoTentar={tentarDeNovo} />}
      {carga.situacao === 'ok' && (
        <>
          <div className={s.caixasDia}>
            <div className={s.caixaTotal}>
              <div className={s.caixaRotulo}>Total do dia</div>
              <div className={`${s.caixaValor} ${c.tabular}`}>{formatarReais(carga.dados.totalDiaCentavos)}</div>
            </div>
            <div className={s.caixaPedidos}>
              <div className={s.caixaRotulo}>Pedidos</div>
              <div className={`${s.caixaValor} ${c.tabular}`}>{carga.dados.quantidadePedidos}</div>
            </div>
          </div>
          {carga.dados.vendas.length === 0 && <div className={s.semVendas}>Nenhuma venda registrada ainda.</div>}
          {/* Lista única em cartão, como no design (1e): "#N · cliente" e "hora · N peças · pagamento". */}
          {carga.dados.vendas.length > 0 && (
            <div className={s.lista}>
              {carga.dados.vendas.map((v) => (
                <div key={v.numero} className={s.vendaDia} data-testid="venda-dia">
                  <div className={s.vendaTexto}>
                    <div className={s.vendaTitulo}>
                      #{v.numero}
                      {v.cliente ? ` · ${v.cliente}` : ''}
                    </div>
                    <div className={s.vendaDetalhe}>
                      {v.hora} · {textoPecas(v.pecas)} · {v.pagamento}
                    </div>
                  </div>
                  <div className={`${s.vendaTotal} ${c.tabular}`}>{formatarReais(v.totalCentavos)}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
