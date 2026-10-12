import { Minus, Plus, Trash, User } from '@phosphor-icons/react';
import type { Dispatch } from 'react';
import type { Catalogo } from '../../api/cliente';
import { calcularPedido, podeAumentarDescontoTotal, podeDiminuirDescontoTotal, type AcaoPedido, type Pedido as PedidoEstado } from '../../dominio/carrinho';
import { saldosPorSku } from '../../dominio/catalogo';
import { formatarReais, mascararCelular, textoPecas } from '../../dominio/formatos';
import c from '../comum.module.css';
import s from './Pdv.module.css';

/**
 * Aviso da linha que ficou acima do estoque (INV-014 alterado): outra venda levou peças e o catálogo foi
 * recarregado. Sem −/+ na linha, o caminho é tirar a peça e, se ainda houver saldo, adicionar de novo.
 */
function avisoSaldo(saldo: number): string {
  return saldo <= 0 ? 'Sem estoque — tire a peça' : `Só ${saldo} em estoque — tire a peça e adicione de novo`;
}

/**
 * Aba Pedido (MI-24): linha do cliente, PEÇAS (só com a lixeira; mais unidades = adicionar de novo em
 * Produtos), Desconto no pedido (R$ 5 por toque, entre zero e o bruto), PAGAMENTO e "Cancelar pedido".
 * Pedido vazio mostra só a mensagem. O resumo e o botão de fechar ficam na barra de baixo (Pdv.tsx).
 */
export function Pedido({
  pedido,
  catalogo,
  despachar,
  aoAlterarCliente,
  aoCancelar,
  cancelarDesligado,
}: {
  pedido: PedidoEstado;
  catalogo: Catalogo;
  despachar: Dispatch<AcaoPedido>;
  aoAlterarCliente: () => void;
  aoCancelar: () => void;
  /** Durante o envio da venda (INV-013). */
  cancelarDesligado: boolean;
}) {
  const { itens, totais } = calcularPedido(pedido);
  // Saldo atual de cada SKU: avisa quando o pedido passou do estoque (catálogo recarregado).
  const saldos = saldosPorSku(catalogo);

  // ATENÇÃO: com o pedido vazio somem também a linha do cliente, o pagamento e o "Cancelar pedido". Um
  // cliente ou pagamento já gravados continuam no estado (só o desconto cai a zero pelo teto do bruto) e
  // reaparecem quando uma peça entra de novo; para zerá-los é preciso "Cancelar pedido" com peças.
  if (itens.length === 0) return <div className={s.cartaoVazio}>Nenhuma peça no pedido ainda. Escolha em Produtos.</div>;

  // O celular fica guardado só com dígitos e ganha a máscara apenas para exibir.
  const cliente = [pedido.cliente, pedido.telefone && mascararCelular(pedido.telefone)].filter(Boolean).join(' · ');

  return (
    <>
      {/* Toque na linha inteira abre o formulário "Cliente do pedido" com o que já está no pedido. */}
      <button type="button" className={s.linhaCliente} onClick={aoAlterarCliente}>
        <User size={20} className={s.linhaClienteIcone} aria-hidden="true" />
        <span className={s.linhaClienteTexto}>{cliente || 'Cliente não identificado'}</span>
        <span className={s.alterar}>Alterar</span>
      </button>

      <section className={s.secao} aria-label="Peças">
        <div className={s.secaoTopo}>
          <h2 className={c.rotulo}>PEÇAS</h2>
          <span className={s.secaoComplemento}>{textoPecas(totais.pecas)}</span>
        </div>
        <div className={s.lista}>
          {itens.map((item) => {
            // SKU que sumiu do catálogo recarregado (inativado no ERP) conta como saldo 0.
            const saldo = saldos.get(item.skuId) ?? 0;
            const multiplo = item.qtd > 1 ? ` · ${item.qtd} × ${formatarReais(item.precoUnitCentavos)}` : '';
            return (
              <div key={item.chave} className={s.item} data-testid="item-pedido">
                <div className={s.itemLinha}>
                  <div className={s.itemTexto}>
                    <div className={s.itemNome}>{item.modeloNome}</div>
                    <div className={s.itemDetalhe}>
                      {item.tecidoNome} · Tam {item.tamanho} · {item.cor}
                      {multiplo}
                    </div>
                  </div>
                  <div className={`${s.itemSubtotal} ${c.tabular}`}>{formatarReais(item.subtotalCentavos)}</div>
                  <button type="button" className={s.tirar} aria-label="Tirar peça" onClick={() => despachar({ tipo: 'remover', chave: item.chave })}>
                    <Trash size={20} aria-hidden="true" />
                  </button>
                </div>
                {item.qtd > saldo && <div className={s.limite}>{avisoSaldo(saldo)}</div>}
              </div>
            );
          })}
        </div>
      </section>

      {/* "−" desligado em zero e "+" desligado quando mais R$ 5 passariam do bruto (INV-031). */}
      <section className={s.linhaDesconto} aria-label="Desconto no pedido">
        <h2 className={s.linhaDescontoTitulo}>Desconto</h2>
        <button
          type="button"
          className={`${c.tile} ${s.passo}`}
          aria-label="Diminuir desconto"
          disabled={!podeDiminuirDescontoTotal(pedido)}
          onClick={() => despachar({ tipo: 'descontoTotalMenos' })}
        >
          <Minus size={20} aria-hidden="true" />
        </button>
        <div className={`${s.valorDesconto} ${c.tabular}`}>
          {pedido.descontoTotalCentavos ? `− ${formatarReais(pedido.descontoTotalCentavos)}` : formatarReais(0)}
        </div>
        <button
          type="button"
          className={`${c.tile} ${s.passo}`}
          aria-label="Aumentar desconto"
          disabled={!podeAumentarDescontoTotal(pedido)}
          onClick={() => despachar({ tipo: 'descontoTotalMais', limite: totais.brutoCentavos })}
        >
          <Plus size={20} aria-hidden="true" />
        </button>
      </section>

      <section className={s.secao} aria-label="Pagamento">
        <h2 className={`${c.rotulo} ${s.secaoTitulo}`}>PAGAMENTO</h2>
        <div className={s.grade2}>
          {catalogo.pagamentos.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`${c.tile} ${s.pagamento}`}
              aria-pressed={pedido.pagamentoId === p.id}
              onClick={() => despachar({ tipo: 'pagamento', pagamentoId: p.id })}
            >
              {p.nome}
            </button>
          ))}
        </div>
      </section>

      {/* Zera tudo, inclusive o cliente, troca a chave e volta para Produtos (MI-25). Desligado durante o
          envio: zerar a tela não cancelaria a requisição. A trava em ref fica em quem passa `aoCancelar`. */}
      <button type="button" className={s.cancelar} disabled={cancelarDesligado} onClick={aoCancelar}>
        Cancelar pedido
      </button>
    </>
  );
}

/**
 * Resumo acima do botão de fechar: peças e valor bruto, e o desconto. O total fica dentro do próprio
 * botão. Valores só para exibição (mesma conta do servidor, ADR-F05). Só aparece com peças no pedido.
 */
export function ResumoPedido({ pedido }: { pedido: PedidoEstado }) {
  const { totais } = calcularPedido(pedido);
  return (
    <div className={`${s.resumoPedido} ${c.tabular}`} data-testid="totais">
      <div className={s.totalLinha}>
        <span>{textoPecas(totais.pecas)}</span>
        <span>{formatarReais(totais.brutoCentavos)}</span>
      </div>
      <div className={s.totalLinha}>
        <span>Desconto</span>
        <span>{totais.descontosCentavos ? `− ${formatarReais(totais.descontosCentavos)}` : formatarReais(0)}</span>
      </div>
    </div>
  );
}
