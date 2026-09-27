import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowRight, FiCalendar } from 'react-icons/fi';
import Buscador from '../componentes/Buscador';
import { Carregando } from '../componentes/Estados';
import { useCompetencia } from '../lib/competencia';
import { useConsulta } from '../lib/api';
import { numero, competenciaExtenso, competenciaRotulo } from '../lib/formato';
import { useTitulo } from '../lib/titulo';

const EXEMPLOS = {
  procedimentos: ['apendicectomia', 'parto normal', 'tomografia do crânio', '03.01.01'],
  cid: ['K35', 'pneumonia', 'diabetes', 'J18.9'],
  cbo: ['enfermeiro', 'médico clínico', 'fisioterapeuta', '2235'],
};

export default function Inicio() {
  useTitulo(null);
  const navegar = useNavigate();
  const { competencia, competencias, ehVigente } = useCompetencia();
  const [modo, setModo] = useState('procedimentos');
  const arvore = useConsulta(competencia ? '/arvore' : null, { competencia });
  const total = useConsulta(competencia ? '/procedimentos' : null, { competencia, limite: 1 });
  const cids = useConsulta(competencia ? '/cids' : null, { competencia, limite: 1, somente_com_procedimentos: 'true' });
  const cbos = useConsulta(competencia ? '/ocupacoes' : null, { competencia, limite: 1, somente_com_procedimentos: 'true' });
  const temAnterior = competencias.some((c) => c.competencia < (competencia || ''));
  const mudancas = useConsulta(competencia && temAnterior ? '/mudancas' : null, { competencia });

  const ir = (q) => {
    const tipo = modo === 'procedimentos' ? '' : `&tipo=${modo}`;
    navegar(`/busca?q=${encodeURIComponent(q)}${tipo}`);
  };

  const m = mudancas.dados?.procedimentos;

  return (
    <div className="miolo">
      <section className="heroi">
        <span className="sobretitulo"><FiCalendar size={13} /> {competencia ? `Competência ${competenciaExtenso(competencia)}${ehVigente ? ' · vigente' : ''}` : 'Carregando competência…'}</span>
        <h1>A tabela do SUS, <em>sem mistério.</em></h1>
        <p className="lead">Valores, regras, CID-10 e ocupações de cada procedimento da Tabela Unificada (SIGTAP), atualizados a cada competência publicada pelo DATASUS.</p>
        <Buscador modo={modo} onModo={setModo} onBuscar={ir} autoFocus />
        <div className="dicas">
          <span>Experimente:</span>
          {EXEMPLOS[modo].map((ex) => <button key={ex} type="button" onClick={() => ir(ex)}>{ex}</button>)}
        </div>
      </section>

      <section className="numeros" aria-label="A tabela em números">
        <div><strong>{total.dados ? numero(total.dados.total) : '—'}</strong><span>procedimentos</span></div>
        <div><strong>{cids.dados ? numero(cids.dados.total) : '—'}</strong><span>CIDs com procedimento</span></div>
        <div><strong>{cbos.dados ? numero(cbos.dados.total) : '—'}</strong><span>ocupações (CBO) habilitadas</span></div>
        <div><strong>{competencias.length || '—'}</strong><span>competências para consulta</span></div>
      </section>

      {m && (
        <section className="secao">
          <div className="secao-cabeca">
            <div>
              <div className="olho">Novidades</div>
              <h2>O que mudou de {competenciaRotulo(mudancas.dados.anterior)} para {competenciaRotulo(mudancas.dados.competencia)}</h2>
            </div>
            <Link to="/novidades" className="botao">Ver todas as mudanças <FiArrowRight /></Link>
          </div>
          <div className="novidades-resumo">
            <Link to="/novidades?ver=novos" className="novidade verde"><strong>{numero(m.novos.length)}</strong><span>procedimentos novos</span></Link>
            <Link to="/novidades?ver=alterados" className="novidade azul"><strong>{numero(m.alterados.length)}</strong><span>procedimentos com valor ou regra alterados</span></Link>
            <Link to="/novidades?ver=excluidos" className="novidade vinho"><strong>{numero(m.excluidos.length)}</strong><span>procedimentos excluídos</span></Link>
          </div>
        </section>
      )}

      <section className="secao">
        <div className="secao-cabeca">
          <div>
            <div className="olho">Navegar</div>
            <h2>Os grupos da tabela</h2>
            <p>A tabela se organiza em grupo, subgrupo e forma de organização, exatamente como no código do procedimento.</p>
          </div>
        </div>
        {arvore.carregando && !arvore.dados && <Carregando linhas={4} />}
        {arvore.dados && (
          <div className="grade-grupos">
            {arvore.dados.itens.map((g) => (
              <Link key={g.codigo} to={`/navegar/${g.codigo}`} className="cartao-grupo">
                <span className="cod">{g.codigo}</span>
                <span className="nome">{g.nome}</span>
                <span className="qtd">{numero(g.procedimentos)} procedimentos</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
