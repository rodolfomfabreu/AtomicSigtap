import React from 'react';
import { moeda, nomeCampo } from '../lib/formato';

// O que mudou num procedimento entre duas competências: campos da ficha
// (antes → depois), relações (+ incluído, − removido, ~ alterado) e
// descrição. Usado em Novidades e no Histórico da ficha do procedimento.

const VALORES = new Set(['vl_sh', 'vl_sa', 'vl_sp']);
const mostrar = (campo, v) => (v === null || v === undefined || v === '' ? 'vazio' : VALORES.has(campo) ? moeda(v) : String(v));

export default function MudancaDetalhe({ campos = [], relacoes = [], descricao = null }) {
  return (
    <>
      {campos.length > 0 && (
        <div className="campos">
          {campos.map((c) => (
            <span key={c.campo}>
              {nomeCampo(c.campo)}: <span className="antes">{c.antes_texto ?? mostrar(c.campo, c.antes)}</span>
              {' '}→ <span className="depois">{c.depois_texto ?? mostrar(c.campo, c.depois)}</span>
            </span>
          ))}
        </div>
      )}
      {relacoes.length > 0 && (
        <div className="relacoes">
          {relacoes.map((r) => (
            <div key={r.chave}>
              <b>{r.rotulo}:</b>{' '}
              {r.incluidos.map((x) => <span key={`+${x.codigo}${x.detalhe || ''}`} className="rel mais">+ {x.codigo_formatado || x.codigo}{x.nome ? ` - ${x.nome}` : ''}{x.detalhe ? ` (${x.detalhe})` : ''}</span>)}
              {r.removidos.map((x) => <span key={`-${x.codigo}${x.detalhe || ''}`} className="rel menos">− {x.codigo_formatado || x.codigo}{x.nome ? ` - ${x.nome}` : ''}</span>)}
              {r.alterados.map((x) => <span key={`~${x.codigo}`} className="rel mudou">{x.codigo_formatado || x.codigo}{x.nome ? ` - ${x.nome}` : ''}: {x.antes || '—'} → {x.depois || '—'}</span>)}
            </div>
          ))}
        </div>
      )}
      {descricao && (
        <div className="relacoes">
          <div><b>Nova descrição:</b> <span style={{ whiteSpace: 'pre-line' }}>{descricao.depois || '(sem descrição)'}</span></div>
          {descricao.antes && (
            <details><summary style={{ cursor: 'pointer' }}>ver descrição anterior</summary><span className="antes" style={{ whiteSpace: 'pre-line' }}>{descricao.antes}</span></details>
          )}
        </div>
      )}
    </>
  );
}
