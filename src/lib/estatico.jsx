import React from 'react';
import { useLocation } from 'react-router-dom';
import { useTitulo } from './titulo';

// Conteúdo pré-renderizado no build (scripts/gerar-estatico.mjs), guardado
// antes do React montar (ver main.jsx). Serve de "rede de segurança" nas
// fichas (2026-10-21): enquanto a API não responde, ou se ela falhar (ex.:
// 429 quando o robô do Google abre muitas páginas seguidas), a página
// continua mostrando o conteúdo pronto em vez de um esqueleto ou de uma
// mensagem de erro - que o Google classificava como "soft 404".
const inicial = { caminho: null, html: '' };

export function guardarEstatico() {
  try {
    const main = document.querySelector('#raiz main');
    inicial.caminho = window.location.pathname.replace(/\/+$/, '') || '/';
    inicial.html = main ? main.innerHTML.trim() : '';
  } catch (e) { /* sem estático */ }
}

/** HTML estático desta URL (só na página em que o site foi aberto). */
export function useEstatico() {
  const { pathname } = useLocation();
  const atual = pathname.replace(/\/+$/, '') || '/';
  return inicial.html && inicial.caminho === atual ? inicial.html : '';
}

export function ConteudoEstatico({ html, aviso = null }) {
  return (
    <div className="miolo" style={{ paddingTop: 30 }}>
      {aviso}
      {/* eslint-disable-next-line react/no-danger */}
      <div className="conteudo-estatico" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

// Página que de fato não existe: avisa o Google para não indexar
export function NaoIndexar() {
  useTitulo(null, null, { noindex: true, canonico: false });
  return null;
}
