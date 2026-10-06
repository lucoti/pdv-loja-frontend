import { CheckCircle } from '@phosphor-icons/react';
import { coresDoProduto, precoMinimo, skuDe, skusDaCor, textoSaldo, type CorSku, type Produto } from '../../dominio/catalogo';
import { formatarReais } from '../../dominio/formatos';
import c from '../comum.module.css';
import s from './Pdv.module.css';

/** Cor e tamanho escolhidos; juntos identificam um SKU do produto. */
export interface Escolha {
  corId: number | null;
  tamanho: string | null;
}

/** Amostra da cor: bolinha com o hex; estampa sem hex mostra a miniatura da foto. */
// ATENÇÃO: cor sem hex e sem foto usa o token `--color-neutral-800` (src/estilos/tokens.css) direto no
// estilo em linha: é a única referência a token de tema fora dos arquivos CSS. Trocar o tema exige olhar aqui.
function Amostra({ cor }: { cor: CorSku }) {
  if (!cor.hex && cor.fotoUrl) return <img className={s.circulo} src={cor.fotoUrl} alt="" aria-hidden="true" />;
  return <span className={s.circulo} style={{ background: cor.hex ?? 'var(--color-neutral-800)' }} aria-hidden="true" />;
}

/**
 * Tela de cor e tamanho (design 1c, MI-06): cores numa lista de uma coluna, com a escolhida marcada, e
 * tamanhos numa grade de 4 colunas, cada um com a sigla e o saldo ("estoque N", INV-016). O preço saiu
 * dos botões (decisão do Lucas: seguir o design) e aparece na linha acima de "Adicionar ao pedido".
 */
export function Variacoes(props: { produto: Produto; escolha: Escolha; aoMudar: (escolha: Escolha) => void }) {
  const { produto, escolha, aoMudar } = props;
  // Sem cor escolhida a lista fica vazia e o bloco TAMANHO nem é desenhado. Com cor, vêm todos os SKUs
  // dela, inclusive os zerados, na ordem da grade de tamanhos do ERP.
  // Os botões ficam em `.gradeTamanhos` (Pdv.module.css): 4 colunas iguais com minmax(0, 1fr), que
  // encolhem com a tela em vez de passar da borda (AP-003). A 375px cabe "estoque 123" numa linha; a
  // 320px (coluna de ~62px úteis) "estoque 12" já quebra em duas linhas, e o botão cresce em altura.
  const tamanhos = escolha.corId === null ? [] : skusDaCor(produto, escolha.corId);

  // Ao trocar de cor, o tamanho escolhido continua se existir com estoque na cor nova.
  const escolherCor = (corId: number) => {
    const mesmo = skuDe(produto, corId, escolha.tamanho);
    aoMudar({ corId, tamanho: mesmo && mesmo.saldo > 0 ? escolha.tamanho : null });
  };

  return (
    <div className={s.coluna18}>
      <section className={s.bloco}>
        <div className={c.rotulo}>COR</div>
        <div className={s.listaCores}>
          {/* Cor sem nenhum tamanho com saldo continua clicável, para consulta; o saldo aparece nos tamanhos. */}
          {coresDoProduto(produto).map((cor) => (
            <button key={cor.id} type="button" className={s.cor} aria-pressed={escolha.corId === cor.id} onClick={() => escolherCor(cor.id)}>
              <Amostra cor={cor} />
              <span className={s.corNome}>{cor.nome}</span>
              {escolha.corId === cor.id && <CheckCircle size={22} className={s.marcada} aria-hidden="true" />}
            </button>
          ))}
        </div>
      </section>

      {escolha.corId !== null && (
        <section className={s.bloco}>
          <div className={c.rotulo}>TAMANHO</div>
          <div className={s.gradeTamanhos}>
            {tamanhos.map((sku) => (
              // Sem saldo não vende (RN-24 do ERP): o tamanho aparece, mas desabilitado.
              <button
                key={sku.id}
                type="button"
                className={s.tamanho}
                aria-pressed={escolha.tamanho === sku.tamanho.sigla}
                disabled={sku.saldo <= 0}
                onClick={() => aoMudar({ ...escolha, tamanho: sku.tamanho.sigla })}
              >
                <span className={s.tamanhoSigla}>{sku.tamanho.sigla}</span>
                <span className={s.tamanhoSaldo}>{textoSaldo(sku.saldo)}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * Texto à esquerda da linha acima de "Adicionar ao pedido": o que falta, a cor e o tamanho escolhidos
 * ou, se o pedido já tem todo o saldo desse SKU, o aviso de limite.
 */
export function resumoEscolha(produto: Produto, escolha: Escolha, jaNoPedido: number): string {
  const sku = skuDe(produto, escolha.corId, escolha.tamanho);
  if (sku) {
    // Mesmo aviso do carrinho (RF-004): o pedido já tem todo o saldo deste SKU.
    if (jaNoPedido >= sku.saldo) return `Só ${sku.saldo} em estoque — já no pedido`;
    return `${sku.cor.nome} · Tam ${sku.tamanho.sigla}`;
  }
  const falta = [escolha.corId === null && 'cor', !escolha.tamanho && 'tamanho'].filter(Boolean);
  return `Falta escolher: ${falta.join(' e ')}`;
}

/**
 * Preço à direita da mesma linha: o do SKU escolhido. Antes da escolha, o preço do produto; se os SKUs
 * tiverem preços diferentes, "a partir de" o menor, para não prometer um preço que o tamanho não tem.
 */
export function precoDaEscolha(produto: Produto, escolha: Escolha): string {
  const sku = skuDe(produto, escolha.corId, escolha.tamanho);
  if (sku) return formatarReais(sku.precoCentavos);
  const minimo = precoMinimo(produto);
  const unico = produto.skus.every((k) => k.precoCentavos === minimo);
  return unico ? formatarReais(minimo) : `a partir de ${formatarReais(minimo)}`;
}
