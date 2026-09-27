import { useEffect } from 'react';

export function useTitulo(titulo) {
  useEffect(() => {
    document.title = titulo ? `${titulo} · Atomic SIGTAP` : 'Atomic SIGTAP · Tabela de Procedimentos do SUS';
  }, [titulo]);
}
