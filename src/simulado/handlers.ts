import { http, HttpResponse } from 'msw';
import type { Catalogo, Venda, VendaEntrada, Vendedor } from '../api/cliente';
import { calcularItem, calcularTotais, DESCONTOS_ITEM } from '../dominio/precos';
import { CATALOGO, CONFIG, PINS, VENDEDORES } from './dados';

/**
 * Servidor simulado da API (ADR-F04): as mesmas rotas, formatos, regras e códigos de erro do
 * pdv-backend, em memória. Usado no `npm run dev` (navegador) e nos testes (msw/node).
 * A sessão é um estado em memória: recarregar a página no modo simulado volta ao login.
 */

const PRIMEIRO_NUMERO_PEDIDO = 1042;
const FUSO_LOJA = 'America/Sao_Paulo';
const horaLocal = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO_LOJA, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Codigo = 'entrada_invalida' | 'senha_incorreta' | 'sessao_invalida' | 'sem_itens' | 'sem_pagamento' | 'item_invalido' | 'item_repetido' | 'telefone_invalido' | 'chave_em_uso' | 'sem_estoque';

function erro(status: number, codigo: Codigo, mensagem: string) {
  return HttpResponse.json({ erro: { codigo, mensagem } }, { status });
}

const semSessao = () => erro(401, 'sessao_invalida', 'Sessão expirada. Entre de novo.');

/** Mesma regra do back (dominio/telefone.ts): só a máscara da tela e exatamente 11 dígitos (DDD + celular). */
function telefoneValido(valor: string): boolean {
  return /^[\d\s()-]+$/.test(valor) && valor.replace(/\D/g, '').length === 11;
}

const diaLocal = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO_LOJA });

/** Próxima meia-noite em São Paulo (UTC−3, sem horário de verão), como o `expiraEm` do back. */
function meiaNoiteSeguinte(): string {
  const hoje = new Date(`${diaLocal.format(new Date())}T03:00:00.000Z`);
  return new Date(hoje.getTime() + 24 * 60 * 60 * 1000).toISOString();
}

export interface OpcoesSimulado {
  vendedores?: Vendedor[];
  pins?: Record<string, string>;
  /** Já começa com sessão aberta para este vendedor. */
  sessaoDe?: string;
  /** Catálogo inicial (padrão: CATALOGO). É copiado: as vendas baixam o saldo só nesta cópia. */
  catalogo?: Catalogo;
}

/** Cria um simulado com estado próprio (sessão e vendas); cada teste pode começar do zero. */
export function criarSimulado(opcoes: OpcoesSimulado = {}) {
  const vendedores = opcoes.vendedores ?? VENDEDORES;
  const pins = opcoes.pins ?? PINS;
  const estado = {
    sessao: opcoes.sessaoDe ?? (null as string | null),
    vendas: [] as Array<Venda & { chave: string }>,
    catalogo: structuredClone(opcoes.catalogo ?? CATALOGO),
  };

  // SKU com o produto dele, procurado no catálogo desta instância.
  const acharSku = (skuId: number) => {
    for (const produto of estado.catalogo.produtos) {
      const sku = produto.skus.find((s) => s.id === skuId);
      if (sku) return { produto, sku };
    }
    return undefined;
  };

  const vendedorDaSessao = () => vendedores.find((v) => v.id === estado.sessao);

  function registrar(vendedor: Vendedor, e: VendaEntrada) {
    if (e.itens.length === 0) return erro(400, 'sem_itens', 'Inclua uma peça');
    const pagamento = estado.catalogo.pagamentos.find((p) => p.id === e.pagamentoId);
    if (!pagamento) return erro(400, 'sem_pagamento', 'Escolha o pagamento');
    // Mesma ordem do back: sem_itens → sem_pagamento → telefone_invalido → item_invalido/item_repetido → sem_estoque.
    const telefoneInformado = (e.telefone ?? '').trim();
    if (telefoneInformado && !telefoneValido(telefoneInformado)) return erro(400, 'telefone_invalido', 'Celular inválido');

    const vistos = new Set<number>();
    const itens: Venda['itens'] = [];
    const baixas: Array<{ sku: Catalogo['produtos'][number]['skus'][number]; qtd: number }> = [];
    const faltas: string[] = [];
    for (const [i, item] of e.itens.entries()) {
      const posicao = `Item ${i + 1}`;
      const achado = acharSku(item.skuId);
      if (!achado) return erro(400, 'item_invalido', `${posicao}: produto indisponível.`);
      if (!Number.isInteger(item.qtd) || item.qtd < 1 || !(DESCONTOS_ITEM as readonly number[]).includes(item.descPercent)) {
        return erro(400, 'entrada_invalida', 'Dados inválidos.');
      }
      const { produto, sku } = achado;
      if (vistos.has(sku.id)) return erro(400, 'item_repetido', `${posicao}: peça repetida — junte as quantidades numa linha só.`);
      vistos.add(sku.id);
      if (item.qtd > sku.saldo) faltas.push(`${posicao}: ${produto.nome} · ${sku.cor.nome} · ${sku.tamanho.sigla} — ${sku.saldo > 0 ? `só ${sku.saldo} em estoque` : 'sem estoque'}`);
      baixas.push({ sku, qtd: item.qtd });
      itens.push({
        modeloId: `produto:${produto.numero}`,
        modeloNome: produto.nome,
        // ATENÇÃO: simplificação — o simulado tem um tecido só; o back grava o id real do tecido do produto.
        tecidoId: 'tecido:1',
        tecidoNome: produto.tecidoNome,
        tamanho: sku.tamanho.sigla,
        cor: sku.cor.nome,
        qtd: item.qtd,
        precoUnitCentavos: sku.precoCentavos,
        descPercent: item.descPercent,
        subtotalCentavos: calcularItem(sku.precoCentavos, item.qtd, item.descPercent).subtotalCentavos,
      });
    }
    // Mesma regra do back: sem saldo não vende, e nada é gravado.
    if (faltas.length) return erro(409, 'sem_estoque', `${faltas.join('; ')}.`);

    const descontoTotal = e.descontoTotalCentavos ?? 0;
    if (descontoTotal < 0 || descontoTotal % 500 !== 0) return erro(400, 'entrada_invalida', 'Dados inválidos.');
    const totais = calcularTotais(
      itens.map((i) => ({ ...calcularItem(i.precoUnitCentavos, i.qtd, i.descPercent), qtd: i.qtd })),
      descontoTotal,
    );
    const agora = new Date();
    const numero = Math.max(PRIMEIRO_NUMERO_PEDIDO - 1, ...estado.vendas.map((v) => v.numero)) + 1;
    const venda: Venda = {
      numero,
      dataHora: agora.toISOString(),
      hora: horaLocal.format(agora),
      vendedor: { id: vendedor.id, nome: vendedor.nome },
      cliente: e.cliente ?? '',
      telefone: telefoneInformado.replace(/\D/g, ''),
      pagamento: { id: pagamento.id, nome: pagamento.nome },
      itens,
      ...totais,
    };
    // A baixa só acontece depois de todas as validações, imitando o batch atômico do back.
    for (const b of baixas) b.sku.saldo -= b.qtd;
    estado.vendas.push({ ...venda, chave: e.chaveIdempotencia });
    return HttpResponse.json({ venda }, { status: 201 });
  }

  const handlers = [
    http.get('*/api/config', () => HttpResponse.json(CONFIG)),

    http.get('*/api/vendedores', () => HttpResponse.json({ vendedores })),

    // Login simulado: mesmos status e códigos do back (400 entrada_invalida, 401 senha_incorreta), com o
    // PIN comparado em texto puro porque aqui não há banco nem hash.
    // ATENÇÃO: simplificações em relação ao back — a mensagem do 400 é outra ("A senha deve ter 8
    // números." aqui; "Digite a senha de 8 números." no back), campos extras no corpo não são recusados
    // e não existe vendedor inativo. A tela real nunca chega ao 400, pois só envia com o PIN completo.
    // O tamanho (8 números) está escrito direto na regra abaixo: precisa acompanhar o TAMANHO_PIN da
    // tela (Login.tsx) e o contrato do back; o teste de contrato do simulado acusa a divergência.
    http.post('*/api/auth/login', async ({ request }) => {
      const corpo = (await request.json().catch(() => null)) as { vendedorId?: unknown; pin?: unknown } | null;
      if (typeof corpo?.vendedorId !== 'string' || typeof corpo.pin !== 'string' || !/^\d{8}$/.test(corpo.pin)) {
        return erro(400, 'entrada_invalida', 'A senha deve ter 8 números.');
      }
      const vendedor = vendedores.find((v) => v.id === corpo.vendedorId);
      if (!vendedor || pins[vendedor.id] !== corpo.pin) return erro(401, 'senha_incorreta', 'Senha incorreta. Tente de novo.');
      estado.sessao = vendedor.id;
      return HttpResponse.json({ vendedor, expiraEm: meiaNoiteSeguinte() });
    }),

    http.get('*/api/auth/sessao', () => {
      const vendedor = vendedorDaSessao();
      return vendedor ? HttpResponse.json({ vendedor, expiraEm: meiaNoiteSeguinte() }) : semSessao();
    }),

    http.post('*/api/auth/logout', () => {
      estado.sessao = null;
      return new HttpResponse(null, { status: 204 });
    }),

    http.get('*/api/catalogo', () => (vendedorDaSessao() ? HttpResponse.json(estado.catalogo) : semSessao())),

    http.post('*/api/vendas', async ({ request }) => {
      const vendedor = vendedorDaSessao();
      if (!vendedor) return semSessao();
      const e = (await request.json().catch(() => null)) as VendaEntrada | null;
      if (!e || typeof e.chaveIdempotencia !== 'string' || !UUID.test(e.chaveIdempotencia) || !Array.isArray(e.itens)) {
        return erro(400, 'entrada_invalida', 'Dados inválidos.');
      }
      // O back valida o corpo com objeto estrito: o campo antigo `cpf` é recusado antes da idempotência.
      if ('cpf' in e) return erro(400, 'entrada_invalida', 'Campo não permitido: cpf.');
      // Idempotência: a mesma chave devolve a venda original (200); de outro vendedor, 409.
      const anterior = estado.vendas.find((v) => v.chave === e.chaveIdempotencia);
      if (anterior) {
        if (anterior.vendedor.id !== vendedor.id) return erro(409, 'chave_em_uso', 'Esta venda já foi registrada por outro vendedor.');
        const { chave: _chave, ...venda } = anterior;
        return HttpResponse.json({ venda }, { status: 200 });
      }
      return registrar(vendedor, e);
    }),

    http.get('*/api/vendas/hoje', () => {
      const vendedor = vendedorDaSessao();
      if (!vendedor) return semSessao();
      // Mais recente primeiro, como o back. O simulado não vira o dia: vale enquanto a página estiver aberta.
      const minhas = estado.vendas.filter((v) => v.vendedor.id === vendedor.id).reverse();
      return HttpResponse.json({
        vendas: minhas.map((v) => ({ numero: v.numero, cliente: v.cliente, hora: v.hora, pecas: v.pecas, pagamento: v.pagamento.nome, totalCentavos: v.totalCentavos })),
        totalDiaCentavos: minhas.reduce((s, v) => s + v.totalCentavos, 0),
        quantidadePedidos: minhas.length,
      });
    }),
  ];

  return { handlers, estado };
}
