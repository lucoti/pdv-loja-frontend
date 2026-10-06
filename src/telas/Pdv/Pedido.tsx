import type { Dispatch } from 'react';
import type { Catalogo } from '../../api/cliente';
import { calcularPedido, type AcaoPedido, type Pedido as PedidoEstado } from '../../dominio/carrinho';
import { saldosPorSku } from '../../dominio/catalogo';
import { formatarReais, textoPecas } from '../../dominio/formatos';
import { DESCONTOS_ITEM } from '../../dominio/precos';
import c from '../comum.module.css';
import s from './Pdv.module.css';

/** Aviso do item no limite do estoque; acima dele (outra venda levou peças), pede para ajustar. */
function avisoLimite(qtd: number, saldo: number): string {
  if (saldo <= 0) return 'Sem estoque — exclua o item';
  return qtd > saldo ? `Só ${saldo} em estoque — diminua a quantidade` : `Só ${saldo} em estoque`;
}

/** Aba Pedido — carrinho e revisão (handoff §2c, RF-F06). */
export function Pedido({ pedido, catalogo, despachar }: { pedido: PedidoEstado; catalogo: Catalogo; despachar: Dispatch<AcaoPedido> }) {
  const { itens, totais } = calcularPedido(pedido);
  // Saldo atual de cada SKU: limita o "+" e avisa quando o pedido passou do estoque (catálogo recarregado).
  const saldos = saldosPorSku(catalogo);

  return (
    <div className={s.coluna18}>
      <div className={`${s.cartao} ${s.cartaoCliente}`}>
        <div className={c.rotulo}>CLIENTE</div>
        <input
          className={s.campo}
          value={pedido.cliente}
          onChange={(e) => despachar({ tipo: 'cliente', valor: e.target.value })}
          placeholder="Nome do cliente"
          aria-label="Nome do cliente"
          maxLength={120}
          autoComplete="off"
        />
        {/* O CPF é validado só pelo servidor; a mensagem de erro dele aparece acima do botão de fechar. */}
        {/* ATENÇÃO: o campo não tem máscara nem conferência no front (aceita até 20 caracteres de
            qualquer tipo). O rótulo "CPF (opcional)" é o seletor de vários testes de tela
            (pdv.test.tsx), inclusive o de RNF-F08 (CPF só em memória); tirar o campo exige inventário
            desses testes (AP-004). Nome e CPF ficam no pedido, não no componente: "Cancelar pedido" e
            "Nova venda" os apagam junto com os itens. */}
        <input
          className={s.campo}
          value={pedido.cpf}
          onChange={(e) => despachar({ tipo: 'cpf', valor: e.target.value })}
          placeholder="CPF (opcional)"
          aria-label="CPF (opcional)"
          inputMode="numeric"
          maxLength={20}
          autoComplete="off"
        />
      </div>

      {itens.length === 0 && (
        <div className={s.vazio}>
          Nenhum item ainda.
          <br />
          Volte em Produtos para incluir peças.
        </div>
      )}

      {itens.map((item) => {
        // SKU que sumiu do catálogo recarregado (inativado no ERP) conta como saldo 0: o item pede exclusão.
        const saldo = saldos.get(item.skuId) ?? 0;
        return (
        <div key={item.chave} className={`${s.cartao} ${s.cartaoItem}`} data-testid="item-pedido">
          <div className={s.itemTopo}>
            <div className={s.itemTexto}>
              <div className={s.itemNome}>{item.modeloNome}</div>
              <div className={s.itemDetalhe}>
                {item.tecidoNome} · Tam {item.tamanho} · {item.cor} · {formatarReais(item.precoUnitCentavos)}
              </div>
            </div>
            <button type="button" className={s.excluir} onClick={() => despachar({ tipo: 'remover', chave: item.chave })}>
              Excluir
            </button>
          </div>

          <div className={s.linha}>
            <button type="button" className={s.menos} aria-label="Diminuir quantidade" onClick={() => despachar({ tipo: 'menos', chave: item.chave })}>
              −
            </button>
            <div className={`${s.qtd} ${c.tabular}`} aria-label="Quantidade">
              {item.qtd}
            </div>
            <button
              type="button"
              className={s.mais}
              aria-label="Aumentar quantidade"
              disabled={item.qtd >= saldo}
              onClick={() => despachar({ tipo: 'mais', chave: item.chave, limite: saldo })}
            >
              +
            </button>
            <div className={s.subtotal}>
              <div className={`${s.subtotalValor} ${c.tabular}`}>{formatarReais(item.subtotalCentavos)}</div>
              <div className={s.descAplicado}>{item.descPercent ? `−${item.descPercent}% aplicado` : ''}</div>
            </div>
          </div>

          {item.qtd >= saldo && <div className={s.limite}>{avisoLimite(item.qtd, saldo)}</div>}

          {/* Desconto por peça: um botão por percentual permitido (RN-004), o marcado com aria-pressed.
              A lista vem de DESCONTOS_ITEM, que precisa ser igual à do back (valor fora dela volta 400). */}
          <div className={s.linhaDesconto}>
            <div className={`${c.rotulo} ${s.rotuloDesconto}`}>DESCONTO</div>
            <div className={s.descontos}>
              {DESCONTOS_ITEM.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={s.desconto}
                  aria-pressed={item.descPercent === d}
                  onClick={() => despachar({ tipo: 'desconto', chave: item.chave, descPercent: d })}
                >
                  {d === 0 ? 'sem' : `${d}%`}
                </button>
              ))}
            </div>
          </div>
        </div>
        );
      })}

      {/* Desconto no pedido inteiro, em passos de R$ 5 (PASSO_DESCONTO_TOTAL_CENTAVOS), somado aos
          descontos das peças. ATENÇÃO: o "+" não tem teto — nem aqui nem no reducer. Passando do
          valor das peças, o total exibido para em R$ 0,00 (calcularTotais) e o servidor faz o mesmo. */}
      <div className={`${s.cartao} ${s.cartaoDesconto}`}>
        <div className={c.rotulo}>DESCONTO NO TOTAL</div>
        <div className={s.linha}>
          <button type="button" className={s.menos} aria-label="Diminuir desconto no total" onClick={() => despachar({ tipo: 'descontoTotalMenos' })}>
            −
          </button>
          <div className={`${s.valorDescontoTotal} ${c.tabular}`}>
            {pedido.descontoTotalCentavos ? `− ${formatarReais(pedido.descontoTotalCentavos)}` : 'sem desconto'}
          </div>
          <button type="button" className={s.mais} aria-label="Aumentar desconto no total" onClick={() => despachar({ tipo: 'descontoTotalMais' })}>
            +
          </button>
        </div>
      </div>

      <div className={`${s.cartao} ${s.cartaoPagamento}`}>
        <div className={c.rotulo}>FORMA DE PAGAMENTO</div>
        <div className={s.grade2}>
          {catalogo.pagamentos.map((p) => (
            <button
              key={p.id}
              type="button"
              className={s.pagamento}
              aria-pressed={pedido.pagamentoId === p.id}
              onClick={() => despachar({ tipo: 'pagamento', pagamentoId: p.id })}
            >
              {p.nome}
            </button>
          ))}
        </div>
      </div>

      {/* Totais só para exibição (mesma conta do servidor, ADR-F05); o valor oficial é o devolvido na venda. */}
      <div className={s.totais} data-testid="totais">
        <div className={s.totalLinha}>
          <span>{textoPecas(totais.pecas)}</span>
          <span className={c.tabular}>{formatarReais(totais.brutoCentavos)}</span>
        </div>
        <div className={`${s.totalLinha} ${s.totalDescontos}`}>
          <span>Descontos</span>
          <span className={c.tabular}>{totais.descontosCentavos ? `− ${formatarReais(totais.descontosCentavos)}` : formatarReais(0)}</span>
        </div>
        <div className={s.totalFinal}>
          <span className={s.totalRotulo}>Total</span>
          <span className={`${s.totalValor} ${c.tabular}`}>{formatarReais(totais.totalCentavos)}</span>
        </div>
      </div>

    </div>
  );
}
