import { useEffect } from 'react';

// Título, descrição, link canônico e robots da página (SEO no app React).
// As páginas estáticas geradas no build (scripts/gerar-estatico.mjs) já
// chegam com essas tags; aqui elas são mantidas certas enquanto a pessoa
// navega pelo app, e nas rotas que não têm página estática (ex.: busca).

const NOME = 'Atomic SIGTAP';
const PADRAO_TITULO = 'Tabela SIGTAP online: procedimentos, valores, CID e CBO do SUS · Atomic SIGTAP';
const PADRAO_DESCRICAO = 'Consulte grátis a Tabela SIGTAP (Tabela Unificada do SUS): valor de cada procedimento, regras, CID-10, CBO, histórico de mudanças e download da tabela.';
const SITE = String(import.meta.env.VITE_SITE_URL || '').replace(/\/+$/, '');

function meta(atributo, chave, conteudo) {
  let el = document.head.querySelector(`meta[${atributo}="${chave}"]`);
  if (conteudo === null) { if (el) el.remove(); return; }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(atributo, chave);
    document.head.appendChild(el);
  }
  el.setAttribute('content', conteudo);
}

function canonico(href) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!href) { if (el) el.remove(); return; }
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * @param titulo     título da página (null = página inicial)
 * @param descricao  meta description (opcional)
 * @param opcoes     { noindex: true } para páginas que não devem ir pro Google
 *                   (ex.: resultados de busca); { canonico: false } para não
 *                   mexer no link canônico
 */
export function useTitulo(titulo, descricao = null, { noindex = false, canonico: usarCanonico = true } = {}) {
  useEffect(() => {
    const completo = titulo ? (titulo.includes(NOME) || titulo.includes('SIGTAP') ? titulo : `${titulo} · ${NOME}`) : PADRAO_TITULO;
    document.title = completo;
    const desc = descricao || PADRAO_DESCRICAO;
    meta('name', 'description', desc);
    meta('property', 'og:title', completo);
    meta('property', 'og:description', desc);
    meta('name', 'robots', noindex ? 'noindex, follow' : null);
    if (usarCanonico && SITE) {
      const url = `${SITE}${window.location.pathname.replace(/\/+$/, '') || '/'}`;
      canonico(url);
      meta('property', 'og:url', url);
    }
  }, [titulo, descricao, noindex, usarCanonico]);
}
