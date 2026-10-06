/** Cliente HTTP (RF-F03, RF-F10): erro padronizado, 401 de sessão, rede e respostas fora do contrato. */
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, definirAoPerderSessao, ErroApi, MENSAGEM_GENERICA, MENSAGEM_SEM_CONEXAO } from '../../src/api/cliente';
import { servidor, usarSimulado } from '../apoio';

async function erroDe(p: Promise<unknown>): Promise<ErroApi> {
  const e = await p.then(
    () => null,
    (x: unknown) => x,
  );
  expect(e).toBeInstanceOf(ErroApi);
  return e as ErroApi;
}

afterEach(() => definirAoPerderSessao(() => {}));

describe('api — sucesso', () => {
  it('GET /config devolve o JSON', async () => {
    expect(await api.config()).toEqual({ loja: { nome: 'FitMoveOn', unidade: 'Unidade Centro' } });
  });

  it('POST /auth/login envia JSON com vendedorId e pin, na origem da página', async () => {
    const vistos: Array<{ url: string; metodo: string; tipo: string | null; corpo: unknown; credenciais: RequestCredentials }> = [];
    servidor.events.on('request:start', async ({ request }) => {
      vistos.push({ url: request.url, metodo: request.method, tipo: request.headers.get('content-type'), corpo: await request.clone().json(), credenciais: request.credentials });
    });
    const r = await api.login('carlos', '12345678');
    servidor.events.removeAllListeners();
    expect(r.vendedor).toEqual({ id: 'carlos', nome: 'Carlos', cargo: 'Vendedor · loja' });
    expect(vistos).toEqual([
      { url: `${window.location.origin}/api/auth/login`, metodo: 'POST', tipo: 'application/json', corpo: { vendedorId: 'carlos', pin: '12345678' }, credenciais: 'same-origin' },
    ]);
  });
});

describe('api — erros', () => {
  it('falha de rede → ErroApi status 0 "Sem conexão. Tente de novo."', async () => {
    servidor.use(http.get('*/api/catalogo', () => HttpResponse.error()));
    const e = await erroDe(api.catalogo());
    expect([e.status, e.codigo, e.message, e.name]).toEqual([0, 'sem_conexao', MENSAGEM_SEM_CONEXAO, 'ErroApi']);
    expect(MENSAGEM_SEM_CONEXAO).toBe('Sem conexão. Tente de novo.');
  });

  it('401 sessao_invalida chama aoPerderSessao e rejeita com a mensagem da API', async () => {
    const perdeu = vi.fn();
    definirAoPerderSessao(perdeu);
    const e = await erroDe(api.catalogo());
    expect(perdeu).toHaveBeenCalledTimes(1);
    expect([e.status, e.codigo, e.message]).toEqual([401, 'sessao_invalida', 'Sessão expirada. Entre de novo.']);
  });

  it('401 senha_incorreta NÃO chama aoPerderSessao', async () => {
    const perdeu = vi.fn();
    definirAoPerderSessao(perdeu);
    const e = await erroDe(api.login('carlos', '99999999'));
    expect(perdeu).not.toHaveBeenCalled();
    expect([e.status, e.codigo, e.message]).toEqual([401, 'senha_incorreta', 'Senha incorreta. Tente de novo.']);
  });

  it('401 sem corpo no formato do contrato não derruba a sessão', async () => {
    const perdeu = vi.fn();
    definirAoPerderSessao(perdeu);
    servidor.use(http.get('*/api/vendas/hoje', () => new HttpResponse('nao autorizado', { status: 401 })));
    const e = await erroDe(api.vendasHoje());
    expect(perdeu).not.toHaveBeenCalled();
    expect([e.status, e.codigo, e.message]).toEqual([401, 'erro_interno', MENSAGEM_GENERICA]);
  });

  it('resposta não-JSON (ex.: 502 de proxy) → mensagem genérica', async () => {
    servidor.use(http.get('*/api/config', () => new HttpResponse('<html>Bad Gateway</html>', { status: 502, headers: { 'Content-Type': 'text/html' } })));
    const e = await erroDe(api.config());
    expect([e.status, e.codigo, e.message]).toEqual([502, 'erro_interno', 'Algo deu errado. Tente de novo.']);
  });

  it('erro 400 no formato do contrato → código e mensagem da API', async () => {
    usarSimulado({ sessaoDe: 'carlos' });
    const e = await erroDe(api.registrarVenda({ chaveIdempotencia: crypto.randomUUID(), itens: [], descontoTotalCentavos: 0, cliente: '', telefone: '', pagamentoId: 'pix' }));
    expect([e.status, e.codigo, e.message]).toEqual([400, 'sem_itens', 'Inclua uma peça']);
  });

  it('500 com corpo de Erro → mensagem da API', async () => {
    servidor.use(http.get('*/api/vendas/hoje', () => HttpResponse.json({ erro: { codigo: 'erro_interno', mensagem: 'Erro interno. Tente de novo.' } }, { status: 500 })));
    const e = await erroDe(api.vendasHoje());
    expect([e.status, e.codigo, e.message]).toEqual([500, 'erro_interno', 'Erro interno. Tente de novo.']);
  });

  it('definirAoPerderSessao substitui o ouvinte anterior', async () => {
    const primeiro = vi.fn();
    const segundo = vi.fn();
    definirAoPerderSessao(primeiro);
    definirAoPerderSessao(segundo);
    await erroDe(api.sessao());
    expect(primeiro).not.toHaveBeenCalled();
    expect(segundo).toHaveBeenCalledTimes(1);
  });
});
