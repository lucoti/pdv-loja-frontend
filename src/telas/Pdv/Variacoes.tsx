import { ArrowLeft, CheckCircle } from '@phosphor-icons/react';
import { coresDoProduto, skuDe, tamanhosDoProduto, textoSaldo, type CorSku, type Produto } from '../../dominio/catalogo';
import c from '../comum.module.css';
import { Cartao } from './Cartao';
import s from './Pdv.module.css';

/** Cor e tamanho escolhidos; juntos identificam um SKU do produto. */
export interface Escolha {
  corId: number | null;
  tamanho: string | null;
}

/** Amostra da cor (60×52): retângulo com o hex; estampa sem hex mostra a miniatura da foto. */
// ATENÇÃO: cor sem hex e sem foto usa o token `--color-neutral-800` (src/estilos/tokens.css) direto no
// estilo em linha: é a única referência a token de tema fora dos arquivos CSS. Trocar o tema exige olhar aqui.
function Amostra({ cor }: { cor: CorSku }) {
  if (!cor.hex && cor.fotoUrl) return <img className={s.amostra} src={cor.fotoUrl} alt="" aria-hidden="true" />;
  return <span className={s.amostra} style={{ background: cor.hex ?? 'var(--color-neutral-800)' }} aria-hidden="true" />;
}

/**
 * Tela de cor e tamanho (MI-23): voltar e título (peça e tecido) no alto, cartão "3 Cor" em 2 colunas e,
 * depois de escolher a cor, cartão "4 Tamanho" em 4 colunas, cada um com a sigla e o saldo ("estoque N",
 * INV-016); o tamanho da grade sem estoque na cor aparece desligado, com "sem estoque". O botão "Adicionar ao pedido" fica na barra de baixo (Pdv.tsx) e só aparece com cor e tamanho.
 */
export function Variacoes(props: {
  produto: Produto;
  /** Nome da peça (tipo do ERP) e do tecido, para o título. */
  titulo: string;
  subtitulo: string;
  escolha: Escolha;
  aoMudar: (escolha: Escolha) => void;
  aoVoltar: () => void;
}) {
  const { produto, escolha, aoMudar } = props;
  // Sem cor escolhida a lista fica vazia e o cartão Tamanho nem é desenhado. Com cor, vem a grade de
  // tamanhos do produto, cada um com o SKU da cor — ou sem SKU, se o GET /catalogo não o mandou (sem saldo).
  // Os botões ficam em `.gradeTamanhos` (Pdv.module.css): 4 colunas iguais com minmax(0, 1fr), que
  // encolhem com a tela em vez de passar da borda (AP-003). A 320px "estoque 12" quebra em duas linhas.
  const tamanhos = escolha.corId === null ? [] : tamanhosDoProduto(produto).map((tamanho) => ({ tamanho, sku: skuDe(produto, escolha.corId, tamanho.sigla) }));

  // Ao trocar de cor, o tamanho escolhido continua se existir na cor nova (INV-016).
  const escolherCor = (corId: number) => {
    aoMudar({ corId, tamanho: skuDe(produto, corId, escolha.tamanho) ? escolha.tamanho : null });
  };

  return (
    <>
      <div className={s.titulo}>
        <button type="button" className={s.voltar} onClick={props.aoVoltar} aria-label="Voltar para peça e tecido">
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
        <div className={s.tituloTexto}>
          <h1 className={s.tituloPeca}>{props.titulo}</h1>
          <div className={s.tituloApoio}>{props.subtitulo}</div>
        </div>
      </div>

      <Cartao numero={3} titulo="Cor">
        <div className={`${s.cartaoCorpo} ${s.grade2}`}>
          {coresDoProduto(produto).map((cor) => (
            <button key={cor.id} type="button" className={`${c.tile} ${s.cor}`} aria-pressed={escolha.corId === cor.id} onClick={() => escolherCor(cor.id)}>
              {/* A marca da cor escolhida fica sobre a amostra, e não ao lado do nome como no design: na
                  coluna de ~164px (390px de tela) o ícone ao lado deixava ~44px para o nome e partia
                  "Marinho" no meio da palavra. */}
              <span className={s.amostraCaixa}>
                <Amostra cor={cor} />
                {escolha.corId === cor.id && <CheckCircle size={26} weight="fill" className={s.marcada} aria-hidden="true" />}
              </span>
              <span className={s.corNome}>{cor.nome}</span>
            </button>
          ))}
        </div>
      </Cartao>

      {escolha.corId !== null && (
        <Cartao numero={4} titulo="Tamanho">
          <div className={`${s.cartaoCorpo} ${s.gradeTamanhos}`}>
            {tamanhos.map(({ tamanho, sku }) => (
              // Sem saldo não vende (RN-24 do ERP): o tamanho aparece, mas desligado (tracejado).
              <button
                key={tamanho.sigla}
                type="button"
                className={`${c.tile} ${s.tamanho}`}
                aria-pressed={escolha.tamanho === tamanho.sigla}
                disabled={!sku || sku.saldo <= 0}
                onClick={() => aoMudar({ ...escolha, tamanho: tamanho.sigla })}
              >
                <span className={s.tamanhoSigla}>{tamanho.sigla}</span>
                <span className={s.tamanhoSaldo}>{textoSaldo(sku?.saldo)}</span>
              </button>
            ))}
          </div>
        </Cartao>
      )}
    </>
  );
}
