import React from 'react';
import { Link } from 'react-router-dom';
import { moeda, numero, TOM_COMPLEXIDADE } from '../lib/formato';

// Linhas de resultado: procedimento, CID e ocupação (CBO)

export function ItemProcedimento({ p, extra = null, compacto = false }) {
  return (
    <li className={`item${compacto ? ' compacto' : ''}`}>
      <Link to={`/procedimento/${p.codigo}`}>
        <span className="codigo">{p.codigo_formatado}</span>
        <span className="titulo">{p.nome}</span>
        <span className="valor">{moeda(p.valor_total)}</span>
        <span className="meta">
          {p.complexidade_rotulo && <span className={`selo ${TOM_COMPLEXIDADE[p.complexidade] || ''}`}>{p.complexidade_rotulo}</span>}
          {p.financiamento_rotulo && <span>{p.financiamento_rotulo}</span>}
          {extra}
        </span>
      </Link>
    </li>
  );
}

export function ItemCid({ c }) {
  return (
    <li className="item">
      <Link to={`/cid/${c.codigo}`}>
        <span className="codigo">{c.codigo_formatado}</span>
        <span className="titulo" style={{ fontWeight: c.categoria ? 600 : 500 }}>{c.nome}</span>
        <span className="valor apagado" style={{ fontWeight: 500 }}>{numero(c.procedimentos)} proc.</span>
        <span className="meta">
          <span className={`selo ${c.categoria ? 'acento' : ''}`}>{c.categoria ? 'Categoria' : 'Subcategoria'}</span>
          {Number(c.agravo) > 0 && <span className={`selo ${Number(c.agravo) === 2 ? 'vinho' : 'ouro'}`}>{c.agravo_rotulo}</span>}
        </span>
      </Link>
    </li>
  );
}

export function ItemCbo({ o }) {
  return (
    <li className="item">
      <Link to={`/cbo/${o.codigo}`}>
        <span className="codigo">{o.codigo_formatado}</span>
        <span className="titulo">{o.nome}</span>
        <span className="valor apagado" style={{ fontWeight: 500 }}>{numero(o.procedimentos)} proc.</span>
      </Link>
    </li>
  );
}
