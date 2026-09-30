import React, { useEffect, useMemo, useState } from 'react';
import { ItemProcedimento } from './Itens';
import { Vazio } from './Estados';
import { numero } from '../lib/formato';

const semAcento = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const PASSO = 60;

export default function ProcedimentosFiltraveis({ titulo, itens, vazio, extra, carregando }) {
  const [filtro, setFiltro] = useState('');
  const [limite, setLimite] = useState(PASSO);
  useEffect(() => { setLimite(PASSO); }, [itens, filtro]);

  const visiveis = useMemo(() => {
    const f = semAcento(filtro.trim());
    if (!f) return itens;
    const dig = f.replace(/\D/g, '');
    return itens.filter((p) => semAcento(p.nome).includes(f) || (dig && p.codigo.includes(dig)));
  }, [itens, filtro]);

  return (
    <section className="painel">
      <h2>{titulo} <span className="contagem">{numero(itens.length)}</span></h2>
      {itens.length > 8 && (
        <input className="campo" style={{ marginBottom: 6, maxWidth: 420 }} value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Filtrar por nome ou código…" aria-label="Filtrar procedimentos" />
      )}
      {itens.length === 0 && <Vazio titulo="Nenhum procedimento">{vazio}</Vazio>}
      {itens.length > 0 && visiveis.length === 0 && <p className="apagado">Nenhum procedimento com esse filtro.</p>}
      <ul className="lista" style={{ opacity: carregando ? 0.5 : 1 }}>
        {visiveis.slice(0, limite).map((p) => <ItemProcedimento key={p.codigo} p={p} compacto extra={extra ? extra(p) : null} />)}
      </ul>
      {visiveis.length > limite && (
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button type="button" className="botao" onClick={() => setLimite((l) => l + PASSO * 3)}>Mostrar mais ({numero(visiveis.length - limite)} restantes)</button>
        </div>
      )}
    </section>
  );
}
