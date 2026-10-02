/**
 * Caracterização da tela de login (refatoração pdv-login-8-digitos): invariantes INV-011, INV-013,
 * INV-014, INV-015, INV-016 e INV-018 escritos sem depender do tamanho da senha nem de como o login é
 * disparado. Essas duas dependências ficam só em ajuda.tsx (PIN_CERTO, PIN_ERRADO e enviarPin).
 */
import { screen, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { VENDEDORES } from '../../src/simulado/dados';
import { servidor, usarSimulado } from '../apoio';
import { ENTRADA_LOGIN, validarEntrada } from '../contrato';
import { abrirApp, digitarPin, enviarPin, esperarEtapaSenha, numerosDigitados, PIN_CERTO, PIN_ERRADO, toqueRapidoExtra } from './ajuda';

const ANA = { id: 'ana', nome: 'Ana', cargo: 'Gerente' };

/** Registra os pedidos de login (corpo) enquanto o teste roda; `parar` desliga a escuta. */
function escutarLogins() {
  const corpos: unknown[] = [];
  servidor.events.on('request:start', async ({ request }) => {
    if (request.url.endsWith('/api/auth/login')) corpos.push(await request.clone().json());
  });
  return { corpos, parar: () => servidor.events.removeAllListeners() };
}

describe('INV-011 — trocar de vendedor limpa os números e o erro', () => {
  it('erro de senha de um vendedor não aparece para o seguinte; o login do seguinte leva o id dele', async () => {
    usarSimulado({ vendedores: [...VENDEDORES, ANA], pins: { carlos: PIN_CERTO, ana: PIN_ERRADO } });
    const escuta = escutarLogins();
    const { usuario } = abrirApp();
    await usuario.click(await screen.findByRole('button', { name: /Ana/ }));
    // Senha do Carlos na conta da Ana: 401.
    await enviarPin(usuario, PIN_CERTO);
    expect(await screen.findByRole('alert')).toHaveTextContent('Senha incorreta. Tente de novo.');
    await digitarPin(usuario, PIN_CERTO.slice(0, 2));
    expect(numerosDigitados()).toBe(2);

    await usuario.click(screen.getByRole('button', { name: 'Trocar vendedor' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: /Carlos/ }));
    expect(numerosDigitados()).toBe(0);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await enviarPin(usuario, PIN_CERTO);
    expect(await screen.findByText('Carlos · pedido novo')).toBeInTheDocument();
    escuta.parar();
    expect(escuta.corpos).toEqual([
      { vendedorId: 'ana', pin: PIN_CERTO },
      { vendedorId: 'carlos', pin: PIN_CERTO },
    ]);
  });

  it('o erro some ao voltar para a lista mesmo sem digitar nada depois dele', async () => {
    usarSimulado({ vendedores: [...VENDEDORES, ANA] });
    const { usuario } = abrirApp();
    await usuario.click(await screen.findByRole('button', { name: /Carlos/ }));
    await enviarPin(usuario, PIN_ERRADO);
    await screen.findByRole('alert');
    await usuario.click(screen.getByRole('button', { name: 'Trocar vendedor' }));
    await usuario.click(screen.getByRole('button', { name: /Carlos/ }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(numerosDigitados()).toBe(0);
  });
});

describe('INV-013 / INV-014 — senha errada, "apagar" e mensagem de erro', () => {
  it('401 limpa os números e mostra o erro; digitar some com o erro; "apagar" remove o último número', async () => {
    const { usuario } = abrirApp();
    expect(await esperarEtapaSenha()).toBe(0);
    await enviarPin(usuario, PIN_ERRADO);
    expect(await screen.findByRole('alert')).toHaveTextContent('Senha incorreta. Tente de novo.');
    expect(numerosDigitados()).toBe(0);
    expect(screen.queryByText(/pedido novo/)).not.toBeInTheDocument();

    await digitarPin(usuario, '70');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(numerosDigitados()).toBe(2);
    await usuario.click(screen.getByRole('button', { name: 'apagar' }));
    expect(numerosDigitados()).toBe(1);
    await usuario.click(screen.getByRole('button', { name: 'apagar' }));
    await usuario.click(screen.getByRole('button', { name: 'apagar' }));
    expect(numerosDigitados()).toBe(0);
  });

  it('"apagar" some com o erro; depois do erro a senha certa entra', async () => {
    const { usuario } = abrirApp();
    await esperarEtapaSenha();
    await enviarPin(usuario, PIN_ERRADO);
    await screen.findByRole('alert');
    await usuario.click(screen.getByRole('button', { name: 'apagar' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(numerosDigitados()).toBe(0);
    await enviarPin(usuario, PIN_CERTO);
    expect(await screen.findByText('Carlos · pedido novo')).toBeInTheDocument();
  });
});

describe('INV-015 / INV-016 — uma tentativa, um pedido, corpo no contrato', () => {
  it('cada tentativa (errada e certa) gera um único pedido { vendedorId, pin } com pin em texto', async () => {
    const escuta = escutarLogins();
    const { usuario } = abrirApp();
    await esperarEtapaSenha();
    await enviarPin(usuario, PIN_ERRADO);
    await screen.findByRole('alert');
    expect(escuta.corpos).toEqual([{ vendedorId: 'carlos', pin: PIN_ERRADO }]);

    await enviarPin(usuario, PIN_CERTO);
    expect(await screen.findByText('Carlos · pedido novo')).toBeInTheDocument();
    escuta.parar();
    expect(escuta.corpos).toEqual([
      { vendedorId: 'carlos', pin: PIN_ERRADO },
      { vendedorId: 'carlos', pin: PIN_CERTO },
    ]);
    for (const corpo of escuta.corpos) validarEntrada(ENTRADA_LOGIN, corpo);
  });

  it('toques rápidos enquanto o primeiro pedido não voltou não geram um segundo pedido', async () => {
    // O login fica pendente até o teste liberar: os toques a mais acontecem com o pedido em andamento.
    let pedidos = 0;
    let liberar = () => {};
    const pendente = new Promise<void>((ok) => (liberar = ok));
    servidor.use(
      http.post('*/api/auth/login', async () => {
        pedidos++;
        await pendente;
        return undefined; // segue para o login do simulado
      }),
    );
    const { usuario } = abrirApp();
    await esperarEtapaSenha();
    await enviarPin(usuario, PIN_CERTO);
    await waitFor(() => expect(pedidos).toBe(1));
    await toqueRapidoExtra(usuario);
    await toqueRapidoExtra(usuario);
    expect(pedidos).toBe(1);
    liberar();
    expect(await screen.findByText('Carlos · pedido novo')).toBeInTheDocument();
    expect(pedidos).toBe(1);
  });

  it('senha começando por zero é enviada como texto, com o zero', async () => {
    const comZero = `0${PIN_CERTO.slice(1)}`;
    usarSimulado({ pins: { carlos: comZero } });
    const escuta = escutarLogins();
    const { usuario } = abrirApp();
    await esperarEtapaSenha();
    await enviarPin(usuario, comZero);
    expect(await screen.findByText('Carlos · pedido novo')).toBeInTheDocument();
    escuta.parar();
    expect(escuta.corpos).toEqual([{ vendedorId: 'carlos', pin: comZero }]);
  });
});

describe('INV-018 — sessão', () => {
  it('sem sessão (401 sessao_invalida) abre o login na etapa da senha, sem a tela de venda', async () => {
    const respostas: Array<{ status: number; codigo: unknown }> = [];
    servidor.events.on('response:mocked', async ({ request, response }) => {
      if (!request.url.endsWith('/api/auth/sessao')) return;
      const corpo = (await response.clone().json()) as { erro?: { codigo?: unknown } };
      respostas.push({ status: response.status, codigo: corpo.erro?.codigo });
    });
    abrirApp();
    expect(await esperarEtapaSenha()).toBe(0);
    servidor.events.removeAllListeners();
    expect(respostas).toEqual([{ status: 401, codigo: 'sessao_invalida' }]);
    expect(screen.getByText('Carlos')).toBeInTheDocument();
    expect(screen.queryByText(/pedido novo/)).not.toBeInTheDocument();
  });

  it('sessão existente abre a venda sem mostrar o teclado da senha', async () => {
    usarSimulado({ sessaoDe: 'carlos' });
    abrirApp();
    expect(await screen.findByText('Carlos · pedido novo')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /números digitados/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'apagar' })).not.toBeInTheDocument();
  });
});
