import React, { useEffect, useRef, useState } from 'react';
import { FiSearch, FiArrowRight, FiFileText, FiActivity, FiUser } from 'react-icons/fi';

export const MODOS = {
  procedimentos: { rotulo: 'Procedimentos', icone: FiFileText, placeholder: 'Nome ou código do procedimento (ex.: apendicectomia, 04.07.02)' },
  cid: { rotulo: 'CID-10', icone: FiActivity, placeholder: 'Código ou nome da doença (ex.: K35, pneumonia)' },
  cbo: { rotulo: 'Ocupações (CBO)', icone: FiUser, placeholder: 'Ocupação ou código CBO (ex.: enfermeiro, 2235-05)' },
};

/**
 * Caixa de busca grande com os três modos. `aoVivo` dispara onBuscar
 * enquanto digita (página de busca); sem ele, só no Enter/botão (início).
 */
export default function Buscador({ modo, termo = '', onModo, onBuscar, aoVivo = false, autoFocus = false }) {
  const [texto, setTexto] = useState(termo);
  const primeira = useRef(true);
  const cfg = MODOS[modo] || MODOS.procedimentos;

  useEffect(() => { setTexto(termo); }, [termo]);

  useEffect(() => {
    if (!aoVivo) return undefined;
    if (primeira.current) { primeira.current = false; return undefined; }
    const t = setTimeout(() => onBuscar(texto.trim()), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto, aoVivo]);

  return (
    <form className="buscador" role="search" onSubmit={(e) => { e.preventDefault(); onBuscar(texto.trim()); }}>
      <div className="modos" role="group" aria-label="O que buscar">
        {Object.entries(MODOS).map(([chave, m]) => {
          const Icone = m.icone;
          return (
            <button key={chave} type="button" className="modo" aria-pressed={modo === chave} onClick={() => onModo(chave)}>
              <Icone size={14} /> {m.rotulo}
            </button>
          );
        })}
      </div>
      <div className="caixa-busca">
        <FiSearch size={20} />
        <input
          type="search"
          value={texto}
          autoFocus={autoFocus}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={cfg.placeholder}
          aria-label={`Buscar ${cfg.rotulo}`}
        />
        <button type="submit" className="botao primario grande" aria-label="Buscar"><span>Buscar</span> <FiArrowRight size={18} /></button>
      </div>
    </form>
  );
}
