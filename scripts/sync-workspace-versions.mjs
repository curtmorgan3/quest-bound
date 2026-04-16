/**
 * Align every workspace package.json with the root package.json `version`:
 * - each package's own `version` field
 * - `dependencies` / `devDependencies` / `peerDependencies` / `optionalDependencies`
 *   entries for `@quest-bound/*` (exact semver → new version; `^x.y.z` → `^` + new version)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const semverExact = /^\d+\.\d+\.\d+$/;

function syncWorkspaceDepSections(pkg, version) {
  for (const section of [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ]) {
    const block = pkg[section];
    if (!block || typeof block !== 'object') continue;
    for (const [name, spec] of Object.entries(block)) {
      if (!name.startsWith('@quest-bound/') || typeof spec !== 'string') continue;
      if (spec.startsWith('workspace:')) continue;
      if (semverExact.test(spec)) {
        block[name] = version;
      } else if (spec.startsWith('^') && semverExact.test(spec.slice(1))) {
        block[name] = `^${version}`;
      }
    }
  }
}

function main() {
  const rootPkgPath = path.join(repoRoot, 'package.json');
  const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
  const version = rootPkg.version;
  if (!version || typeof version !== 'string') {
    console.error('sync-workspace-versions: root package.json has no version');
    process.exit(1);
  }

  const packagesDir = path.join(repoRoot, 'packages');
  const entries = fs.readdirSync(packagesDir, { withFileTypes: true });

  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const pkgPath = path.join(packagesDir, ent.name, 'package.json');
    if (!fs.existsSync(pkgPath)) continue;

    const raw = fs.readFileSync(pkgPath, 'utf8');
    const pkg = JSON.parse(raw);
    pkg.version = version;
    syncWorkspaceDepSections(pkg, version);

    const next = `${JSON.stringify(pkg, null, 2)}\n`;
    if (next !== raw) {
      fs.writeFileSync(pkgPath, next, 'utf8');
      console.log(`updated ${path.relative(repoRoot, pkgPath)}`);
    }
  }
}

main();
