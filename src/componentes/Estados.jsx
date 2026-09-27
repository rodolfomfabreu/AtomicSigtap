import React from 'react';
import { FiAlertTriangle, FiInfo, FiSearch } from 'react-icons/fi';

export function Carregando({ linhas = 6 }) {
  return (
    <div className="esqueleto" role="status" aria-label="Carregando">
      {Array.from({ length: linhas }, (_, i) => <div key={i} />)}
    </div>
  );
}

export function Aviso({ tipo = '', children }) {
  const Icone = tipo === 'info' ? FiInfo : FiAlertTriangle;
  return <div className={`aviso ${tipo}`} role={tipo === 'erro' ? 'alert' : undefined}><Icone size={16} /><div>{children}</div></div>;
}

export function Erro({ erro }) {
  if (!erro) return null;
  return <Aviso tipo="erro">{erro.message || String(erro)}</Aviso>;
}

export function Vazio({ titulo, children, icone: Icone = FiSearch }) {
  return (
    <div className="vazio">
      <Icone size={34} />
      <strong>{titulo}</strong>
      {children}
    </div>
  );
}
