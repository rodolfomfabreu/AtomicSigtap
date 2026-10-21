import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiDownload, FiMonitor, FiPackage, FiInfo, FiArrowUpRight, FiCheckCircle,
} from 'react-icons/fi';
import { Carregando, Erro, Vazio } from '../componentes/Estados';
import { useConsulta, urlDownloadPacote } from '../lib/api';
import { numero, competenciaExtenso } from '../lib/formato';
import { useTitulo } from '../lib/titulo';

// Área de downloads: o programa SIGTAP (desktop, Windows) que fica em
// public/downloads/SIGTAP.zip e os pacotes mensais da Tabela Unificada que
// a API guarda a cada importação (GET /downloads).

export const ARQUIVO_PROGRAMA = `${import.meta.env.BASE_URL}downloads/SIGTAP.zip`;
const SITE_OFICIAL = 'http://sigtap.datasus.gov.br/';

const tamanho = (bytes) => {
  const n = Number(bytes) || 0;
  return n >= 1024 ** 2 ? `${(n / 1024 ** 2).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
};
const data = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : null);

// Tamanho e data do programa direto do servidor (HEAD), sem precisar de build
function usePrograma() {
  const [info, setInfo] = useState({ carregando: true, existe: false });
  useEffect(() => {
    let vivo = true;
    fetch(ARQUIVO_PROGRAMA, { method: 'HEAD', cache: 'no-store' })
      .then((r) => {
        const tipo = r.headers.get('content-type') || '';
        // O fallback do SPA devolve o index.html com 200: isso não é o zip
        const existe = r.ok && !tipo.includes('text/html');
        if (vivo) setInfo({ carregando: false, existe, bytes: Number(r.headers.get('content-length')) || null, em: r.headers.get('last-modified') });
      })
      .catch(() => vivo && setInfo({ carregando: false, existe: false }));
    return () => { vivo = false; };
  }, []);
  return info;
}

export default function Downloads() {
  useTitulo(
    'Download da Tabela SIGTAP: programa e pacotes mensais (competências)',
    'Baixe o programa SIGTAP para Windows corrigido para funcionar com os pacotes mais recentes, e os pacotes da Tabela Unificada do SUS de cada competência (arquivos oficiais do DATASUS).',
  );
  const programa = usePrograma();
  const pacotes = useConsulta('/downloads', {});
  const lista = pacotes.dados || [];

  return (
    <div className="miolo">
      <div className="pagina-cabeca">
        <div className="olho">Downloads</div>
        <h1>Baixar a Tabela SIGTAP</h1>
        <p>
          O programa SIGTAP para consultar a tabela sem internet e os pacotes mensais da Tabela Unificada de Procedimentos,
          Medicamentos e OPM do SUS, do jeito que o DATASUS publica, para importar no seu sistema de faturamento.
        </p>
      </div>

      <div className="ficha-grade">
        <div>
          <section className="painel download-destaque">
            <div className="icone-grande" aria-hidden="true"><FiMonitor size={26} /></div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h2 style={{ marginBottom: 4 }}>
                Programa SIGTAP (Windows) <span className="selo verde"><FiCheckCircle size={11} /> funciona com os pacotes atuais</span>
              </h2>
              <p className="apagado" style={{ margin: '0 0 8px' }}>
                Versão desktop do DATASUS para consulta offline da tabela, <b style={{ color: 'var(--tinta-2)' }}>corrigida para funcionar com os pacotes mais recentes</b>.
                A versão disponível no site oficial ainda tem o problema e não funciona com as competências atuais.
              </p>
              <p className="apagado" style={{ margin: '0 0 12px' }}>
                Descompacte a pasta e abra o <code>sigtap.exe</code>. Se ele não abrir, instale o Java (JRE 8) e tente de novo.
              </p>
              {programa.carregando ? <Carregando linhas={1} /> : programa.existe ? (
                <div className="download-acoes">
                  <a className="botao primario grande" href={ARQUIVO_PROGRAMA} download>
                    <FiDownload /> Baixar SIGTAP.zip
                  </a>
                  <span className="apagado" style={{ fontSize: 13 }}>
                    {programa.bytes ? tamanho(programa.bytes) : ''}{programa.em ? ` · atualizado em ${data(programa.em)}` : ''}
                  </span>
                </div>
              ) : (
                <p className="apagado" style={{ margin: 0 }}>O programa estará disponível aqui em breve.</p>
              )}
            </div>
          </section>

          <section className="painel">
            <h2><FiPackage /> Pacotes mensais da Tabela Unificada {lista.length > 0 && <span className="contagem">{numero(lista.length)}</span>}</h2>
            <p className="apagado" style={{ marginTop: 0 }}>
              Cada competência é um <code>.zip</code> com os arquivos de texto e o layout oficial do DATASUS
              (procedimentos, CID, CBO, habilitações, regras…). É o mesmo pacote usado para atualizar o programa SIGTAP e os sistemas de faturamento.
            </p>
            <Erro erro={pacotes.erro} />
            {pacotes.carregando && !pacotes.dados && <Carregando linhas={4} />}
            {pacotes.dados && lista.length === 0 && (
              <Vazio titulo="Nenhum pacote disponível ainda" icone={FiPackage}>Os pacotes aparecem aqui a cada nova competência importada.</Vazio>
            )}
            {lista.length > 0 && (
              <ul className="lista lista-downloads">
                {lista.map((p, i) => (
                  <li key={p.competencia}>
                    <div className="quando">
                      <strong>{p.competencia_rotulo}</strong>
                      <span className="apagado">{competenciaExtenso(p.competencia)}</span>
                    </div>
                    <div className="sobre">
                      <span className="mono" title={p.arquivo}>{p.arquivo}</span>
                      <span className="apagado">
                        {p.tamanho}{p.versao ? ` · versão ${p.versao}` : ''}{p.publicado_em ? ` · disponível desde ${data(p.publicado_em)}` : ''}
                      </span>
                      <span className="selos">
                        {i === 0 && <span className="selo verde"><FiCheckCircle size={11} /> mais recente</span>}
                        {p.consultavel && <Link className="selo acento" to="/">consultável no site</Link>}
                      </span>
                    </div>
                    <a className="botao" href={urlDownloadPacote(p.competencia)} rel="nofollow">
                      <FiDownload /> Baixar
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="ficha-lateral">
          <section className="painel">
            <h2><FiInfo /> Como usar</h2>
            <ul className="lista-sobre">
              <li><FiCheckCircle /> <span><b>Programa:</b> baixe o SIGTAP.zip, descompacte numa pasta e abra o <code>sigtap.exe</code>. Esta versão já está corrigida para as competências atuais.</span></li>
              <li><FiCheckCircle /> <span><b>Atualizar o programa:</b> baixe o pacote da competência e importe pelo próprio SIGTAP.</span></li>
              <li><FiCheckCircle /> <span><b>Sistemas de faturamento:</b> o zip segue o layout oficial do DATASUS (arquivos .txt + layout).</span></li>
            </ul>
          </section>
          <section className="painel">
            <h2>Competências mais antigas</h2>
            <p className="apagado" style={{ margin: '0 0 12px', fontSize: 14 }}>
              Precisa de uma competência que não está na lista? Todas as publicações ficam no site oficial do DATASUS.
            </p>
            <a className="botao" href={SITE_OFICIAL} target="_blank" rel="noopener noreferrer">SIGTAP oficial <FiArrowUpRight /></a>
          </section>
          <p className="apagado" style={{ fontSize: 12.5, margin: 0 }}>
            Pacotes mensais oficiais do DATASUS/Ministério da Saúde, redistribuídos sem alteração.
          </p>
        </aside>
      </div>
    </div>
  );
}
