import { setupServer } from 'msw/node';
import { criarSimulado, type OpcoesSimulado } from '../src/simulado/handlers';

/**
 * Servidor simulado para os testes (msw/node). Cada teste pode trocar o simulado com
 * `usarSimulado(...)` ou sobrescrever rotas com `servidor.use(...)` (ex.: falha de rede).
 */
export const servidor = setupServer();

export function usarSimulado(opcoes: OpcoesSimulado = {}) {
  const simulado = criarSimulado(opcoes);
  servidor.resetHandlers(...simulado.handlers);
  return simulado;
}
