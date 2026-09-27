import React, { useEffect, useRef, useState } from 'react';
import { FiSearch, FiShuffle, FiX } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { buscar } from '../lib/api';
import { numero } from '../lib/formato';

const CONFIG = {
  cbo: { url: '/ocupacoes', placeholder: 'Digite a ocupação ou o CBO (ex.: enfermeiro, 2252-25)', rotulo: 'ocupação', rota: 'cbo' },
  cid: { url: '/cids', placeholder: 'Digite o CID ou a doença (ex.: J18, pneumonia)', rotulo: 'CID', rota: 'cid' },
};

/**
 * Cruzamento CID × CBO: escolhe a ocupação (na página do CID) ou o CID
 * (na página da ocupação) e a lista de procedimentos fica só com a interseção.
 */
export default function Cruzar({ tipo, competencia, selecionado, total, contexto, onSelecionar, onLimpar, cruzarDe }) {
  const cfg = CONFIG[tipo];
  const [termo, setTermo] = useState('');
  const [opcoes, setOpcoes] = useState([]);
  const [aberto, setAberto] = useState(false);
  const [indice, setIndice] = useState(0);
  const raiz = useRef(null);

  useEffect(() => {
    const q = termo.trim();
    if (q.length < 2) { setOpcoes([]); return undefined; }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      buscar(cfg.url, { competencia, q, limite: 10, somente_com_procedimentos: 'true' }, { signal: ctrl.signal })
        .then((d) => { setOpcoes(d.itens || []); setIndice(0); setAberto(true); })
        .catch(() => {});
    }, 220);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [termo, competencia, cfg.url]);

  useEffect(() => {
    const fora = (e) => { if (raiz.current && !raiz.current.contains(e.target)) setAberto(false); };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, []);

  const escolher = (o) => { setTermo(''); setOpcoes([]); setAberto(false); onSelecionar(o.codigo); };

  if (selecionado) {
    return (
      <div className="cruzamento-ativo">
        <FiShuffle size={18} />
        <span>
          {tipo === 'cbo'
            ? <>Procedimentos de <b>{contexto}</b> que a ocupação <Link to={`/cbo/${selecionado.codigo}?cid=${cruzarDe}`}><span className="mono">{selecionado.codigo_formatado}</span> {selecionado.nome}</Link> pode executar</>
            : <>Procedimentos de <b>{contexto}</b> que aceitam o CID <Link to={`/cid/${selecionado.codigo}?cbo=${cruzarDe}`}><span className="mono">{selecionado.codigo_formatado}</span> {selecionado.nome}</Link></>}
          {total !== null && total !== undefined && <>: <b>{numero(total)}</b></>}
        </span>
        <button type="button" className="botao pequeno" onClick={onLimpar}><FiX /> Tirar cruzamento</button>
      </div>
    );
  }

  return (
    <div className="cruzar" ref={raiz}>
      <div className="campo-busca">
        <FiSearch />
        <input
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          onFocus={() => opcoes.length && setAberto(true)}
          onKeyDown={(e) => {
            if (!aberto || !opcoes.length) return;
            if (e.key === 'ArrowDown') { e.preventDefault(); setIndice((i) => Math.min(opcoes.length - 1, i + 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setIndice((i) => Math.max(0, i - 1)); }
            if (e.key === 'Enter') { e.preventDefault(); escolher(opcoes[indice]); }
            if (e.key === 'Escape') setAberto(false);
          }}
          placeholder={cfg.placeholder}
          aria-label={`Cruzar com ${cfg.rotulo}`}
          role="combobox"
          aria-expanded={aberto}
          aria-autocomplete="list"
        />
      </div>
      {aberto && opcoes.length > 0 && (
        <ul role="listbox">
          {opcoes.map((o, i) => (
            <li key={o.codigo} role="option" aria-selected={i === indice} onMouseDown={(e) => { e.preventDefault(); escolher(o); }} onMouseEnter={() => setIndice(i)}>
              <span className="mono">{o.codigo_formatado}</span>
              <span>{o.nome}</span>
              <span className="qtd">{numero(o.procedimentos)} proc.</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
