/** Login (RF-F01, RF-F02) e sessão (RF-F03) pela página inteira. */
import { act, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { api } from '../../src/api/cliente';
import { VENDEDORES } from '../../src/simulado/dados';
import { servidor, usarSimulado } from '../apoio';
import { ENTRADA_LOGIN, validarEntrada } from '../contrato';
import { abrirApp, digitarPin, entrar } from './ajuda';

const ANA = { id: 'ana', nome: 'Ana', cargo: 'Gerente' };
const marcadores = () => screen.getByRole('img', { name: /números digitados/ }).getAttribute('aria-label');

/**
 * Toques "no mesmo instante": cliques nativos em sequência dentro de um único act, de modo que a tela
 * NÃO é redesenhada entre um toque e outro (o React só redesenha ao sair do act). É o que acontece no
 * navegador com toques mais rápidos que o redesenho. fireEvent/userEvent não servem aqui: redesenham
 * a cada toque e escondem o defeito de ler a senha (ou a trava) do estado em vez do useRef.
 */
function tocarSemRedesenhar(nomes: string[]) {
  const teclas = nomes.map((nome) => screen.getByRole('button', { name: nome }));
  act(() => {
    for (const tecla of teclas) tecla.click();
  });
}

/** Deixa o login pendente até `liberar()` e registra o corpo de cada pedido recebido. */
function prenderLogin() {
  const corpos: unknown[] = [];
  let liberar = () => {};
  const preso = new Promise<void>((r) => (liberar = r));
  servidor.use(
    http.post('*/api/auth/login', async ({ request }) => {
      corpos.push(await request.clone().json());
      await preso;
      return undefined; // segue para o login do simulado
    }),
  );
  return { corpos, liberar: () => liberar() };
}

describe('RF-F01 — escolha do vendedor', () => {
  it('com mais de um vendedor mostra "Quem está vendendo?" com inicial, nome e cargo', async () => {
    usarSimulado({ vendedores: [...VENDEDORES, ANA] });
    abrirApp();
    expect(await screen.findByRole('heading', { name: 'Quem está vendendo?' })).toBeInTheDocument();
    const carlos = screen.getByRole('button', { name: /Carlos/ });
    expect(carlos).toHaveTextContent('C');
    expect(carlos).toHaveTextContent('Vendedor · loja');
    expect(screen.getByRole('button', { name: /Ana/ })).toHaveTextContent('Gerente');
    expect(screen.queryByText('Digite sua senha de 8 números')).not.toBeInTheDocument();
  });

  it('com um único vendedor a seleção é omitida e não há botão voltar', async () => {
    abrirApp();
    expect(await screen.findByText('Digite sua senha de 8 números')).toBeInTheDocument();
    expect(screen.getByText('Carlos')).toBeInTheDocument();
    expect(screen.queryByText('Quem está vendendo?')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Trocar vendedor' })).not.toBeInTheDocument();
  });

  it('escolher vendedor abre o PIN; voltar retorna à seleção e limpa o PIN', async () => {
    usarSimulado({ vendedores: [...VENDEDORES, ANA], pins: { carlos: '12345678', ana: '56781234' } });
    const { usuario } = abrirApp();
    await usuario.click(await screen.findByRole('button', { name: /Ana/ }));
    expect(screen.getByText('Ana')).toBeInTheDocument();
    await digitarPin(usuario, '56');
    expect(marcadores()).toBe('2 de 8 números digitados');
    await usuario.click(screen.getByRole('button', { name: 'Trocar vendedor' }));
    expect(screen.getByRole('heading', { name: 'Quem está vendendo?' })).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: /Ana/ }));
    expect(marcadores()).toBe('0 de 8 números digitados');
    await digitarPin(usuario, '56781234');
    expect(await screen.findByText('Ana · pedido novo')).toBeInTheDocument();
  });

  it('cabeçalho "BALCÃO" e "Ponto de venda · {unidade}"; rodapé só com "Esqueceu a senha?"', async () => {
    abrirApp();
    expect(await screen.findByText('Ponto de venda · Unidade Centro')).toBeInTheDocument();
    expect(screen.getByText('BALCÃO')).toBeInTheDocument();
    expect(screen.getByText('Esqueceu a senha? Peça ao gerente.')).toBeInTheDocument();
    expect(screen.queryByText(/Senha de teste/)).not.toBeInTheDocument();
  });
});

describe('RF-F02 — PIN', () => {
  it('teclado próprio: sem <input>, teclas 0–9 e "apagar"', async () => {
    const { container } = abrirApp();
    await screen.findByText('Digite sua senha de 8 números');
    expect(container.querySelector('input')).toBeNull();
    for (const d of '0123456789') expect(screen.getByRole('button', { name: d })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'apagar' })).toBeInTheDocument();
  });

  it('não há botão "Entrar no PDV": o 8º número valida a senha; "apagar" remove o último', async () => {
    let logins = 0;
    servidor.events.on('request:start', ({ request }) => {
      if (request.url.endsWith('/api/auth/login')) logins++;
    });
    const { usuario } = abrirApp();
    await screen.findByText('Digite sua senha de 8 números');
    expect(screen.queryByRole('button', { name: 'Entrar no PDV' })).not.toBeInTheDocument();
    await digitarPin(usuario, '12345679');
    // 8 números errados: valida sozinho, falha e limpa.
    expect(await screen.findByRole('alert')).toHaveTextContent('Senha incorreta. Tente de novo.');
    expect(logins).toBe(1);
    await digitarPin(usuario, '1234567');
    expect(marcadores()).toBe('7 de 8 números digitados');
    await usuario.click(screen.getByRole('button', { name: 'apagar' }));
    expect(marcadores()).toBe('6 de 8 números digitados');
    // Com menos de 8 números nada é enviado.
    expect(logins).toBe(1);
    await digitarPin(usuario, '78');
    expect(await screen.findByText('Carlos · pedido novo')).toBeInTheDocument();
    servidor.events.removeAllListeners();
    expect(logins).toBe(2);
  });

  it('toques mais rápidos que o redesenho da tela não perdem números nem enviam duas vezes', async () => {
    const { corpos, liberar } = prenderLogin();
    abrirApp();
    await screen.findByText('Digite sua senha de 8 números');
    // Depois do 8º número vêm, no mesmo instante, um 9º número, um "apagar" e mais um número: todos ignorados.
    tocarSemRedesenhar([...'123456789', 'apagar', '8']);
    await waitFor(() => expect(corpos).toHaveLength(1));
    expect(corpos).toEqual([{ vendedorId: 'carlos', pin: '12345678' }]);
    expect(marcadores()).toBe('8 de 8 números digitados');
    liberar();
    expect(await screen.findByText('Carlos · pedido novo')).toBeInTheDocument();
    expect(corpos).toHaveLength(1);
  });

  it('toques no mesmo instante: "apagar" no meio da senha vale, e o envio sai só no 8º número', async () => {
    const { corpos, liberar } = prenderLogin();
    abrirApp();
    await screen.findByText('Digite sua senha de 8 números');
    tocarSemRedesenhar([...'1239', 'apagar', ...'456']);
    expect(marcadores()).toBe('6 de 8 números digitados');
    expect(corpos).toEqual([]);
    tocarSemRedesenhar([...'78']);
    await waitFor(() => expect(corpos).toEqual([{ vendedorId: 'carlos', pin: '12345678' }]));
    liberar();
    expect(await screen.findByText('Carlos · pedido novo')).toBeInTheDocument();
    expect(corpos).toHaveLength(1);
  });

  it('depois de um erro, toques no mesmo instante recomeçam do zero e enviam a senha nova inteira', async () => {
    const corpos: unknown[] = [];
    servidor.events.on('request:start', async ({ request }) => {
      if (request.url.endsWith('/api/auth/login')) corpos.push(await request.clone().json());
    });
    abrirApp();
    await screen.findByText('Digite sua senha de 8 números');
    tocarSemRedesenhar([...'87654321']);
    expect(await screen.findByRole('alert')).toHaveTextContent('Senha incorreta. Tente de novo.');
    expect(marcadores()).toBe('0 de 8 números digitados');
    tocarSemRedesenhar([...'12345678']);
    expect(await screen.findByText('Carlos · pedido novo')).toBeInTheDocument();
    servidor.events.removeAllListeners();
    expect(corpos).toEqual([
      { vendedorId: 'carlos', pin: '87654321' },
      { vendedorId: 'carlos', pin: '12345678' },
    ]);
  });

  it('enquanto valida, o teclado e "Trocar vendedor" ficam travados e os 8 marcadores preenchidos', async () => {
    usarSimulado({ vendedores: [...VENDEDORES, ANA], pins: { carlos: '12345678', ana: '56781234' } });
    let liberar = () => {};
    const preso = new Promise<void>((r) => (liberar = r));
    servidor.use(
      http.post('*/api/auth/login', async () => {
        await preso;
        return HttpResponse.error();
      }),
    );
    const { usuario } = abrirApp();
    await usuario.click(await screen.findByRole('button', { name: /Ana/ }));
    await digitarPin(usuario, '56781234');
    expect(marcadores()).toBe('8 de 8 números digitados');
    for (const nome of [...'0123456789', 'apagar', 'Trocar vendedor']) expect(screen.getByRole('button', { name: nome })).toBeDisabled();
    liberar();
    // Depois da resposta o teclado volta a responder.
    await screen.findByRole('alert');
    for (const nome of [...'0123456789', 'apagar', 'Trocar vendedor']) expect(screen.getByRole('button', { name: nome })).toBeEnabled();
  });

  it('PIN errado (401) limpa o PIN e mostra o erro; novo dígito apaga o erro', async () => {
    const { usuario } = abrirApp();
    await screen.findByText('Digite sua senha de 8 números');
    await digitarPin(usuario, '99999999');
    expect(await screen.findByRole('alert')).toHaveTextContent('Senha incorreta. Tente de novo.');
    expect(marcadores()).toBe('0 de 8 números digitados');
    await digitarPin(usuario, '1');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await digitarPin(usuario, '99');
    await usuario.click(screen.getByRole('button', { name: 'apagar' }));
    expect(marcadores()).toBe('2 de 8 números digitados');
  });

  it('"apagar" também apaga a mensagem de erro', async () => {
    const { usuario } = abrirApp();
    await screen.findByText('Digite sua senha de 8 números');
    await digitarPin(usuario, '00000000');
    await screen.findByRole('alert');
    await usuario.click(screen.getByRole('button', { name: 'apagar' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('falha de rede no login limpa o PIN e mostra "Sem conexão. Tente de novo."; digitar de novo entra', async () => {
    let falhar = true;
    servidor.use(http.post('*/api/auth/login', () => (falhar ? HttpResponse.error() : undefined)));
    const { usuario } = abrirApp();
    await screen.findByText('Digite sua senha de 8 números');
    await digitarPin(usuario, '12345678');
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão. Tente de novo.');
    expect(marcadores()).toBe('0 de 8 números digitados');
    falhar = false;
    await digitarPin(usuario, '12345678');
    expect(await screen.findByText('Carlos · pedido novo')).toBeInTheDocument();
  });

  it('PIN certo abre a venda direto; o corpo enviado segue o contrato', async () => {
    const corpos: unknown[] = [];
    servidor.events.on('request:start', async ({ request }) => {
      if (request.url.endsWith('/api/auth/login')) corpos.push(await request.clone().json());
    });
    const { usuario } = abrirApp();
    await screen.findByText('Digite sua senha de 8 números');
    await entrar(usuario);
    servidor.events.removeAllListeners();
    expect(screen.getByText('Carlos · pedido novo')).toBeInTheDocument();
    expect(corpos).toEqual([{ vendedorId: 'carlos', pin: '12345678' }]);
    validarEntrada(ENTRADA_LOGIN, corpos[0]);
  });

  it('falha ao carregar config/vendedores → erro e "Tentar de novo" que recarrega', async () => {
    let falhar = true;
    servidor.use(http.get('*/api/vendedores', () => (falhar ? HttpResponse.error() : undefined)));
    const { usuario } = abrirApp();
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão. Tente de novo.');
    expect(screen.getByText('Ponto de venda')).toBeInTheDocument();
    falhar = false;
    await usuario.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText('Digite sua senha de 8 números')).toBeInTheDocument();
    expect(screen.getByText('Ponto de venda · Unidade Centro')).toBeInTheDocument();
  });

  it('mostra "Carregando…" enquanto os dados do login chegam', async () => {
    abrirApp();
    // Primeiro a verificação de sessão, depois config/vendedores: ambos em "Carregando…".
    expect(screen.getByRole('status')).toHaveTextContent('Carregando…');
    await screen.findByText('Digite sua senha de 8 números');
    expect(screen.queryByText('Carregando…')).not.toBeInTheDocument();
  });

  it('erro não-ErroApi no login mostra a mensagem genérica (defensivo)', async () => {
    // Resposta 200 sem corpo: api.login resolve com undefined e o acesso a .vendedor lança TypeError.
    servidor.use(http.post('*/api/auth/login', () => new HttpResponse(null, { status: 200 })));
    const { usuario } = abrirApp();
    await screen.findByText('Digite sua senha de 8 números');
    await digitarPin(usuario, '12345678');
    expect(await screen.findByRole('alert')).toHaveTextContent('Algo deu errado. Tente de novo.');
    expect(marcadores()).toBe('0 de 8 números digitados');
  });
});

describe('RF-F03 — sessão', () => {
  it('sessão válida ao abrir → vai direto para a venda, sem login', async () => {
    usarSimulado({ sessaoDe: 'carlos' });
    abrirApp();
    expect(await screen.findByText('Carlos · pedido novo')).toBeInTheDocument();
    expect(screen.queryByText('Digite sua senha de 8 números')).not.toBeInTheDocument();
  });

  it('sem sessão → login', async () => {
    abrirApp();
    expect(await screen.findByText('Digite sua senha de 8 números')).toBeInTheDocument();
  });

  it('falha de rede ao verificar a sessão → "Tentar de novo" (não manda ao login)', async () => {
    usarSimulado({ sessaoDe: 'carlos' });
    let falhar = true;
    servidor.use(http.get('*/api/auth/sessao', () => (falhar ? HttpResponse.error() : undefined)));
    const { usuario } = abrirApp();
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão. Tente de novo.');
    expect(screen.queryByText('Digite sua senha de 8 números')).not.toBeInTheDocument();
    falhar = false;
    await usuario.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText('Carlos · pedido novo')).toBeInTheDocument();
  });

  it('500 na verificação de sessão → mensagem da API e "Tentar de novo"', async () => {
    servidor.use(http.get('*/api/auth/sessao', () => HttpResponse.json({ erro: { codigo: 'erro_interno', mensagem: 'Erro interno.' } }, { status: 500 })));
    abrirApp();
    expect(await screen.findByRole('alert')).toHaveTextContent('Erro interno.');
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });

  it('rejeição que não é ErroApi na verificação de sessão → mensagem genérica, sem texto técnico', async () => {
    const espiao = vi.spyOn(api, 'sessao').mockRejectedValueOnce(new Error('falhou'));
    abrirApp();
    expect(await screen.findByRole('alert')).toHaveTextContent('Algo deu errado. Tente de novo.');
    expect(screen.queryByText(/falhou/)).not.toBeInTheDocument();
    espiao.mockRestore();
  });

  it('RF-I06: 200 fora do contrato na sessão (sem corpo) → "Tentar de novo", não fica em "Carregando…"', async () => {
    let foraDoContrato = true;
    usarSimulado({ sessaoDe: 'carlos' });
    servidor.use(http.get('*/api/auth/sessao', () => (foraDoContrato ? new HttpResponse(null, { status: 200 }) : undefined)));
    const { usuario } = abrirApp();
    expect(await screen.findByRole('alert')).toHaveTextContent('Algo deu errado. Tente de novo.');
    expect(screen.queryByText('Carregando…')).not.toBeInTheDocument();
    foraDoContrato = false;
    await usuario.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText('Carlos · pedido novo')).toBeInTheDocument();
  });

  it('401 numa rota protegida (catálogo) volta ao login', async () => {
    const sim = usarSimulado({ sessaoDe: 'carlos' });
    servidor.use(
      http.get('*/api/catalogo', () => {
        sim.estado.sessao = null;
        return undefined;
      }),
    );
    abrirApp();
    expect(await screen.findByText('Digite sua senha de 8 números')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(/pedido novo/)).not.toBeInTheDocument());
  });
});
