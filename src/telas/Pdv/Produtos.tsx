import type { Catalogo } from '../../api/cliente';
import type { Produto } from '../../dominio/catalogo';
import c from '../comum.module.css';
import { Cartao } from './Cartao';
import s from './Pdv.module.css';

/**
 * Nome do produto na lista, sem repetir o tipo do grupo: no ERP o nome costuma começar pelo tipo
 * ("Bermuda médio Suplex new zeland" no tipo "Bermuda médio"), e o design mostra só o restante
 * ("Suplex new zeland"). Nome que não começa pelo tipo aparece inteiro.
 */
export function nomeNaLista(produto: Produto, tipoNome: string): string {
  const prefixo = `${tipoNome} `;
  const nome = produto.nome;
  if (nome.toLocaleLowerCase('pt-BR').startsWith(prefixo.toLocaleLowerCase('pt-BR')) && nome.length > prefixo.length) return nome.slice(prefixo.length);
  return nome;
}

/**
 * Aba Produtos (MI-22): cartão "1 Peça" com os tipos do ERP e cartão "2 Tecido" com os produtos do tipo
 * escolhido. Tocar num tecido abre a tela de cor e tamanho. Preço e saldo aparecem só lá.
 */
export function Produtos(props: {
  catalogo: Catalogo;
  tipoId: number | null;
  aoEscolherTipo: (id: number) => void;
  aoEscolherProduto: (produto: Produto) => void;
}) {
  const { catalogo, tipoId } = props;
  // Os tipos vêm só com produto vendável (o back já filtra), então nenhum tipo abre lista vazia.
  const produtos = catalogo.produtos.filter((p) => p.tipoId === tipoId);
  const tipo = catalogo.tipos.find((t) => t.id === tipoId);

  // Catálogo do ERP vazio (nenhum produto ativo com SKU ativo): nada para vender ainda.
  if (!catalogo.produtos.length) return <div className={s.vazio}>Nenhum produto cadastrado no ERP.</div>;

  return (
    <>
      <Cartao numero={1} titulo="Peça" complemento={tipo?.nome}>
        {/* Grade de 3 colunas iguais que encolhem (AP-003): todos os tipos à vista, sem rolar de lado. */}
        <div className={`${s.cartaoCorpo} ${s.gradeTipos}`}>
          {catalogo.tipos.map((t) => (
            <button key={t.id} type="button" className={`${c.tile} ${s.tipo}`} aria-pressed={t.id === tipoId} onClick={() => props.aoEscolherTipo(t.id)}>
              {t.nome}
            </button>
          ))}
        </div>
      </Cartao>

      {tipo && (
        <Cartao numero={2} titulo="Tecido" complemento={produtos.length === 1 ? '1 opção' : `${produtos.length} opções`}>
          <div className={`${s.cartaoCorpo} ${s.grade2}`}>
            {produtos.map((p) => (
              <button key={p.id} type="button" className={`${c.tile} ${s.tecido}`} onClick={() => props.aoEscolherProduto(p)}>
                {nomeNaLista(p, tipo.nome)}
              </button>
            ))}
          </div>
        </Cartao>
      )}
    </>
  );
}
