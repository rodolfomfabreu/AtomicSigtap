import React, { createContext, useContext, useMemo, useState } from 'react';
import { useConsulta } from './api';

const Contexto = createContext(null);

export function CompetenciaProvider({ children }) {
  const [escolhida, setEscolhida] = useState(null);
  const apoio = useConsulta('/apoio', {});
  const vigente = apoio.dados?.competencia || null;

  const valor = useMemo(() => ({
    competencia: escolhida || vigente,
    vigente,
    competencias: apoio.dados?.competencias || [],
    apoio: apoio.dados,
    carregando: apoio.carregando,
    erro: apoio.erro,
    trocar: (c) => setEscolhida(c === vigente ? null : c),
    ehVigente: !escolhida || escolhida === vigente,
  }), [escolhida, vigente, apoio.dados, apoio.carregando, apoio.erro]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export const useCompetencia = () => useContext(Contexto);
