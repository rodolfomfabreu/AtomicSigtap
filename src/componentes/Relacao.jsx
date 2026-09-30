import React, { useMemo, useState } from 'react';
import { FiChevronDown } from 'react-icons/fi';
import { numero } from '../lib/formato';

const semAcento = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function Relacao({ titulo, itens, render, aberta = false, filtravel = true }) {
  const [filtro, setFiltro] = useState('');
  const visiveis = useMemo(() => {
    const f = semAcento(filtro.trim());
    return f ? itens.filter((i) => semAcento(JSON.stringify(i)).includes(f)) : itens;
  }, [itens, filtro]);
  if (!itens?.length) return null;
  return (
    <details className="relacao" open={aberta}>
      <summary>{titulo} <span className="contagem">{numero(itens.length)}</span><FiChevronDown /></summary>
      <div className="conteudo">
        {filtravel && itens.length > 12 && (
          <input className="campo" style={{ marginBottom: 8 }} value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder={`Filtrar ${titulo.toLowerCase()}…`} aria-label={`Filtrar ${titulo}`} />
        )}
        <ul>{visiveis.map(render)}</ul>
      </div>
    </details>
  );
}
