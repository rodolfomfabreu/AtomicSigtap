import React, { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { FiChevronRight } from 'react-icons/fi';
import { Carregando, Erro } from '../componentes/Estados';
import Cruzar from '../componentes/Cruzar';
import ProcedimentosFiltraveis from '../componentes/ProcedimentosFiltraveis';
import { HistoricoContagem } from '../componentes/Graficos';
import { BotaoCopiar, BotaoCompartilhar } from './Procedimento';
import { useCompetencia } from '../lib/competencia';
import { useConsulta } from '../lib/api';
import { numero } from '../lib/formato';
import { useTitulo } from '../lib/titulo';

export default function Cbo() {
  const { codigo } = useParams();
  const [params, setParams] = useSearchParams();
  const cid = params.get('cid') || '';
  const { competencia } = useCompetencia();
  const r = useConsulta(competencia ? `/ocupacoes/${codigo}` : null, { competencia, cid });
  const f = r.dados && r.dados.codigo === codigo.toUpperCase().replace(/[^0-9A-Z]/g, '') ? r.dados : null;
  useTitulo(f ? `CBO ${f.codigo_formatado} ${f.nome}` : 'Ocupação');
  const maxGrupo = useMemo(() => Math.max(1, ...(f?.grupos || []).map((g) => g.procedimentos)), [f]);

  const cruzar = (v) => setParams(v ? { cid: v } : {}, { replace: true });

  if (r.erro && !f) {
    return (
      <div className="miolo" style={{ paddingTop: 34 }}>
        <Erro erro={r.erro} />
        {r.erro.status === 404 && <p className="apagado">Confira o código ou <Link to={`/busca?tipo=cbo&q=${codigo}`}>busque a ocupação</Link>.</p>}
      </div>
    );
  }
  if (!f) return <div className="miolo" style={{ paddingTop: 34 }}><Carregando linhas={10} /></div>;

  const proprio = f.familia.find((x) => x.codigo === f.codigo);

  return (
    <div className="miolo">
      <header className="ficha-cabeca">
        <nav className="trilha" aria-label="Posição">
          <Link to="/busca?tipo=cbo">Ocupações</Link><FiChevronRight size={12} />
          <Link to={`/busca?tipo=cbo&q=${f.familia_codigo}`}>Família {f.familia_codigo}</Link><FiChevronRight size={12} />
          <span>{f.codigo_formatado}</span>
        </nav>
        <div className="linha-selos">
          <span className="codigo-grande">CBO {f.codigo_formatado}</span>
          <span className="selo acento">Competência {f.competencia_rotulo}</span>
        </div>
        <h1>{f.nome}</h1>
        <div className="acoes">
          <BotaoCopiar texto={`${f.codigo_formatado} - ${f.nome}`} />
          <BotaoCompartilhar titulo={`CBO ${f.codigo_formatado} ${f.nome}`} />
        </div>
      </header>

      <div className="ficha-grade">
        <div>
          <section className="painel">
            <h2>Cruzar com um CID</h2>
            <p className="apagado" style={{ margin: '-4px 0 12px', fontSize: 14 }}>Escolha o diagnóstico para ver só o que esta ocupação pode fazer por ele. Uma categoria (ex.: K35) inclui as subcategorias.</p>
            <Cruzar
              tipo="cid"
              competencia={f.competencia}
              selecionado={f.filtro_cid}
              total={f.filtro_cid ? f.procedimentos.length : null}
              contexto={`CBO ${f.codigo_formatado}`}
              cruzarDe={f.codigo}
              onSelecionar={cruzar}
              onLimpar={() => cruzar(null)}
            />
          </section>

          {f.grupos.length > 0 && (
            <section className="painel">
              <h2>{f.filtro_cid ? 'Por grupo, com o cruzamento' : 'Onde esta ocupação atua'}</h2>
              <div className="perfil">
                {f.grupos.map((g) => (
                  <div className="linha" key={g.codigo}>
                    <Link className="nome" to={`/navegar/${g.codigo}`} title={g.nome}>{g.codigo} · {g.nome}</Link>
                    <div className="trilho"><div style={{ width: `${(g.procedimentos / maxGrupo) * 100}%` }} /></div>
                    <span className="n">{numero(g.procedimentos)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <ProcedimentosFiltraveis
            titulo={f.filtro_cid ? `Procedimentos para o CID ${f.filtro_cid.codigo_formatado}` : 'Procedimentos que pode executar'}
            itens={f.procedimentos}
            carregando={r.carregando}
            vazio={f.filtro_cid ? 'Esta ocupação não executa nenhum procedimento que aceite este CID.' : 'Nenhum procedimento vinculado a esta ocupação nesta competência.'}
          />
        </div>

        <aside className="ficha-lateral">
          <section className="painel">
            <h2>Sobre a ocupação</h2>
            <dl className="atributos" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div><dt>Família CBO</dt><dd>{f.familia_codigo}</dd></div>
              <div><dt>Procedimentos</dt><dd>{numero(proprio?.procedimentos ?? f.procedimentos.length)}</dd></div>
            </dl>
          </section>

          {f.familia.length > 1 && (
            <section className="painel familia">
              <h2>Família {f.familia_codigo} <span className="contagem">{f.familia.length}</span></h2>
              <div style={{ maxHeight: 380, overflow: 'auto' }}>
                {f.familia.map((x) => (x.codigo === f.codigo
                  ? <span key={x.codigo} className="atual"><span className="mono">{x.codigo_formatado}</span>{x.nome}</span>
                  : <Link key={x.codigo} to={`/cbo/${x.codigo}${cid ? `?cid=${cid}` : ''}`}><span className="mono">{x.codigo_formatado}</span>{x.nome}</Link>))}
              </div>
            </section>
          )}

          {f.historico?.length > 1 && (
            <section className="painel">
              <h2>Ao longo do tempo</h2>
              <HistoricoContagem historico={f.historico} competencia={f.competencia} />
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
