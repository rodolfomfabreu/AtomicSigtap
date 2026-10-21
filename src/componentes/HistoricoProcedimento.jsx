import React, { useMemo, useState } from 'react';
import {
  FiPlusCircle, FiMinusCircle, FiRefreshCw, FiRotateCcw, FiInfo, FiExternalLink,
} from 'react-icons/fi';
import { Carregando, Erro, Vazio } from './Estados';
import MudancaDetalhe from './MudancaDetalhe';
import { useConsulta } from '../lib/api';
import { useCompetencia } from '../lib/competencia';
import { moeda, numero, competenciaExtenso } from '../lib/formato';

// Histórico do procedimento em todas as competências importadas: desde
// quando está na tabela, se é novo, se saiu e voltou e o que mudou em cada
// competência (campos, relações e descrição).

const TIPOS = {
  inclusao: { rotulo: 'Incluído na tabela', cor: 'verde', icone: FiPlusCircle },
  reinclusao: { rotulo: 'Voltou para a tabela', cor: 'ouro', icone: FiRotateCcw },
  exclusao: { rotulo: 'Excluído da tabela', cor: 'vinho', icone: FiMinusCircle },
  alteracao: { rotulo: 'Alterado', cor: 'azul', icone: FiRefreshCw },
};
const FILTROS = [
  ['', 'Tudo'],
  ['valor', 'Valores'],
  ['regra', 'Regras e atributos'],
  ['relacao', 'Relações (CID, CBO…)'],
  ['descricao', 'Descrição'],
];
const VALORES = new Set(['vl_sh', 'vl_sa', 'vl_sp']);
const POR_PAGINA = 12;

function combina(e, filtro) {
  if (!filtro) return true;
  if (filtro === 'valor') return e.campos.some((c) => VALORES.has(c.campo));
  if (filtro === 'regra') return e.campos.some((c) => !VALORES.has(c.campo));
  if (filtro === 'relacao') return e.relacoes.length > 0;
  if (filtro === 'descricao') return !!e.descricao;
  return true;
}

// Só os campos/relações do filtro escolhido (o resto da mudança fica oculto)
function recorte(e, filtro) {
  if (!filtro || e.tipo !== 'alteracao') return e;
  return {
    ...e,
    campos: filtro === 'valor' ? e.campos.filter((c) => VALORES.has(c.campo))
      : filtro === 'regra' ? e.campos.filter((c) => !VALORES.has(c.campo)) : [],
    relacoes: filtro === 'relacao' ? e.relacoes : [],
    descricao: filtro === 'descricao' ? e.descricao : null,
  };
}

export default function HistoricoProcedimento({ codigo }) {
  const r = useConsulta(`/procedimentos/${codigo}/historico`, {});
  const { trocar, competencia: consultada } = useCompetencia();
  const [filtro, setFiltro] = useState('');
  const [limite, setLimite] = useState(POR_PAGINA);
  const h = r.dados;

  const eventos = useMemo(() => (h?.eventos || []).filter((e) => combina(e, filtro)).map((e) => recorte(e, filtro)), [h, filtro]);
  const comMudanca = useMemo(() => new Set((h?.eventos || []).map((e) => e.competencia)), [h]);

  if (r.erro) return <section className="painel" id="historico"><h2>Histórico do procedimento</h2><Erro erro={r.erro} /></section>;
  if (!h) return <section className="painel" id="historico"><h2>Histórico do procedimento</h2><Carregando linhas={5} /></section>;

  const alteracoes = h.eventos.filter((e) => e.tipo === 'alteracao').length;
  const desde = h.incluido_em
    ? { valor: h.incluido_em_rotulo, nota: `Entrou na tabela em ${competenciaExtenso(h.incluido_em)}.` }
    : h.anterior_ao_historico
      ? { valor: `antes de ${h.primeira_importada_rotulo}`, nota: `Já estava na primeira competência guardada aqui (${h.primeira_importada_rotulo}); a data de criação é anterior.` }
      : { valor: h.primeira_rotulo, nota: null };

  return (
    <section className="painel historico" id="historico" aria-label="Histórico do procedimento">
      <h2>Histórico do procedimento <span className="contagem">{numero(h.competencias_importadas)} competências analisadas</span></h2>

      <div className="historico-resumo">
        <div className={h.novo_na_vigente ? 'destaque verde' : ''}>
          <span>Na tabela desde</span>
          <strong>{desde.valor}</strong>
          {h.novo_na_vigente && <em>novo nesta competência</em>}
        </div>
        <div className={h.na_vigente ? '' : 'destaque vinho'}>
          <span>Situação na vigente ({h.vigente_rotulo})</span>
          <strong>{h.na_vigente ? 'Ativo' : 'Fora da tabela'}</strong>
          {!h.na_vigente && <em>última vez em {h.ultima_rotulo}</em>}
        </div>
        <div>
          <span>Competências com alteração</span>
          <strong>{numero(alteracoes)}</strong>
        </div>
        <div>
          <span>Competências sem mudança</span>
          <strong>{numero(h.competencias_sem_mudanca)}</strong>
        </div>
      </div>

      <div className="presenca" role="img" aria-label={`Presença do procedimento nas ${h.presenca.length} competências importadas`}>
        {h.presenca.map((p) => (
          <button
            type="button"
            key={p.competencia}
            className={`${p.presente ? 'sim' : 'nao'}${comMudanca.has(p.competencia) ? ' mudou' : ''}${p.competencia === consultada ? ' atual' : ''}`}
            title={`${p.rotulo}: ${p.presente ? 'na tabela' : 'fora da tabela'}${comMudanca.has(p.competencia) ? ' · com mudança' : ''}${p.presente ? ' (clique para ver a ficha nesta competência)' : ''}`}
            onClick={() => p.presente && trocar(p.competencia)}
            disabled={!p.presente}
          />
        ))}
      </div>
      <div className="presenca-legenda">
        <span>{h.presenca[0]?.rotulo}</span>
        <span className="itens"><i className="sim" /> na tabela <i className="sim mudou" /> com mudança <i className="nao" /> fora</span>
        <span>{h.presenca[h.presenca.length - 1]?.rotulo}</span>
      </div>
      {desde.nota && <p className="apagado historico-nota"><FiInfo size={13} /> {desde.nota} O histórico cobre as competências de {h.primeira_importada_rotulo} a {h.vigente_rotulo}.</p>}

      {h.eventos.length > 0 && (
        <div className="abas-simples" style={{ marginTop: 14 }}>
          {FILTROS.map(([k, rotulo]) => (
            <button key={k || 'tudo'} type="button" className={`botao pequeno${filtro === k ? ' primario' : ''}`} onClick={() => { setFiltro(k); setLimite(POR_PAGINA); }}>{rotulo}</button>
          ))}
        </div>
      )}

      {h.eventos.length === 0 ? (
        <Vazio titulo="Nenhuma mudança registrada">O procedimento ficou igual em todas as competências analisadas.</Vazio>
      ) : eventos.length === 0 ? (
        <Vazio titulo="Nada deste tipo">Nenhuma mudança desse tipo nas competências analisadas.</Vazio>
      ) : (
        <ol className="linha-tempo">
          {eventos.slice(0, limite).map((e) => {
            const tipo = TIPOS[e.tipo];
            const Icone = tipo.icone;
            return (
              <li key={e.competencia} className={`mudanca ${tipo.cor}`}>
                <div className="cab">
                  <span className={`marco ${tipo.cor}`}><Icone size={14} /></span>
                  <strong className="quando">{e.competencia_rotulo}</strong>
                  <span className={`selo ${tipo.cor}`}>{tipo.rotulo}</span>
                  <span className="apagado" style={{ fontSize: 12.5 }}>comparado com {e.anterior_rotulo}</span>
                  {e.tipo !== 'exclusao' && (
                    <button type="button" className="link-acao" onClick={() => trocar(e.competencia)}>
                      ver ficha em {e.competencia_rotulo} <FiExternalLink size={12} />
                    </button>
                  )}
                </div>
                {(e.tipo === 'inclusao' || e.tipo === 'reinclusao') && (
                  <div className="campos"><span>{e.nome} · valor total <span className="depois">{moeda(e.valor_total)}</span></span></div>
                )}
                {e.tipo === 'exclusao' && (
                  <div className="campos"><span>Não aparece mais a partir de {e.competencia_rotulo}. Último valor total: <span className="depois">{moeda(e.valor_total)}</span></span></div>
                )}
                <MudancaDetalhe campos={e.campos} relacoes={e.relacoes} descricao={e.descricao} />
              </li>
            );
          })}
        </ol>
      )}
      {eventos.length > limite && (
        <button type="button" className="botao" style={{ marginTop: 10 }} onClick={() => setLimite((l) => l + POR_PAGINA)}>
          Mostrar mais ({numero(eventos.length - limite)})
        </button>
      )}
    </section>
  );
}
