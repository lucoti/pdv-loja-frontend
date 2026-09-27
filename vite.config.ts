import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * `npm run dev`: a API é simulada no navegador pelo MSW (src/simulado), sem back-end.
 * `npm run dev:api` (mode "api"): /api vai por proxy para o back real em localhost:3001 (ADR-F04).
 */
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // O mockServiceWorker.js só é servido no modo simulado; o build de produção não leva nada do MSW.
  publicDir: mode === 'development' ? 'simulado-publico' : false,
  define: {
    // Liga o servidor simulado só no modo de desenvolvimento padrão; nunca no build de produção.
    __API_SIMULADA__: JSON.stringify(mode === 'development'),
  },
  server: {
    port: 5173,
    proxy: mode === 'api' ? { '/api': 'http://localhost:3001' } : undefined,
  },
}));
