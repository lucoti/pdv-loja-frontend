/** Login (RF-F01, RF-F02) e sessão (RF-F03) pela página inteira. */
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { api } from '../../src/api/cliente';
import { VENDEDORES } from '../../src/simulado/dados';
import { servidor, usarSimulado } from '../apoio';
import { ENTRADA_LOGIN, validarEntrada } from '../contrato';
import { abrirApp, digitarPin, entrar } from './ajuda';

const ANA = { id: 'ana', nome: 'Ana', cargo: 'Gerente' };
const marcadores = () => screen.getByRole('img', { name: /números digitados/ }).getAttribute('aria-label');

describe('RF-F01 — escolha do vendedor', () => {
  it('com mais de um vendedor mostra "Quem está vendendo?" com inicial, nome e cargo', async () => {
    usarSimulado({ vendedores: [...VENDEDORES, ANA] });
    abrirApp();
    expect(await screen.findByRole('heading', { name: 'Quem está vendendo?' })).toBeInTheDocument();
    const carlos = screen.getByRole('button', { name: /Carlos/ });
    expect(carlos).toHaveTextContent('C');
    expect(carlos).toHaveTextContent('Vendedor · loja');
    expect(screen.getByRole('button', { name: /Ana/ })).toHaveTextContent('Gerente');
    expect(screen.queryByRole('button', { name: 'Entrar no PDV' })).not.toBeInTheDocument();
  });

  it('com um único vendedor a seleção é omitida e não há botão voltar', async () => {
    abrirApp();
    expect(await screen.findByText('Digite sua senha de 4 números')).toBeInTheDocument();
    expect(screen.getByText('Carlos')).toBeInTheDocument();
    expect(screen.queryByText('Quem está vendendo?')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Trocar vendedor' })).not.toBeInTheDocument();
  });

  it('escolher vendedor abre o PIN; voltar retorna à seleção e limpa o PIN', async () => {
    usarSimulado({ vendedores: [...VENDEDORES, ANA], pins: { carlos: '1234', ana: '5678' } });
    const { usuario } = abrirApp();
    await usuario.click(await screen.findByRole('button', { name: /Ana/ }));
    expect(screen.getByText('Ana')).toBeInTheDocument();
    await digitarPin(usuario, '56');
    expect(marcadores()).toBe('2 de 4 números digitados');
    await usuario.click(screen.getByRole('button', { name: 'Trocar vendedor' }));
    expect(screen.getByRole('heading', { name: 'Quem está vendendo?' })).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: /Ana/ }));
    expect(marcadores()).toBe('0 de 4 números digitados');
    await digitarPin(usuario, '5678');
    await usuario.click(screen.getByRole('button', { name: 'Entrar no PDV' }));
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
    await screen.findByText('Digite sua senha de 4 números');
    expect(container.querySelector('input')).toBeNull();
    for (const d of '0123456789') expect(screen.getByRole('button', { name: d })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'apagar' })).toBeInTheDocument();
  });

  it('aceita no máximo 4 dígitos, "apagar" remove o último e "Entrar" só habilita com 4', async () => {
    const { usuario } = abrirApp();
    await screen.findByText('Digite sua senha de 4 números');
    const entrarBtn = screen.getByRole('button', { name: 'Entrar no PDV' });
    expect(entrarBtn).toBeDisabled();
    await digitarPin(usuario, '123');
    expect(entrarBtn).toBeDisabled();
    await digitarPin(usuario, '45');
    expect(marcadores()).toBe('4 de 4 números digitados');
    expect(entrarBtn).toBeEnabled();
    await usuario.click(screen.getByRole('button', { name: 'apagar' }));
    expect(marcadores()).toBe('3 de 4 números digitados');
    expect(entrarBtn).toBeDisabled();
    // O 5º dígito foi ignorado: com "4" o PIN volta a ser 1234 e entra.
    await digitarPin(usuario, '4');
    await usuario.click(entrarBtn);
    expect(await screen.findByText('Carlos · pedido novo')).toBeInTheDocument();
  });

  it('PIN errado (401) limpa o PIN e mostra o erro; novo dígito apaga o erro', async () => {
    const { usuario } = abrirApp();
    await screen.findByText('Digite sua senha de 4 números');
    await digitarPin(usuario, '9999');
    await usuario.click(screen.getByRole('button', { name: 'Entrar no PDV' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Senha incorreta. Tente de novo.');
    expect(marcadores()).toBe('0 de 4 números digitados');
    await digitarPin(usuario, '1');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await digitarPin(usuario, '99');
    await usuario.click(screen.getByRole('button', { name: 'apagar' }));
    expect(marcadores()).toBe('2 de 4 números digitados');
  });

  it('"apagar" também apaga a mensagem de erro', async () => {
    const { usuario } = abrirApp();
    await screen.findByText('Digite sua senha de 4 números');
    await digitarPin(usuario, '0000');
    await usuario.click(screen.getByRole('button', { name: 'Entrar no PDV' }));
    await screen.findByRole('alert');
    await usuario.click(screen.getByRole('button', { name: 'apagar' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('falha de rede no login mantém o PIN e mostra "Sem conexão. Tente de novo."', async () => {
    servidor.use(http.post('*/api/auth/login', () => HttpResponse.error()));
    const { usuario } = abrirApp();
    await screen.findByText('Digite sua senha de 4 números');
    await digitarPin(usuario, '1234');
    await usuario.click(screen.getByRole('button', { name: 'Entrar no PDV' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão. Tente de novo.');
    expect(marcadores()).toBe('4 de 4 números digitados');
    expect(screen.getByRole('button', { name: 'Entrar no PDV' })).toBeEnabled();
  });

  it('PIN certo abre a venda direto; o corpo enviado segue o contrato', async () => {
    const corpos: unknown[] = [];
    servidor.events.on('request:start', async ({ request }) => {
      if (request.url.endsWith('/api/auth/login')) corpos.push(await request.clone().json());
    });
    const { usuario } = abrirApp();
    await screen.findByText('Digite sua senha de 4 números');
    await entrar(usuario);
    servidor.events.removeAllListeners();
    expect(screen.getByText('Carlos · pedido novo')).toBeInTheDocument();
    expect(corpos).toEqual([{ vendedorId: 'carlos', pin: '1234' }]);
    validarEntrada(ENTRADA_LOGIN, corpos[0]);
  });

  it('toque duplo em "Entrar" envia um único login', async () => {
    let logins = 0;
    servidor.events.on('request:start', ({ request }) => {
      if (request.url.endsWith('/api/auth/login')) logins++;
    });
    const { usuario } = abrirApp();
    await screen.findByText('Digite sua senha de 4 números');
    await digitarPin(usuario, '1234');
    await usuario.dblClick(screen.getByRole('button', { name: 'Entrar no PDV' }));
    await screen.findByText('Carlos · pedido novo');
    servidor.events.removeAllListeners();
    expect(logins).toBe(1);
  });

  it('falha ao carregar config/vendedores → erro e "Tentar de novo" que recarrega', async () => {
    let falhar = true;
    servidor.use(http.get('*/api/vendedores', () => (falhar ? HttpResponse.error() : undefined)));
    const { usuario } = abrirApp();
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão. Tente de novo.');
    expect(screen.getByText('Ponto de venda')).toBeInTheDocument();
    falhar = false;
    await usuario.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText('Digite sua senha de 4 números')).toBeInTheDocument();
    expect(screen.getByText('Ponto de venda · Unidade Centro')).toBeInTheDocument();
  });

  it('mostra "Carregando…" enquanto os dados do login chegam', async () => {
    abrirApp();
    // Primeiro a verificação de sessão, depois config/vendedores: ambos em "Carregando…".
    expect(screen.getByRole('status')).toHaveTextContent('Carregando…');
    await screen.findByText('Digite sua senha de 4 números');
    expect(screen.queryByText('Carregando…')).not.toBeInTheDocument();
  });

  it('erro não-ErroApi no login mostra a mensagem genérica (defensivo)', async () => {
    // Resposta 200 sem corpo: api.login resolve com undefined e o acesso a .vendedor lança TypeError.
    servidor.use(http.post('*/api/auth/login', () => new HttpResponse(null, { status: 200 })));
    const { usuario } = abrirApp();
    await screen.findByText('Digite sua senha de 4 números');
    await digitarPin(usuario, '1234');
    await usuario.click(screen.getByRole('button', { name: 'Entrar no PDV' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Algo deu errado. Tente de novo.');
    expect(marcadores()).toBe('4 de 4 números digitados');
  });
});

describe('RF-F03 — sessão', () => {
  it('sessão válida ao abrir → vai direto para a venda, sem login', async () => {
    usarSimulado({ sessaoDe: 'carlos' });
    abrirApp();
    expect(await screen.findByText('Carlos · pedido novo')).toBeInTheDocument();
    expect(screen.queryByText('Digite sua senha de 4 números')).not.toBeInTheDocument();
  });

  it('sem sessão → login', async () => {
    abrirApp();
    expect(await screen.findByRole('button', { name: 'Entrar no PDV' })).toBeInTheDocument();
  });

  it('falha de rede ao verificar a sessão → "Tentar de novo" (não manda ao login)', async () => {
    usarSimulado({ sessaoDe: 'carlos' });
    let falhar = true;
    servidor.use(http.get('*/api/auth/sessao', () => (falhar ? HttpResponse.error() : undefined)));
    const { usuario } = abrirApp();
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão. Tente de novo.');
    expect(screen.queryByRole('button', { name: 'Entrar no PDV' })).not.toBeInTheDocument();
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

  it('rejeição que não é ErroApi na verificação de sessão mostra o texto do erro', async () => {
    const espiao = vi.spyOn(api, 'sessao').mockRejectedValueOnce(new Error('falhou'));
    abrirApp();
    expect(await screen.findByRole('alert')).toHaveTextContent('Error: falhou');
    espiao.mockRestore();
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
    expect(await screen.findByRole('button', { name: 'Entrar no PDV' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(/pedido novo/)).not.toBeInTheDocument());
  });
});
