// Atomic SIGTAP - empacota e publica o dist/ (2026-10-21).
//
// O build gera milhares de arquivos (uma página por procedimento, CID, CBO...),
// e subir um por um é inviável. Aqui vira UM arquivo .tar.gz:
//
//   npm run pacote   -> só cria atomic_sigtap-dist.tar.gz (pra subir à mão,
//                       ex.: WinSCP, e descompactar no servidor)
//   npm run deploy   -> cria o pacote, envia por scp e troca a pasta no
//                       servidor de uma vez (sem o site ficar "pela metade")
//
// Usa o tar, scp e ssh que já vêm no Windows 10/11 (e no Linux/macOS).
// Configuração no .env:
//   DEPLOY_SSH=usuario@servidor        (ex.: root@sigtap.atomiccodes.com.br)
//   DEPLOY_DIR=/var/www/atomic_sigtap/dist   (pasta que o nginx serve - root)
//   DEPLOY_PORTA=22                     (opcional)
// Dica: configure login por chave SSH (ssh-keygen + ssh-copy-id) para não
// digitar a senha duas vezes (uma no scp, outra no ssh).

import { spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(RAIZ, 'dist');
const PACOTE = 'atomic_sigtap-dist.tar.gz';
const env = loadEnv(process.env.MODE || 'production', RAIZ, ['DEPLOY_']);
const soPacote = process.argv.includes('--so-pacote');

function rodar(cmd, args, opcoes = {}) {
  console.log(`> ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: RAIZ, ...opcoes });
  if (r.error) throw new Error(`não foi possível rodar "${cmd}": ${r.error.message}`);
  if (r.status !== 0) throw new Error(`"${cmd}" terminou com erro (código ${r.status})`);
}

function main() {
  if (!existsSync(join(DIST, 'index.html'))) throw new Error('dist/ não encontrado - rode "npm run build" antes.');

  // 1. Empacota o conteúdo de dist/ (não a pasta) num arquivo só
  rodar('tar', ['-czf', PACOTE, '-C', 'dist', '.']);
  const mb = (statSync(join(RAIZ, PACOTE)).size / 1024 / 1024).toFixed(1);
  console.log(`\nPacote pronto: ${PACOTE} (${mb} MB)\n`);
  if (soPacote) {
    console.log('Para publicar à mão, no servidor:');
    console.log('  mkdir -p /var/www/atomic_sigtap/dist.novo');
    console.log(`  tar -xzf ${PACOTE} -C /var/www/atomic_sigtap/dist.novo`);
    console.log('  mv /var/www/atomic_sigtap/dist /var/www/atomic_sigtap/dist.antigo && mv /var/www/atomic_sigtap/dist.novo /var/www/atomic_sigtap/dist');
    console.log('  rm -rf /var/www/atomic_sigtap/dist.antigo');
    return;
  }

  const destino = env.DEPLOY_SSH;
  const pasta = String(env.DEPLOY_DIR || '').replace(/\/+$/, '');
  if (!destino || !pasta) {
    throw new Error('Configure DEPLOY_SSH e DEPLOY_DIR no .env (ou use "npm run pacote" e suba o arquivo à mão).');
  }
  if (!/^\/[\w./-]+$/.test(pasta) || pasta.split('/').filter(Boolean).length < 2) {
    throw new Error(`DEPLOY_DIR inválido ou perigoso: "${pasta}" (use algo como /var/www/atomic_sigtap/dist)`);
  }
  const porta = String(env.DEPLOY_PORTA || '22');
  const remoto = `/tmp/${PACOTE}`;

  // 2. Envia o arquivo
  rodar('scp', ['-P', porta, PACOTE, `${destino}:${remoto}`]);

  // 3. Descompacta numa pasta nova e troca de uma vez (o site nunca fica
  //    pela metade); a versão anterior fica em <pasta>.anterior até o
  //    próximo deploy, para voltar rápido se precisar.
  const script = [
    'set -e',
    `rm -rf '${pasta}.novo'`,
    `mkdir -p '${pasta}.novo'`,
    `tar -xzf '${remoto}' -C '${pasta}.novo'`,
    `rm -rf '${pasta}.anterior'`,
    `if [ -d '${pasta}' ]; then mv '${pasta}' '${pasta}.anterior'; fi`,
    `mv '${pasta}.novo' '${pasta}'`,
    `rm -f '${remoto}'`,
    `echo "Publicado em ${pasta} (anterior guardado em ${pasta}.anterior)"`,
  ].join(' && ');
  rodar('ssh', ['-p', porta, destino, script]);
  console.log('\nDeploy concluído. Para voltar à versão anterior, no servidor:');
  console.log(`  mv '${pasta}' '${pasta}.ruim' && mv '${pasta}.anterior' '${pasta}'`);
}

try {
  main();
} catch (e) {
  console.error(`\n[deploy] ${e.message}\n`);
  process.exit(1);
}
