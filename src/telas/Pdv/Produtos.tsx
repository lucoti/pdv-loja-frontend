import { CaretRight } from '@phosphor-icons/react';
import type { Catalogo } from '../../api/cliente';
import type { Produto } from '../../dominio/catalogo';
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
 * Aba Produtos — grade com os tipos do ERP e a lista de produtos do tipo escolhido (design 1b, MI-05).
 * Cada linha mostra o produto e, se ele já está no pedido, o selo "N no pedido". Preço e "sem estoque"
 * saíram da lista por decisão do Lucas (seguir o design): o vendedor vê preço e saldo em cor/tamanho.
 */
export function Produtos(props: {
  catalogo: Catalogo;
  tipoId: number | null;
  aoEscolherTipo: (id: number) => void;
  aoEscolherProduto: (produto: Produto) => void;
  /** Quantas peças do produto (somando todos os SKUs) já estão no pedido. */
  noPedido: (produto: Produto) => number;
}) {
  const { catalogo, tipoId } = props;
  // Os tipos vêm só com produto vendável (o back já filtra), então nenhum tipo abre lista vazia.
  const produtos = catalogo.produtos.filter((p) => p.tipoId === tipoId);
  const tipo = catalogo.tipos.find((t) => t.id === tipoId);

  // Catálogo do ERP vazio (nenhum produto ativo com SKU ativo): nada para vender ainda.
  if (!catalogo.produtos.length) return <div className={s.vazio}>Nenhum produto cadastrado no ERP.</div>;

  return (
    <div className={s.coluna14}>
      {/* Grade de 3 colunas iguais que encolhem (AP-003): todos os tipos à vista, sem rolar de lado. */}
      <div className={s.gradeTipos}>
        {catalogo.tipos.map((t) => (
          <button key={t.id} type="button" className={s.tipo} aria-pressed={t.id === tipoId} onClick={() => props.aoEscolherTipo(t.id)}>
            {t.nome}
          </button>
        ))}
      </div>

      {tipo && (
        <section className={s.grupo} aria-label={tipo.nome}>
          <div className={s.grupoTopo}>
            <span className={s.grupoNome}>{tipo.nome}</span>
            <span className={s.grupoQtd}>{produtos.length === 1 ? '1 modelo' : `${produtos.length} modelos`}</span>
          </div>
          <div className={s.lista}>
            {produtos.map((p) => {
              const qtd = props.noPedido(p);
              return (
                <button key={p.id} type="button" className={s.linhaProduto} onClick={() => props.aoEscolherProduto(p)}>
                  <span className={s.linhaProdutoNome}>{nomeNaLista(p, tipo.nome)}</span>
                  {qtd > 0 && <span className={s.selo}>{qtd} no pedido</span>}
                  <CaretRight size={20} className={s.seta} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
