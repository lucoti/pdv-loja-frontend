import { useCallback, useReducer, useState } from 'react';
import { api, ErroApi, MENSAGEM_GENERICA, type Catalogo, type Venda, type Vendedor } from '../../api/cliente';
import { calcularPedido, pedidoVazio, podeFechar, reduzirPedido, type AcaoPedido, type Pedido as PedidoEstado } from '../../dominio/carrinho';
import { formatarReais } from '../../dominio/formatos';
import { CaixaErro, Carregando, FalhaAoCarregar } from '../Avisos';
import c from '../comum.module.css';
import { Folha } from '../Folha';
import { useCarregar } from '../useCarregar';
import { BarraInferior, type Aba } from './BarraInferior';
import { Cabecalho } from './Cabecalho';
import { Dia } from './Dia';
import { ModalSucesso } from './ModalSucesso';
import { Pedido } from './Pedido';
import { Produtos } from './Produtos';
import s from './Pdv.module.css';
import { resumoEscolha, Variacoes, type Escolha } from './Variacoes';

const SEM_ESCOLHA: Escolha = { tecidoId: null, tamanho: null, cor: null };

/** Tela de venda (handoff §2). Carrega o catálogo e só então mostra Produtos e Pedido. */
export function Pdv({ vendedor }: { vendedor: Vendedor }) {
  const [aba, setAba] = useState<Aba>('produtos');
  const [carga, tentarDeNovo] = useCarregar(api.catalogo);
  // O pedido fica aqui, acima de <Venda>, para sobreviver à troca de abas e ao recarregar do catálogo.
  // ATENÇÃO: se a sessão cair (401), o App troca para o Login e este componente é desmontado — o
  // pedido em andamento se perde, pois nada é salvo no navegador (RNF-F08, decisão de escopo).
  // ATENÇÃO: crypto.randomUUID só existe em contexto seguro (HTTPS ou localhost). Abrir o modo
  // dev pelo IP da rede local (http://192.168...) quebra a tela de venda.
  const [pedido, despacharPedido] = useReducer(reduzirPedido, undefined, () => pedidoVazio(crypto.randomUUID()));
  const pecas = calcularPedido(pedido).totais.pecas;

  return (
    <Folha>
      <Cabecalho vendedor={vendedor.nome} />
      {carga.situacao === 'ok' ? (
        <Venda catalogo={carga.dados} aba={aba} setAba={setAba} pedido={pedido} despacharPedido={despacharPedido} pecas={pecas} />
      ) : (
        <>
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
  aba: Aba;
  setAba: (aba: Aba) => void;
  pedido: PedidoEstado;
  despacharPedido: (acao: AcaoPedido) => void;
  pecas: number;
}) {
  const { catalogo, aba, setAba, pedido, pecas } = props;
  const [categoriaId, setCategoriaId] = useState(catalogo.categorias[0]?.id ?? '');
  const [modeloId, setModeloId] = useState<string | null>(null);
  const [escolha, setEscolha] = useState<Escolha>(SEM_ESCOLHA);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState<Venda | null>(null);

  const modelo = catalogo.modelos.find((m) => m.id === modeloId);

  // Qualquer mudança no pedido apaga a mensagem de erro da última tentativa (RF-F10).
  const despachar = useCallback(
    (acao: AcaoPedido) => {
      setErro('');
      props.despacharPedido(acao);
    },
    [props.despacharPedido],
  );

  const escolherModelo = (id: string) => {
    setModeloId(id);
    // O tecido já vem no primeiro do catálogo ("Suplex Normal"); tamanho e cor em branco.
    setEscolha({ ...SEM_ESCOLHA, tecidoId: catalogo.tecidos[0]?.id ?? null });
  };

  const voltarParaModelos = () => {
    setModeloId(null);
    setEscolha(SEM_ESCOLHA);
  };

  const tecido = catalogo.tecidos.find((t) => t.id === escolha.tecidoId);
  const podeAdicionar = !!(modelo && tecido && escolha.tamanho && escolha.cor);

  const adicionar = () => {
    if (!modelo || !tecido || !escolha.tamanho || !escolha.cor) return;
    despachar({
      tipo: 'adicionar',
      variacao: {
        modeloId: modelo.id,
        modeloNome: modelo.nome,
        tecidoId: tecido.id,
        tecidoNome: tecido.nome,
        tamanho: escolha.tamanho,
        cor: escolha.cor,
        // Preço só para exibição (RN-001, mesma conta de precoVariacao); o servidor recalcula ao fechar.
        precoUnitCentavos: modelo.precoBaseCentavos + tecido.acrescimoCentavos,
      },
    });
    voltarParaModelos();
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
        itens: pedido.itens.map((i) => ({ modeloId: i.modeloId, tecidoId: i.tecidoId, tamanho: i.tamanho, cor: i.cor, qtd: i.qtd, descPercent: i.descPercent })),
        descontoTotalCentavos: pedido.descontoTotalCentavos,
        cliente: pedido.cliente.trim(),
        cpf: pedido.cpf.trim(),
        pagamentoId: pedido.pagamentoId ?? '',
      });
      setSucesso(venda);
    } catch (e) {
      // 401 já levou de volta ao login (cliente.ts); os demais erros ficam na tela, com o pedido intacto.
      setErro(e instanceof ErroApi ? e.message : MENSAGEM_GENERICA);
    } finally {
      setEnviando(false);
    }
  };

  // Só aqui e em "Cancelar pedido" a chave de idempotência muda (ADR-F06).
  const novaVenda = () => {
    setSucesso(null);
    despachar({ tipo: 'novo', chaveIdempotencia: crypto.randomUUID() });
    voltarParaModelos();
    setAba('produtos');
  };

  const naVariacao = aba === 'produtos' && !!modelo;
  const { totais } = calcularPedido(pedido);
  const rotuloFechar =
    pedido.itens.length === 0 ? 'Inclua uma peça' : pedido.pagamentoId === null ? 'Escolha o pagamento' : `Fechar venda · ${formatarReais(totais.totalCentavos)}`;

  // O botão grande da barra inferior muda conforme a tela: adicionar (variações) ou fechar (pedido).
  let acao = null;
  if (naVariacao) {
    acao = (
      <div className={s.acao}>
        <div className={s.apoio}>{resumoEscolha(catalogo, modelo, escolha)}</div>
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
      <main className={s.conteudo}>
        {aba === 'produtos' && !modelo && (
          <Produtos catalogo={catalogo} categoriaId={categoriaId} aoEscolherCategoria={setCategoriaId} aoEscolherModelo={(m) => escolherModelo(m.id)} />
        )}
        {naVariacao && <Variacoes catalogo={catalogo} modelo={modelo} escolha={escolha} aoMudar={setEscolha} aoVoltar={voltarParaModelos} />}
        {aba === 'pedido' && <Pedido pedido={pedido} catalogo={catalogo} despachar={despachar} />}
        {aba === 'dia' && <Dia />}
      </main>

      <BarraInferior aba={aba} pecas={pecas} acao={acao} aoTrocarAba={setAba} />

      {sucesso && <ModalSucesso venda={sucesso} aoNovaVenda={novaVenda} />}
    </>
  );
}
