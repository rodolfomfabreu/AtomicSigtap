// Atomic SIGTAP - pós-build: sitemap.xml + páginas pré-renderizadas (SEO).
//
// Roda depois do `vite build` (ver "build" no package.json). Busca na API a
// lista completa da competência vigente (GET /fat/sigtap/publico/sitemap) e:
//
//  1. grava um index.html para cada procedimento, CID, CBO e nível da árvore
//     (grupo > subgrupo > forma), além das páginas fixas (início, downloads,
//     novidades...), a partir do index.html do build. Cada página chega com
//     <title>, descrição, canonical, og:*, dados estruturados (JSON-LD) e o
//     conteúdo em HTML puro, cheio de links internos - é o que o Google lê
//     e o que faz o site aparecer em buscas como "sigtap 0301010072",
//     "tabela sigtap", "procedimentos cid k35" ou "download sigtap". O nginx
//     já serve esses arquivos com o try_files existente; o app React
//     carrega por cima normalmente.
//  2. gera sitemap.xml (índice) + sitemap-*.xml e o robots.txt.
//
// Se a API ou as variáveis não estiverem disponíveis, avisa e sai sem erro:
// o build do app continua valendo, só sem as páginas estáticas.
//
// Variáveis (.env / .env.production): VITE_API_URL, VITE_SIGTAP_TOKEN,
// VITE_SITE_URL (ex.: https://sigtap.atomiccodes.com.br), VITE_NOME_INSTITUICAO,
// e (opcionais) VITE_GOOGLE_SITE_VERIFICATION / VITE_BING_SITE_VERIFICATION
// com o código da meta tag de verificação do Search Console / Bing.

import { mkdir, readFile, writeFile, access, stat } from 'node:fs/promises';
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
const VERIFICACAO_GOOGLE = env.VITE_GOOGLE_SITE_VERIFICATION || '';
const VERIFICACAO_BING = env.VITE_BING_SITE_VERIFICATION || '';
const NOME_APP = 'Atomic SIGTAP';
const TITULO_INICIO = 'Tabela SIGTAP online: procedimentos, valores, CID e CBO do SUS · Atomic SIGTAP';
const MAX_LISTA = 15; // itens por lista de relação nas páginas
const MAX_IRMAOS = 12; // "outros procedimentos da mesma forma de organização"

const aviso = (msg) => console.warn(`\n[gerar-estatico] ${msg}\n`);

// ------------------------------------------------------------------ utilitários

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const brl = (v) => (v === null || v === undefined ? '—'
  : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
const num = (v) => Number(v || 0).toLocaleString('pt-BR');
const plural = (n, um, varios) => `${num(n)} ${Number(n) === 1 ? um : varios}`;
const cortar = (s, max) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1).replace(/\s+\S*$/, '')}…` : t;
};
const url = (caminho) => `${SITE}${caminho}`;
const rotulo = (c) => (c && c.length === 6 ? `${c.slice(4)}/${c.slice(0, 4)}` : c || '');
const fmtCid = (c) => (c && c.length === 4 ? `${c.slice(0, 3)}.${c.slice(3)}` : c);
const fmtCbo = (c) => (c && c.length === 6 ? `${c.slice(0, 4)}-${c.slice(4)}` : c);
const tamanho = (bytes) => {
  const n = Number(bytes) || 0;
  return n >= 1024 ** 2 ? `${(n / 1024 ** 2).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
};
// Nome em caixa alta do DATASUS -> "Consulta medica em..." (só em textos corridos)
const frase = (s) => {
  const t = String(s || '').trim().toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

async function existe(caminho) {
  try { await access(caminho); return true; } catch { return false; }
}

// JSON dentro de <script>: escapa "<" para não fechar a tag
const jsonLd = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
const migalhas = (itens) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: itens.map(([nome, caminho], i) => ({
    '@type': 'ListItem', position: i + 1, name: nome, item: url(caminho),
  })),
});

// ------------------------------------------------------------------ montagem do HTML

function pagina(template, {
  caminho, titulo, descricao, corpo, tipo = 'website', dados = [],
}) {
  const tituloCompleto = !titulo ? TITULO_INICIO
    : (/SIGTAP/i.test(titulo) ? titulo : `${titulo} · ${NOME_APP}`);
  const desc = cortar(descricao, 200);
  const tags = [
    `<meta name="description" content="${esc(desc)}" />`,
    SITE && `<link rel="canonical" href="${esc(url(caminho))}" />`,
    VERIFICACAO_GOOGLE && `<meta name="google-site-verification" content="${esc(VERIFICACAO_GOOGLE)}" />`,
    VERIFICACAO_BING && `<meta name="msvalidate.01" content="${esc(VERIFICACAO_BING)}" />`,
    `<meta property="og:site_name" content="${esc(NOME_APP)}" />`,
    `<meta property="og:type" content="${tipo}" />`,
    `<meta property="og:title" content="${esc(tituloCompleto)}" />`,
    `<meta property="og:description" content="${esc(desc)}" />`,
    SITE && `<meta property="og:url" content="${esc(url(caminho))}" />`,
    '<meta property="og:locale" content="pt_BR" />',
    '<meta name="twitter:card" content="summary" />',
    ...(SITE ? dados.filter(Boolean).map(jsonLd) : []),
  ].filter(Boolean).join('\n    ');

  return template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(tituloCompleto)}</title>`)
    .replace(/<meta name="description"[^>]*>\s*/, '')
    .replace('</head>', `    ${tags}\n  </head>`)
    // Conteúdo estático dentro da raiz: é o que o Google e os apps de
    // mensagem leem; o React substitui ao carregar.
    .replace('<div id="raiz"></div>', `<div id="raiz">${corpo}</div>`);
}

const MENU = [
  ['/busca', 'Buscar'], ['/navegar', 'Navegar pela tabela'], ['/busca?tipo=cid', 'CID-10'], ['/busca?tipo=cbo', 'Ocupações (CBO)'],
  ['/novidades', 'Novidades'], ['/downloads', 'Download da tabela'], ['/contato', 'Contato'],
];

const casca = (conteudo) => `<div class="casca"><header class="topo"><div class="miolo"><a href="/" class="marca"><div><b>${esc(NOME_APP)}</b><span>Tabela de Procedimentos do SUS</span></div></a>
<nav class="nav" aria-label="Principal">${MENU.map(([h, t]) => `<a href="${h}">${esc(t)}</a>`).join('')}</nav></div></header>
<main class="miolo" style="padding-top:32px;padding-bottom:48px">${conteudo}</main>
<footer class="rodape"><div class="miolo"><span><b>${esc(NOME_APP)}</b>${INSTITUICAO ? ` · ${esc(INSTITUICAO)}` : ''} · consulta à Tabela de Procedimentos, Medicamentos e OPM do SUS (SIGTAP).</span>
<span>Dados oficiais publicados mensalmente pelo DATASUS/Ministério da Saúde. Consulta informativa: em caso de divergência, vale a publicação oficial.</span></div></footer></div>`;

const trilha = (itens) => `<nav class="trilha" aria-label="Posição na tabela">${itens
  .map(([nome, caminho]) => (caminho ? `<a href="${esc(caminho)}">${esc(nome)}</a>` : `<span>${esc(nome)}</span>`))
  .join(' › ')}</nav>`;

const listaLinks = (itens, total) => (itens.length ? `<ul class="estatico-lista">${itens.map(([caminho, codigo, nome, extra]) => `<li><a href="${esc(caminho)}"><span class="mono">${esc(codigo)}</span></a> ${esc(nome || '')}${extra ? ` <span class="apagado">· ${esc(extra)}</span>` : ''}</li>`).join('')}</ul>${
  total > itens.length ? `<p class="apagado">e mais ${num(total - itens.length)}.</p>` : ''}` : '');

// ------------------------------------------------------------------ sitemap

const xmlUrl = (caminho, lastmod, prioridade) => `  <url><loc>${esc(url(caminho))}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}<priority>${prioridade}</priority></url>`;
const urlset = (linhas) => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${linhas.join('\n')}\n</urlset>\n`;

// ------------------------------------------------------------------ API

// Tempo máximo por chamada (BUILD_API_TIMEOUT em segundos, padrão 300).
// A 1ª montagem do sitemap depois de importar uma competência pode demorar;
// as seguintes vêm do cache da API (Redis) e são rápidas.
const TIMEOUT_MS = (Number(env.BUILD_API_TIMEOUT) || 300) * 1000;
const TENTATIVAS = 3;
const esperar = (ms) => new Promise((r) => { setTimeout(r, ms); });

async function api(caminho) {
  for (let tentativa = 1; ; tentativa += 1) {
    const inicio = Date.now();
    // Mostra que está vivo enquanto espera (antes ficava mudo)
    const pulso = setInterval(() => {
      console.log(`[gerar-estatico] aguardando ${caminho}... ${Math.round((Date.now() - inicio) / 1000)}s`);
    }, 15000);
    let res;
    let texto;
    try {
      res = await fetch(`${API}/fat/sigtap/publico${caminho}`, {
        headers: { 'x-sigtap-token': TOKEN },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      texto = await res.text();
    } catch (e) {
      const msg = e.name === 'TimeoutError' ? `sem resposta em ${TIMEOUT_MS / 1000}s` : e.message;
      if (tentativa >= TENTATIVAS || e.name === 'TimeoutError') throw new Error(msg);
      console.log(`[gerar-estatico] ${caminho}: ${msg} - tentando de novo (${tentativa + 1}/${TENTATIVAS})...`);
      await esperar(5000 * tentativa);
      continue;
    } finally {
      clearInterval(pulso);
    }
    // 502/503/504 = nginx sem resposta da API (reiniciando, caiu ou demorou
    // mais que o proxy_read_timeout). Tenta de novo antes de desistir.
    if ([502, 503, 504].includes(res.status) && tentativa < TENTATIVAS) {
      console.log(`[gerar-estatico] ${caminho}: HTTP ${res.status} (${res.statusText}) - tentando de novo em ${5 * tentativa}s (${tentativa + 1}/${TENTATIVAS})...`);
      await esperar(5000 * tentativa);
      continue;
    }
    let corpo;
    try { corpo = JSON.parse(texto); } catch (e) {
      throw new Error(`HTTP ${res.status} ${res.statusText} - a API não devolveu JSON${res.status === 504 ? ' (o nginx desistiu de esperar: aumente o proxy_read_timeout ou rode de novo, a API termina e guarda em cache)' : ''}`);
    }
    if (!res.ok || corpo.status >= 400) throw new Error(corpo?.errors?.[0]?.msg || `HTTP ${res.status}`);
    console.log(`[gerar-estatico] ${caminho}: ok em ${((Date.now() - inicio) / 1000).toFixed(1)}s`);
    return corpo.data;
  }
}

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
  if (!SITE) aviso('VITE_SITE_URL ausente: as páginas serão geradas, mas sem sitemap.xml, sem link canônico e sem dados estruturados.');

  let dados;
  try {
    console.log(`[gerar-estatico] buscando os dados da tabela em ${API} ...`);
    dados = await api('/sitemap');
  } catch (e) {
    aviso(`Não foi possível buscar os dados na API (${API}): ${e.message}. Páginas estáticas e sitemap NÃO gerados; o app funciona normalmente.`);
    return;
  }
  // Downloads: opcional (API antiga sem a rota não impede o resto)
  let pacotes = [];
  try { pacotes = await api('/downloads'); } catch (e) { aviso(`Lista de pacotes indisponível (${e.message}); a página de downloads sai sem a lista.`); }
  const programaPath = join(DIST, 'downloads', 'SIGTAP.zip');
  const programa = (await existe(programaPath)) ? await stat(programaPath) : null;

  const inicio = Date.now();
  const template = await readFile(templatePath, 'utf8');
  const comp = dados.competencia_rotulo;
  const vigente = dados.competencia;
  const primeira = dados.primeira_competencia || vigente;
  const lastmod = dados.atualizado_em ? String(dados.atualizado_em).slice(0, 10) : null;
  const arvore = dados.arvore || { grupos: [], subgrupos: [], formas: [] };

  const procs = new Map(dados.procedimentos.map((p) => [p.codigo, p]));
  const cids = new Map(dados.cids.map((c) => [c.codigo, c]));
  const cbos = new Map(dados.cbos.map((o) => [o.codigo, o]));
  const nomeGrupo = new Map(arvore.grupos.map((g) => [g.g, g.nome]));
  const nomeSub = new Map(arvore.subgrupos.map((s) => [`${s.g}${s.s}`, s.nome]));
  const nomeForma = new Map(arvore.formas.map((f) => [`${f.g}${f.s}${f.f}`, f.nome]));
  // Procedimentos por prefixo do código (grupo, subgrupo, forma) - índice
  // montado uma vez só, em vez de filtrar a lista inteira para cada página
  const porPrefixoIdx = new Map();
  dados.procedimentos.forEach((p) => [2, 4, 6].forEach((n) => {
    const k = p.codigo.slice(0, n);
    if (!porPrefixoIdx.has(k)) porPrefixoIdx.set(k, []);
    porPrefixoIdx.get(k).push(p);
  }));
  const porPrefixo = (prefixo) => porPrefixoIdx.get(prefixo) || [];
  const novos = vigente !== primeira ? dados.procedimentos.filter((p) => p.desde === vigente) : [];

  const paginas = { paginas: [], navegar: [], procedimentos: [], cids: [], cbos: [] };
  const gravar = async (grupo, caminho, html, prioridade) => {
    const destino = caminho === '/' ? templatePath : join(DIST, caminho, 'index.html');
    await mkdir(dirname(destino), { recursive: true });
    await writeFile(destino, html);
    paginas[grupo].push([caminho, prioridade]);
  };
  const site = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: NOME_APP,
    alternateName: ['AT-SIGTAP', 'Atomic SIGTAP', 'Tabela SIGTAP online'],
    url: url('/'),
    inLanguage: 'pt-BR',
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${url('/busca')}?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };

  // --- início
  const faq = [
    ['O que é a Tabela SIGTAP?', 'É a Tabela Unificada de Procedimentos, Medicamentos e OPM do SUS, mantida pelo Ministério da Saúde e publicada todo mês pelo DATASUS no Sistema de Gerenciamento da Tabela (SIGTAP). Ela define o código, o valor, as regras, os CIDs e as ocupações (CBO) de cada procedimento faturado no SUS (SIA e SIH).'],
    ['Como consultar o valor de um procedimento do SUS?', 'Digite o nome ou o código do procedimento (com ou sem pontos, ex.: 0301010072 ou 03.01.01.007-2) na busca. A ficha mostra o valor do serviço hospitalar (SH), ambulatorial (SA), profissional (SP) e o total, além das regras e relações.'],
    ['Como saber desde quando um procedimento existe ou o que mudou nele?', 'Na ficha do procedimento, o botão "Histórico" mostra desde quando ele aparece nas competências, se é novo, se foi excluído e o que mudou em cada competência: valores, regras, CIDs, CBOs, habilitações e descrição.'],
    ['Como baixar a Tabela SIGTAP?', 'Na página Downloads estão o programa SIGTAP para Windows, já corrigido para funcionar com os pacotes mais recentes (a versão do site oficial ainda não funciona com as competências atuais), e os pacotes mensais (.zip) da Tabela Unificada de cada competência, no layout oficial do DATASUS.'],
    ['O programa SIGTAP do DATASUS não funciona com a competência atual. O que fazer?', 'A versão do programa SIGTAP publicada no site oficial ainda tem um problema com os pacotes mais recentes. Na página Downloads do Atomic SIGTAP há uma versão corrigida, que funciona com as competências atuais.'],
    ['Com que frequência a tabela é atualizada?', `A tabela muda a cada competência (mensal). A competência vigente aqui é ${comp}; competências anteriores continuam disponíveis para consulta.`],
  ];
  await gravar('paginas', '/', pagina(template, {
    caminho: '/',
    titulo: null,
    descricao: `Consulte grátis a Tabela SIGTAP (Tabela Unificada do SUS): valor de cada procedimento, regras, CID-10, CBO, histórico de mudanças e download da tabela. Competência vigente: ${comp}.`,
    dados: [site, {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map(([q, r]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: r } })),
    }],
    corpo: casca(`
<section class="heroi"><h1>Tabela SIGTAP online: consulta de procedimentos do SUS</h1>
<p class="lead">Valores, regras, CID-10 e ocupações (CBO) de ${plural(dados.procedimentos.length, 'procedimento', 'procedimentos')} da Tabela Unificada do SUS (SIGTAP), competência ${esc(comp)}. Busca por nome ou código, histórico de mudanças e download da tabela.</p>
<form action="/busca" method="get" role="search"><input name="q" aria-label="Buscar procedimento, CID ou CBO" placeholder="Ex.: 0301010072, apendicectomia, K35" /> <button type="submit">Buscar</button></form></section>
<h2>Grupos da Tabela de Procedimentos do SUS</h2>
${listaLinks(arvore.grupos.map((g) => [`/navegar/${g.g}`, g.g, g.nome, plural(porPrefixo(g.g).length, 'procedimento', 'procedimentos')]), arvore.grupos.length)}
${novos.length ? `<h2>Procedimentos novos na competência ${esc(comp)}</h2>${listaLinks(novos.slice(0, 30).map((p) => [`/procedimento/${p.codigo}`, p.codigo_formatado, p.nome]), novos.length)}<p><a href="/novidades">Ver tudo o que mudou na tabela</a></p>` : ''}
<h2>Download da Tabela SIGTAP</h2><p>Baixe o programa SIGTAP e os pacotes mensais da Tabela Unificada na <a href="/downloads">área de downloads</a>.</p>
<h2>Perguntas frequentes</h2>
${faq.map(([q, r]) => `<h3>${esc(q)}</h3><p>${esc(r)}</p>`).join('\n')}`),
  }), '1.0');

  // --- páginas fixas simples
  const fixas = [
    ['/busca', 'Buscar na Tabela SIGTAP: procedimento, CID-10 ou CBO', 'Busque procedimentos da Tabela SUS (SIGTAP) por nome ou código, e também CID-10 e ocupações (CBO).', '0.5'],
    ['/contato', 'Contato', 'Quem criou o Atomic SIGTAP e informações sobre os dados da Tabela SUS (SIGTAP).', '0.3'],
  ];
  for (const [caminho, titulo, descricao, prioridade] of fixas) {
    // eslint-disable-next-line no-await-in-loop
    await gravar('paginas', caminho, pagina(template, {
      caminho, titulo, descricao, corpo: casca(`<h1>${esc(titulo)}</h1><p>${esc(descricao)}</p><p><a href="/navegar">Navegar pela tabela</a> · <a href="/novidades">Novidades</a> · <a href="/downloads">Downloads</a></p>`),
    }), prioridade);
  }

  // --- novidades
  await gravar('paginas', '/novidades', pagina(template, {
    caminho: '/novidades',
    titulo: `Novidades da Tabela SIGTAP ${comp}: procedimentos novos, excluídos e alterados`,
    descricao: `O que mudou na Tabela SIGTAP na competência ${comp}: procedimentos novos, excluídos e alterados campo a campo (valores, regras, CID, CBO e habilitações).`,
    dados: [migalhas([['Início', '/'], ['Novidades', '/novidades']])],
    corpo: casca(`${trilha([['Início', '/'], ['Novidades']])}<h1>O que mudou na Tabela SIGTAP</h1>
<p>Compare competências da Tabela Unificada do SUS: procedimentos que entraram, saíram e o que mudou campo a campo (valores, regras, CID, CBO, habilitações e descrição). Competência vigente: ${esc(comp)}.</p>
${novos.length ? `<h2>Procedimentos novos em ${esc(comp)}</h2>${listaLinks(novos.map((p) => [`/procedimento/${p.codigo}`, p.codigo_formatado, p.nome, brl(p.valor_total)]), novos.length)}` : ''}`),
  }), '0.7');

  // --- downloads
  const maisAntigo = pacotes[pacotes.length - 1]?.competencia;
  const maisRecente = pacotes[0]?.competencia;
  await gravar('paginas', '/downloads', pagina(template, {
    caminho: '/downloads',
    titulo: 'Download da Tabela SIGTAP: programa e pacotes mensais (competências)',
    descricao: 'Baixe o programa SIGTAP para Windows corrigido para funcionar com os pacotes mais recentes, e os pacotes da Tabela Unificada do SUS de cada competência (arquivos oficiais do DATASUS).',
    dados: [migalhas([['Início', '/'], ['Downloads', '/downloads']]), {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: 'Tabela Unificada de Procedimentos, Medicamentos e OPM do SUS (SIGTAP)',
      description: 'Pacotes mensais da Tabela Unificada de Procedimentos, Medicamentos e Órteses, Próteses e Materiais Especiais do SUS (SIGTAP), publicados pelo DATASUS, com procedimentos, valores, CID-10, CBO, habilitações e regras.',
      url: url('/downloads'),
      inLanguage: 'pt-BR',
      isAccessibleForFree: true,
      keywords: ['SIGTAP', 'Tabela SUS', 'Tabela Unificada', 'procedimentos SUS', 'DATASUS', 'faturamento SUS'],
      creator: { '@type': 'Organization', name: 'DATASUS - Ministério da Saúde', url: 'https://datasus.saude.gov.br' },
      temporalCoverage: maisAntigo
        ? `${maisAntigo.slice(0, 4)}-${maisAntigo.slice(4)}/${maisRecente.slice(0, 4)}-${maisRecente.slice(4)}` : undefined,
    }],
    corpo: casca(`${trilha([['Início', '/'], ['Downloads']])}<h1>Baixar a Tabela SIGTAP</h1>
<p>O programa SIGTAP para consultar a tabela sem internet e os pacotes mensais da Tabela Unificada de Procedimentos, Medicamentos e OPM do SUS, do jeito que o DATASUS publica, para importar no seu sistema de faturamento.</p>
<h2>Programa SIGTAP (Windows)</h2>
<p>Versão desktop do SIGTAP <b>corrigida para funcionar com os pacotes mais recentes</b> da Tabela Unificada. A versão disponível no site oficial do DATASUS ainda tem o problema e não funciona com as competências atuais.</p>
${programa ? `<p><a href="/downloads/SIGTAP.zip" download>Baixar SIGTAP.zip</a> (${tamanho(programa.size)}). Descompacte e abra o sigtap.exe (requer Java).</p>` : '<p>Em breve.</p>'}
<h2>Pacotes mensais da Tabela Unificada</h2>
${pacotes.length ? `<ul class="estatico-lista">${pacotes.map((p) => `<li>Competência <b>${esc(p.competencia_rotulo)}</b> · ${esc(p.arquivo)} · ${esc(p.tamanho)}</li>`).join('')}</ul>` : '<p>Os pacotes aparecem aqui a cada nova competência.</p>'}`),
  }), '0.8');

  // --- árvore: /navegar, grupos, subgrupos e formas de organização
  await gravar('navegar', '/navegar', pagina(template, {
    caminho: '/navegar',
    titulo: 'Navegar pela Tabela SIGTAP: grupos e subgrupos',
    descricao: `Os grupos, subgrupos e formas de organização da Tabela de Procedimentos do SUS (SIGTAP), competência ${comp}.`,
    dados: [migalhas([['Início', '/'], ['Tabela', '/navegar']])],
    corpo: casca(`${trilha([['Início', '/'], ['Tabela']])}<h1>Grupos da Tabela SIGTAP</h1>
<p>A Tabela Unificada se organiza em grupo, subgrupo e forma de organização, exatamente como os primeiros dígitos do código do procedimento.</p>
${listaLinks(arvore.grupos.map((g) => [`/navegar/${g.g}`, g.g, g.nome, plural(porPrefixo(g.g).length, 'procedimento', 'procedimentos')]), arvore.grupos.length)}`),
  }), '0.7');

  for (const g of arvore.grupos) {
    const subs = arvore.subgrupos.filter((s) => s.g === g.g);
    const caminho = `/navegar/${g.g}`;
    const tr = [['Início', '/'], ['Tabela', '/navegar'], [`${g.g} ${g.nome}`, caminho]];
    // eslint-disable-next-line no-await-in-loop
    await gravar('navegar', caminho, pagina(template, {
      caminho,
      titulo: `Grupo ${g.g} ${frase(g.nome)} | Tabela SIGTAP`,
      descricao: `Subgrupos e procedimentos do grupo ${g.g} - ${g.nome} da Tabela SUS (SIGTAP): ${plural(porPrefixo(g.g).length, 'procedimento', 'procedimentos')} na competência ${comp}.`,
      dados: [migalhas(tr)],
      corpo: casca(`${trilha(tr.slice(0, -1).concat([[`${g.g} ${g.nome}`]]))}<p class="olho">Grupo ${esc(g.g)}</p><h1>${esc(g.nome)}</h1>
<p>${plural(porPrefixo(g.g).length, 'procedimento', 'procedimentos')} da Tabela SIGTAP neste grupo, divididos em ${plural(subs.length, 'subgrupo', 'subgrupos')}.</p>
${listaLinks(subs.map((s) => [`/navegar/${g.g}/${s.s}`, `${g.g}.${s.s}`, s.nome, plural(porPrefixo(`${g.g}${s.s}`).length, 'procedimento', 'procedimentos')]), subs.length)}`),
    }), '0.6');
  }
  for (const s of arvore.subgrupos) {
    const formas = arvore.formas.filter((f) => f.g === s.g && f.s === s.s);
    const caminho = `/navegar/${s.g}/${s.s}`;
    const tr = [['Início', '/'], ['Tabela', '/navegar'], [`${s.g} ${nomeGrupo.get(s.g) || ''}`, `/navegar/${s.g}`], [`${s.s} ${s.nome}`, caminho]];
    // eslint-disable-next-line no-await-in-loop
    await gravar('navegar', caminho, pagina(template, {
      caminho,
      titulo: `${s.g}.${s.s} ${frase(s.nome)} | Tabela SIGTAP`,
      descricao: `Formas de organização e procedimentos do subgrupo ${s.g}.${s.s} - ${s.nome} da Tabela SUS (SIGTAP), competência ${comp}.`,
      dados: [migalhas(tr)],
      corpo: casca(`${trilha(tr.slice(0, -1).concat([[`${s.s} ${s.nome}`]]))}<p class="olho">Subgrupo ${esc(`${s.g}.${s.s}`)}</p><h1>${esc(s.nome)}</h1>
<p>${plural(porPrefixo(`${s.g}${s.s}`).length, 'procedimento', 'procedimentos')} em ${plural(formas.length, 'forma de organização', 'formas de organização')}.</p>
${listaLinks(formas.map((f) => [`/navegar/${f.g}/${f.s}/${f.f}`, `${f.g}.${f.s}.${f.f}`, f.nome, plural(porPrefixo(`${f.g}${f.s}${f.f}`).length, 'procedimento', 'procedimentos')]), formas.length)}`),
    }), '0.6');
  }
  for (const f of arvore.formas) {
    const lista = porPrefixo(`${f.g}${f.s}${f.f}`);
    const caminho = `/navegar/${f.g}/${f.s}/${f.f}`;
    const tr = [['Início', '/'], ['Tabela', '/navegar'], [`${f.g} ${nomeGrupo.get(f.g) || ''}`, `/navegar/${f.g}`],
      [`${f.s} ${nomeSub.get(`${f.g}${f.s}`) || ''}`, `/navegar/${f.g}/${f.s}`], [`${f.f} ${f.nome}`, caminho]];
    // eslint-disable-next-line no-await-in-loop
    await gravar('navegar', caminho, pagina(template, {
      caminho,
      titulo: `${f.g}.${f.s}.${f.f} ${frase(f.nome)} | Procedimentos SIGTAP`,
      descricao: `${plural(lista.length, 'procedimento', 'procedimentos')} da Tabela SUS (SIGTAP) em ${f.g}.${f.s}.${f.f} ${f.nome}, com código e valor. Competência ${comp}.`,
      dados: [migalhas(tr)],
      corpo: casca(`${trilha(tr.slice(0, -1).concat([[`${f.f} ${f.nome}`]]))}<p class="olho">Forma de organização ${esc(`${f.g}.${f.s}.${f.f}`)}</p><h1>${esc(f.nome)}</h1>
<p>${plural(lista.length, 'procedimento', 'procedimentos')} da Tabela SIGTAP, competência ${esc(comp)}:</p>
${listaLinks(lista.map((p) => [`/procedimento/${p.codigo}`, p.codigo_formatado, p.nome, brl(p.valor_total)]), lista.length)}`),
    }), '0.5');
  }

  // --- procedimentos
  for (const p of dados.procedimentos) {
    const caminho = `/procedimento/${p.codigo}`;
    const g = p.codigo.slice(0, 2);
    const s = p.codigo.slice(2, 4);
    const f = p.codigo.slice(4, 6);
    const tr = [['Início', '/'], ['Tabela', '/navegar'], [`${g} ${nomeGrupo.get(g) || p.grupo || ''}`, `/navegar/${g}`],
      [`${s} ${nomeSub.get(g + s) || ''}`, `/navegar/${g}/${s}`], [`${f} ${nomeForma.get(g + s + f) || ''}`, `/navegar/${g}/${s}/${f}`]];
    const desde = p.desde || vigente;
    const novo = vigente !== primeira && desde === vigente;
    const desdeTexto = novo ? `É um procedimento novo: entrou na tabela na competência ${comp}.`
      : desde === primeira ? `Consta na tabela desde, pelo menos, a competência ${rotulo(primeira)}.`
        : `Consta na tabela desde a competência ${rotulo(desde)}.`;
    const cidsLista = (p.cids_lista || []).slice(0, MAX_LISTA);
    const cbosLista = (p.cbos_lista || []).slice(0, MAX_LISTA);
    const irmaos = porPrefixo(p.codigo.slice(0, 6)).filter((x) => x.codigo !== p.codigo);
    // Vizinhos a partir do próprio código (cada página linka um trecho diferente da forma)
    const i = Math.max(0, irmaos.findIndex((x) => x.codigo > p.codigo));
    const vizinhos = [...irmaos.slice(i), ...irmaos.slice(0, i)].slice(0, MAX_IRMAOS);
    const desc = `SIGTAP ${p.codigo} (${p.codigo_formatado}) ${p.nome}: valor total ${brl(p.valor_total)} (SH ${brl(p.valor_sh)}, SA ${brl(p.valor_sa)}, SP ${brl(p.valor_sp)}).${p.complexidade ? ` ${p.complexidade}.` : ''} ${num(p.cids)} CIDs, ${num(p.cbos)} CBOs. Competência ${comp}.`;
    // eslint-disable-next-line no-await-in-loop
    await gravar('procedimentos', caminho, pagina(template, {
      caminho,
      titulo: `${p.codigo_formatado} - ${p.nome} | SIGTAP ${p.codigo}`,
      descricao: desc,
      tipo: 'article',
      dados: [migalhas([...tr, [p.codigo_formatado, caminho]]), {
        '@context': 'https://schema.org',
        '@type': 'MedicalProcedure',
        name: p.nome,
        url: url(caminho),
        description: cortar(p.descricao || desc, 300),
        code: { '@type': 'MedicalCode', codeValue: p.codigo, codingSystem: 'SIGTAP (Tabela Unificada do SUS)' },
      }],
      corpo: casca(`${trilha(tr)}
<p class="olho">Procedimento SIGTAP · ${esc(p.grupo || '')}</p>
<h1>${esc(p.nome)}</h1>
<p><span class="mono">${esc(p.codigo_formatado)}</span> · código ${esc(p.codigo)}${p.complexidade ? ` · ${esc(p.complexidade)}` : ''}${p.financiamento ? ` · ${esc(p.financiamento)}` : ''} · competência ${esc(comp)}</p>
<p>O procedimento <b>${esc(p.codigo_formatado)} - ${esc(frase(p.nome))}</b>, da Tabela Unificada do SUS (SIGTAP), tem valor total de <b>${brl(p.valor_total)}</b> na competência ${esc(comp)}: serviço hospitalar ${brl(p.valor_sh)}, serviço ambulatorial ${brl(p.valor_sa)} e serviço profissional ${brl(p.valor_sp)}. ${esc(desdeTexto)} Aceita ${plural(p.cids, 'CID-10', 'CIDs-10')} e pode ser executado por ${plural(p.cbos, 'ocupação (CBO)', 'ocupações (CBO)')}.</p>
<dl class="atributos">
  <div><dt>Serviço hospitalar (SH)</dt><dd>${brl(p.valor_sh)}</dd></div>
  <div><dt>Serviço ambulatorial (SA)</dt><dd>${brl(p.valor_sa)}</dd></div>
  <div><dt>Serviço profissional (SP)</dt><dd>${brl(p.valor_sp)}</dd></div>
  <div><dt>Valor total</dt><dd>${brl(p.valor_total)}</dd></div>
  <div><dt>Na tabela desde</dt><dd>${esc(desde === primeira && !novo ? `${rotulo(primeira)} (ou antes)` : rotulo(desde))}</dd></div>
</dl>
${p.descricao ? `<h2>Descrição</h2><p>${esc(p.descricao)}</p>` : ''}
${cidsLista.length ? `<h2>CID-10 aceitos</h2>${listaLinks(cidsLista.map((c) => [`/cid/${c}`, fmtCid(c), cids.get(c)?.nome]), p.cids)}` : ''}
${cbosLista.length ? `<h2>Ocupações que executam (CBO)</h2>${listaLinks(cbosLista.map((o) => [`/cbo/${o}`, fmtCbo(o), cbos.get(o)?.nome]), p.cbos)}` : ''}
${vizinhos.length ? `<h2>Outros procedimentos de ${esc(frase(nomeForma.get(g + s + f) || 'mesma forma de organização'))}</h2>${listaLinks(vizinhos.map((x) => [`/procedimento/${x.codigo}`, x.codigo_formatado, x.nome]), irmaos.length)}` : ''}
<p><a href="${esc(caminho)}#historico">Histórico do procedimento: desde quando existe e o que mudou em cada competência</a></p>`),
    }), '0.8');
  }

  // --- CIDs
  for (const c of dados.cids) {
    const caminho = `/cid/${c.codigo}`;
    const lista = (c.procedimentos_lista || []).map((cod) => procs.get(cod)).filter(Boolean);
    const tr = [['Início', '/'], ['CID-10', '/busca?tipo=cid'], [`CID ${c.codigo_formatado}`, caminho]];
    // eslint-disable-next-line no-await-in-loop
    await gravar('cids', caminho, pagina(template, {
      caminho,
      titulo: `CID ${c.codigo_formatado} - ${c.nome} | Procedimentos SIGTAP`,
      descricao: `CID ${c.codigo_formatado} - ${c.nome}: ${plural(c.procedimentos, 'procedimento', 'procedimentos')} da Tabela SUS (SIGTAP) aceitam este diagnóstico. Valores e ocupações. Competência ${comp}.`,
      tipo: 'article',
      dados: [migalhas(tr), {
        '@context': 'https://schema.org',
        '@type': 'MedicalCondition',
        name: c.nome,
        url: url(caminho),
        code: { '@type': 'MedicalCode', codeValue: c.codigo_formatado, codingSystem: 'ICD-10' },
      }],
      corpo: casca(`${trilha(tr.slice(0, -1).concat([[`CID ${c.codigo_formatado}`]]))}
<p class="olho">CID-10 · ${c.categoria ? 'Categoria' : 'Subcategoria'}</p>
<h1>${esc(c.nome)}</h1>
<p><span class="mono">CID ${esc(c.codigo_formatado)}</span> · competência ${esc(comp)}</p>
<p>${plural(c.procedimentos, 'procedimento', 'procedimentos')} da Tabela Unificada do SUS (SIGTAP) ${c.procedimentos === 1 ? 'aceita' : 'aceitam'} o CID ${esc(c.codigo_formatado)} (${esc(frase(c.nome))}).${c.agravo ? ' Doença de notificação compulsória.' : ''}</p>
${lista.length ? `<h2>Procedimentos compatíveis com o CID ${esc(c.codigo_formatado)}</h2>${listaLinks(lista.map((p) => [`/procedimento/${p.codigo}`, p.codigo_formatado, p.nome, brl(p.valor_total)]), c.procedimentos)}` : ''}`),
    }), '0.5');
  }

  // --- CBOs
  for (const o of dados.cbos) {
    const caminho = `/cbo/${o.codigo}`;
    const lista = (o.procedimentos_lista || []).map((cod) => procs.get(cod)).filter(Boolean);
    const tr = [['Início', '/'], ['Ocupações (CBO)', '/busca?tipo=cbo'], [`CBO ${o.codigo_formatado}`, caminho]];
    // eslint-disable-next-line no-await-in-loop
    await gravar('cbos', caminho, pagina(template, {
      caminho,
      titulo: `CBO ${o.codigo_formatado} - ${o.nome} | Procedimentos SIGTAP`,
      descricao: `CBO ${o.codigo_formatado} - ${o.nome}: ${plural(o.procedimentos, 'procedimento', 'procedimentos')} da Tabela SUS (SIGTAP) que esta ocupação pode executar. Competência ${comp}.`,
      tipo: 'article',
      dados: [migalhas(tr), {
        '@context': 'https://schema.org',
        '@type': 'DefinedTerm',
        name: o.nome,
        termCode: o.codigo_formatado,
        url: url(caminho),
        inDefinedTermSet: 'Classificação Brasileira de Ocupações (CBO)',
      }],
      corpo: casca(`${trilha(tr.slice(0, -1).concat([[`CBO ${o.codigo_formatado}`]]))}
<p class="olho">Ocupação (CBO)</p>
<h1>${esc(o.nome)}</h1>
<p><span class="mono">CBO ${esc(o.codigo_formatado)}</span> · competência ${esc(comp)}</p>
<p>A ocupação ${esc(frase(o.nome))} (CBO ${esc(o.codigo_formatado)}) pode executar ${plural(o.procedimentos, 'procedimento', 'procedimentos')} da Tabela Unificada do SUS (SIGTAP).</p>
${lista.length ? `<h2>Procedimentos que a ocupação executa</h2>${listaLinks(lista.map((p) => [`/procedimento/${p.codigo}`, p.codigo_formatado, p.nome, brl(p.valor_total)]), o.procedimentos)}` : ''}`),
    }), '0.5');
  }

  // --- sitemap (índice + um arquivo por tipo) e robots.txt
  if (SITE) {
    const arquivos = Object.fromEntries(Object.entries(paginas)
      .filter(([, lista]) => lista.length)
      .map(([nome, lista]) => [`sitemap-${nome}.xml`, lista.map(([c, pr]) => xmlUrl(c, lastmod, pr))]));
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

  const total = Object.values(paginas).reduce((n, l) => n + l.length, 0);
  console.log(`[gerar-estatico] competência ${comp}: ${num(total)} páginas pré-renderizadas `
    + `(${num(dados.procedimentos.length)} procedimentos, ${num(dados.cids.length)} CIDs, ${num(dados.cbos.length)} CBOs, `
    + `${num(paginas.navegar.length)} da árvore)${SITE ? ' + sitemap.xml' : ''} em ${((Date.now() - inicio) / 1000).toFixed(1)}s`);
}

main().catch((e) => {
  aviso(`Falha inesperada: ${e.stack || e.message}. O build do app continua valendo.`);
});
