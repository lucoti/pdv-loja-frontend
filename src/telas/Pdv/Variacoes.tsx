import type { Catalogo } from '../../api/cliente';
import { formatarReais } from '../../dominio/formatos';
import { precoVariacao } from '../../dominio/precos';
import c from '../comum.module.css';
import s from './Pdv.module.css';

type Modelo = Catalogo['modelos'][number];

export interface Escolha {
  tecidoId: string | null;
  tamanho: string | null;
  cor: string | null;
}

/** Painel de variações — tecido, tamanho e cor (handoff §2b, RF-F05). */
export function Variacoes(props: {
  catalogo: Catalogo;
  modelo: Modelo;
  escolha: Escolha;
  aoMudar: (escolha: Escolha) => void;
  aoVoltar: () => void;
}) {
  const { catalogo, modelo, escolha, aoMudar } = props;

  return (
    <div className={s.coluna22}>
      <div className={s.topoVariacao}>
        <button type="button" className={c.voltar} onClick={props.aoVoltar} aria-label="Voltar para os modelos">
          ←
        </button>
        <h1 className={s.nomeVariacao}>{modelo.nome}</h1>
      </div>

      <section>
        <div className={`${c.rotulo} ${s.rotuloBloco}`}>TECIDO</div>
        <div className={s.grade2}>
          {catalogo.tecidos.map((t) => (
            <button
              key={t.id}
              type="button"
              className={s.tecido}
              aria-pressed={escolha.tecidoId === t.id}
              onClick={() => aoMudar({ ...escolha, tecidoId: t.id })}
            >
              <span className={s.tecidoNome}>{t.nome}</span>
              <span className={s.tecidoPreco}>{formatarReais(precoVariacao(modelo.precoBaseCentavos, t.acrescimoCentavos))}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className={`${c.rotulo} ${s.rotuloBloco}`}>TAMANHO</div>
        <div className={s.grade4}>
          {catalogo.tamanhos.map((t) => (
            <button
              key={t}
              type="button"
              className={s.tamanho}
              aria-pressed={escolha.tamanho === t}
              onClick={() => aoMudar({ ...escolha, tamanho: t })}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className={`${c.rotulo} ${s.rotuloBloco}`}>COR</div>
        <div className={s.grade2}>
          {catalogo.cores.map((cor) => (
            <button
              key={cor.nome}
              type="button"
              className={s.cor}
              aria-pressed={escolha.cor === cor.nome}
              onClick={() => aoMudar({ ...escolha, cor: cor.nome })}
            >
              <span className={s.circulo} style={{ background: cor.hex }} aria-hidden="true" />
              <span className={s.corNome}>{cor.nome}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

/** Linha de apoio acima de "Adicionar ao pedido": o que falta, ou o resumo com o preço. */
export function resumoEscolha(catalogo: Catalogo, modelo: Modelo, escolha: Escolha): string {
  const tecido = catalogo.tecidos.find((t) => t.id === escolha.tecidoId);
  if (tecido && escolha.tamanho && escolha.cor) {
    const preco = precoVariacao(modelo.precoBaseCentavos, tecido.acrescimoCentavos);
    return `${tecido.nome} · Tam ${escolha.tamanho} · ${escolha.cor} — ${formatarReais(preco)}`;
  }
  const falta = [!tecido && 'tecido', !escolha.tamanho && 'tamanho', !escolha.cor && 'cor'].filter(Boolean);
  return `Falta escolher: ${falta.join(', ')}`;
}
