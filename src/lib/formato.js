// Formatos de exibição (pt-BR)
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const int = new Intl.NumberFormat('pt-BR');

export const moeda = (v) => (v === null || v === undefined ? '—' : brl.format(Number(v)));
export const numero = (v) => (v === null || v === undefined ? '—' : int.format(Number(v)));
export const percentual = (v) => (v === null || v === undefined ? '—' : `${String(Number(v)).replace('.', ',')}%`);
export const competenciaRotulo = (c) => (c && c.length === 6 ? `${c.slice(4)}/${c.slice(0, 4)}` : c || '');

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const competenciaExtenso = (c) => (c && c.length === 6 ? `${MESES[Number(c.slice(4)) - 1]} de ${c.slice(0, 4)}` : '');

// CID A000 -> A00.0 | CBO 225125 -> 2251-25
export const formatarCid = (c) => (c && c.length === 4 ? `${c.slice(0, 3)}.${c.slice(3)}` : c || '');
export const formatarCbo = (c) => (c && c.length === 6 ? `${c.slice(0, 4)}-${c.slice(4)}` : c || '');

// O DATASUS usa "||" como quebra de linha nas descrições
export const paragrafos = (texto) => String(texto || '').split('||').map((t) => t.trim()).filter(Boolean);

export const TOM_COMPLEXIDADE = { 0: 'neutro', 1: 'verde', 2: 'azul', 3: 'vinho' };

// Nomes amigáveis dos campos comparados em "Novidades"
const CAMPOS = {
  no_procedimento: 'Nome', vl_sh: 'Valor SH', vl_sa: 'Valor SA', vl_sp: 'Valor SP', tp_complexidade: 'Complexidade',
  tp_sexo: 'Sexo', qt_maxima_execucao: 'Qtd. máxima', qt_dias_permanencia: 'Média de permanência', qt_pontos: 'Pontos',
  vl_idade_minima: 'Idade mínima', vl_idade_maxima: 'Idade máxima', co_financiamento: 'Financiamento', co_rubrica: 'Rubrica',
  qt_tempo_permanencia: 'Tempo de permanência', vl_sh_zerado: 'SH zerado',
};
export const nomeCampo = (c) => CAMPOS[c] || c.replace(/^(co|no|vl|qt|tp|dt)_/, '').replace(/_/g, ' ');
