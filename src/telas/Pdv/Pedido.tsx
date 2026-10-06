import { CreditCard, Minus, Money, Percent, Plus, QrCode, Trash, TShirt, User, Wallet, type Icon } from '@phosphor-icons/react';
import type { Dispatch, ReactNode } from 'react';
import type { Catalogo } from '../../api/cliente';
import { calcularPedido, podeAumentarDescontoTotal, type AcaoPedido, type Pedido as PedidoEstado } from '../../dominio/carrinho';
import { saldosPorSku } from '../../dominio/catalogo';
import { formatarReais, mascararCelular, textoPecas } from '../../dominio/formatos';
import c from '../comum.module.css';
import s from './Pdv.module.css';

/** Aviso do item no limite do estoque; acima dele (outra venda levou peças), pede para ajustar. */
function avisoLimite(qtd: number, saldo: number): string {
  if (saldo <= 0) return 'Sem estoque — exclua o item';
  return qtd > saldo ? `Só ${saldo} em estoque — diminua a quantidade` : `Só ${saldo} em estoque`;
}

/** Ícone de cada forma de pagamento do ERP; forma desconhecida usa a carteira genérica. */
const ICONE_PAGAMENTO: Record<string, Icon> = { dinheiro: Money, pix: QrCode, debito: CreditCard, credito: CreditCard };

/** Cartão numerado do Pedido (design 1d): número, título, complemento e ícone no cabeçalho. */
function Cartao(props: { numero: number; titulo: string; Icone: Icon; complemento?: string; children: ReactNode }) {
  const { Icone } = props;
  return (
    <section className={s.cartao} aria-label={props.titulo}>
      <div className={s.cartaoTopo}>
        <span className={s.cartaoNumero} aria-hidden="true">
          {props.numero}
        </span>
        <h2 className={s.cartaoTitulo}>{props.titulo}</h2>
        {props.complemento && <span className={s.cartaoComplemento}>{props.complemento}</span>}
        <Icone size={22} className={s.cartaoIcone} aria-hidden="true" />
      </div>
      {props.children}
    </section>
  );
}

/**
 * Aba Pedido (design 1d, MI-03 e MI-07): cartões 1 Cliente, 2 Peças, 3 Desconto no pedido e 4 Pagamento.
 * O desconto por item (%) saiu da tela; o pedido inteiro tem um desconto só, em R$ 5 por toque, que não
 * passa do valor bruto. O resumo de valores e o botão de fechar ficam na barra de baixo (Pdv.tsx).
 */
export function Pedido({
  pedido,
  catalogo,
  despachar,
  aoAlterarCliente,
}: {
  pedido: PedidoEstado;
  catalogo: Catalogo;
  despachar: Dispatch<AcaoPedido>;
  aoAlterarCliente: () => void;
}) {
  const { itens, totais } = calcularPedido(pedido);
  // Saldo atual de cada SKU: limita o "+" e avisa quando o pedido passou do estoque (catálogo recarregado).
  const saldos = saldosPorSku(catalogo);

  return (
    <div className={s.coluna14}>
      <Cartao numero={1} titulo="Cliente" Icone={User}>
        {/* Toque na linha inteira reabre a etapa Cliente com o que já está no pedido (MI-02). */}
        <button type="button" className={s.linhaCliente} onClick={aoAlterarCliente}>
          <span className={s.linhaClienteTexto}>
            <span className={s.linhaClienteNome}>{pedido.cliente || 'Cliente não identificado'}</span>
            <span className={s.linhaClienteCelular}>{pedido.telefone ? mascararCelular(pedido.telefone) : 'Sem celular'}</span>
          </span>
          <span className={s.alterar}>Alterar</span>
        </button>
      </Cartao>

      <Cartao numero={2} titulo="Peças" Icone={TShirt} complemento={textoPecas(totais.pecas)}>
        {itens.length === 0 && <div className={s.vazio}>Nenhuma peça ainda. Vá em Produtos para incluir.</div>}
        {itens.map((item) => {
          // SKU que sumiu do catálogo recarregado (inativado no ERP) conta como saldo 0: o item pede exclusão.
          const saldo = saldos.get(item.skuId) ?? 0;
          return (
            <div key={item.chave} className={s.item} data-testid="item-pedido">
              <div className={s.itemTopo}>
                <div className={s.itemTexto}>
                  <div className={s.itemNome}>{item.modeloNome}</div>
                  <div className={s.itemDetalhe}>
                    {item.tecidoNome} · Tam {item.tamanho} · {item.cor}
                  </div>
                </div>
                <div className={`${s.itemSubtotal} ${c.tabular}`}>{formatarReais(item.subtotalCentavos)}</div>
              </div>

              <div className={s.linha}>
                <button type="button" className={s.menos} aria-label="Diminuir quantidade" onClick={() => despachar({ tipo: 'menos', chave: item.chave })}>
                  <Minus size={20} aria-hidden="true" />
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
                  <Plus size={20} aria-hidden="true" />
                </button>
                <span className={s.unitario}>{formatarReais(item.precoUnitCentavos)} cada</span>
                <button type="button" className={s.tirar} onClick={() => despachar({ tipo: 'remover', chave: item.chave })}>
                  <Trash size={20} aria-hidden="true" />
                  <span className={s.tirarTexto}>Tirar</span>
                </button>
              </div>

              {item.qtd >= saldo && <div className={s.limite}>{avisoLimite(item.qtd, saldo)}</div>}
            </div>
          );
        })}
      </Cartao>

      <Cartao numero={3} titulo="Desconto no pedido" Icone={Percent}>
        <div className={`${s.cartaoCorpo} ${s.linha}`}>
          <button type="button" className={s.menos} aria-label="Diminuir desconto no total" onClick={() => despachar({ tipo: 'descontoTotalMenos' })}>
            <Minus size={20} aria-hidden="true" />
          </button>
          <div className={`${s.valorDescontoTotal} ${c.tabular}`}>
            {pedido.descontoTotalCentavos ? `− ${formatarReais(pedido.descontoTotalCentavos)}` : 'Sem desconto'}
          </div>
          {/* O "+" para no bruto (MI-03, ADR-005): o próximo passo de R$ 5 não pode passar do valor das peças. */}
          <button
            type="button"
            className={s.mais}
            aria-label="Aumentar desconto no total"
            disabled={!podeAumentarDescontoTotal(pedido)}
            onClick={() => despachar({ tipo: 'descontoTotalMais', limite: totais.brutoCentavos })}
          >
            <Plus size={20} aria-hidden="true" />
          </button>
        </div>
      </Cartao>

      <Cartao numero={4} titulo="Pagamento" Icone={Wallet}>
        <div className={`${s.cartaoCorpo} ${s.grade2}`}>
          {catalogo.pagamentos.map((p) => {
            const IconePag = ICONE_PAGAMENTO[p.id] ?? Wallet;
            return (
              <button
                key={p.id}
                type="button"
                className={s.pagamento}
                aria-pressed={pedido.pagamentoId === p.id}
                onClick={() => despachar({ tipo: 'pagamento', pagamentoId: p.id })}
              >
                <IconePag size={20} aria-hidden="true" />
                {p.nome}
              </button>
            );
          })}
        </div>
      </Cartao>
    </div>
  );
}

/**
 * Resumo acima do botão de fechar (design 1d): peças e valor bruto, e o desconto. O total fica dentro
 * do próprio botão. Valores só para exibição (mesma conta do servidor, ADR-F05).
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
