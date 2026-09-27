import { setupWorker } from 'msw/browser';
import { criarSimulado } from './handlers';

/** Liga o servidor simulado no navegador (`npm run dev`). Rotas fora de /api seguem normalmente. */
export function iniciarSimulado() {
  return setupWorker(...criarSimulado().handlers).start({ onUnhandledRequest: 'bypass', quiet: true });
}
