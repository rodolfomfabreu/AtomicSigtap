import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { CompetenciaProvider } from './lib/competencia';
import ErroTela from './componentes/ErroTela';
import './estilos.css';

createRoot(document.getElementById('raiz')).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ErroTela>
        <CompetenciaProvider>
          <App />
        </CompetenciaProvider>
      </ErroTela>
    </BrowserRouter>
  </React.StrictMode>
);
