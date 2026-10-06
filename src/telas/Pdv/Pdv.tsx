import { ArrowRight, User } from '@phosphor-icons/react';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { api, ErroApi, MENSAGEM_GENERICA, type Catalogo, type Venda } from '../../api/cliente';
import { calcularPedido, pedidoVazio, podeFechar, qtdNoPedido, reduzirPedido, type AcaoPedido, type Pedido as PedidoEstado } from '../../dominio/carrinho';
import { skuDe } from '../../dominio/catalogo';
import { celularValido, formatarReais, mascararCelular, somenteDigitos } from '../../dominio/formatos';
import { CaixaErro, Carregando, FalhaAoCarregar } from '../Avisos';
import c from '../comum.module.css';
import { Folha } from '../Folha';
import { useCarregar } from '../useCarregar';
import { BarraInferior, type Aba } from './BarraInferior';
import { AvisoVenda } from './AvisoVenda';
import { Cabecalho, nomeEtapa } from './Cabecalho';
import { Cliente, type RascunhoCliente } from './Cliente';
import { Dia } from './Dia';
import { Pedido, ResumoPedido } from './Pedido';
import { Produtos } from './Produtos';
import s from './Pdv.module.css';
import { precoDaEscolha, resumoEscolha, Variacoes, type Escolha } from './Variacoes';

const SEM_ESCOLHA: Escolha = { corId: null, tamanho: null };

/** Data de hoje no topo da aba Dia, no formato do design: "05 out". */
function hojeCurto(): string {
  return new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '').replace(' de ', ' ');
}

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
          <Cabecalho etapa={nomeEtapa(aba)} titulo={aba === 'dia' ? 'Vendas de hoje' : undefined} lateral={aba === 'dia' ? hojeCurto() : undefined} />
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
  // Trava contra envio duplo (ADR-006, AP-001): lida e escrita no ref, que muda na hora; o estado
  // `enviando` serve só para desenhar o botão. Dois toques antes do redesenho não passam os dois.
  const enviandoRef = useRef(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState<Venda | null>(null);
  // Etapa Cliente (MI-02, ADR-003): a aba Produtos mostra o formulário do cliente até ele ser confirmado
  // ou pulado. "Alterar" no Pedido reabre a etapa com `origemCliente = 'pedido'`, para voltar ao Pedido.
  const [clienteDefinido, setClienteDefinido] = useState(false);
  const [origemCliente, setOrigemCliente] = useState<'inicio' | 'pedido'>('inicio');
  const [rascunho, setRascunho] = useState<RascunhoCliente>({ nome: '', celular: '' });

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
    // MI-11 (decisão do Lucas: seguir o design): a tela fica em cor/tamanho com a escolha limpa, para
    // incluir outra cor ou tamanho da mesma peça; o contador da aba Pedido mostra que a peça entrou.
    setEscolha(SEM_ESCOLHA);
  };

  // Fechamento da venda (INV-013, INV-014): uma tentativa por vez, erro na tela com o pedido intacto.
  // A trava é o ref (ADR-006): o estado do React só muda no próximo desenho, e um segundo toque antes
  // dele ainda veria "não enviando". O corpo vem do pedido da closure, igual nos dois toques.
  const fechar = async () => {
    if (!podeFechar(pedido) || enviandoRef.current) return;
    enviandoRef.current = true;
    setEnviando(true);
    setErro('');
    try {
      // O front não envia preços: o servidor recalcula tudo (RF-F07). A chave é a mesma em toda tentativa.
      // ATENÇÃO: este é o único ponto em que o pedido sai do aparelho, e o corpo é o contrato INV-001.
      // O nome vai com espaços das pontas cortados. ATENÇÃO (provisório até a etapa 6): o CPF saiu do
      // PDV e o contrato atual ainda exige o campo, então vai `cpf: ''`; o celular (`pedido.telefone`)
      // só entra no corpo quando a feature irmã pdv-cliente-telefone publicar o contrato novo. O back
      // valida com objeto estrito: mandar `telefone` antes disso faz toda venda voltar 400.
      const { venda } = await api.registrarVenda({
        chaveIdempotencia: pedido.chaveIdempotencia,
        itens: pedido.itens.map((i) => ({ skuId: i.skuId, qtd: i.qtd, descPercent: i.descPercent })),
        descontoTotalCentavos: pedido.descontoTotalCentavos,
        cliente: pedido.cliente.trim(),
        cpf: '',
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
      enviandoRef.current = false;
      setEnviando(false);
    }
  };

  // Começa uma venda do zero na etapa Cliente: pedido e cliente zerados, chave de idempotência nova.
  // Só o OK do aviso de venda e "Cancelar pedido" chamam esta função (ADR-F06, ADR-004, INV-011).
  // ATENÇÃO: enquanto o aviso está aberto, o pedido já registrado continua no estado com a chave antiga;
  // se a troca de chave deixar de depender do OK, um reenvio do mesmo pedido seria tratado pelo
  // servidor como a mesma venda.
  const recomecar = () => {
    setSucesso(null);
    despachar({ tipo: 'novo', chaveIdempotencia: crypto.randomUUID() });
    voltarParaProdutos();
    setRascunho({ nome: '', celular: '' });
    setOrigemCliente('inicio');
    setClienteDefinido(false);
    setAba('produtos');
  };

  // "Alterar" no cartão Cliente do Pedido: reabre a etapa com o que já está no pedido.
  const alterarCliente = () => {
    setRascunho({ nome: pedido.cliente, celular: mascararCelular(pedido.telefone) });
    setOrigemCliente('pedido');
    setClienteDefinido(false);
    setAba('produtos');
  };

  // Confirma (ou pula, com os campos vazios) a etapa Cliente e segue para onde o vendedor estava indo.
  const confirmarCliente = (r: RascunhoCliente) => {
    despachar({ tipo: 'cliente', nome: r.nome.trim(), telefone: somenteDigitos(r.celular) });
    setRascunho(r);
    setClienteDefinido(true);
    if (origemCliente === 'pedido') setAba('pedido');
    setOrigemCliente('inicio');
  };

  // A tela de cor/tamanho não é uma aba: é a aba Produtos com um produto aberto. Trocar de aba não
  // fecha o produto; ao voltar para Produtos, a tela de cor/tamanho reaparece com a escolha feita.
  // ATENÇÃO: se uma recarga do catálogo tirar o produto aberto, `produto` fica undefined e a tela
  // volta sozinha para a lista, embora `produtoId` continue guardado.
  const naCliente = aba === 'produtos' && !clienteDefinido;
  const naVariacao = aba === 'produtos' && !naCliente && !!produto;
  const { totais } = calcularPedido(pedido);
  // O rótulo diz o que falta para fechar (INV-013). Os três textos são procurados literalmente pelos
  // testes de tela; mudar a redação exige ajustar os testes (AP-004).
  const rotuloFechar = pedido.itens.length === 0 ? 'Inclua uma peça' : pedido.pagamentoId === null ? 'Escolha o pagamento' : 'Fechar venda';

  // O botão grande da barra inferior muda conforme a tela: adicionar (variações) ou fechar (pedido).
  let acao = null;
  if (naCliente) {
    // Design 1a: botão principal habilitado com o celular vazio ou completo (10/11 dígitos); o segundo
    // segue sem cliente (venda anônima continua possível, decisão do Lucas).
    acao = (
      <div className={s.acao}>
        <button type="button" className={`${c.cta} ${s.ctaIcone}`} disabled={!celularValido(rascunho.celular)} onClick={() => confirmarCliente(rascunho)}>
          {origemCliente === 'pedido' ? 'Salvar cliente' : 'Escolher produtos'}
          {origemCliente === 'inicio' && <ArrowRight size={20} aria-hidden="true" />}
        </button>
        <button type="button" className={s.semCliente} onClick={() => confirmarCliente({ nome: '', celular: '' })}>
          Venda sem cliente
        </button>
      </div>
    );
  } else if (naVariacao) {
    acao = (
      <div className={s.acao}>
        <div className={s.resumoLinha}>
          <span className={s.apoio}>{resumoEscolha(produto, escolha, jaNoPedido)}</span>
          <span className={`${s.resumoPreco} ${c.tabular}`}>{precoDaEscolha(produto, escolha)}</span>
        </div>
        <button type="button" className={c.cta} disabled={!podeAdicionar} onClick={adicionar}>
          Adicionar ao pedido
        </button>
      </div>
    );
  } else if (aba === 'pedido') {
    acao = (
      <div className={s.acao}>
        <ResumoPedido pedido={pedido} />
        {erro && <CaixaErro mensagem={erro} />}
        {/* Design 1d: o que falta (ou "Fechar venda") à esquerda e o total à direita, no mesmo botão. */}
        <button type="button" className={`${c.cta} ${s.fechar}`} disabled={!podeFechar(pedido) || enviando} aria-busy={enviando} onClick={fechar}>
          <span className={s.fecharRotulo}>{rotuloFechar}</span>
          <span className={`${s.fecharTotal} ${c.tabular}`}>{formatarReais(totais.totalCentavos)}</span>
        </button>
      </div>
    );
  }

  // Topo de cada tela conforme o design (MI-09): o que muda é o título, a linha de apoio e o complemento.
  const etapa = nomeEtapa(aba, naVariacao, naCliente);
  let topo;
  if (naCliente) {
    topo = <Cabecalho etapa={etapa} apoio={origemCliente === 'pedido' ? 'Alterar o cliente do pedido' : 'Nova venda · primeiro passo'} />;
  } else if (naVariacao) {
    topo = <Cabecalho etapa={etapa} titulo={produto.nome} apoio={produto.tecidoNome} aoVoltar={voltarParaProdutos} />;
  } else if (aba === 'produtos') {
    topo = (
      <Cabecalho
        etapa={etapa}
        apoio={
          <span className={s.apoioCliente}>
            <User size={16} aria-hidden="true" />
            {pedido.cliente.trim() || 'Cliente não identificado'}
          </span>
        }
        lateral={`${catalogo.produtos.length} ${catalogo.produtos.length === 1 ? 'modelo' : 'modelos'}`}
      />
    );
  } else if (aba === 'pedido') {
    // Sem confirmação, como antes: zera o pedido e o cliente, troca a chave e volta para a etapa Cliente.
    topo = (
      <Cabecalho
        etapa={etapa}
        lateral={
          <button type="button" className={s.cancelar} onClick={recomecar}>
            Cancelar pedido
          </button>
        }
      />
    );
  } else {
    topo = <Cabecalho etapa={etapa} titulo="Vendas de hoje" lateral={hojeCurto()} />;
  }

  return (
    <>
      {topo}
      <main className={aba === 'pedido' || aba === 'dia' ? `${s.conteudo} ${s.conteudoCartoes}` : s.conteudo}>
        {naCliente && <Cliente rascunho={rascunho} aoMudar={setRascunho} />}
        {aba === 'produtos' && !naCliente && !produto && (
          <Produtos
            catalogo={catalogo}
            tipoId={tipoId}
            aoEscolherTipo={setTipoId}
            aoEscolherProduto={(p) => escolherProduto(p.id)}
            noPedido={(p) => p.skus.reduce((soma, k) => soma + qtdNoPedido(pedido, k.id), 0)}
          />
        )}
        {naVariacao && <Variacoes produto={produto} escolha={escolha} aoMudar={setEscolha} />}
        {aba === 'pedido' && <Pedido pedido={pedido} catalogo={catalogo} despachar={despachar} aoAlterarCliente={alterarCliente} />}
        {aba === 'dia' && <Dia />}
      </main>

      <BarraInferior aba={aba} pecas={pecas} acao={acao} aoTrocarAba={setAba} />

      {sucesso && <AvisoVenda venda={sucesso} aoOk={recomecar} />}
    </>
  );
}
