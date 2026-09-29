/** useCarregar (RF-F10) — carga inicial, "Tentar de novo" e atualização silenciosa com descarte de resposta atrasada (AP-001). */
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ErroApi } from '../../src/api/cliente';
import { useCarregar } from '../../src/telas/useCarregar';

/** Busca controlada: cada chamada devolve uma promessa que o teste resolve ou rejeita quando quiser. */
function buscaControlada<T>() {
  const pendentes: Array<{ resolver: (v: T) => void; rejeitar: (e: unknown) => void }> = [];
  const buscar = () =>
    new Promise<T>((resolver, rejeitar) => {
      pendentes.push({ resolver, rejeitar });
    });
  return { buscar, pendentes };
}

describe('useCarregar', () => {
  it('carregando → ok com os dados', async () => {
    const b = buscaControlada<string>();
    const { result } = renderHook(() => useCarregar(b.buscar));
    expect(result.current[0]).toEqual({ situacao: 'carregando' });
    await act(async () => b.pendentes[0]!.resolver('v1'));
    expect(result.current[0]).toEqual({ situacao: 'ok', dados: 'v1' });
  });

  it('erro: mensagem do ErroApi ou genérica; "Tentar de novo" volta a carregar', async () => {
    const b = buscaControlada<string>();
    const { result } = renderHook(() => useCarregar(b.buscar));
    await act(async () => b.pendentes[0]!.rejeitar(new ErroApi(500, 'erro_interno', 'Falhou feio')));
    expect(result.current[0]).toEqual({ situacao: 'erro', mensagem: 'Falhou feio' });
    act(() => result.current[1]());
    expect(result.current[0]).toEqual({ situacao: 'carregando' });
    await act(async () => b.pendentes[1]!.rejeitar(new Error('boom')));
    expect(result.current[0]).toEqual({ situacao: 'erro', mensagem: 'Algo deu errado. Tente de novo.' });
  });

  it('atualizar não passa por "carregando": os dados atuais ficam até a resposta chegar', async () => {
    const b = buscaControlada<string>();
    const { result } = renderHook(() => useCarregar(b.buscar));
    await act(async () => b.pendentes[0]!.resolver('v1'));
    act(() => result.current[2]());
    expect(result.current[0]).toEqual({ situacao: 'ok', dados: 'v1' });
    await act(async () => b.pendentes[1]!.resolver('v2'));
    expect(result.current[0]).toEqual({ situacao: 'ok', dados: 'v2' });
  });

  it('AP-001: resposta atrasada de uma atualização anterior é descartada (vale a mais nova)', async () => {
    const b = buscaControlada<string>();
    const { result } = renderHook(() => useCarregar(b.buscar));
    await act(async () => b.pendentes[0]!.resolver('v1'));
    act(() => result.current[2]()); // busca 2 (antiga)
    act(() => result.current[2]()); // busca 3 (mais nova)
    await act(async () => b.pendentes[2]!.resolver('nova'));
    await act(async () => b.pendentes[1]!.resolver('atrasada'));
    expect(result.current[0]).toEqual({ situacao: 'ok', dados: 'nova' });
  });

  it('AP-001: atualização pendente é descartada por um "Tentar de novo" posterior, e a carga inicial pendente por uma atualização', async () => {
    const b = buscaControlada<string>();
    const { result } = renderHook(() => useCarregar(b.buscar));
    act(() => result.current[2]()); // atualização durante a carga inicial invalida a busca 0
    await act(async () => b.pendentes[0]!.resolver('inicial-atrasada'));
    expect(result.current[0]).toEqual({ situacao: 'carregando' });
    await act(async () => b.pendentes[1]!.resolver('atualizada'));
    expect(result.current[0]).toEqual({ situacao: 'ok', dados: 'atualizada' });
    act(() => result.current[2]()); // busca 2
    act(() => result.current[1]()); // tentar de novo → busca 3
    await act(async () => b.pendentes[2]!.resolver('da-atualizacao'));
    expect(result.current[0]).toEqual({ situacao: 'carregando' });
    await act(async () => b.pendentes[3]!.resolver('da-tentativa'));
    expect(result.current[0]).toEqual({ situacao: 'ok', dados: 'da-tentativa' });
  });

  it('falha na atualização mantém os dados atuais', async () => {
    const b = buscaControlada<string>();
    const { result } = renderHook(() => useCarregar(b.buscar));
    await act(async () => b.pendentes[0]!.resolver('v1'));
    act(() => result.current[2]());
    await act(async () => b.pendentes[1]!.rejeitar(new ErroApi(503, 'erro_interno', 'fora')));
    expect(result.current[0]).toEqual({ situacao: 'ok', dados: 'v1' });
  });

  it('resposta que chega depois de desmontar não é aplicada (a última vista continua)', async () => {
    const b = buscaControlada<string>();
    const { result, unmount } = renderHook(() => useCarregar(b.buscar));
    await act(async () => b.pendentes[0]!.resolver('v1'));
    act(() => result.current[2]());
    unmount();
    await act(async () => b.pendentes[1]!.resolver('depois'));
    await waitFor(() => expect(result.current[0]).toEqual({ situacao: 'ok', dados: 'v1' }));
  });
});
