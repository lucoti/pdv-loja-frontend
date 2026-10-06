import type { components, paths } from './tipos.gerados';

/**
 * Cliente HTTP da API do PDV (contrato backend/contrato/openapi.yaml, tipos gerados — ADR-F03).
 * Mesmo domínio, em /api (ADR-007 do back); a sessão viaja no cookie HttpOnly, que o front nunca lê.
 */

type Esquemas = components['schemas'];
export type Vendedor = Esquemas['Vendedor'];
export type Catalogo = Esquemas['Catalogo'];
export type Venda = Esquemas['Venda'];
// Corpo do POST /vendas (INV-001): chaveIdempotencia, itens {skuId, qtd, descPercent},
// descontoTotalCentavos, cliente, cpf e pagamentoId — nenhum preço. No tipo gerado, `cpf` e `cliente`
// são obrigatórios (vão como '' quando vazios).
// ATENÇÃO: o tipo vem do openapi.yaml do back (`npm run gerar:tipos`). A troca de `cpf` por `telefone`
// (feature pdv-cliente-telefone) começa no contrato do back; o front só acompanha regerando os tipos.
export type VendaEntrada = Esquemas['VendaEntrada'];
export type ItemVendaEntrada = Esquemas['ItemVendaEntrada'];
export type VendasDoDia = Esquemas['VendasDoDia'];
export type RespostaVendedor = Esquemas['RespostaVendedor'];
export type ConfigLoja = paths['/config']['get']['responses'][200]['content']['application/json'];
type CodigoErro = Esquemas['Erro']['erro']['codigo'];

export const MENSAGEM_SEM_CONEXAO = 'Sem conexão. Tente de novo.';
export const MENSAGEM_GENERICA = 'Algo deu errado. Tente de novo.';

/** Erro de qualquer chamada. Status 0 = a requisição nem chegou ao servidor (rede). */
export class ErroApi extends Error {
  constructor(
    readonly status: number,
    readonly codigo: CodigoErro | 'sem_conexao',
    mensagem: string,
  ) {
    super(mensagem);
    this.name = 'ErroApi';
  }
}

// Avisado quando uma rota protegida responde 401 (sessão expirou à meia-noite, p. ex.) — RF-F03.
// Um único ouvinte (registrado pelo App): definir de novo substitui o anterior.
let aoPerderSessao: () => void = () => {};
export function definirAoPerderSessao(fn: () => void): void {
  aoPerderSessao = fn;
}

async function requisitar<T>(metodo: 'GET' | 'POST', caminho: string, corpo?: unknown): Promise<T> {
  let resposta: Response;
  try {
    // URL absoluta a partir da origem da página: mesmo domínio em produção, proxy/simulado em dev.
    resposta = await fetch(`${window.location.origin}/api${caminho}`, {
      method: metodo,
      credentials: 'same-origin',
      headers: corpo === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
  } catch {
    throw new ErroApi(0, 'sem_conexao', MENSAGEM_SEM_CONEXAO);
  }

  const dados: unknown = await resposta.json().catch(() => undefined);
  if (resposta.ok) return dados as T;

  const erro = (dados as Partial<Esquemas['Erro']> | undefined)?.erro;
  // Só "sessao_invalida" derruba a sessão: o 401 do login ("senha_incorreta") é tratado pela própria tela.
  if (resposta.status === 401 && erro?.codigo === 'sessao_invalida') aoPerderSessao();
  // Resposta sem o formato do contrato (ex.: 502 de um proxy): mensagem genérica.
  throw new ErroApi(resposta.status, erro?.codigo ?? 'erro_interno', erro?.mensagem ?? MENSAGEM_GENERICA);
}

export const api = {
  config: () => requisitar<ConfigLoja>('GET', '/config'),
  vendedores: () => requisitar<{ vendedores: Vendedor[] }>('GET', '/vendedores'),
  login: (vendedorId: string, pin: string) => requisitar<RespostaVendedor>('POST', '/auth/login', { vendedorId, pin }),
  sessao: () => requisitar<RespostaVendedor>('GET', '/auth/sessao'),
  catalogo: () => requisitar<Catalogo>('GET', '/catalogo'),
  // Reenviar o mesmo corpo com a mesma chave não duplica a venda: o servidor devolve a já registrada.
  // Erros de negócio (409 sem_estoque, 400 item_invalido / cpf_invalido…) chegam como ErroApi com `codigo`.
  registrarVenda: (venda: VendaEntrada) => requisitar<{ venda: Venda }>('POST', '/vendas', venda),
  vendasHoje: () => requisitar<VendasDoDia>('GET', '/vendas/hoje'),
};
