import React from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { FiChevronRight } from 'react-icons/fi';
import { Carregando, Erro, Aviso } from '../componentes/Estados';
import Cruzar from '../componentes/Cruzar';
import ProcedimentosFiltraveis from '../componentes/ProcedimentosFiltraveis';
import { HistoricoContagem } from '../componentes/Graficos';
import { BotaoCopiar, BotaoCompartilhar } from './Procedimento';
import { useCompetencia } from '../lib/competencia';
import { useConsulta } from '../lib/api';
import { useTitulo } from '../lib/titulo';

export default function Cid() {
  const { codigo } = useParams();
  const [params, setParams] = useSearchParams();
  const cbo = params.get('cbo') || '';
  const { competencia } = useCompetencia();
  const r = useConsulta(competencia ? `/cids/${codigo}` : null, { competencia, cbo });
  // Mantém a ficha anterior na tela enquanto o cruzamento recarrega
  const f = r.dados && r.dados.codigo === codigo.toUpperCase().replace(/[^A-Z0-9]/g, '') ? r.dados : null;
  useTitulo(f ? `CID ${f.codigo_formatado} ${f.nome}` : 'CID-10');

  const cruzar = (v) => setParams(v ? { cbo: v } : {}, { replace: true });

  if (r.erro && !f) {
    return (
      <div className="miolo" style={{ paddingTop: 34 }}>
        <Erro erro={r.erro} />
        {r.erro.status === 404 && <p className="apagado">Confira o código ou <Link to={`/busca?tipo=cid&q=${codigo}`}>busque o CID</Link>.</p>}
      </div>
    );
  }
  if (!f) return <div className="miolo" style={{ paddingTop: 34 }}><Carregando linhas={10} /></div>;

  const agravo = Number(f.agravo);

  return (
    <div className="miolo">
      <header className="ficha-cabeca">
        <nav className="trilha" aria-label="Posição">
          <Link to="/busca?tipo=cid">CID-10</Link><FiChevronRight size={12} />
          {!f.categoria && <><Link to={`/cid/${f.codigo.slice(0, 3)}`}>{f.codigo.slice(0, 3)}</Link><FiChevronRight size={12} /></>}
          <span>{f.codigo_formatado}</span>
        </nav>
        <div className="linha-selos">
          <span className="codigo-grande">CID {f.codigo_formatado}</span>
          <span className={`selo ${f.categoria ? 'acento' : ''}`}>{f.categoria ? 'Categoria' : 'Subcategoria'}</span>
          {agravo > 0 && <span className={`selo ${agravo === 2 ? 'vinho' : 'ouro'}`}>{f.agravo_rotulo}</span>}
          <span className="selo acento">Competência {f.competencia_rotulo}</span>
        </div>
        <h1>{f.nome}</h1>
        <div className="acoes">
          <BotaoCopiar texto={`${f.codigo_formatado} - ${f.nome}`} />
          <BotaoCompartilhar titulo={`CID ${f.codigo_formatado} ${f.nome}`} />
        </div>
      </header>

      {agravo > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Aviso tipo={agravo === 2 ? 'erro' : ''}>
            <b>{f.agravo_rotulo}.</b> Doença de notificação compulsória{agravo === 2 ? ' imediata' : ''}: além do registro do atendimento, o caso deve ser notificado à vigilância epidemiológica.
          </Aviso>
        </div>
      )}

      <div className="ficha-grade">
        <div>
          <section className="painel">
            <h2>Cruzar com uma ocupação</h2>
            <p className="apagado" style={{ margin: '-4px 0 12px', fontSize: 14 }}>Quer saber o que um profissional pode fazer para este diagnóstico? Escolha a ocupação (CBO).</p>
            <Cruzar
              tipo="cbo"
              competencia={f.competencia}
              selecionado={f.filtro_cbo}
              total={f.filtro_cbo ? f.procedimentos.length : null}
              contexto={`CID ${f.codigo_formatado}`}
              cruzarDe={f.codigo}
              onSelecionar={cruzar}
              onLimpar={() => cruzar(null)}
            />
          </section>

          <ProcedimentosFiltraveis
            titulo={f.filtro_cbo ? `Procedimentos do CID que o CBO ${f.filtro_cbo.codigo_formatado} executa` : 'Procedimentos que aceitam este CID'}
            itens={f.procedimentos}
            carregando={r.carregando}
            vazio={f.filtro_cbo ? 'Esta ocupação não executa nenhum procedimento que aceite este CID.' : 'Nenhum procedimento da tabela está vinculado a este CID nesta competência.'}
            extra={(p) => (
              <>
                <span className={`selo ${p.principal ? 'azul' : ''}`}>{p.principal ? 'CID principal' : 'CID secundário'}</span>
                {f.categoria && p.cids?.length > 0 && <span>via {p.cids.slice(0, 4).join(', ')}{p.cids.length > 4 ? '…' : ''}</span>}
              </>
            )}
          />
        </div>

        <aside className="ficha-lateral">
          <section className="painel">
            <h2>Sobre o CID</h2>
            <dl className="atributos" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div><dt>Tipo</dt><dd>{f.categoria ? 'Categoria' : 'Subcategoria'}</dd></div>
              <div><dt>Sexo</dt><dd>{f.sexo_rotulo || '—'}</dd></div>
              <div><dt>Agravo</dt><dd>{f.agravo_rotulo || '—'}</dd></div>
              <div><dt>Estadiamento</dt><dd>{f.exige_estadiamento ? 'Exigido' : 'Não exige'}</dd></div>
              <div><dt>Campos irradiados</dt><dd>{f.campos_irradiados || 'Não se aplica'}</dd></div>
            </dl>
          </section>

          {f.familia.length > 1 && (
            <section className="painel familia">
              <h2>{f.categoria ? 'Subcategorias' : 'Mesma categoria'}</h2>
              {f.familia.map((x) => (x.codigo === f.codigo
                ? <span key={x.codigo} className="atual"><span className="mono">{x.codigo_formatado}</span>{x.nome}</span>
                : <Link key={x.codigo} to={`/cid/${x.codigo}${cbo ? `?cbo=${cbo}` : ''}`}><span className="mono">{x.codigo_formatado}</span>{x.nome}</Link>))}
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
