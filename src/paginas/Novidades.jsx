import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiArrowRight, FiPlusCircle, FiMinusCircle, FiRefreshCw, FiLayers } from 'react-icons/fi';
import { Carregando, Erro, Vazio, Aviso } from '../componentes/Estados';
import { useCompetencia } from '../lib/competencia';
import { useConsulta } from '../lib/api';
import { moeda, numero, competenciaRotulo, nomeCampo } from '../lib/formato';
import { useTitulo } from '../lib/titulo';

const VALORES = new Set(['vl_sh', 'vl_sa', 'vl_sp']);
const mostrar = (campo, v) => (v === null || v === undefined || v === '' ? 'vazio' : VALORES.has(campo) ? moeda(v) : String(v));
const LIMITE = 200;
const VISOES = {
  alterados: { rotulo: 'Alterados', icone: FiRefreshCw },
  novos: { rotulo: 'Novos', icone: FiPlusCircle },
  excluidos: { rotulo: 'Excluídos', icone: FiMinusCircle },
  tabelas: { rotulo: 'Outras tabelas', icone: FiLayers },
};

export default function Novidades() {
  useTitulo('Novidades da tabela');
  const [params, setParams] = useSearchParams();
  const { competencia, competencias } = useCompetencia();
  const anteriores = useMemo(() => competencias.filter((c) => c.competencia < (competencia || '')), [competencias, competencia]);
  const anterior = anteriores.some((c) => c.competencia === params.get('anterior')) ? params.get('anterior') : anteriores[0]?.competencia;
  const visao = VISOES[params.get('ver')] ? params.get('ver') : 'alterados';
  const [filtro, setFiltro] = useState('');
  const r = useConsulta(competencia && anterior ? '/mudancas' : null, { competencia, anterior });

  const trocar = (novo) => { const p = new URLSearchParams(params); Object.entries(novo).forEach(([k, v]) => p.set(k, v)); setParams(p, { replace: true }); };

  const p = r.dados?.procedimentos;
  const lista = useMemo(() => {
    const base = p?.[visao] || [];
    const f = filtro.trim().toLowerCase();
    return f ? base.filter((i) => i.nome.toLowerCase().includes(f) || i.codigo.includes(f.replace(/\D/g, '') || '§')) : base;
  }, [p, visao, filtro]);

  return (
    <div className="miolo">
      <div className="pagina-cabeca">
        <div className="olho">Novidades</div>
        <h1>O que mudou na tabela</h1>
        <p>Compare duas competências: procedimentos que entraram, saíram e o que mudou campo a campo (valores, regras, nomes).</p>
      </div>

      {!anteriores.length ? (
        <div className="painel"><Vazio titulo="Ainda não há o que comparar">O comparativo aparece quando existir uma competência anterior a {competenciaRotulo(competencia)}.</Vazio></div>
      ) : (
        <>
          <div className="filtros" style={{ marginTop: 0 }}>
            <select value={anterior} onChange={(e) => trocar({ anterior: e.target.value })} aria-label="Competência anterior">
              {anteriores.map((c) => <option key={c.competencia} value={c.competencia}>{c.rotulo}</option>)}
            </select>
            <FiArrowRight className="apagado" />
            <span className="selo acento" style={{ fontSize: 13, padding: '5px 12px' }}>{competenciaRotulo(competencia)}</span>
          </div>

          <Erro erro={r.erro} />
          {r.carregando && !r.dados && <div className="painel"><p className="apagado" style={{ marginTop: 0 }}>Comparando as competências… pode levar alguns segundos.</p><Carregando /></div>}

          {p && (
            <>
              <div className="novidades-resumo quatro" style={{ margin: '14px 0 18px' }}>
                {[['novos', 'verde', p.novos.length, 'novos'], ['alterados', 'azul', p.alterados.length, 'alterados'], ['excluidos', 'vinho', p.excluidos.length, 'excluídos'], ['tabelas', '', r.dados.tabelas.length, 'outras tabelas com mudança']].map(([k, cor, n, txt]) => (
                  <button key={k} type="button" className={`novidade ${cor}`} style={{ textAlign: 'left', cursor: 'pointer', font: 'inherit', outline: visao === k ? '2px solid var(--acento)' : undefined }} onClick={() => trocar({ ver: k })} aria-pressed={visao === k}>
                    <strong>{numero(n)}</strong><span>{txt}</span>
                  </button>
                ))}
              </div>

              {p.campos_nao_comparados?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <Aviso tipo="info">O layout do DATASUS mudou entre as competências. Campos que existem só em uma delas não entram no comparativo: {p.campos_nao_comparados.map(nomeCampo).join(', ')}.</Aviso>
                </div>
              )}

              <section className="painel">
                <h2>{VISOES[visao].rotulo}</h2>
                {visao === 'tabelas' ? (
                  r.dados.tabelas.length ? (
                    <ul className="lista">
                      {r.dados.tabelas.map((t) => (
                        <li key={t.tabela} className="mudanca">
                          <div className="cab"><span className="mono">{t.tabela}</span><span style={{ color: 'var(--verde)' }}>+{numero(t.incluidas)}</span><span style={{ color: 'var(--vinho)' }}>−{numero(t.removidas)}</span></div>
                        </li>
                      ))}
                    </ul>
                  ) : <Vazio titulo="Nenhuma mudança nas demais tabelas" />
                ) : (
                  <>
                    {(p[visao] || []).length > 10 && <input className="campo" style={{ maxWidth: 420, marginBottom: 6 }} value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Filtrar por nome ou código…" aria-label="Filtrar" />}
                    {lista.length === 0 && <Vazio titulo="Nenhum procedimento nesta lista" />}
                    <ul className="lista">
                      {lista.slice(0, LIMITE).map((i) => (
                        <li key={i.codigo} className="mudanca">
                          <div className="cab">
                            <Link className="mono" to={`/procedimento/${i.codigo}`}>{i.codigo_formatado}</Link>
                            <span style={{ fontWeight: 500 }}>{i.nome}</span>
                            {i.valor_total !== undefined && <span className="num apagado" style={{ marginLeft: 'auto' }}>{moeda(i.valor_total)}</span>}
                          </div>
                          {i.campos && (
                            <div className="campos">
                              {i.campos.map((c) => (
                                <span key={c.campo}>{nomeCampo(c.campo)}: <span className="antes">{mostrar(c.campo, c.antes)}</span> → <span className="depois">{mostrar(c.campo, c.depois)}</span></span>
                              ))}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                    {lista.length > LIMITE && <p className="apagado" style={{ fontSize: 13 }}>Mostrando {LIMITE} de {numero(lista.length)}. Use o filtro para achar um procedimento específico.</p>}
                    {visao === 'excluidos' && lista.length > 0 && <p className="apagado" style={{ fontSize: 13 }}>Para ver a ficha de um excluído, troque a competência no topo para {competenciaRotulo(anterior)}.</p>}
                  </>
                )}
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
