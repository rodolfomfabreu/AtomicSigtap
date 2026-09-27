import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiChevronRight } from 'react-icons/fi';
import { Carregando, Erro, Vazio } from '../componentes/Estados';
import { ItemProcedimento } from '../componentes/Itens';
import Paginacao from '../componentes/Paginacao';
import { useCompetencia } from '../lib/competencia';
import { useConsulta } from '../lib/api';
import { numero } from '../lib/formato';
import { useTitulo } from '../lib/titulo';

const POR_PAGINA = 30;
const NIVEIS = ['Grupos', 'Subgrupos', 'Formas de organização'];

// Grupo > Subgrupo > Forma de organização > Procedimentos (GG.SS.FF.PPP-D).
// Os nomes do caminho vêm das próprias listas de cada nível.
export default function Navegar() {
  const { grupo, subgrupo, forma } = useParams();
  const { competencia } = useCompetencia();
  const [pagina, setPagina] = useState(1);
  useEffect(() => { setPagina(1); }, [grupo, subgrupo, forma, competencia]);

  const grupos = useConsulta(competencia ? '/arvore' : null, { competencia });
  const subgrupos = useConsulta(competencia && grupo ? '/arvore' : null, { competencia, grupo });
  const formas = useConsulta(competencia && subgrupo ? '/arvore' : null, { competencia, grupo, subgrupo });
  const procs = useConsulta(competencia && forma ? '/procedimentos' : null, {
    competencia, grupo, subgrupo, forma, pagina, limite: POR_PAGINA,
  });

  const nome = (lista, cod) => lista.dados?.itens?.find((i) => i.codigo === cod)?.nome || '';
  const caminho = [
    grupo && { cod: grupo, nome: nome(grupos, grupo), url: `/navegar/${grupo}` },
    subgrupo && { cod: subgrupo, nome: nome(subgrupos, subgrupo), url: `/navegar/${grupo}/${subgrupo}` },
    forma && { cod: forma, nome: nome(formas, forma), url: `/navegar/${grupo}/${subgrupo}/${forma}` },
  ].filter(Boolean);
  const atual = caminho[caminho.length - 1];
  useTitulo(atual?.nome || 'Navegar pela tabela');

  const nivelAtual = forma ? null : subgrupo ? formas : grupo ? subgrupos : grupos;
  const prefixo = [grupo, subgrupo].filter(Boolean).join('.');
  const base = ['/navegar', grupo, subgrupo].filter(Boolean).join('/');

  return (
    <div className="miolo">
      <div className="pagina-cabeca">
        <nav className="trilha" aria-label="Caminho na tabela">
          {caminho.length ? <Link to="/navegar">Todos os grupos</Link> : <span>Todos os grupos</span>}
          {caminho.map((c, i) => (
            <React.Fragment key={c.url}>
              <FiChevronRight size={12} />
              {i === caminho.length - 1 ? <span>{c.cod} · {c.nome}</span> : <Link to={c.url}>{c.cod} · {c.nome}</Link>}
            </React.Fragment>
          ))}
        </nav>
        <div className="olho">{atual ? caminho.map((c) => c.cod).join('.') : 'Estrutura da tabela'}</div>
        <h1>{atual ? atual.nome || '…' : 'Navegar pela tabela'}</h1>
        {!atual && <p>Desça de grupo em grupo até chegar aos procedimentos, do jeito que o código SIGTAP é montado: grupo, subgrupo, forma de organização e procedimento.</p>}
      </div>

      {nivelAtual && (
        <>
          <Erro erro={nivelAtual.erro} />
          {nivelAtual.carregando && !nivelAtual.dados && <Carregando />}
          {nivelAtual.dados && (nivelAtual.dados.itens.length ? (
            <>
              <div className="olho" style={{ color: 'var(--apagado)' }}>{NIVEIS[caminho.length]}</div>
              <div className="grade-grupos">
                {nivelAtual.dados.itens.map((i) => (
                  <Link key={i.codigo} to={`${base}/${i.codigo}`} className="cartao-grupo">
                    <span className="cod">{prefixo ? `${prefixo}.${i.codigo}` : i.codigo}</span>
                    <span className="nome">{i.nome}</span>
                    <span className="qtd">{numero(i.procedimentos)} procedimento{i.procedimentos === 1 ? '' : 's'}</span>
                  </Link>
                ))}
              </div>
            </>
          ) : <Vazio titulo="Nada neste nível">Esta competência não tem itens aqui.</Vazio>)}
        </>
      )}

      {forma && (
        <div className="painel">
          <Erro erro={procs.erro} />
          {procs.carregando && !procs.dados && <Carregando />}
          {procs.dados && (
            <>
              <ul className="lista" style={{ opacity: procs.carregando ? 0.55 : 1 }}>
                {procs.dados.itens.map((p) => <ItemProcedimento key={p.codigo} p={p} />)}
              </ul>
              <Paginacao total={procs.dados.total} pagina={pagina} porPagina={POR_PAGINA} rotulo={['procedimento', 'procedimentos']} onPagina={(n) => { setPagina(n); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
