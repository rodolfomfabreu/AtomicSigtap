import React from 'react';
import { Link } from 'react-router-dom';
import { FiGithub, FiArrowUpRight, FiDatabase, FiCode, FiShield } from 'react-icons/fi';
import { useTitulo } from '../lib/titulo';

// Página de contato / sobre o projeto
export const GITHUB_USUARIO = 'rodolfomfabreu';
export const GITHUB_URL = `https://github.com/${GITHUB_USUARIO}`;
export const AUTOR = 'Rodolfo M F Abreu';

export default function Contato() {
  useTitulo('Contato');
  return (
    <div className="miolo">
      <div className="pagina-cabeca">
        <div className="olho">Contato</div>
        <h1>Quem fez o Atomic SIGTAP</h1>
        <p>
          O Atomic SIGTAP nasceu para deixar a Tabela Unificada do SUS fácil de consultar: busca sem mistério, cada procedimento
          explicado numa página e o que mudou entre as competências à vista.
        </p>
      </div>

      <div className="ficha-grade">
        <div>
          <section className="painel contato-autor">
            <div className="avatar" aria-hidden="true"><FiCode size={28} /></div>
            <div style={{ minWidth: 0 }}>
              <div className="olho" style={{ marginBottom: 2 }}>Criado por</div>
              <h2 style={{ fontSize: 26, marginBottom: 4 }}>{AUTOR}</h2>
              <p className="apagado" style={{ margin: '0 0 16px' }}>Desenvolvedor · sistemas para a saúde</p>
              <a className="botao primario grande" href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                <FiGithub size={18} /> github.com/{GITHUB_USUARIO} <FiArrowUpRight />
              </a>
            </div>
          </section>

          <section className="painel">
            <h2>Encontrou algo estranho?</h2>
            <p style={{ margin: 0, color: 'var(--tinta-2)' }}>
              Se um valor, CID ou regra parecer diferente do publicado pelo DATASUS, confira primeiro a competência selecionada no topo:
              a tabela muda todo mês. Sugestões e correções são bem-vindas pelo GitHub.
            </p>
          </section>
        </div>

        <aside className="ficha-lateral">
          <section className="painel">
            <h2>Sobre os dados</h2>
            <ul className="lista-sobre">
              <li><FiDatabase /> <span>Dados oficiais da <b>Tabela SIGTAP</b>, publicados mensalmente pelo DATASUS / Ministério da Saúde.</span></li>
              <li><FiShield /> <span>Consulta informativa: em caso de divergência, vale a publicação oficial.</span></li>
            </ul>
          </section>
          <Link to="/" className="botao" style={{ justifyContent: 'center' }}>Voltar à busca</Link>
        </aside>
      </div>
    </div>
  );
}
