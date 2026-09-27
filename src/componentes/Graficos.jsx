import React from 'react';
import { moeda, numero } from '../lib/formato';

/** Valor total do procedimento competência a competência. */
export function HistoricoValor({ historico = [] }) {
  if (!historico || historico.length < 2) return null;
  const valores = historico.map((h) => h.valor_total || 0);
  const primeiro = valores[0];
  if (valores.every((v) => v === primeiro)) {
    return (
      <p style={{ margin: 0, color: 'var(--tinta-2)' }}>
        Sem alteração de valor entre {historico[0].competencia_rotulo} e {historico[historico.length - 1].competencia_rotulo}
        {' '}({historico.length} competências): <b>{moeda(primeiro)}</b>.
      </p>
    );
  }
  const L = 300; const A = 130; const m = { t: 14, r: 10, b: 24, l: 10 };
  const min = Math.min(...valores); const max = Math.max(...valores); const faixa = max - min || 1;
  const x = (i) => m.l + (i * (L - m.l - m.r)) / (historico.length - 1);
  const y = (v) => m.t + (1 - (v - min) / faixa) * (A - m.t - m.b);
  const pontos = historico.map((h, i) => `${x(i)},${y(h.valor_total || 0)}`).join(' ');
  const ultimo = valores[valores.length - 1];
  const variacao = primeiro ? ((ultimo - primeiro) / primeiro) * 100 : null;
  return (
    <div className="grafico-linha">
      {variacao !== null && (
        <p style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--tinta-2)' }}>
          <span className={`selo ${variacao >= 0 ? 'verde' : 'vinho'}`}>{variacao >= 0 ? '+' : ''}{variacao.toFixed(1).replace('.', ',')}%</span>
          {' '}de {moeda(primeiro)} para {moeda(ultimo)} no período
        </p>
      )}
      <svg viewBox={`0 0 ${L} ${A}`} role="img" aria-label="Histórico do valor total por competência">
        <polygon points={`${x(0)},${A - m.b} ${pontos} ${x(historico.length - 1)},${A - m.b}`} fill="var(--acento-suave)" />
        <polyline points={pontos} fill="none" stroke="var(--acento)" strokeWidth="2.2" strokeLinejoin="round" />
        {historico.map((h, i) => (
          <g key={h.competencia}>
            <circle cx={x(i)} cy={y(h.valor_total || 0)} r={i === historico.length - 1 ? 4.5 : 3.2} fill="var(--cartao)" stroke="var(--acento)" strokeWidth="2">
              <title>{`${h.competencia_rotulo}: ${moeda(h.valor_total)}`}</title>
            </circle>
            {(historico.length <= 8 || i === 0 || i === historico.length - 1) && (
              <text x={x(i)} y={A - 6} textAnchor={i === 0 ? 'start' : i === historico.length - 1 ? 'end' : 'middle'} fontSize="11" fill="var(--apagado)">{h.competencia_rotulo}</text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

/** Quantos procedimentos o CID/CBO tinha em cada competência. */
export function HistoricoContagem({ historico = [], competencia }) {
  if (!historico || historico.length < 2) return null;
  const valores = historico.map((h) => h.procedimentos);
  if (valores.every((v) => v === valores[0])) {
    return (
      <p style={{ margin: 0, color: 'var(--tinta-2)' }}>
        Sem mudança entre {historico[0].competencia_rotulo} e {historico[historico.length - 1].competencia_rotulo}: {numero(valores[0])} procedimento{valores[0] === 1 ? '' : 's'} em todas as {historico.length} competências.
      </p>
    );
  }
  const max = Math.max(...valores, 1);
  return (
    <div className="barras" role="img" aria-label="Procedimentos vinculados por competência">
      {historico.slice(-12).map((h) => (
        <div key={h.competencia} className={`col${h.competencia === competencia ? ' atual' : ''}`} title={`${h.competencia_rotulo}: ${numero(h.procedimentos)}`}>
          <span className="n">{numero(h.procedimentos)}</span>
          <div className="barra" style={{ height: `${Math.max(4, (h.procedimentos / max) * 80)}px` }} />
          <span className="r">{h.competencia_rotulo}</span>
        </div>
      ))}
    </div>
  );
}
