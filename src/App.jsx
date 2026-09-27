import React from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './componentes/Layout';
import Inicio from './paginas/Inicio';
import Busca from './paginas/Busca';
import Procedimento from './paginas/Procedimento';
import Cid from './paginas/Cid';
import Cbo from './paginas/Cbo';
import Navegar from './paginas/Navegar';
import Novidades from './paginas/Novidades';
import NaoEncontrada from './paginas/NaoEncontrada';
import Contato from './paginas/Contato';
import { useCompetencia } from './lib/competencia';
import { Aviso } from './componentes/Estados';

function Rotas() {
  const { erro } = useCompetencia();
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={erro ? <div className="miolo" style={{ paddingTop: 40 }}><Aviso tipo="erro">{erro.message}</Aviso></div> : <Inicio />} />
        <Route path="busca" element={<Busca />} />
        <Route path="procedimento/:codigo" element={<Procedimento />} />
        <Route path="cid/:codigo" element={<Cid />} />
        <Route path="cbo/:codigo" element={<Cbo />} />
        <Route path="navegar" element={<Navegar />} />
        <Route path="navegar/:grupo" element={<Navegar />} />
        <Route path="navegar/:grupo/:subgrupo" element={<Navegar />} />
        <Route path="navegar/:grupo/:subgrupo/:forma" element={<Navegar />} />
        <Route path="novidades" element={<Novidades />} />
        <Route path="contato" element={<Contato />} />
        <Route path="*" element={<NaoEncontrada />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return <Rotas />;
}
