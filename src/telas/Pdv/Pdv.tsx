import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { api, ErroApi, MENSAGEM_GENERICA, type Catalogo, type Venda } from '../../api/cliente';
import { calcularPedido, pedidoVazio, podeFechar, qtdNoPedido, reduzirPedido, type AcaoPedido, type Pedido as PedidoEstado } from '../../dominio/carrinho';
import { skuDe } from '../../dominio/catalogo';
import { celularValido, formatarReais, mascararCelular, somenteDigitos } from '../../dominio/formatos';
import { CaixaErro, Carregando, FalhaAoCarregar } from '../Avisos';
import c from '../comum.module.css';
import { Folha } from '../Folha';
import { useCarregar } from '../useCarregar';
import { Abas, type Aba } from './Abas';
import { AvisoVenda } from './AvisoVenda';
import { Cliente, type RascunhoCliente } from './Cliente';
import { Dia } from './Dia';
import { Pedido, ResumoPedido } from './Pedido';
import { nomeNaLista, Produtos } from './Produtos';
import s from './Pdv.module.css';
import { Variacoes, type Escolha } from './Variacoes';

const SEM_ESCOLHA: Escolha = { corId: null, tamanho: null };

/** Nome da tela atual, usado como nome acessível do `<main>` (ADR-002): é o sinal dos testes de tela. */
function nomeDaTela(aba: Aba, naVariacao = false, naCliente = false): string {
  if (naCliente) return 'Cliente do pedido';
  if (naVariacao) return 'Cor e tamanho';
  return aba === 'produtos' ? 'Produtos' : aba === 'pedido' ? 'Pedido' : 'Dia';
}

/** Tela de venda (handoff §2). Carrega o catálogo e só então mostra Produtos e Pedido. */
export function Pdv() {
  const [aba, setAba] = useState<Aba>('produtos');
  // Formulário "Cliente do pedido" aberto (MI-21, ADR-003). Fica aqui, junto da aba, porque a troca de
  // aba (feita pelas abas, fora de <Venda>) também o fecha, descartando o que foi digitado.
  const [editandoCliente, setEditandoCliente] = useState(false);
  const [carga, tentarDeNovo, atualizarCatalogo] = useCarregar(api.catalogo);
  // O pedido fica aqui, acima de <Venda>, para sobreviver à troca de abas e ao recarregar do catálogo.
  // ATENÇÃO: se a sessão cair (401), o App troca para o Login e este componente é desmontado — o
  // pedido em andamento se perde, pois nada é salvo no navegador (RNF-F08, decisão de escopo).
  // ATENÇÃO: crypto.randomUUID só existe em contexto seguro (HTTPS ou localhost). Abrir o modo
  // dev pelo IP da rede local (http://192.168...) quebra a tela de venda.
  const [pedido, despacharPedido] = useReducer(reduzirPedido, undefined, () => pedidoVazio(crypto.randomUUID()));
  const pecas = calcularPedido(pedido).totais.pecas;

  // A troca de aba não tem trava em ref (ADR-003): grava direto no estado e não envia nada. Fechar o
  // formulário do cliente aqui é o que faz a troca de aba descartar a edição (MI-21).
  const trocarAba = (nova: Aba) => {
    setAba(nova);
    setEditandoCliente(false);
  };

  // As abas são desenhadas uma vez só, fora do ramo que depende do catálogo (ADR-001): quando a carga
  // termina, elas continuam sendo o mesmo elemento (INV-020 corrigido).
  return (
    <Folha>
      <Abas aba={aba} pecas={pecas} aoTrocarAba={trocarAba} />
      {carga.situacao === 'ok' ? (
        <Venda
          catalogo={carga.dados}
          atualizarCatalogo={atualizarCatalogo}
          aba={aba}
          setAba={setAba}
          editandoCliente={editandoCliente}
          setEditandoCliente={setEditandoCliente}
          pedido={pedido}
          despacharPedido={despacharPedido}
        />
      ) : (
        <main className={s.conteudo} aria-label={nomeDaTela(aba)}>
          {/* A aba Dia não depende do catálogo: funciona mesmo com ele carregando ou em falha. */}
          {aba === 'dia' ? (
            <Dia />
          ) : carga.situacao === 'carregando' ? (
            <Carregando />
          ) : (
            <FalhaAoCarregar mensagem={carga.mensagem} aoTentar={tentarDeNovo} />
          )}
        </main>
      )}
    </Folha>
  );
}

/** Conteúdo do PDV com o catálogo já carregado: escolha da peça, pedido, cliente e fechamento. */
function Venda(props: {
  catalogo: Catalogo;
  /** Recarrega o catálogo sem sair da tela (saldos novos depois de um 409). */
  atualizarCatalogo: () => void;
  aba: Aba;
  setAba: (aba: Aba) => void;
  editandoCliente: boolean;
  setEditandoCliente: (editando: boolean) => void;
  pedido: PedidoEstado;
  despacharPedido: (acao: AcaoPedido) => void;
}) {
  // ATENÇÃO: `setAba` chega aqui cru, sem o `setEditandoCliente(false)` de `trocarAba`. Hoje só o
  // `recomecar` o usa, e ele já fecha o formulário; outro uso precisa fechar também, senão o formulário
  // do cliente reaparece com um rascunho velho ao voltar para a aba Pedido.
  const { catalogo, aba, setAba, editandoCliente, setEditandoCliente, pedido } = props;
  // Primeiro tipo do ERP já selecionado (INV-017). Se uma recarga do catálogo tirar o tipo escolhido,
  // a tela volta para o primeiro tipo em vez de mostrar uma lista vazia sem peça marcada.
  const [tipoEscolhido, setTipoId] = useState<number | null>(catalogo.tipos[0]?.id ?? null);
  const tipoId = catalogo.tipos.some((t) => t.id === tipoEscolhido) ? tipoEscolhido : (catalogo.tipos[0]?.id ?? null);
  const [produtoId, setProdutoId] = useState<number | null>(null);
  const [escolha, setEscolha] = useState<Escolha>(SEM_ESCOLHA);
  const [enviando, setEnviando] = useState(false);
  // Trava contra envio duplo (ADR-006 da pdv-mobile-refatorado, AP-001): lida e escrita no ref, que muda
  // na hora; o estado `enviando` serve só para desenhar o botão. Dois toques antes do redesenho não passam.
  const enviandoRef = useRef(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState<Venda | null>(null);
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

  // Volta para Peça/Tecido com o tipo (peça) ainda escolhido.
  const voltarParaProdutos = () => {
    setProdutoId(null);
    setEscolha(SEM_ESCOLHA);
  };

  // O limite considera o que já está no pedido: adicionar de novo o mesmo SKU soma na linha (INV-012).
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
    // MI-23: depois de adicionar, volta para Peça/Tecido com a peça anterior ainda marcada; a bolinha
    // da aba Pedido mostra que a peça entrou.
    voltarParaProdutos();
  };

  // Fechamento da venda (INV-013, INV-014): uma tentativa por vez, erro na tela com o pedido intacto.
  // A trava é o ref: o estado do React só muda no próximo desenho, e um segundo toque antes dele ainda
  // veria "não enviando". O corpo vem do pedido da closure, igual nos dois toques.
  const fechar = async () => {
    if (!podeFechar(pedido) || enviandoRef.current) return;
    enviandoRef.current = true;
    setEnviando(true);
    setErro('');
    try {
      // O front não envia preços: o servidor recalcula tudo (RF-F07). A chave é a mesma em toda tentativa.
      // ATENÇÃO: este é o único ponto em que o pedido sai do aparelho, e o corpo é o contrato INV-001.
      // O nome vai com espaços das pontas cortados e o celular só com os dígitos (ou '' sem celular).
      // ATENÇÃO: contrato da feature pdv-cliente-telefone — o back valida com objeto estrito e recusa `cpf`.
      const { venda } = await api.registrarVenda({
        chaveIdempotencia: pedido.chaveIdempotencia,
        itens: pedido.itens.map((i) => ({ skuId: i.skuId, qtd: i.qtd, descPercent: i.descPercent })),
        descontoTotalCentavos: pedido.descontoTotalCentavos,
        cliente: pedido.cliente.trim(),
        telefone: pedido.telefone,
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

  // Começa uma venda do zero em Produtos: pedido e cliente zerados, chave de idempotência nova. Só
  // "Nova venda" (aviso de venda) e "Cancelar pedido" chamam esta função (INV-011, MI-25, MI-26).
  // ATENÇÃO: enquanto o aviso está aberto, o pedido já registrado continua no estado com a chave antiga;
  // se a troca de chave deixar de depender do "Nova venda", um reenvio do mesmo pedido seria tratado pelo
  // servidor como a mesma venda.
  const recomecar = () => {
    setSucesso(null);
    despachar({ tipo: 'novo', chaveIdempotencia: crypto.randomUUID() });
    voltarParaProdutos();
    setEditandoCliente(false);
    setAba('produtos');
  };

  // Sem confirmação: zera o pedido e o cliente, troca a chave e volta para Produtos (MI-25). A trava é
  // lida da ref, para um toque em "Cancelar" no mesmo instante do "Fechar venda", antes do redesenho,
  // não passar (AP-001); o botão também fica desligado durante o envio.
  const cancelar = () => {
    if (!enviandoRef.current) recomecar();
  };

  // "Alterar" na linha do cliente: abre o formulário com o que já está no pedido.
  const alterarCliente = () => {
    setRascunho({ nome: pedido.cliente, celular: mascararCelular(pedido.telefone) });
    setEditandoCliente(true);
  };

  // Grava o cliente (ou nenhum, com os campos vazios) e volta para o Pedido.
  const salvarCliente = (r: RascunhoCliente) => {
    despachar({ tipo: 'cliente', nome: r.nome.trim(), telefone: somenteDigitos(r.celular) });
    setEditandoCliente(false);
  };

  // Como a tela é decidida (não há rota): a aba vem do estado `aba`; na aba Produtos, um produto aberto
  // mostra cor/tamanho e, sem produto, Peça/Tecido; na aba Pedido, o formulário do cliente aparece
  // enquanto `editandoCliente` for verdadeiro. Trocar de aba não fecha o produto aberto.
  // ATENÇÃO: se uma recarga do catálogo tirar o produto aberto, `produto` fica undefined e a tela
  // volta sozinha para Peça/Tecido, embora `produtoId` continue guardado.
  const naCliente = aba === 'pedido' && editandoCliente;
  const naVariacao = aba === 'produtos' && !!produto;
  const { totais } = calcularPedido(pedido);
  // O rótulo diz o que falta para fechar (INV-013). Os três textos são procurados literalmente pelos
  // testes de tela; mudar a redação exige ajustar os testes (AP-004).
  const rotuloFechar = pedido.itens.length === 0 ? 'Inclua uma peça' : pedido.pagamentoId === null ? 'Escolha o pagamento' : 'Fechar venda';

  // A barra de baixo só existe quando a tela tem ação: salvar o cliente, adicionar (com cor e tamanho
  // escolhidos) ou fechar a venda. Em Peça/Tecido e no Dia não há barra.
  let acao = null;
  if (naCliente) {
    // Celular vazio ou completo (11 dígitos, mesma regra do back) para salvar; incompleto, a mensagem
    // aparece no formulário. "Venda sem cliente" grava nome e celular vazios.
    acao = (
      <>
        <button type="button" className={`${c.cta} ${s.ctaForte}`} disabled={!celularValido(rascunho.celular)} onClick={() => salvarCliente(rascunho)}>
          Salvar cliente
        </button>
        <button type="button" className={s.semCliente} onClick={() => salvarCliente({ nome: '', celular: '' })}>
          Venda sem cliente
        </button>
      </>
    );
  } else if (naVariacao && sku) {
    // Com todo o saldo deste tamanho já no pedido, o botão fica desligado, sem texto extra (MI-23).
    acao = (
      <button type="button" className={c.cta} disabled={!podeAdicionar} onClick={adicionar}>
        Adicionar ao pedido
      </button>
    );
  } else if (aba === 'pedido') {
    acao = (
      <>
        {pedido.itens.length > 0 && <ResumoPedido pedido={pedido} />}
        {erro && <CaixaErro mensagem={erro} />}
        {/* O que falta (ou "Fechar venda") à esquerda e o total à direita, no mesmo botão. */}
        <button type="button" className={`${c.cta} ${s.ctaForte} ${s.fechar}`} disabled={!podeFechar(pedido) || enviando} aria-busy={enviando} onClick={fechar}>
          <span className={s.fecharRotulo}>{rotuloFechar}</span>
          <span className={`${s.fecharTotal} ${c.tabular}`}>{formatarReais(totais.totalCentavos)}</span>
        </button>
      </>
    );
  }

  const tipoDoProduto = produto && catalogo.tipos.find((t) => t.id === produto.tipoId);

  return (
    <>
      <main className={s.conteudo} aria-label={nomeDaTela(aba, naVariacao, naCliente)}>
        {aba === 'produtos' && !produto && <Produtos catalogo={catalogo} tipoId={tipoId} aoEscolherTipo={setTipoId} aoEscolherProduto={(p) => escolherProduto(p.id)} />}
        {naVariacao && (
          <Variacoes
            produto={produto}
            titulo={tipoDoProduto?.nome ?? produto.nome}
            subtitulo={tipoDoProduto ? nomeNaLista(produto, tipoDoProduto.nome) : produto.tecidoNome}
            escolha={escolha}
            aoMudar={setEscolha}
            aoVoltar={voltarParaProdutos}
          />
        )}
        {aba === 'pedido' && !naCliente && (
          <Pedido pedido={pedido} catalogo={catalogo} despachar={despachar} aoAlterarCliente={alterarCliente} aoCancelar={cancelar} cancelarDesligado={enviando} />
        )}
        {naCliente && <Cliente rascunho={rascunho} aoMudar={setRascunho} aoVoltar={() => setEditandoCliente(false)} />}
        {aba === 'dia' && <Dia />}
      </main>

      {acao && <div className={s.barra}>{acao}</div>}

      {sucesso && <AvisoVenda venda={sucesso} aoNovaVenda={recomecar} />}
    </>
  );
}
