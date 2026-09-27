import { useEffect, useState } from 'react';

// Cliente da API pública do SIGTAP (projeto_pnl_api /fat/sigtap/publico).
// Autentica só com o token público no header x-sigtap-token: não há
// usuário, empresa nem login. Respostas no padrão { status, msg, data }.
const BASE = `${String(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')}/fat/sigtap/publico`;
const TOKEN = import.meta.env.VITE_SIGTAP_TOKEN || '';

// Cache curto em memória: voltar/avançar entre fichas não refaz a consulta
const CACHE_MS = 5 * 60 * 1000;
const cache = new Map();

export class ErroApi extends Error {
  constructor(mensagem, status) {
    super(mensagem);
    this.status = status;
  }
}

function montarUrl(caminho, params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, v);
  });
  const s = qs.toString();
  return `${BASE}${caminho}${s ? `?${s}` : ''}`;
}

export async function buscar(caminho, params, { signal } = {}) {
  const url = montarUrl(caminho, params);
  const guardado = cache.get(url);
  if (guardado && Date.now() - guardado.em < CACHE_MS) return guardado.dados;

  let res;
  try {
    res = await fetch(url, { headers: { 'x-sigtap-token': TOKEN }, signal });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new ErroApi('Não foi possível falar com o servidor. Confira sua conexão e tente de novo.', 0);
  }
  let corpo = null;
  try { corpo = await res.json(); } catch (e) { /* resposta sem JSON */ }
  const status = corpo?.status || res.status;
  if (!res.ok || status >= 400) {
    if (status === 401) throw new ErroApi('Este site não está autorizado a consultar a tabela no momento.', 401);
    if (status === 429) throw new ErroApi('Muitas consultas em pouco tempo. Aguarde alguns segundos e tente de novo.', 429);
    throw new ErroApi(corpo?.errors?.[0]?.msg || 'Não foi possível concluir a consulta.', status);
  }
  cache.set(url, { em: Date.now(), dados: corpo.data });
  return corpo.data;
}

/** Hook de leitura: refaz quando `chave` muda; `caminho` null = não busca. */
export function useConsulta(caminho, params) {
  const chave = caminho ? montarUrl(caminho, params) : null;
  const [estado, setEstado] = useState({ dados: null, erro: null, carregando: !!chave });

  useEffect(() => {
    if (!chave) { setEstado({ dados: null, erro: null, carregando: false }); return undefined; }
    const ctrl = new AbortController();
    setEstado((e) => ({ dados: e.dados, erro: null, carregando: true }));
    buscar(caminho, params, { signal: ctrl.signal })
      .then((dados) => setEstado({ dados, erro: null, carregando: false }))
      .catch((erro) => { if (erro.name !== 'AbortError') setEstado({ dados: null, erro, carregando: false }); });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  return estado;
}
