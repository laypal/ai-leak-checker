/**
 * @fileoverview Package the built extension into a Chrome Web Store zip.
 * @module scripts/package
 *
 * Produces `releases/ai-leak-checker-v<version>.zip` from the contents of
 * `dist/` (manifest.json at the zip ROOT, as the Web Store requires). Run via
 * `npm run package`, which builds first. Cross-platform: uses PowerShell
 * Compress-Archive on Windows and `zip` elsewhere. Output is git-ignored (*.zip).
 *
 * The version is read from the BUILT dist/manifest.json so the zip name always
 * matches what will actually be uploaded.
 */

import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const distDir = join(root, 'dist');
const releasesDir = join(root, 'releases');

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

if (!existsSync(join(distDir, 'manifest.json'))) {
  fail('dist/manifest.json not found — run `npm run build` first (npm run package does this).');
}

const manifest = JSON.parse(readFileSync(join(distDir, 'manifest.json'), 'utf-8').replace(/^﻿/, ''));
const version = manifest.version;
if (!version) {
  fail('No version field in dist/manifest.json.');
}

mkdirSync(releasesDir, { recursive: true });
const zipPath = join(releasesDir, `ai-leak-checker-v${version}.zip`);
if (existsSync(zipPath)) {
  rmSync(zipPath);
}

console.log(`📦 Packaging dist/ → ${zipPath}`);

try {
  if (process.platform === 'win32') {
    // Compress-Archive on dist/* places the contents at the archive root.
    execFileSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `Compress-Archive -Path "${join(distDir, '*')}" -DestinationPath "${zipPath}" -Force`,
      ],
      { stdio: 'inherit' }
    );
  } else {
    // `zip -r ../releases/...zip .` run from inside dist/ keeps paths relative
    // to dist/, so manifest.json lands at the zip root.
    execFileSync('zip', ['-r', '-q', zipPath, '.'], { cwd: distDir, stdio: 'inherit' });
  }
} catch (err) {
  fail(`Zip failed: ${err.message}\n(On non-Windows, ensure the \`zip\` CLI is installed.)`);
}

console.log(`✅ Created ${zipPath}`);
console.log('   Upload at: https://chrome.google.com/webstore/devconsole → item → Package → Upload new package');
