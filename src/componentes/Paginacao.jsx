import React from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { numero } from '../lib/formato';

export default function Paginacao({ total, pagina, porPagina, onPagina, rotulo = ['resultado', 'resultados'] }) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  return (
    <div className="paginacao">
      <span>{numero(total)} {total === 1 ? rotulo[0] : rotulo[1]}</span>
      {paginas > 1 && (
        <div className="acoes">
          <button type="button" className="botao pequeno" disabled={pagina <= 1} onClick={() => onPagina(pagina - 1)}><FiChevronLeft /> Anterior</button>
          <span className="num">{pagina} de {numero(paginas)}</span>
          <button type="button" className="botao pequeno" disabled={pagina >= paginas} onClick={() => onPagina(pagina + 1)}>Próxima <FiChevronRight /></button>
        </div>
      )}
    </div>
  );
}
