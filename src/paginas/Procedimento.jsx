import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  FiChevronRight, FiCopy, FiCheck, FiShare2, FiClock,
} from 'react-icons/fi';
import { Carregando, Erro, Aviso } from '../componentes/Estados';
import Relacao from '../componentes/Relacao';
import HistoricoProcedimento from '../componentes/HistoricoProcedimento';
import { HistoricoValor } from '../componentes/Graficos';
import { useCompetencia } from '../lib/competencia';
import { useConsulta } from '../lib/api';
import {
  moeda, numero, percentual, paragrafos, formatarCid, formatarCbo, TOM_COMPLEXIDADE, competenciaRotulo,
} from '../lib/formato';
import { useTitulo } from '../lib/titulo';
import { useEstatico, ConteudoEstatico, NaoIndexar } from '../lib/estatico';

const naoSeAplica = (v, sufixo = '') => (v === null || v === undefined ? 'Não se aplica' : `${numero(v)}${sufixo}`);

export function BotaoCopiar({ texto }) {
  const [ok, setOk] = useState(false);
  const copiar = async () => {
    try { await navigator.clipboard.writeText(texto); setOk(true); setTimeout(() => setOk(false), 1600); } catch (e) { window.prompt('Copie:', texto); }
  };
  return <button type="button" className="botao pequeno" onClick={copiar}>{ok ? <><FiCheck /> Copiado</> : <><FiCopy /> Copiar código e nome</>}</button>;
}

export function BotaoCompartilhar({ titulo }) {
  const [ok, setOk] = useState(false);
  const compartilhar = async () => {
    const url = window.location.href;
    if (navigator.share) { try { await navigator.share({ title: titulo, url }); } catch (e) { /* cancelado */ } return; }
    try { await navigator.clipboard.writeText(url); setOk(true); setTimeout(() => setOk(false), 1600); } catch (e) { window.prompt('Link:', url); }
  };
  return <button type="button" className="botao pequeno" onClick={compartilhar}>{ok ? <><FiCheck /> Link copiado</> : <><FiShare2 /> Compartilhar</>}</button>;
}

export default function Procedimento() {
  const { codigo } = useParams();
  const { competencia, competencias, vigente } = useCompetencia();
  const r = useConsulta(competencia ? `/procedimentos/${codigo.replace(/\D/g, '')}` : null, { competencia });
  const f = r.dados;
  const estatico = useEstatico();
  useTitulo(
    f ? `${f.codigo_formatado} - ${f.nome} | SIGTAP ${f.codigo}` : 'Procedimento',
    f ? `${f.codigo_formatado} ${f.nome}: valor total ${moeda(f.valor_total)} (SH ${moeda(f.valor_sh)}, SA ${moeda(f.valor_sa)}, SP ${moeda(f.valor_sp)}), regras, CID-10 e CBO na Tabela SUS (SIGTAP), competência ${f.competencia_rotulo}.` : null,
  );

  // Histórico (botão no topo da ficha). Abre direto com o link #historico.
  const [verHistorico, setVerHistorico] = useState(() => window.location.hash === '#historico');
  const refHistorico = useRef(null);
  const alternarHistorico = () => {
    const abrir = !verHistorico;
    setVerHistorico(abrir);
    try {
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}${abrir ? '#historico' : ''}`);
    } catch (e) { /* navegador antigo */ }
  };
  useEffect(() => {
    if (verHistorico && f && refHistorico.current) refHistorico.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [verHistorico, !!f]); // eslint-disable-line react-hooks/exhaustive-deps

  // Desde quando aparece (pelo histórico de valores, que já vem na ficha)
  const primeiraImportada = competencias.length ? competencias[competencias.length - 1].competencia : null;
  const desde = f?.historico?.[0]?.competencia || null;
  const novo = !!desde && competencias.length > 1 && desde === vigente && desde !== primeiraImportada;

  if (r.erro && r.erro.status !== 404 && estatico) {
    return <ConteudoEstatico html={estatico} aviso={<Aviso tipo="info">Não foi possível atualizar os dados agora; mostrando a versão salva da competência vigente.</Aviso>} />;
  }
  if (r.erro) {
    return (
      <div className="miolo" style={{ paddingTop: 34 }}>
        {r.erro.status === 404 && <NaoIndexar />}
        <Erro erro={r.erro} />
        {r.erro.status === 404 && <p className="apagado">Ele pode não existir nesta competência. Troque a competência no topo ou <Link to={`/busca?q=${codigo}`}>busque pelo código</Link>.</p>}
      </div>
    );
  }
  if (!f) return estatico ? <ConteudoEstatico html={estatico} /> : <div className="miolo" style={{ paddingTop: 34 }}><Carregando linhas={10} /></div>;

  const item = (i, extra) => (
    <li key={`${i.codigo}-${i.tipo || ''}-${i.classificacao || ''}`}>
      <span className="mono">{i.codigo_formatado || i.codigo}</span>
      <span>{i.nome || '—'}</span>
      {extra && <span className="extra">{extra}</span>}
    </li>
  );

  return (
    <div className="miolo">
      <header className="ficha-cabeca">
        <nav className="trilha" aria-label="Posição na tabela">
          <Link to="/navegar">Tabela</Link><FiChevronRight size={12} />
          <Link to={`/navegar/${f.grupo.codigo}`}>{f.grupo.codigo} · {f.grupo.nome}</Link><FiChevronRight size={12} />
          <Link to={`/navegar/${f.grupo.codigo}/${f.subgrupo.codigo}`}>{f.subgrupo.codigo} · {f.subgrupo.nome}</Link><FiChevronRight size={12} />
          <Link to={`/navegar/${f.grupo.codigo}/${f.subgrupo.codigo}/${f.forma_organizacao.codigo}`}>{f.forma_organizacao.codigo} · {f.forma_organizacao.nome}</Link>
        </nav>
        <div className="linha-selos">
          <span className="codigo-grande">{f.codigo_formatado}</span>
          {f.complexidade_rotulo && <span className={`selo ${TOM_COMPLEXIDADE[f.complexidade] || ''}`}>{f.complexidade_rotulo}</span>}
          {f.financiamento_rotulo && <span className="selo">{f.financiamento_rotulo}</span>}
          <span className="selo acento">Competência {f.competencia_rotulo}</span>
          {novo && <span className="selo verde">Novo em {competenciaRotulo(desde)}</span>}
        </div>
        <h1>{f.nome}</h1>
        <div className="acoes">
          <BotaoCopiar texto={`${f.codigo_formatado} - ${f.nome}`} />
          <BotaoCompartilhar titulo={`${f.codigo_formatado} ${f.nome}`} />
          <button type="button" className={`botao pequeno${verHistorico ? ' primario' : ''}`} onClick={alternarHistorico} aria-expanded={verHistorico} aria-controls="historico">
            <FiClock /> {verHistorico ? 'Fechar histórico' : 'Histórico'}
            {desde && !verHistorico && (
              <span className="apagado" style={{ fontWeight: 400 }}>
                · {desde === primeiraImportada ? `desde antes de ${competenciaRotulo(desde)}` : `desde ${competenciaRotulo(desde)}`}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="valores" aria-label="Valores">
        <div><span>Serviço hospitalar (SH)</span><strong>{moeda(f.valor_sh)}</strong></div>
        <div><span>Serviço ambulatorial (SA)</span><strong>{moeda(f.valor_sa)}</strong></div>
        <div><span>Serviço profissional (SP)</span><strong>{moeda(f.valor_sp)}</strong></div>
        <div className="total"><span>Valor total</span><strong>{moeda(f.valor_total)}</strong></div>
      </div>

      {verHistorico && (
        <div ref={refHistorico} style={{ marginTop: 20, scrollMarginTop: 80 }}>
          <HistoricoProcedimento codigo={f.codigo} />
        </div>
      )}

      <div className="ficha-grade" style={{ marginTop: 20 }}>
        <div>
          {paragrafos(f.descricao).length > 0 && (
            <section className="painel descricao">
              <h2>Descrição</h2>
              {paragrafos(f.descricao).map((p, i) => <p key={i}>{p}</p>)}
            </section>
          )}

          <section className="painel">
            <h2>Regras e atributos</h2>
            <dl className="atributos">
              <div><dt>Sexo</dt><dd>{f.sexo_rotulo || '—'}</dd></div>
              <div><dt>Idade mínima</dt><dd>{f.idade_minima || 'Não se aplica'}</dd></div>
              <div><dt>Idade máxima</dt><dd>{f.idade_maxima || 'Não se aplica'}</dd></div>
              <div><dt>Quantidade máxima</dt><dd>{naoSeAplica(f.quantidade_maxima)}</dd></div>
              <div><dt>Média de permanência</dt><dd>{naoSeAplica(f.dias_permanencia, ' dia(s)')}</dd></div>
              <div><dt>Tempo de permanência</dt><dd>{naoSeAplica(f.tempo_permanencia, ' dia(s)')}</dd></div>
              <div><dt>Pontos</dt><dd>{naoSeAplica(f.pontos)}</dd></div>
              <div><dt>Rubrica</dt><dd>{f.rubrica ? `${f.rubrica.codigo} · ${f.rubrica.nome || ''}` : '—'}</dd></div>
            </dl>
          </section>

          <section className="painel">
            <h2>Relações na tabela</h2>
            <Relacao
              titulo="CID-10 aceitos"
              itens={f.cids}
              aberta={f.cids.length > 0 && f.cids.length <= 15}
              render={(c) => (
                <li key={c.codigo}>
                  <Link className="mono" to={`/cid/${c.codigo}`}>{formatarCid(c.codigo)}</Link>
                  <span>{c.nome || '—'}</span>
                  <span className="extra">{c.principal ? <span className="selo azul">principal</span> : 'secundário'}</span>
                </li>
              )}
            />
            <Relacao
              titulo="Ocupações que executam (CBO)"
              itens={f.ocupacoes}
              render={(o) => (
                <li key={o.codigo}>
                  <Link className="mono" to={`/cbo/${o.codigo}`}>{formatarCbo(o.codigo)}</Link>
                  <span>{o.nome || '—'}</span>
                </li>
              )}
            />
            <Relacao titulo="Habilitações exigidas" itens={f.habilitacoes} render={(i) => item(i, i.grupo ? `grupo ${i.grupo}` : null)} />
            <Relacao titulo="Instrumentos de registro" itens={f.instrumentos_registro} filtravel={false} render={(i) => item(i)} />
            <Relacao titulo="Modalidades de atendimento" itens={f.modalidades} filtravel={false} render={(i) => item(i)} />
            <Relacao titulo="Tipos de leito" itens={f.leitos} filtravel={false} render={(i) => item(i)} />
            <Relacao
              titulo="Serviço / classificação"
              itens={f.servicos}
              render={(s) => (
                <li key={`${s.servico}-${s.classificacao}`}>
                  <span className="mono">{s.servico}/{s.classificacao}</span>
                  <span>{s.servico_nome || '—'}{s.classificacao_nome ? ` — ${s.classificacao_nome}` : ''}</span>
                </li>
              )}
            />
            <Relacao
              titulo="Incrementos"
              itens={f.incrementos}
              render={(i) => item(i, `SH ${percentual(i.percentual_sh)} · SA ${percentual(i.percentual_sa)} · SP ${percentual(i.percentual_sp)}`)}
            />
            <Relacao
              titulo="Procedimentos compatíveis"
              itens={f.compativeis}
              render={(c) => (
                <li key={`${c.codigo}-${c.tipo}-${c.registro_compativel}`}>
                  <Link className="mono" to={`/procedimento/${c.codigo}`}>{c.codigo_formatado}</Link>
                  <span>{c.nome || '—'}</span>
                  <span className="extra">{c.tipo_rotulo}{c.qt_permitida ? ` · até ${c.qt_permitida}` : ''}</span>
                </li>
              )}
            />
            <Relacao titulo="Detalhes" itens={f.detalhes} filtravel={false} render={(i) => item(i)} />
            <Relacao
              titulo="Regras condicionadas"
              itens={f.regras_condicionadas}
              filtravel={false}
              render={(r2) => (
                <li key={r2.codigo} style={{ flexDirection: 'column', gap: 4 }}>
                  <span><span className="mono">{r2.codigo}</span> {r2.nome}</span>
                  {r2.descricao && <span className="apagado" style={{ fontSize: 13 }}>{r2.descricao}</span>}
                </li>
              )}
            />
            <Relacao titulo="Procedimentos de origem" itens={f.origem} filtravel={false} render={(i) => item(i)} />
            <Relacao titulo="Correspondência SIA/SIH (tabela antiga)" itens={f.sia_sih} render={(i) => item(i, i.tipo === 'A' ? 'SIA' : i.tipo === 'H' ? 'SIH' : i.tipo)} />
            <Relacao titulo="RENASES" itens={f.renases} filtravel={false} render={(i) => item(i)} />
            <Relacao titulo="TUSS" itens={f.tuss} render={(i) => item(i)} />
            <Relacao titulo="Redes de atenção" itens={f.redes_atencao} filtravel={false} render={(i) => item(i, i.rede || null)} />
          </section>
        </div>

        <aside className="ficha-lateral">
          <section className="painel">
            <h2>Valor ao longo do tempo</h2>
            {f.historico?.length > 1
              ? <HistoricoValor historico={f.historico} />
              : <p className="apagado" style={{ margin: 0 }}>O histórico aparece quando houver mais de uma competência importada.</p>}
            {!verHistorico && (
              <button type="button" className="botao pequeno" style={{ marginTop: 12, width: '100%' }} onClick={alternarHistorico}>
                <FiClock /> Ver o que mudou em cada competência
              </button>
            )}
          </section>
          <section className="painel">
            <h2>Resumo</h2>
            <dl className="atributos" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div><dt>CIDs aceitos</dt><dd>{numero(f.cids.length)}</dd></div>
              <div><dt>Ocupações</dt><dd>{numero(f.ocupacoes.length)}</dd></div>
              <div><dt>Habilitações</dt><dd>{numero(f.habilitacoes.length)}</dd></div>
              <div><dt>Compatíveis</dt><dd>{numero(f.compativeis.length)}</dd></div>
            </dl>
          </section>
          {f.habilitacoes.length > 0 && (
            <Aviso tipo="info">Este procedimento exige habilitação do estabelecimento. Confira a lista em “Habilitações exigidas”.</Aviso>
          )}
        </aside>
      </div>
    </div>
  );
}
