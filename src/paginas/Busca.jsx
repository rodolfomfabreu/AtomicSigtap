import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiX } from 'react-icons/fi';
import Buscador, { MODOS } from '../componentes/Buscador';
import { Carregando, Erro, Vazio } from '../componentes/Estados';
import { ItemProcedimento, ItemCid, ItemCbo } from '../componentes/Itens';
import Paginacao from '../componentes/Paginacao';
import { useCompetencia } from '../lib/competencia';
import { useConsulta } from '../lib/api';
import { useTitulo } from '../lib/titulo';

const POR_PAGINA = 25;
const URL = { procedimentos: '/procedimentos', cid: '/cids', cbo: '/ocupacoes' };
const ROTULOS = { procedimentos: ['procedimento', 'procedimentos'], cid: ['CID', 'CIDs'], cbo: ['ocupação', 'ocupações'] };

// Busca unificada: o estado vive na URL (?q=&tipo=&pagina=&grupo=...) para
// o link poder ser compartilhado e o "voltar" do navegador funcionar.
export default function Busca() {
  const [params, setParams] = useSearchParams();
  const { competencia, apoio } = useCompetencia();
  const tipo = URL[params.get('tipo')] ? params.get('tipo') : 'procedimentos';
  const q = params.get('q') || '';
  const pagina = Math.max(1, Number(params.get('pagina')) || 1);
  const grupo = params.get('grupo') || '';
  const complexidade = params.get('complexidade') || '';
  const financiamento = params.get('financiamento') || '';
  const todos = params.get('todos') === '1';
  useTitulo(q ? `“${q}” em ${MODOS[tipo].rotulo}` : `Buscar ${MODOS[tipo].rotulo}`);

  const mudar = (novo) => {
    const p = new URLSearchParams(params);
    Object.entries(novo).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    if (!('pagina' in novo)) p.delete('pagina');
    setParams(p, { replace: 'q' in novo && Object.keys(novo).length === 1 });
  };

  const filtros = tipo === 'procedimentos'
    ? { grupo, complexidade, financiamento }
    : { somente_com_procedimentos: todos ? undefined : 'true' };
  const r = useConsulta(competencia ? URL[tipo] : null, { competencia, q, pagina, limite: POR_PAGINA, ...filtros });
  const temFiltro = grupo || complexidade || financiamento;

  return (
    <div className="miolo">
      <div className="pagina-cabeca" style={{ paddingBottom: 8 }}>
        <Buscador
          modo={tipo}
          termo={q}
          onModo={(m) => mudar({ tipo: m === 'procedimentos' ? '' : m, grupo: '', complexidade: '', financiamento: '', todos: '' })}
          onBuscar={(t) => mudar({ q: t })}
          aoVivo
          autoFocus
        />
      </div>

      <div className="filtros">
        {tipo === 'procedimentos' ? (
          <>
            <select value={grupo} onChange={(e) => mudar({ grupo: e.target.value })} aria-label="Grupo">
              <option value="">Todos os grupos</option>
              {apoio?.grupos?.map((g) => <option key={g.codigo} value={g.codigo}>{g.codigo} · {g.nome}</option>)}
            </select>
            <select value={complexidade} onChange={(e) => mudar({ complexidade: e.target.value })} aria-label="Complexidade">
              <option value="">Toda complexidade</option>
              {apoio?.complexidades?.map((c) => <option key={c.codigo} value={c.codigo}>{c.nome}</option>)}
            </select>
            <select value={financiamento} onChange={(e) => mudar({ financiamento: e.target.value })} aria-label="Financiamento">
              <option value="">Todo financiamento</option>
              {apoio?.financiamentos?.map((f) => <option key={f.codigo} value={f.codigo}>{f.nome}</option>)}
            </select>
            {temFiltro && <button type="button" className="botao pequeno" onClick={() => mudar({ grupo: '', complexidade: '', financiamento: '' })}><FiX /> Limpar filtros</button>}
          </>
        ) : (
          <label className="check">
            <input type="checkbox" checked={todos} onChange={(e) => mudar({ todos: e.target.checked ? '1' : '' })} />
            Mostrar também {tipo === 'cid' ? 'CIDs' : 'ocupações'} sem procedimento vinculado
          </label>
        )}
      </div>

      <div className="painel" style={{ marginTop: 12 }}>
        <Erro erro={r.erro} />
        {r.carregando && !r.dados && <Carregando />}
        {r.dados && r.dados.itens.length === 0 && (
          <Vazio titulo="Nada encontrado">
            A busca ignora acentos e a ordem das palavras. Tente menos palavras, só o começo do código ou outro modo de busca.
          </Vazio>
        )}
        {r.dados && r.dados.itens.length > 0 && (
          <>
            <ul className="lista" style={{ opacity: r.carregando ? 0.55 : 1, transition: 'opacity .15s' }}>
              {tipo === 'procedimentos' && r.dados.itens.map((p) => <ItemProcedimento key={p.codigo} p={p} />)}
              {tipo === 'cid' && r.dados.itens.map((c) => <ItemCid key={c.codigo} c={c} />)}
              {tipo === 'cbo' && r.dados.itens.map((o) => <ItemCbo key={o.codigo} o={o} />)}
            </ul>
            <Paginacao total={r.dados.total} pagina={pagina} porPagina={POR_PAGINA} rotulo={ROTULOS[tipo]} onPagina={(n) => { mudar({ pagina: String(n) }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
          </>
        )}
      </div>
    </div>
  );
}
