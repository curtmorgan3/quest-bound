/**
 * Publishes every workspace under packages/ except core-engine.
 * Forwards extra CLI args to each `npm publish` (e.g. `--dry-run`).
 * Adds `--access public` for scoped packages unless you pass `--access` yourself.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const packagesDir = path.join(repoRoot, 'packages');

const extraArgs = process.argv.slice(2);
const hasAccessFlag = extraArgs.some(
  (a) => a === '--access' || a.startsWith('--access='),
);

function npmCmd() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function main() {
  const entries = fs.readdirSync(packagesDir, { withFileTypes: true });
  const names = [];

  for (const ent of entries) {
    if (!ent.isDirectory() || ent.name === 'core-engine') continue;
    const pkgPath = path.join(packagesDir, ent.name, 'package.json');
    if (!fs.existsSync(pkgPath)) continue;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (typeof pkg.name === 'string') names.push(pkg.name);
  }

  names.sort();

  if (names.length === 0) {
    console.error('No packages found to publish.');
    process.exit(1);
  }

  const npm = npmCmd();

  for (const name of names) {
    const args = ['publish', '-w', name];
    if (!hasAccessFlag) {
      args.push('--access', 'public');
    }
    args.push(...extraArgs);

    console.log(`\n> ${npm} ${args.join(' ')}\n`);

    const result = spawnSync(npm, args, {
      cwd: repoRoot,
      stdio: 'inherit',
      shell: false,
    });

    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  }
}

main();
