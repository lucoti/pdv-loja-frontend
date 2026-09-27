import '@fontsource/libre-franklin/400.css';
import '@fontsource/libre-franklin/500.css';
import '@fontsource/libre-franklin/600.css';
import '@fontsource/libre-franklin/700.css';
import './estilos/global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

async function iniciar() {
  // Só no `npm run dev`: a API é simulada no navegador (ADR-F04). Nunca entra no build de produção.
  if (__API_SIMULADA__) {
    const { iniciarSimulado } = await import('./simulado/navegador');
    await iniciarSimulado();
  }
  createRoot(document.getElementById('raiz')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void iniciar();
