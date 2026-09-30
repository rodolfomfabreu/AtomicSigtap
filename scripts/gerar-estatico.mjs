// Atomic SIGTAP - pós-build: sitemap.xml + páginas pré-renderizadas.
//
// Roda depois do `vite build` (ver "build" no package.json). Busca na API a
// lista completa da competência vigente (GET /fat/sigtap/publico/sitemap) e:
//
//  1. grava um index.html para cada procedimento, CID e CBO
//     (dist/procedimento/0407020039/index.html...), a partir do index.html do
//     build, com <title>, descrição, tags de compartilhamento (WhatsApp,
//     Teams...) e um resumo em texto. O nginx já serve esses arquivos com o
//     try_files existente; o app React carrega por cima normalmente.
//  2. gera sitemap.xml (índice) + sitemap-*.xml e o robots.txt.
//
// Se a API ou as variáveis não estiverem disponíveis, avisa e sai sem erro:
// o build do app continua valendo, só sem as páginas estáticas.
//
// Variáveis (.env / .env.production): VITE_API_URL, VITE_SIGTAP_TOKEN,
// VITE_SITE_URL (ex.: https://sigtap.atomiccodes.com.br), VITE_NOME_INSTITUICAO.

import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(RAIZ, 'dist');
const env = loadEnv(process.env.MODE || 'production', RAIZ, ['VITE_', 'BUILD_']);
// BUILD_API_URL (opcional): de onde o script BUSCA os dados no build (ex.:
// http://localhost:3333). Não vai para o site. O site publicado sempre usa
// VITE_API_URL, que precisa ser o endereço público da API.
const API = String(env.BUILD_API_URL || env.VITE_API_URL || '').replace(/\/+$/, '');
const TOKEN = env.VITE_SIGTAP_TOKEN || '';
const SITE = String(env.VITE_SITE_URL || '').replace(/\/+$/, '');
const INSTITUICAO = env.VITE_NOME_INSTITUICAO || '';
const NOME_APP = 'Atomic SIGTAP';

const aviso = (msg) => console.warn(`\n[gerar-estatico] ${msg}\n`);

// ------------------------------------------------------------------ utilitários

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const brl = (v) => (v === null || v === undefined ? '—'
  : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
const num = (v) => Number(v || 0).toLocaleString('pt-BR');
const cortar = (s, max) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1).replace(/\s+\S*$/, '')}…` : t;
};
const url = (caminho) => `${SITE}${caminho}`;

async function existe(caminho) {
  try { await access(caminho); return true; } catch { return false; }
}

// ------------------------------------------------------------------ montagem do HTML

function pagina(template, { caminho, titulo, descricao, corpo, tipo = 'website' }) {
  const tituloCompleto = titulo ? `${titulo} · ${NOME_APP}` : `${NOME_APP} · Tabela de Procedimentos do SUS`;
  const desc = cortar(descricao, 200);
  const tags = [
    `<meta name="description" content="${esc(desc)}" />`,
    SITE && `<link rel="canonical" href="${esc(url(caminho))}" />`,
    `<meta property="og:site_name" content="${esc(NOME_APP)}" />`,
    `<meta property="og:type" content="${tipo}" />`,
    `<meta property="og:title" content="${esc(tituloCompleto)}" />`,
    `<meta property="og:description" content="${esc(desc)}" />`,
    SITE && `<meta property="og:url" content="${esc(url(caminho))}" />`,
    '<meta property="og:locale" content="pt_BR" />',
    '<meta name="twitter:card" content="summary" />',
  ].filter(Boolean).join('\n    ');

  return template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(tituloCompleto)}</title>`)
    .replace(/<meta name="description"[^>]*>\s*/, '')
    .replace('</head>', `    ${tags}\n  </head>`)
    // Conteúdo estático dentro da raiz: é o que o Google e os apps de
    // mensagem leem; o React substitui ao carregar.
    .replace('<div id="raiz"></div>', `<div id="raiz">${corpo}</div>`);
}

const casca = (conteudo) => `<div class="casca"><main class="miolo" style="padding-top:32px;padding-bottom:48px">${conteudo}
<p style="margin-top:28px"><a href="/">${esc(NOME_APP)}</a> · consulta à Tabela de Procedimentos do SUS (SIGTAP)${INSTITUICAO ? ` · ${esc(INSTITUICAO)}` : ''}</p></main></div>`;

function corpoProcedimento(p, comp) {
  return casca(`
<p class="olho">${esc(p.grupo || 'Procedimento')}</p>
<h1>${esc(p.nome)}</h1>
<p><span class="mono">${esc(p.codigo_formatado)}</span>${p.complexidade ? ` · ${esc(p.complexidade)}` : ''}${p.financiamento ? ` · ${esc(p.financiamento)}` : ''} · competência ${esc(comp)}</p>
<dl class="atributos">
  <div><dt>Serviço hospitalar (SH)</dt><dd>${brl(p.valor_sh)}</dd></div>
  <div><dt>Serviço ambulatorial (SA)</dt><dd>${brl(p.valor_sa)}</dd></div>
  <div><dt>Serviço profissional (SP)</dt><dd>${brl(p.valor_sp)}</dd></div>
  <div><dt>Valor total</dt><dd>${brl(p.valor_total)}</dd></div>
  <div><dt>CIDs aceitos</dt><dd>${num(p.cids)}</dd></div>
  <div><dt>Ocupações (CBO)</dt><dd>${num(p.cbos)}</dd></div>
</dl>
${p.descricao ? `<p>${esc(p.descricao)}</p>` : ''}`);
}

function corpoCid(c, comp) {
  return casca(`
<p class="olho">CID-10 · ${c.categoria ? 'Categoria' : 'Subcategoria'}</p>
<h1>${esc(c.nome)}</h1>
<p><span class="mono">CID ${esc(c.codigo_formatado)}</span> · competência ${esc(comp)}</p>
<p>${num(c.procedimentos)} procedimento${c.procedimentos === 1 ? '' : 's'} da Tabela SUS aceita${c.procedimentos === 1 ? '' : 'm'} este CID.${c.agravo ? ' Doença de notificação compulsória.' : ''}</p>`);
}

function corpoCbo(o, comp) {
  return casca(`
<p class="olho">Ocupação (CBO)</p>
<h1>${esc(o.nome)}</h1>
<p><span class="mono">CBO ${esc(o.codigo_formatado)}</span> · competência ${esc(comp)}</p>
<p>Esta ocupação pode executar ${num(o.procedimentos)} procedimento${o.procedimentos === 1 ? '' : 's'} da Tabela SUS.</p>`);
}

// ------------------------------------------------------------------ sitemap

const xmlUrl = (caminho, lastmod, prioridade) => `  <url><loc>${esc(url(caminho))}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}<priority>${prioridade}</priority></url>`;
const urlset = (linhas) => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${linhas.join('\n')}\n</urlset>\n`;

// ------------------------------------------------------------------ principal

async function main() {
  const templatePath = join(DIST, 'index.html');
  if (!(await existe(templatePath))) {
    aviso('dist/index.html não encontrado - rode depois do "vite build".');
    return;
  }
  if (!API || !TOKEN) {
    aviso('VITE_API_URL ou VITE_SIGTAP_TOKEN ausente: páginas estáticas e sitemap NÃO gerados.');
    return;
  }
  if (!SITE) aviso('VITE_SITE_URL ausente: as páginas serão geradas, mas sem sitemap.xml e sem link canônico.');

  let dados;
  try {
    const res = await fetch(`${API}/fat/sigtap/publico/sitemap`, { headers: { 'x-sigtap-token': TOKEN } });
    const corpo = await res.json();
    if (!res.ok || corpo.status >= 400) throw new Error(corpo?.errors?.[0]?.msg || `HTTP ${res.status}`);
    dados = corpo.data;
  } catch (e) {
    aviso(`Não foi possível buscar os dados na API (${API}): ${e.message}. Páginas estáticas e sitemap NÃO gerados; o app funciona normalmente.`);
    return;
  }

  const inicio = Date.now();
  const template = await readFile(templatePath, 'utf8');
  const comp = dados.competencia_rotulo;
  const lastmod = dados.atualizado_em ? String(dados.atualizado_em).slice(0, 10) : null;

  const gravar = async (caminho, html) => {
    const destino = caminho === '/' ? templatePath : join(DIST, caminho, 'index.html');
    await mkdir(dirname(destino), { recursive: true });
    await writeFile(destino, html);
  };

  // Páginas fixas
  const fixas = [
    ['/', null, `Consulte procedimentos, valores, regras, CID-10 e ocupações (CBO) da Tabela Unificada do SUS (SIGTAP). Competência vigente: ${comp}.`],
    ['/busca', 'Buscar', 'Busque procedimentos da Tabela SUS (SIGTAP) por nome ou código, e também CID-10 e ocupações (CBO).'],
    ['/navegar', 'Navegar pela tabela', 'Os grupos, subgrupos e formas de organização da Tabela de Procedimentos do SUS (SIGTAP).'],
    ['/novidades', 'Novidades da tabela', `O que mudou na Tabela SIGTAP na competência ${comp}: procedimentos novos, excluídos e alterados.`],
    ['/contato', 'Contato', 'Quem criou o Atomic SIGTAP e informações sobre os dados da Tabela SUS.'],
  ];
  for (const [caminho, titulo, descricao] of fixas) {
    // eslint-disable-next-line no-await-in-loop
    await gravar(caminho, pagina(template, {
      caminho, titulo, descricao, corpo: casca(`<h1>${esc(titulo || 'A tabela do SUS, sem mistério.')}</h1><p>${esc(descricao)}</p>`),
    }));
  }

  // Procedimentos, CIDs e CBOs
  let n = 0;
  for (const p of dados.procedimentos) {
    const caminho = `/procedimento/${p.codigo}`;
    const desc = `${p.codigo_formatado} ${p.nome}: valor total ${brl(p.valor_total)} (SH ${brl(p.valor_sh)}, SA ${brl(p.valor_sa)}, SP ${brl(p.valor_sp)}).${p.complexidade ? ` ${p.complexidade}.` : ''} Tabela SUS, competência ${comp}.`;
    // eslint-disable-next-line no-await-in-loop
    await gravar(caminho, pagina(template, {
      caminho, titulo: `${p.codigo_formatado} ${p.nome}`, descricao: desc, corpo: corpoProcedimento(p, comp), tipo: 'article',
    }));
    n += 1;
  }
  for (const c of dados.cids) {
    const caminho = `/cid/${c.codigo}`;
    // eslint-disable-next-line no-await-in-loop
    await gravar(caminho, pagina(template, {
      caminho,
      titulo: `CID ${c.codigo_formatado} ${c.nome}`,
      descricao: `CID ${c.codigo_formatado} - ${c.nome}: ${num(c.procedimentos)} procedimentos da Tabela SUS (SIGTAP) aceitam este diagnóstico. Competência ${comp}.`,
      corpo: corpoCid(c, comp),
      tipo: 'article',
    }));
    n += 1;
  }
  for (const o of dados.cbos) {
    const caminho = `/cbo/${o.codigo}`;
    // eslint-disable-next-line no-await-in-loop
    await gravar(caminho, pagina(template, {
      caminho,
      titulo: `CBO ${o.codigo_formatado} ${o.nome}`,
      descricao: `CBO ${o.codigo_formatado} - ${o.nome}: ${num(o.procedimentos)} procedimentos da Tabela SUS que esta ocupação pode executar. Competência ${comp}.`,
      corpo: corpoCbo(o, comp),
      tipo: 'article',
    }));
    n += 1;
  }

  // Sitemap (índice + um arquivo por tipo) e robots.txt
  if (SITE) {
    const arquivos = {
      'sitemap-paginas.xml': fixas.map(([c]) => xmlUrl(c, lastmod, c === '/' ? '1.0' : '0.6')),
      'sitemap-procedimentos.xml': dados.procedimentos.map((p) => xmlUrl(`/procedimento/${p.codigo}`, lastmod, '0.8')),
      'sitemap-cids.xml': dados.cids.map((c) => xmlUrl(`/cid/${c.codigo}`, lastmod, '0.5')),
      'sitemap-cbos.xml': dados.cbos.map((o) => xmlUrl(`/cbo/${o.codigo}`, lastmod, '0.5')),
    };
    for (const [nome, linhas] of Object.entries(arquivos)) {
      // eslint-disable-next-line no-await-in-loop
      await writeFile(join(DIST, nome), urlset(linhas));
    }
    const indice = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${
      Object.keys(arquivos).map((nome) => `  <sitemap><loc>${esc(url(`/${nome}`))}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</sitemap>`).join('\n')
    }\n</sitemapindex>\n`;
    await writeFile(join(DIST, 'sitemap.xml'), indice);

    // robots.txt: mantém o do public/ (se houver) e garante a linha do sitemap
    const robotsPath = join(DIST, 'robots.txt');
    let robots = (await existe(robotsPath)) ? await readFile(robotsPath, 'utf8') : 'User-agent: *\nAllow: /\n';
    robots = robots.replace(/^Sitemap:.*$/gim, '').trimEnd();
    await writeFile(robotsPath, `${robots}\n\nSitemap: ${url('/sitemap.xml')}\n`);
  }

  console.log(`[gerar-estatico] competência ${comp}: ${num(n)} páginas pré-renderizadas `
    + `(${num(dados.procedimentos.length)} procedimentos, ${num(dados.cids.length)} CIDs, ${num(dados.cbos.length)} CBOs)`
    + `${SITE ? ' + sitemap.xml' : ''} em ${((Date.now() - inicio) / 1000).toFixed(1)}s`);
}

main().catch((e) => {
  aviso(`Falha inesperada: ${e.stack || e.message}. O build do app continua valendo.`);
});
