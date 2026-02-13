/**
 * Generates locally-trusted HTTPS certs for the dev server using mkcert.
 * Run once after installing mkcert (brew install mkcert && mkcert -install).
 *
 * Cert includes localhost, 127.0.0.1, ::1, and your machine's LAN IP(s)
 * so you can use https from other devices on the network.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const certDir = path.resolve(process.cwd(), '.cert');
const keyPath = path.join(certDir, 'key.pem');
const certPath = path.join(certDir, 'cert.pem');

function getLocalIPs(): string[] {
  const ips: string[] = [];
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    if (!iface) continue;
    for (const config of iface) {
      if (config.family === 'IPv4' && !config.internal) {
        ips.push(config.address);
      }
    }
  }
  return ips;
}

function main() {
  const check = spawnSync('mkcert', ['-help'], { encoding: 'utf8' });
  if (check.error ?? check.status !== 0) {
    console.error(
      'mkcert is not installed. Install it first:\n  brew install mkcert\n  mkcert -install',
    );
    process.exit(1);
  }

  fs.mkdirSync(certDir, { recursive: true });

  const names = ['localhost', '127.0.0.1', '::1', ...getLocalIPs()];

  console.log('Generating cert for:', names.join(', '));
  const result = spawnSync('mkcert', [
    '-key-file',
    keyPath,
    '-cert-file',
    certPath,
    ...names,
  ], {
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  console.log(
    'Done. Certificates written to .cert/\nRun "npm run dev" to start the dev server with HTTPS.',
  );
}

main();
