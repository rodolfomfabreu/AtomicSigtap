import React from 'react';
import { Link } from 'react-router-dom';
import { useTitulo } from '../lib/titulo';

export default function NaoEncontrada() {
  useTitulo('Página não encontrada');
  return (
    <div className="nao-encontrada miolo">
      <div className="grande">404</div>
      <h1 style={{ margin: '12px 0 8px' }}>Esta página não está na tabela</h1>
      <p className="apagado">O endereço pode ter mudado ou sido digitado errado.</p>
      <Link to="/" className="botao primario grande">Voltar ao início</Link>
    </div>
  );
}
