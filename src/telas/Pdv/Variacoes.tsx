import { coresDoProduto, semEstoque, skuDe, skusDaCor, textoSaldo, type CorSku, type Produto } from '../../dominio/catalogo';
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

/** Painel de variações — cor e depois tamanho, com preço e estoque de cada SKU (handoff §2b, RF-003). */
export function Variacoes(props: { produto: Produto; escolha: Escolha; aoMudar: (escolha: Escolha) => void; aoVoltar: () => void }) {
  const { produto, escolha, aoMudar } = props;
  // Sem cor escolhida a lista fica vazia e o bloco TAMANHO nem é desenhado. Com cor, vêm todos os SKUs
  // dela, inclusive os zerados, na ordem da grade de tamanhos do ERP.
  // Cada tamanho é um botão com três linhas: sigla, preço e saldo (`textoSaldo`: "estoque N").
  // Os botões ficam na grade `.gradeTamanhos` (Pdv.module.css), de 3 colunas iguais que encolhem com a
  // tela: com os 6 tamanhos de costume são 3 em cada linha, e um preço de 3 dígitos cabe num celular
  // de 360px (cerca de 100px por coluna).
  // ATENÇÃO: num celular de 320px a coluna tem cerca de 88px e um preço de 4 dígitos (R$ 1.110,00)
  // passa da borda do próprio botão; a página não chega a rolar de lado. Só importa se a loja tiver
  // peça acima de R$ 999,99.
  const tamanhos = escolha.corId === null ? [] : skusDaCor(produto, escolha.corId);

  // Ao trocar de cor, o tamanho escolhido continua se existir com estoque na cor nova.
  const escolherCor = (corId: number) => {
    const mesmo = skuDe(produto, corId, escolha.tamanho);
    aoMudar({ corId, tamanho: mesmo && mesmo.saldo > 0 ? escolha.tamanho : null });
  };

  return (
    <div className={s.coluna22}>
      <div className={s.topoVariacao}>
        <button type="button" className={c.voltar} onClick={props.aoVoltar} aria-label="Voltar para os produtos">
          ←
        </button>
        <div>
          <h1 className={s.nomeVariacao}>{produto.nome}</h1>
          <div className={s.modeloPreco}>{produto.tecidoNome}</div>
        </div>
      </div>

      <section>
        <div className={`${c.rotulo} ${s.rotuloBloco}`}>COR</div>
        <div className={s.grade2}>
          {coresDoProduto(produto).map((cor) => {
            // A cor sem nenhum tamanho com saldo continua clicável, para consulta, mas avisa "sem estoque".
            const esgotada = semEstoque(skusDaCor(produto, cor.id));
            return (
              <button key={cor.id} type="button" className={s.cor} aria-pressed={escolha.corId === cor.id} onClick={() => escolherCor(cor.id)}>
                <Amostra cor={cor} />
                <span className={s.corTexto}>
                  <span className={s.corNome}>{cor.nome}</span>
                  {esgotada && <span className={s.semEstoque}>sem estoque</span>}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {escolha.corId !== null && (
        <section>
          <div className={`${c.rotulo} ${s.rotuloBloco}`}>TAMANHO</div>
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
                <span className={s.tamanhoPreco}>{formatarReais(sku.precoCentavos)}</span>
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
 * Linha de apoio acima de "Adicionar ao pedido": o que falta, o resumo com o preço ou, se o pedido
 * já tem todo o saldo desse SKU, o aviso de limite.
 */
export function resumoEscolha(produto: Produto, escolha: Escolha, jaNoPedido: number): string {
  const sku = skuDe(produto, escolha.corId, escolha.tamanho);
  if (sku) {
    // Mesmo aviso do carrinho (RF-004): o pedido já tem todo o saldo deste SKU.
    if (jaNoPedido >= sku.saldo) return `Só ${sku.saldo} em estoque — já no pedido`;
    return `${sku.cor.nome} · Tam ${sku.tamanho.sigla} — ${formatarReais(sku.precoCentavos)}`;
  }
  const falta = [escolha.corId === null && 'cor', !escolha.tamanho && 'tamanho'].filter(Boolean);
  return `Falta escolher: ${falta.join(', ')}`;
}
