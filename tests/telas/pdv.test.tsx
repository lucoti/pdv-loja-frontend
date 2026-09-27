/** Tela de venda (RF-F04..RF-F10) pela página inteira, contra o simulado. */
import { screen, waitFor, within } from '@testing-library/react';
import { getResponse, http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { api } from '../../src/api/cliente';
import { dataBr } from '../../src/dominio/formatos';
import { CATALOGO } from '../../src/simulado/dados';
import { resumoEscolha } from '../../src/telas/Pdv/Variacoes';
import { servidor, usarSimulado } from '../apoio';
import { ENTRADA_VENDA, validarEntrada } from '../contrato';
import {
  abrirApp,
  adicionarPeca,
  botaoFechar,
  esperarCatalogo,
  itensPedido,
  LEGGING_LIGHT_M_PRETO,
  sem_nbsp,
  TOP_NADADOR_P_VINHO,
  totais,
} from './ajuda';

/** Abre o PDV já logado (sessão válida) com o catálogo carregado. */
async function abrirPdv(...sobrescritas: Parameters<typeof servidor.use>) {
  const simulado = usarSimulado({ sessaoDe: 'carlos' });
  // Sobrescritas entram depois do simulado (usarSimulado reinicia os handlers).
  if (sobrescritas.length) servidor.use(...sobrescritas);
  const app = abrirApp();
  await esperarCatalogo();
  return { ...app, simulado };
}

/** Captura os corpos de POST /vendas que o front envia (sem interferir na resposta). */
function capturarVendas() {
  const corpos: any[] = [];
  servidor.events.on('request:start', async ({ request }) => {
    if (request.method === 'POST' && request.url.endsWith('/api/vendas')) corpos.push(await request.clone().json());
  });
  return corpos;
}

const aba = (nome: RegExp | string) => screen.getByRole('button', { name: nome });
const texto = (el: HTMLElement) => sem_nbsp(el.textContent);

/** Monta o pedido de referência do back: 2× Legging Light M Preto 10%, Top Nadador P Vinho, −R$ 15, Pix. */
async function montarReferencia(usuario: Awaited<ReturnType<typeof abrirPdv>>['usuario']) {
  await adicionarPeca(usuario, LEGGING_LIGHT_M_PRETO);
  await adicionarPeca(usuario, LEGGING_LIGHT_M_PRETO);
  await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
  await usuario.click(within(itensPedido()[0]!).getByRole('button', { name: '10%' }));
  for (let i = 0; i < 3; i++) await usuario.click(screen.getByRole('button', { name: 'Aumentar desconto no total' }));
  await usuario.type(screen.getByRole('textbox', { name: 'Nome do cliente' }), 'Maria');
  await usuario.type(screen.getByRole('textbox', { name: 'CPF (opcional)' }), '529.982.247-25');
  await usuario.click(screen.getByRole('button', { name: 'Pix' }));
}

describe('RF-F04 — cabeçalho', () => {
  it('"BALCÃO", "{vendedor} · pedido novo" e data de hoje; sem número do pedido', async () => {
    await abrirPdv();
    expect(screen.getByText('BALCÃO')).toBeInTheDocument();
    expect(screen.getByText('Carlos · pedido novo')).toBeInTheDocument();
    expect(screen.getByText(dataBr())).toBeInTheDocument();
    expect(dataBr()).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(screen.queryByText(/#\d+/)).not.toBeInTheDocument();
  });
});

describe('RF-F05 — produtos e variações', () => {
  it('primeira categoria selecionada; modelos com "a partir de"; chips filtram', async () => {
    const { usuario } = await abrirPdv();
    expect(aba('Calças')).toHaveAttribute('aria-pressed', 'true');
    expect(aba('Tops')).toHaveAttribute('aria-pressed', 'false');
    expect(texto(aba(/Calça Legging/))).toContain('a partir de R$ 89,00');
    expect(screen.getAllByRole('button', { name: /a partir de/ })).toHaveLength(4);
    await usuario.click(aba('Bermudas'));
    expect(aba('Bermudas')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: /Calça Legging/ })).not.toBeInTheDocument();
    expect(texto(aba(/Bermuda Ciclista/))).toContain('a partir de R$ 59,00');
    expect(screen.getAllByRole('button', { name: /a partir de/ })).toHaveLength(4);
  });

  it('painel: tecido "Suplex Normal" já marcado, tamanho e cor em branco, preços por tecido', async () => {
    const { usuario } = await abrirPdv();
    await usuario.click(aba(/Calça Legging/));
    expect(screen.getByRole('heading', { name: 'Calça Legging' })).toBeInTheDocument();
    expect(aba(/^Suplex Normal/)).toHaveAttribute('aria-pressed', 'true');
    expect(aba(/^Suplex Light/)).toHaveAttribute('aria-pressed', 'false');
    expect(texto(aba(/^Suplex Normal/))).toContain('R$ 89,00');
    expect(texto(aba(/^Suplex Light/))).toContain('R$ 101,00');
    for (const t of ['P', 'M', 'G', 'GG']) expect(aba(t)).toHaveAttribute('aria-pressed', 'false');
    for (const c of CATALOGO.cores) expect(aba(c.nome)).toHaveAttribute('aria-pressed', 'false');
    // Cor como círculo com a cor real.
    expect(aba('Vinho').querySelector('span[aria-hidden]')).toHaveStyle({ background: '#6B2232' });
  });

  it('linha de apoio: "Falta escolher: …" só com o que falta; completa → resumo com preço; botão só habilita completo', async () => {
    const { usuario } = await abrirPdv();
    await usuario.click(aba(/Calça Legging/));
    const adicionar = aba('Adicionar ao pedido');
    expect(screen.getByText('Falta escolher: tamanho, cor')).toBeInTheDocument();
    expect(adicionar).toBeDisabled();
    await usuario.click(aba('Preto'));
    expect(screen.getByText('Falta escolher: tamanho')).toBeInTheDocument();
    expect(adicionar).toBeDisabled();
    await usuario.click(aba('G'));
    await usuario.click(aba(/^Suplex Light/));
    expect(sem_nbsp(screen.getByText(/^Suplex Light · Tam G · Preto/).textContent)).toBe('Suplex Light · Tam G · Preto — R$ 101,00');
    expect(adicionar).toBeEnabled();
    expect(aba('G')).toHaveAttribute('aria-pressed', 'true');
  });

  it('resumoEscolha lista também o tecido quando ele falta', () => {
    const modelo = CATALOGO.modelos[0]!;
    expect(resumoEscolha(CATALOGO, modelo, { tecidoId: null, tamanho: null, cor: null })).toBe('Falta escolher: tecido, tamanho, cor');
    expect(resumoEscolha(CATALOGO, modelo, { tecidoId: 'inexistente', tamanho: 'M', cor: 'Preto' })).toBe('Falta escolher: tecido');
  });

  it('voltar do painel retorna à lista e descarta a escolha', async () => {
    const { usuario } = await abrirPdv();
    await usuario.click(aba(/Calça Legging/));
    await usuario.click(aba('M'));
    await usuario.click(aba('Voltar para os modelos'));
    expect(screen.queryByRole('heading', { name: 'Calça Legging' })).not.toBeInTheDocument();
    await usuario.click(aba(/Calça Legging/));
    expect(aba('M')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Falta escolher: tamanho, cor')).toBeInTheDocument();
  });

  it('adicionar vai para a aba Pedido e limpa a variação', async () => {
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, LEGGING_LIGHT_M_PRETO);
    expect(aba('Pedido (1)')).toHaveAttribute('aria-current', 'page');
    expect(itensPedido()).toHaveLength(1);
    expect(texto(itensPedido()[0]!)).toContain('Suplex Light · Tam M · Preto · R$ 101,00');
    await usuario.click(aba('Produtos'));
    expect(screen.queryByRole('heading', { name: 'Calça Legging' })).not.toBeInTheDocument();
    expect(aba(/Calça Legging/)).toBeInTheDocument();
  });
});

describe('RF-F06 — carrinho', () => {
  it('vazio: título, mensagem, aba sem contagem e rótulo "Inclua uma peça"', async () => {
    const { usuario } = await abrirPdv();
    expect(aba('Pedido')).toBeInTheDocument();
    await usuario.click(aba('Pedido'));
    expect(screen.getByRole('heading', { name: 'Novo pedido' })).toBeInTheDocument();
    expect(screen.getByText(/Nenhum item ainda\./)).toHaveTextContent('Nenhum item ainda.Volte em Produtos para incluir peças.');
    expect(botaoFechar()).toHaveTextContent('Inclua uma peça');
    expect(botaoFechar()).toBeDisabled();
  });

  it('mesma variação adicionada de novo soma na linha; aba mostra total de peças', async () => {
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, LEGGING_LIGHT_M_PRETO);
    await adicionarPeca(usuario, LEGGING_LIGHT_M_PRETO);
    expect(itensPedido()).toHaveLength(1);
    expect(within(itensPedido()[0]!).getByLabelText('Quantidade')).toHaveTextContent('2');
    await adicionarPeca(usuario, { ...LEGGING_LIGHT_M_PRETO, cor: 'Vinho' });
    expect(itensPedido()).toHaveLength(2);
    expect(aba('Pedido (3)')).toBeInTheDocument();
  });

  it('"+" e "−" mudam a quantidade; "−" com qtd 1 remove; "Excluir" remove', async () => {
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, LEGGING_LIGHT_M_PRETO);
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    const legging = () => itensPedido()[0]!;
    await usuario.click(within(legging()).getByRole('button', { name: 'Aumentar quantidade' }));
    expect(within(legging()).getByLabelText('Quantidade')).toHaveTextContent('2');
    expect(texto(within(legging()).getByText(/R\$ 202,00/))).toBe('R$ 202,00');
    await usuario.click(within(legging()).getByRole('button', { name: 'Diminuir quantidade' }));
    expect(within(legging()).getByLabelText('Quantidade')).toHaveTextContent('1');
    await usuario.click(within(legging()).getByRole('button', { name: 'Diminuir quantidade' }));
    expect(itensPedido()).toHaveLength(1);
    expect(texto(itensPedido()[0]!)).toContain('Top Nadador');
    await usuario.click(within(itensPedido()[0]!).getByRole('button', { name: 'Excluir' }));
    expect(itensPedido()).toHaveLength(0);
    expect(aba('Pedido')).toBeInTheDocument();
  });

  it('desconto por item: subtotal com desconto e "−N% aplicado"', async () => {
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, LEGGING_LIGHT_M_PRETO);
    await adicionarPeca(usuario, LEGGING_LIGHT_M_PRETO);
    const item = itensPedido()[0]!;
    expect(within(item).getByRole('button', { name: 'sem' })).toHaveAttribute('aria-pressed', 'true');
    await usuario.click(within(item).getByRole('button', { name: '10%' }));
    expect(within(item).getByRole('button', { name: '10%' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(item).getByText('−10% aplicado')).toBeInTheDocument();
    expect(texto(item)).toContain('R$ 181,80');
    await usuario.click(within(item).getByRole('button', { name: 'sem' }));
    expect(within(item).queryByText(/aplicado/)).not.toBeInTheDocument();
    expect(texto(item)).toContain('R$ 202,00');
  });

  it('desconto no total: passos de R$ 5, "sem desconto" e mínimo 0', async () => {
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, LEGGING_LIGHT_M_PRETO);
    const mais = aba('Aumentar desconto no total');
    const menos = aba('Diminuir desconto no total');
    expect(screen.getByText('sem desconto')).toBeInTheDocument();
    await usuario.click(menos);
    expect(screen.getByText('sem desconto')).toBeInTheDocument();
    for (let i = 0; i < 3; i++) await usuario.click(mais);
    const valor = () => texto(mais.previousElementSibling as HTMLElement);
    expect(valor()).toBe('− R$ 15,00');
    await usuario.click(menos);
    expect(valor()).toBe('− R$ 10,00');
  });

  it('cliente, CPF numérico e pagamento em grade com as opções do catálogo', async () => {
    const { usuario } = await abrirPdv();
    await usuario.click(aba('Pedido'));
    expect(screen.getByRole('textbox', { name: 'CPF (opcional)' })).toHaveAttribute('inputmode', 'numeric');
    expect(screen.getByPlaceholderText('Nome do cliente')).toBeInTheDocument();
    for (const p of ['Dinheiro', 'Pix', 'Débito', 'Crédito']) expect(aba(p)).toHaveAttribute('aria-pressed', 'false');
    await usuario.click(aba('Débito'));
    expect(aba('Débito')).toHaveAttribute('aria-pressed', 'true');
    await usuario.type(screen.getByRole('textbox', { name: 'Nome do cliente' }), 'Maria');
    expect(screen.getByRole('textbox', { name: 'Nome do cliente' })).toHaveValue('Maria');
  });

  it('totais do pedido de referência: 3 peças R$ 257,00, descontos − R$ 35,20, total R$ 221,80', async () => {
    const { usuario } = await abrirPdv();
    await montarReferencia(usuario);
    const t = screen.getByTestId('totais');
    expect(texto(t)).toBe('3 peçasR$ 257,00Descontos− R$ 35,20TotalR$ 221,80');
    expect(texto(botaoFechar())).toBe('Fechar venda · R$ 221,80');
  });

  it('total nunca negativo na tela', async () => {
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    for (let i = 0; i < 12; i++) await usuario.click(aba('Aumentar desconto no total'));
    expect(texto(totais().getByText('Total').nextElementSibling as HTMLElement)).toBe('R$ 0,00');
    expect(texto(totais().getByText('Descontos').nextElementSibling as HTMLElement)).toBe('− R$ 60,00');
  });

  it('"Cancelar pedido" limpa itens, descontos, cliente, CPF e pagamento na hora', async () => {
    const { usuario } = await abrirPdv();
    await montarReferencia(usuario);
    await usuario.click(aba('Cancelar pedido'));
    expect(itensPedido()).toHaveLength(0);
    expect(screen.getByText('sem desconto')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Nome do cliente' })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: 'CPF (opcional)' })).toHaveValue('');
    expect(aba('Pix')).toHaveAttribute('aria-pressed', 'false');
    expect(aba('Pedido')).toBeInTheDocument();
    expect(texto(screen.getByTestId('totais'))).toBe('0 peçasR$ 0,00DescontosR$ 0,00TotalR$ 0,00');
  });
});

describe('RF-F07 — fechar venda', () => {
  it('rótulos do botão: vazio → "Inclua uma peça"; sem pagamento → "Escolha o pagamento"; pronto → "Fechar venda · R$ X"', async () => {
    const { usuario } = await abrirPdv();
    await usuario.click(aba('Pedido'));
    expect(botaoFechar()).toHaveTextContent('Inclua uma peça');
    expect(botaoFechar()).toBeDisabled();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    expect(botaoFechar()).toHaveTextContent('Escolha o pagamento');
    expect(botaoFechar()).toBeDisabled();
    await usuario.click(aba('Pix'));
    expect(texto(botaoFechar())).toBe('Fechar venda · R$ 55,00');
    expect(botaoFechar()).toBeEnabled();
    await usuario.click(within(itensPedido()[0]!).getByRole('button', { name: 'Excluir' }));
    expect(botaoFechar()).toHaveTextContent('Inclua uma peça');
    expect(botaoFechar()).toBeDisabled();
  });

  it('POST /vendas envia só escolhas (sem preços), no formato de VendaEntrada', async () => {
    const corpos = capturarVendas();
    const { usuario } = await abrirPdv();
    await montarReferencia(usuario);
    await usuario.click(botaoFechar());
    await screen.findByRole('dialog');
    servidor.events.removeAllListeners();
    expect(corpos).toHaveLength(1);
    const corpo = corpos[0];
    expect(corpo.chaveIdempotencia).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect({ ...corpo, chaveIdempotencia: 'x' }).toEqual({
      chaveIdempotencia: 'x',
      itens: [
        { modeloId: 'calca-legging', tecidoId: 'light', tamanho: 'M', cor: 'Preto', qtd: 2, descPercent: 10 },
        { modeloId: 'top-nadador', tecidoId: 'normal', tamanho: 'P', cor: 'Vinho', qtd: 1, descPercent: 0 },
      ],
      descontoTotalCentavos: 1500,
      cliente: 'Maria',
      cpf: '529.982.247-25',
      pagamentoId: 'pix',
    });
    expect(JSON.stringify(corpo)).not.toMatch(/precoUnit|subtotal|brutoCentavos|totalCentavos|modeloNome|tecidoNome/);
    validarEntrada(ENTRADA_VENDA, corpo);
  });

  it('cliente e CPF vão sem espaços nas pontas', async () => {
    const corpos = capturarVendas();
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await usuario.type(screen.getByRole('textbox', { name: 'Nome do cliente' }), '  João  ');
    await usuario.type(screen.getByRole('textbox', { name: 'CPF (opcional)' }), ' 52998224725 ');
    await usuario.click(aba('Dinheiro'));
    await usuario.click(botaoFechar());
    await screen.findByRole('dialog');
    servidor.events.removeAllListeners();
    expect([corpos[0].cliente, corpos[0].cpf]).toEqual(['João', '52998224725']);
    validarEntrada(ENTRADA_VENDA, corpos[0]);
  });

  it('enquanto envia, o botão fica bloqueado e toque duplo não gera segundo envio', async () => {
    let liberar!: () => void;
    const segura = new Promise<void>((r) => (liberar = r));
    const { usuario, simulado } = await abrirPdv();
    servidor.use(
      http.post('*/api/vendas', async () => {
        await segura;
        return undefined;
      }),
    );
    const corpos = capturarVendas();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await usuario.click(aba('Pix'));
    await usuario.dblClick(botaoFechar());
    await waitFor(() => expect(botaoFechar()).toBeDisabled());
    expect(botaoFechar()).toHaveAttribute('aria-busy', 'true');
    await usuario.click(botaoFechar());
    liberar();
    await screen.findByRole('dialog');
    servidor.events.removeAllListeners();
    expect(corpos).toHaveLength(1);
    expect(simulado.estado.vendas).toHaveLength(1);
  });

  it('falha de rede depois de o servidor gravar: reenvio usa a MESMA chave e não duplica a venda', async () => {
    const { usuario, simulado } = await abrirPdv();
    let primeira = true;
    servidor.use(
      http.post('*/api/vendas', async ({ request }) => {
        if (!primeira) return undefined;
        primeira = false;
        // O servidor grava a venda, mas a resposta se perde na rede.
        await getResponse(simulado.handlers, request.clone());
        return HttpResponse.error();
      }),
    );
    const corpos = capturarVendas();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await usuario.click(aba('Pix'));
    await usuario.click(botaoFechar());
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão. Tente de novo.');
    expect(simulado.estado.vendas).toHaveLength(1);
    // Pedido e chave mantidos.
    expect(itensPedido()).toHaveLength(1);
    expect(botaoFechar()).toBeEnabled();
    await usuario.click(botaoFechar());
    const modal = await screen.findByRole('dialog');
    servidor.events.removeAllListeners();
    expect(corpos).toHaveLength(2);
    expect(corpos[1].chaveIdempotencia).toBe(corpos[0].chaveIdempotencia);
    expect(simulado.estado.vendas).toHaveLength(1);
    expect(texto(modal)).toContain('Pedido #1042');
  });

  it('a chave muda só depois de "Nova venda" ou "Cancelar pedido"', async () => {
    const corpos = capturarVendas();
    const { usuario } = await abrirPdv();
    const fecharCom = async () => {
      await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
      await usuario.click(aba('Pix'));
      await usuario.click(botaoFechar());
      await usuario.click(await screen.findByRole('button', { name: 'Nova venda' }));
    };
    await fecharCom();
    await fecharCom();
    // Cancelar pedido: o próximo pedido usa chave nova.
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    servidor.use(http.post('*/api/vendas', () => HttpResponse.error()));
    await usuario.click(aba('Pix'));
    await usuario.click(botaoFechar());
    await screen.findByRole('alert');
    await usuario.click(aba('Cancelar pedido'));
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await usuario.click(aba('Pix'));
    await usuario.click(botaoFechar());
    await screen.findByRole('alert');
    servidor.events.removeAllListeners();
    const chaves = corpos.map((c) => c.chaveIdempotencia);
    expect(chaves).toHaveLength(4);
    expect(new Set(chaves).size).toBe(4);
  });
});

describe('RF-F08 — venda registrada', () => {
  it('modal com número e valores do servidor; "Nova venda" zera e volta para Produtos', async () => {
    const { usuario } = await abrirPdv();
    await montarReferencia(usuario);
    await usuario.click(botaoFechar());
    const modal = await screen.findByRole('dialog');
    expect(within(modal).getByRole('heading', { name: 'Venda registrada' })).toBeInTheDocument();
    expect(texto(within(modal).getByText(/^Pedido #/))).toBe('Pedido #1042 · 3 peça(s) · R$ 221,80 em Pix · Maria');
    await usuario.click(within(modal).getByRole('button', { name: 'Nova venda' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(aba('Produtos')).toHaveAttribute('aria-current', 'page');
    expect(aba('Pedido')).toBeInTheDocument();
    await usuario.click(aba('Pedido'));
    expect(itensPedido()).toHaveLength(0);
    expect(screen.getByRole('textbox', { name: 'Nome do cliente' })).toHaveValue('');
    expect(aba('Pix')).toHaveAttribute('aria-pressed', 'false');
  });

  it('usa o que o servidor devolve (não o cálculo local); sem cliente não mostra " · "', async () => {
    const { usuario, simulado } = await abrirPdv();
    servidor.use(
      http.post('*/api/vendas', async ({ request }) => {
        const r = await getResponse(simulado.handlers, request);
        const { venda } = (await r!.json()) as { venda: Record<string, unknown> };
        return HttpResponse.json({ venda: { ...venda, numero: 2001, pecas: 7, totalCentavos: 12345, cliente: '' } }, { status: 201 });
      }),
    );
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await usuario.click(aba('Crédito'));
    await usuario.click(botaoFechar());
    const modal = await screen.findByRole('dialog');
    expect(texto(within(modal).getByText(/^Pedido #/))).toBe('Pedido #2001 · 7 peça(s) · R$ 123,45 em Crédito');
  });

  it('resposta 200 (reenvio já gravado) também abre o modal', async () => {
    const { usuario } = await abrirPdv();
    servidor.use(
      http.post('*/api/vendas', () =>
        HttpResponse.json(
          {
            venda: {
              numero: 1042, dataHora: '2026-09-27T14:00:00.000Z', hora: '11:00', vendedor: { id: 'carlos', nome: 'Carlos' }, cliente: 'Ana', cpf: '',
              pagamento: { id: 'pix', nome: 'Pix' }, itens: [], pecas: 1, brutoCentavos: 5500, descontoItensCentavos: 0, descontoTotalCentavos: 0, descontosCentavos: 0, totalCentavos: 5500,
            },
          },
          { status: 200 },
        ),
      ),
    );
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await usuario.click(aba('Pix'));
    await usuario.click(botaoFechar());
    expect(texto(within(await screen.findByRole('dialog')).getByText(/^Pedido #/))).toBe('Pedido #1042 · 1 peça(s) · R$ 55,00 em Pix · Ana');
  });
});

describe('RF-F09 — aba Dia', () => {
  it('sem vendas: caixas zeradas e "Nenhuma venda registrada ainda."', async () => {
    const { usuario } = await abrirPdv();
    await usuario.click(aba('Dia'));
    expect(await screen.findByText('Nenhuma venda registrada ainda.')).toBeInTheDocument();
    expect(texto(screen.getByText('Total do dia').parentElement!)).toBe('Total do diaR$ 0,00');
    expect(texto(screen.getByText('Pedidos').parentElement!)).toBe('Pedidos0');
  });

  it('reflete as vendas registradas, da mais recente para a mais antiga', async () => {
    const { usuario, simulado } = await abrirPdv();
    await montarReferencia(usuario);
    await usuario.click(botaoFechar());
    await usuario.click(await screen.findByRole('button', { name: 'Nova venda' }));
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await usuario.click(aba('Dinheiro'));
    await usuario.click(botaoFechar());
    await usuario.click(await screen.findByRole('button', { name: 'Nova venda' }));
    await usuario.click(aba('Dia'));
    const linhas = await screen.findAllByTestId('venda-dia');
    const hora = simulado.estado.vendas[1]!.hora;
    expect(linhas.map(texto)).toEqual([`Pedido #1043${hora} · 1 peça(s) · DinheiroR$ 55,00`, `Pedido #1042 · Maria${simulado.estado.vendas[0]!.hora} · 3 peça(s) · PixR$ 221,80`]);
    expect(hora).toMatch(/^\d{2}:\d{2}$/);
    expect(texto(screen.getByText('Total do dia').parentElement!)).toBe('Total do diaR$ 276,80');
    expect(texto(screen.getByText('Pedidos').parentElement!)).toBe('Pedidos2');
  });

  it('busca de novo a cada abertura da aba', async () => {
    let buscas = 0;
    servidor.events.on('request:start', ({ request }) => {
      if (request.url.endsWith('/api/vendas/hoje')) buscas++;
    });
    const { usuario } = await abrirPdv();
    await usuario.click(aba('Dia'));
    await screen.findByText('Nenhuma venda registrada ainda.');
    await usuario.click(aba('Produtos'));
    await usuario.click(aba('Dia'));
    await screen.findByText('Nenhuma venda registrada ainda.');
    servidor.events.removeAllListeners();
    expect(buscas).toBe(2);
  });

  it('falha → mensagem e "Tentar de novo"', async () => {
    let falhar = true;
    const { usuario } = await abrirPdv();
    servidor.use(http.get('*/api/vendas/hoje', () => (falhar ? HttpResponse.error() : undefined)));
    await usuario.click(aba('Dia'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão. Tente de novo.');
    falhar = false;
    await usuario.click(aba('Tentar de novo'));
    expect(await screen.findByText('Nenhuma venda registrada ainda.')).toBeInTheDocument();
  });
});

describe('RF-F10 — erros da API', () => {
  it('400 (CPF inválido): mensagem da API acima do botão, pedido mantido; editar apaga a mensagem', async () => {
    const { usuario, simulado } = await abrirPdv();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await usuario.type(screen.getByRole('textbox', { name: 'CPF (opcional)' }), '123.456.789-00');
    await usuario.click(aba('Pix'));
    await usuario.click(botaoFechar());
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('CPF inválido');
    // A caixa fica logo acima do botão de fechar.
    expect(alerta.nextElementSibling).toBe(botaoFechar());
    expect(itensPedido()).toHaveLength(1);
    expect(screen.getByRole('textbox', { name: 'CPF (opcional)' })).toHaveValue('123.456.789-00');
    expect(simulado.estado.vendas).toHaveLength(0);
    await usuario.click(within(itensPedido()[0]!).getByRole('button', { name: 'Aumentar quantidade' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('409 (chave em uso): mensagem da API e pedido mantido', async () => {
    const { usuario } = await abrirPdv();
    servidor.use(http.post('*/api/vendas', () => HttpResponse.json({ erro: { codigo: 'chave_em_uso', mensagem: 'Esta venda já foi registrada por outro vendedor.' } }, { status: 409 })));
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await usuario.click(aba('Pix'));
    await usuario.click(botaoFechar());
    expect(await screen.findByRole('alert')).toHaveTextContent('Esta venda já foi registrada por outro vendedor.');
    expect(itensPedido()).toHaveLength(1);
  });

  it('500: mensagem genérica, pedido mantido e reenvio com a mesma chave', async () => {
    let falhar = true;
    const corpos = capturarVendas();
    const { usuario } = await abrirPdv();
    servidor.use(http.post('*/api/vendas', () => (falhar ? new HttpResponse('erro', { status: 500 }) : undefined)));
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await usuario.click(aba('Pix'));
    await usuario.click(botaoFechar());
    expect(await screen.findByRole('alert')).toHaveTextContent('Algo deu errado. Tente de novo.');
    falhar = false;
    await usuario.click(botaoFechar());
    await screen.findByRole('dialog');
    servidor.events.removeAllListeners();
    expect(corpos[1].chaveIdempotencia).toBe(corpos[0].chaveIdempotencia);
  });

  it('qualquer alteração no pedido apaga o erro (pagamento, cliente, desconto)', async () => {
    const { usuario } = await abrirPdv();
    servidor.use(http.post('*/api/vendas', () => HttpResponse.error()));
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await usuario.click(aba('Pix'));
    const falhar = async () => {
      await usuario.click(botaoFechar());
      await screen.findByRole('alert');
    };
    await falhar();
    await usuario.click(aba('Débito'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await falhar();
    await usuario.type(screen.getByRole('textbox', { name: 'Nome do cliente' }), 'x');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await falhar();
    await usuario.click(aba('Aumentar desconto no total'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('erro inesperado (não ErroApi) ao fechar → mensagem genérica', async () => {
    const espiao = vi.spyOn(api, 'registrarVenda').mockRejectedValueOnce(new Error('boom'));
    const { usuario } = await abrirPdv();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await usuario.click(aba('Pix'));
    await usuario.click(botaoFechar());
    expect(await screen.findByRole('alert')).toHaveTextContent('Algo deu errado. Tente de novo.');
    espiao.mockRestore();
  });

  it('401 ao fechar a venda volta ao login (pedido não é preservado)', async () => {
    const { usuario, simulado } = await abrirPdv();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await usuario.click(aba('Pix'));
    simulado.estado.sessao = null;
    await usuario.click(botaoFechar());
    expect(await screen.findByRole('button', { name: 'Entrar no PDV' })).toBeInTheDocument();
    expect(screen.queryByText(/pedido novo/)).not.toBeInTheDocument();
    expect(simulado.estado.vendas).toHaveLength(0);
  });

  it('401 ao abrir a aba Dia volta ao login', async () => {
    const { usuario, simulado } = await abrirPdv();
    simulado.estado.sessao = null;
    await usuario.click(aba('Dia'));
    expect(await screen.findByRole('button', { name: 'Entrar no PDV' })).toBeInTheDocument();
  });

  it('catálogo: "Carregando…", falha com "Tentar de novo" e a aba Dia funciona sem catálogo', async () => {
    usarSimulado({ sessaoDe: 'carlos' });
    let falhar = true;
    servidor.use(http.get('*/api/catalogo', () => (falhar ? HttpResponse.error() : undefined)));
    const { usuario } = abrirApp();
    await screen.findByText('Carlos · pedido novo');
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão. Tente de novo.');
    expect(aba('Pedido')).toBeInTheDocument();
    await usuario.click(aba('Dia'));
    expect(await screen.findByText('Nenhuma venda registrada ainda.')).toBeInTheDocument();
    await usuario.click(aba('Produtos'));
    falhar = false;
    await usuario.click(aba('Tentar de novo'));
    await esperarCatalogo();
    expect(screen.queryByText('Carregando…')).not.toBeInTheDocument();
  });

  it('com o catálogo ainda carregando, aparece "Carregando…" e a aba Pedido não mostra o carrinho', async () => {
    let liberar!: () => void;
    const segura = new Promise<void>((r) => (liberar = r));
    usarSimulado({ sessaoDe: 'carlos' });
    servidor.use(
      http.get('*/api/catalogo', async () => {
        await segura;
        return undefined;
      }),
    );
    const { usuario } = abrirApp();
    await screen.findByText('Carlos · pedido novo');
    expect(screen.getByRole('status')).toHaveTextContent('Carregando…');
    await usuario.click(aba('Pedido'));
    expect(screen.getByRole('status')).toHaveTextContent('Carregando…');
    expect(screen.queryByRole('heading', { name: 'Novo pedido' })).not.toBeInTheDocument();
    liberar();
    expect(await screen.findByRole('heading', { name: 'Novo pedido' })).toBeInTheDocument();
  });
});

describe('RNF-F08 — PIN e CPF só em memória', () => {
  it('login + venda com CPF: nada em console, localStorage, sessionStorage ou URL', async () => {
    const metodos = ['log', 'info', 'warn', 'error', 'debug'] as const;
    const espioes = metodos.map((m) => vi.spyOn(console, m));
    const { usuario } = abrirApp();
    await screen.findByText('Digite sua senha de 4 números');
    for (const d of '1234') await usuario.click(screen.getByRole('button', { name: d }));
    await usuario.click(screen.getByRole('button', { name: 'Entrar no PDV' }));
    await esperarCatalogo();
    await adicionarPeca(usuario, TOP_NADADOR_P_VINHO);
    await usuario.type(screen.getByRole('textbox', { name: 'CPF (opcional)' }), '529.982.247-25');
    await usuario.click(aba('Pix'));
    await usuario.click(botaoFechar());
    await screen.findByRole('dialog');
    const registrado = espioes.flatMap((e) => e.mock.calls.map((c) => c.map(String).join(' '))).join('\n');
    espioes.forEach((e) => e.mockRestore());
    expect(registrado).not.toMatch(/1234|529\.?982|52998224725/);
    expect([localStorage.length, sessionStorage.length]).toEqual([0, 0]);
    expect(window.location.href).not.toMatch(/1234|529/);
  });
});
