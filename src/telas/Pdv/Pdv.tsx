import { useCallback, useEffect, useReducer, useState } from 'react';
import { api, ErroApi, MENSAGEM_GENERICA, type Catalogo, type Venda } from '../../api/cliente';
import { calcularPedido, pedidoVazio, podeFechar, qtdNoPedido, reduzirPedido, type AcaoPedido, type Pedido as PedidoEstado } from '../../dominio/carrinho';
import { skuDe } from '../../dominio/catalogo';
import { formatarReais } from '../../dominio/formatos';
import { CaixaErro, Carregando, FalhaAoCarregar } from '../Avisos';
import c from '../comum.module.css';
import { Folha } from '../Folha';
import { useCarregar } from '../useCarregar';
import { BarraInferior, type Aba } from './BarraInferior';
import { Cabecalho, nomeEtapa } from './Cabecalho';
import { Dia } from './Dia';
import { ModalSucesso } from './ModalSucesso';
import { Pedido } from './Pedido';
import { Produtos } from './Produtos';
import s from './Pdv.module.css';
import { resumoEscolha, Variacoes, type Escolha } from './Variacoes';

const SEM_ESCOLHA: Escolha = { corId: null, tamanho: null };

/** Tela de venda (handoff §2). Carrega o catálogo e só então mostra Produtos e Pedido. */
export function Pdv() {
  const [aba, setAba] = useState<Aba>('produtos');
  const [carga, tentarDeNovo, atualizarCatalogo] = useCarregar(api.catalogo);
  // O pedido fica aqui, acima de <Venda>, para sobreviver à troca de abas e ao recarregar do catálogo.
  // ATENÇÃO: se a sessão cair (401), o App troca para o Login e este componente é desmontado — o
  // pedido em andamento se perde, pois nada é salvo no navegador (RNF-F08, decisão de escopo).
  // ATENÇÃO: crypto.randomUUID só existe em contexto seguro (HTTPS ou localhost). Abrir o modo
  // dev pelo IP da rede local (http://192.168...) quebra a tela de venda.
  const [pedido, despacharPedido] = useReducer(reduzirPedido, undefined, () => pedidoVazio(crypto.randomUUID()));
  const pecas = calcularPedido(pedido).totais.pecas;

  // O topo mostra a etapa e é desenhado por quem a conhece: <Venda> (que sabe se há um produto aberto)
  // ou, com o catálogo carregando ou em falha, o ramo abaixo, só pela aba. Nos dois casos ele é o
  // primeiro filho da folha, para aparecer nas três abas.
  // ATENÇÃO: os dois ramos montam cada um o seu topo e a sua barra inferior. Quando o catálogo termina
  // de carregar, os do ramo de baixo saem da página e os de <Venda> entram no lugar: na tela não há
  // diferença visível, mas um toque numa aba nesse exato instante pode se perder (visto só em teste),
  // e um teste que guarde o elemento do topo antes da carga fica com um elemento que já saiu da página.
  return (
    <Folha>
      {carga.situacao === 'ok' ? (
        <Venda
          catalogo={carga.dados}
          atualizarCatalogo={atualizarCatalogo}
          aba={aba}
          setAba={setAba}
          pedido={pedido}
          despacharPedido={despacharPedido}
          pecas={pecas}
        />
      ) : (
        <>
          <Cabecalho etapa={nomeEtapa(aba)} />
          <main className={s.conteudo}>
            {/* A aba Dia não depende do catálogo: funciona mesmo com ele carregando ou em falha. */}
            {aba === 'dia' ? (
              <Dia />
            ) : carga.situacao === 'carregando' ? (
              <Carregando />
            ) : (
              <FalhaAoCarregar mensagem={carga.mensagem} aoTentar={tentarDeNovo} />
            )}
          </main>
          <BarraInferior aba={aba} pecas={pecas} aoTrocarAba={setAba} />
        </>
      )}
    </Folha>
  );
}

/** Conteúdo do PDV com o catálogo já carregado: navegação entre abas, escolha da variação e fechamento. */
function Venda(props: {
  catalogo: Catalogo;
  /** Recarrega o catálogo sem sair da tela (saldos novos depois de um 409). */
  atualizarCatalogo: () => void;
  aba: Aba;
  setAba: (aba: Aba) => void;
  pedido: PedidoEstado;
  despacharPedido: (acao: AcaoPedido) => void;
  pecas: number;
}) {
  const { catalogo, aba, setAba, pedido, pecas } = props;
  // Primeiro tipo do ERP já selecionado (RF-002). Se uma recarga do catálogo tirar o tipo escolhido,
  // a tela volta para o primeiro tipo em vez de mostrar uma lista vazia sem chip marcado.
  const [tipoEscolhido, setTipoId] = useState<number | null>(catalogo.tipos[0]?.id ?? null);
  const tipoId = catalogo.tipos.some((t) => t.id === tipoEscolhido) ? tipoEscolhido : (catalogo.tipos[0]?.id ?? null);
  const [produtoId, setProdutoId] = useState<number | null>(null);
  const [escolha, setEscolha] = useState<Escolha>(SEM_ESCOLHA);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState<Venda | null>(null);

  // A cada catálogo novo, o pedido aberto passa a usar o preço atual de cada SKU. Vai direto ao reducer
  // (sem o "despachar" abaixo) para não apagar a mensagem de erro de um 409 que motivou a recarga.
  const { despacharPedido } = props;
  useEffect(() => {
    despacharPedido({ tipo: 'precos', precos: new Map(catalogo.produtos.flatMap((p) => p.skus.map((k) => [k.id, k.precoCentavos] as const))) });
  }, [catalogo, despacharPedido]);

  // Procurado pelo id a cada render: depois de recarregar o catálogo, a tela usa os saldos novos.
  const produto = catalogo.produtos.find((p) => p.id === produtoId);

  // Qualquer mudança no pedido apaga a mensagem de erro da última tentativa (RF-F10).
  const despachar = useCallback(
    (acao: AcaoPedido) => {
      setErro('');
      props.despacharPedido(acao);
    },
    [props.despacharPedido],
  );

  const escolherProduto = (id: number) => {
    setProdutoId(id);
    setEscolha(SEM_ESCOLHA);
  };

  const voltarParaProdutos = () => {
    setProdutoId(null);
    setEscolha(SEM_ESCOLHA);
  };

  // O limite considera o que já está no pedido: adicionar de novo o mesmo SKU soma na linha (RF-004).
  const sku = produto && skuDe(produto, escolha.corId, escolha.tamanho);
  const jaNoPedido = sku ? qtdNoPedido(pedido, sku.id) : 0;
  const podeAdicionar = !!sku && jaNoPedido < sku.saldo;

  const adicionar = () => {
    if (!produto || !sku || !podeAdicionar) return;
    despachar({
      tipo: 'adicionar',
      limite: sku.saldo,
      variacao: {
        skuId: sku.id,
        modeloNome: produto.nome,
        tecidoNome: produto.tecidoNome,
        tamanho: sku.tamanho.sigla,
        cor: sku.cor.nome,
        // Preço só para exibição (preço do SKU); o servidor usa o do banco ao fechar.
        precoUnitCentavos: sku.precoCentavos,
      },
    });
    voltarParaProdutos();
    setAba('pedido');
  };

  const fechar = async () => {
    if (!podeFechar(pedido) || enviando) return;
    setEnviando(true);
    setErro('');
    try {
      // O front não envia preços: o servidor recalcula tudo (RF-F07). A chave é a mesma em toda tentativa.
      const { venda } = await api.registrarVenda({
        chaveIdempotencia: pedido.chaveIdempotencia,
        itens: pedido.itens.map((i) => ({ skuId: i.skuId, qtd: i.qtd, descPercent: i.descPercent })),
        descontoTotalCentavos: pedido.descontoTotalCentavos,
        cliente: pedido.cliente.trim(),
        cpf: pedido.cpf.trim(),
        pagamentoId: pedido.pagamentoId ?? '',
      });
      setSucesso(venda);
      // A venda baixou o estoque: recarrega o catálogo para os saldos da tela acompanharem.
      props.atualizarCatalogo();
    } catch (e) {
      // 401 já levou de volta ao login (cliente.ts); os demais erros ficam na tela, com o pedido intacto.
      setErro(e instanceof ErroApi ? e.message : MENSAGEM_GENERICA);
      // Sem estoque (409) ou peça que saiu do catálogo (400 item_invalido): recarrega o catálogo para o
      // pedido mostrar os saldos atuais; o vendedor ajusta e tenta de novo (RF-006).
      if (e instanceof ErroApi && (e.codigo === 'sem_estoque' || e.codigo === 'item_invalido')) props.atualizarCatalogo();
    } finally {
      setEnviando(false);
    }
  };

  // Só aqui e em "Cancelar pedido" a chave de idempotência muda (ADR-F06).
  const novaVenda = () => {
    setSucesso(null);
    despachar({ tipo: 'novo', chaveIdempotencia: crypto.randomUUID() });
    voltarParaProdutos();
    setAba('produtos');
  };

  // A tela de cor/tamanho não é uma aba: é a aba Produtos com um produto aberto. Trocar de aba não
  // fecha o produto; ao voltar para Produtos, a tela de cor/tamanho reaparece com a escolha feita.
  // ATENÇÃO: se uma recarga do catálogo tirar o produto aberto, `produto` fica undefined e a tela
  // volta sozinha para a lista, embora `produtoId` continue guardado.
  const naVariacao = aba === 'produtos' && !!produto;
  const { totais } = calcularPedido(pedido);
  const rotuloFechar =
    pedido.itens.length === 0 ? 'Inclua uma peça' : pedido.pagamentoId === null ? 'Escolha o pagamento' : `Fechar venda · ${formatarReais(totais.totalCentavos)}`;

  // O botão grande da barra inferior muda conforme a tela: adicionar (variações) ou fechar (pedido).
  let acao = null;
  if (naVariacao) {
    acao = (
      <div className={s.acao}>
        <div className={s.apoio}>{resumoEscolha(produto, escolha, jaNoPedido)}</div>
        <button type="button" className={c.cta} disabled={!podeAdicionar} onClick={adicionar}>
          Adicionar ao pedido
        </button>
      </div>
    );
  } else if (aba === 'pedido') {
    acao = (
      <div className={s.acao}>
        {erro && <CaixaErro mensagem={erro} />}
        <button type="button" className={c.cta} disabled={!podeFechar(pedido) || enviando} aria-busy={enviando} onClick={fechar}>
          {rotuloFechar}
        </button>
      </div>
    );
  }

  return (
    <>
      <Cabecalho etapa={nomeEtapa(aba, naVariacao)} />
      <main className={s.conteudo}>
        {aba === 'produtos' && !produto && (
          <Produtos catalogo={catalogo} tipoId={tipoId} aoEscolherTipo={setTipoId} aoEscolherProduto={(p) => escolherProduto(p.id)} />
        )}
        {naVariacao && <Variacoes produto={produto} escolha={escolha} aoMudar={setEscolha} aoVoltar={voltarParaProdutos} />}
        {aba === 'pedido' && <Pedido pedido={pedido} catalogo={catalogo} despachar={despachar} />}
        {aba === 'dia' && <Dia />}
      </main>

      <BarraInferior aba={aba} pecas={pecas} acao={acao} aoTrocarAba={setAba} />

      {sucesso && <ModalSucesso venda={sucesso} aoNovaVenda={novaVenda} />}
    </>
  );
}
