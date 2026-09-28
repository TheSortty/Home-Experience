// Límites de arquitectura (dependency-cruiser) sobre las dos apps + packages.
// depcruise necesita la ruta absoluta del tsconfig de cada app para resolver
// sus alias (`@/src/...`); por eso este wrapper en vez de un script inline.
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

let failed = false;
for (const app of ['marketing', 'campus']) {
  try {
    execFileSync('npx', [
      'depcruise', `apps/${app}/src`, 'packages',
      '--config', '.dependency-cruiser.cjs',
      '--ts-config', resolve(`apps/${app}/tsconfig.json`),
    ], { stdio: 'inherit', shell: true });
  } catch {
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
