import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { servidor, usarSimulado } from './apoio';

// Toda requisição dos testes cai no simulado; requisição sem rota é erro (não vai para a rede).
beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  usarSimulado();
});
afterAll(() => servidor.close());
usarSimulado();
