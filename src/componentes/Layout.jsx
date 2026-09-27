import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  FiMoon, FiSun, FiSearch, FiMenu, FiClock, FiGithub,
} from 'react-icons/fi';
import Logo from './Logo';
import { AUTOR, GITHUB_URL } from '../paginas/Contato';
import { useCompetencia } from '../lib/competencia';
import { competenciaRotulo, competenciaExtenso } from '../lib/formato';

const INSTITUICAO = import.meta.env.VITE_NOME_INSTITUICAO || '';

function trocarTema() {
  const novo = document.documentElement.dataset.tema === 'escuro' ? 'claro' : 'escuro';
  document.documentElement.dataset.tema = novo;
  try { localStorage.setItem('atomic_sigtap_tema', novo); } catch (e) { /* navegador sem storage */ }
  return novo;
}

export default function Layout() {
  const { competencia, competencias, trocar, ehVigente, vigente } = useCompetencia();
  const [tema, setTema] = useState(() => document.documentElement.dataset.tema || 'claro');
  const [menu, setMenu] = useState(false);
  const [termo, setTermo] = useState('');
  const navegar = useNavigate();
  const local = useLocation();

  useEffect(() => { setMenu(false); window.scrollTo(0, 0); }, [local.pathname]);

  const buscarTopo = (e) => {
    e.preventDefault();
    if (termo.trim()) navegar(`/busca?q=${encodeURIComponent(termo.trim())}`);
    setTermo('');
  };

  return (
    <div className="casca">
      <a href="#conteudo" className="sr">Pular para o conteúdo</a>
      <header className={`topo${local.pathname !== '/' ? ' com-busca' : ''}`}>
        <div className="miolo">
          <Link to="/" className="marca" aria-label="Atomic SIGTAP - início">
            <Logo />
            <div><b>Atomic SIGTAP</b><span>Tabela de Procedimentos do SUS</span></div>
          </Link>
          <nav className={`nav${menu ? ' aberto' : ''}`} aria-label="Principal">
            <NavLink to="/busca" className={({ isActive }) => (isActive ? 'ativo' : '')}>Buscar</NavLink>
            <NavLink to="/navegar" className={({ isActive }) => (isActive ? 'ativo' : '')}>Navegar</NavLink>
            <NavLink to="/busca?tipo=cid" className={() => (local.pathname.startsWith('/cid') ? 'ativo' : '')}>CID-10</NavLink>
            <NavLink to="/busca?tipo=cbo" className={() => (local.pathname.startsWith('/cbo') ? 'ativo' : '')}>Ocupações</NavLink>
            <NavLink to="/novidades" className={({ isActive }) => (isActive ? 'ativo' : '')}>Novidades</NavLink>
            <NavLink to="/contato" className={({ isActive }) => (isActive ? 'ativo' : '')}>Contato</NavLink>
          </nav>
          <div className="direita">
            {local.pathname !== '/' && (
              <form className="busca-topo" onSubmit={buscarTopo} role="search">
                <FiSearch />
                <input value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Buscar procedimento…" aria-label="Buscar procedimento" />
              </form>
            )}
            {competencias.length > 0 && (
              <label className="seletor-comp">
                <span>Competência</span>
                <select value={competencia || ''} onChange={(e) => trocar(e.target.value)} aria-label="Competência consultada">
                  {competencias.map((c, i) => <option key={c.competencia} value={c.competencia}>{c.rotulo}{i === 0 ? ' · vigente' : ''}</option>)}
                </select>
              </label>
            )}
            <button type="button" className="botao-icone" onClick={() => setTema(trocarTema())} aria-label={tema === 'escuro' ? 'Usar tema claro' : 'Usar tema escuro'} title={tema === 'escuro' ? 'Tema claro' : 'Tema escuro'}>
              {tema === 'escuro' ? <FiSun /> : <FiMoon />}
            </button>
            <button type="button" className="botao-icone so-celular" onClick={() => setMenu((m) => !m)} aria-label="Menu" aria-expanded={menu}><FiMenu /></button>
          </div>
        </div>
      </header>

      {!ehVigente && competencia && (
        <div className="faixa-historica" role="status">
          <div className="miolo">
            <FiClock />
            <span>Você está consultando a competência de <b>{competenciaExtenso(competencia)}</b>, que não é a vigente.</span>
            <button type="button" onClick={() => trocar(vigente)}>Voltar para {competenciaRotulo(vigente)}</button>
          </div>
        </div>
      )}

      <main id="conteudo">
        <Outlet />
      </main>

      <footer className="rodape">
        <div className="miolo">
          <span><b>Atomic SIGTAP</b>{INSTITUICAO ? ` · ${INSTITUICAO}` : ''} · consulta à Tabela de Procedimentos, Medicamentos e OPM do SUS.</span>
          <span>Dados oficiais publicados mensalmente pelo DATASUS/Ministério da Saúde (SIGTAP). Esta consulta é informativa; em caso de divergência, vale a publicação oficial.</span>
          <span className="credito">
            Criado por <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer"><FiGithub size={13} /> {AUTOR}</a>
            {' '}· <Link to="/contato">Contato</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
