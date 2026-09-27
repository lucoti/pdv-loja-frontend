import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  define: { __API_SIMULADA__: 'false' },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    // Todo teste precisa de ao menos uma asserção (T8: nenhum bloco sem expect).
    expect: { requireAssertions: true },
    setupFiles: ['tests/preparo.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      // main.tsx só monta a página e liga o MSW no navegador; tipos gerados não têm lógica.
      exclude: ['src/main.tsx', 'src/api/tipos.gerados.ts', 'src/simulado/navegador.ts', 'src/**/*.d.ts'],
      reporter: ['text', 'json-summary'],
      thresholds: { perFile: true, lines: 85, functions: 85, statements: 85, branches: 80 },
    },
  },
});
