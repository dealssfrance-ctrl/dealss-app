// Generates a build-time version stamp written into:
//  - src/app/version.ts  (embedded in the JS bundle)
//  - public/version.json (deployed alongside dist/, fetched at runtime)
//
// The mobile app compares its embedded APP_VERSION with the version.json
// served by https://troqly.be to decide whether to prompt the user to
// switch to the live (remote) site.

import { writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

let gitHash = 'nogit';
try {
  gitHash = execSync('git rev-parse --short HEAD', { cwd: root })
    .toString()
    .trim();
} catch {
  // ignore — not a git checkout
}

const buildTime = new Date().toISOString();
// Version = ISO timestamp + short git hash. Lex-comparable.
const version = `${buildTime.replace(/[-:.TZ]/g, '').slice(0, 14)}-${gitHash}`;

const tsContent = `// Auto-generated at build time by scripts/generate-version.mjs
// DO NOT EDIT MANUALLY.
export const APP_VERSION = '${version}';
export const APP_BUILD_TIME = '${buildTime}';
`;
writeFileSync(resolve(root, 'src/app/version.ts'), tsContent, 'utf8');

const jsonContent = JSON.stringify(
  { version, buildTime, gitHash },
  null,
  2
);
const publicDir = resolve(root, 'public');
mkdirSync(publicDir, { recursive: true });
writeFileSync(resolve(publicDir, 'version.json'), jsonContent + '\n', 'utf8');

console.log(`[version] ${version}`);
