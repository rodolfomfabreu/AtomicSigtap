import React from 'react';

// Se algo quebrar na renderização, mostra uma tela amigável em vez da página em branco
export default class ErroTela extends React.Component {
  constructor(props) {
    super(props);
    this.state = { erro: null };
  }

  static getDerivedStateFromError(erro) { return { erro }; }

  componentDidCatch(erro, info) { console.error('[atomic_sigtap]', erro, info?.componentStack); }

  render() {
    if (!this.state.erro) return this.props.children;
    return (
      <div className="nao-encontrada miolo">
        <div className="grande">ops</div>
        <h1 style={{ margin: '12px 0 8px' }}>Algo saiu do lugar</h1>
        <p className="apagado">Um erro inesperado aconteceu nesta tela. Recarregar costuma resolver.</p>
        <button type="button" className="botao primario grande" onClick={() => window.location.assign(import.meta.env.BASE_URL || '/')}>Recarregar o início</button>
      </div>
    );
  }
}
