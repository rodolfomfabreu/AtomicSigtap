# Atomic SIGTAP

Consulta pública da **Tabela Unificada de Procedimentos do SUS (SIGTAP)**: procedimentos,
valores, regras, CID-10, ocupações (CBO), cruzamento CID × CBO e o que mudou entre competências.

É um app **só de leitura**, separado do projeto_pnl. Os dados vêm da mesma API
(`projeto_pnl_api`, rotas `/fat/sigtap/publico/*`), autenticada por um **token público
próprio**: sem usuário, sem empresa, sem login. O token só abre as consultas do SIGTAP
e não serve para nenhuma outra rota da API.

## Configurar

1. No projeto_pnl, em **Faturamento › Atualizar Tabela › Tokens do app público**, gere um token.
2. Copie `.env.example` para `.env` e preencha:

```
VITE_API_URL=https://endereco-da-projeto_pnl_api
VITE_SIGTAP_TOKEN=sgt_...
VITE_NOME_INSTITUICAO=Nome que aparece no rodapé (opcional)
```

> As variáveis `VITE_*` entram no build. Trocou o token ou a URL? Rode o build de novo.
> Revogar o token na tela de Tokens corta o acesso na hora (cache de até 30s na API).

## Rodar e publicar

```
npm install
npm run dev        # desenvolvimento (porta padrão do Vite; troque com --port)
npm run build      # gera dist/
```

Publique a pasta `dist/` no nginx. O `nginx.conf.example` tem o essencial: o
`try_files ... /index.html` é obrigatório para os links diretos (ex.: `/cid/K35`) funcionarem.
Se o app ficar num subcaminho (ex.: `/sigtap/`), gere o build com `npx vite build --base=/sigtap/`.

## Telas

| Rota | O que mostra |
|---|---|
| `/` | Busca principal (procedimento, CID ou CBO), números da competência, novidades e grupos |
| `/busca?q=&tipo=cid\|cbo` | Resultados com filtros (grupo, complexidade, financiamento) |
| `/procedimento/:codigo` | Ficha completa: valores, regras, descrição, histórico de valor e todas as relações |
| `/cid/:codigo?cbo=` | CID: atributos, subcategorias, procedimentos e cruzamento com uma ocupação |
| `/cbo/:codigo?cid=` | Ocupação: família CBO, perfil por grupo, procedimentos e cruzamento com um CID |
| `/navegar/...` | Grupo › subgrupo › forma de organização › procedimentos |
| `/novidades` | Novos, excluídos e alterados (campo a campo) entre duas competências |
| `/contato` | Quem criou o app (GitHub) e informações sobre os dados |

A competência vigente é a mais recente importada; o seletor no topo consulta qualquer
competência anterior. Todos os links podem ser compartilhados (o cruzamento vai junto na URL).

## Estrutura

```
src/
  lib/          api.js (fetch + token + cache), competencia.jsx, formato.js, titulo.js
  componentes/  Layout, Buscador, Itens, Cruzar, Graficos, Relacao, Estados...
  paginas/      Inicio, Busca, Procedimento, Cid, Cbo, Navegar, Novidades, NaoEncontrada
  estilos.css   tema editorial claro + escuro (variáveis CSS)
```

---

Criado por **Rodolfo M F Abreu** · [github.com/rodolfomfabreu](https://github.com/rodolfomfabreu)
