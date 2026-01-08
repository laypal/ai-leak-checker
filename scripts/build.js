#!/usr/bin/env node

/**
 * Build script for AI Leak Checker extension.
 * 
 * Usage:
 *   node scripts/build.js          # Production build
 *   node scripts/build.js --dev    # Development build
 *   node scripts/build.js --zip    # Build and create ZIP for Chrome Web Store
 */

import { execSync } from 'child_process';
import { cpSync, mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createWriteStream } from 'fs';
import { createGzip } from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

const args = process.argv.slice(2);
const isDev = args.includes('--dev');
const shouldZip = args.includes('--zip');

const DIST = join(ROOT, 'dist');
const PUBLIC = join(ROOT, 'public');

function log(msg) {
  console.log(`[build] ${msg}`);
}

function error(msg) {
  console.error(`[build] ERROR: ${msg}`);
  process.exit(1);
}

function run(cmd, opts = {}) {
  try {
    execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...opts });
  } catch (e) {
    error(`Command failed: ${cmd}`);
  }
}

async function main() {
  log('Starting build...');
  
  // Clean dist
  if (existsSync(DIST)) {
    log('Cleaning dist/');
    rmSync(DIST, { recursive: true });
  }
  mkdirSync(DIST, { recursive: true });

  // TypeScript check
  log('Type checking...');
  run('npx tsc --noEmit');

  // Vite build
  log(`Building with Vite (${isDev ? 'development' : 'production'})...`);
  const mode = isDev ? 'development' : 'production';
  run(`npx vite build --mode ${mode}`);

  // Copy static assets
  log('Copying static assets...');
  
  // Copy manifest
  cpSync(join(PUBLIC, 'manifest.json'), join(DIST, 'manifest.json'));
  
  // Copy icons (if they exist)
  const iconSizes = ['16', '32', '48', '128'];
  for (const size of iconSizes) {
    const iconPath = join(PUBLIC, 'icons', `icon${size}.png`);
    if (existsSync(iconPath)) {
      mkdirSync(join(DIST, 'icons'), { recursive: true });
      cpSync(iconPath, join(DIST, 'icons', `icon${size}.png`));
    }
  }

  // Update manifest with correct paths if needed
  const manifestPath = join(DIST, 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  
  // Ensure icons are correctly referenced
  if (!existsSync(join(DIST, 'icons', 'icon16.png'))) {
    log('Warning: Icon files not found. Using placeholder icon config.');
    // Remove icons if they don't exist to avoid Chrome errors
    delete manifest.icons;
    delete manifest.action?.default_icon;
  }
  
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  // Verify build
  log('Verifying build...');
  const requiredFiles = ['manifest.json', 'background.js', 'content.js', 'popup.html'];
  for (const file of requiredFiles) {
    if (!existsSync(join(DIST, file))) {
      error(`Missing required file: ${file}`);
    }
  }

  log('Build complete!');
  log(`Output: ${DIST}`);

  // Create ZIP for Chrome Web Store
  if (shouldZip) {
    log('Creating ZIP for Chrome Web Store...');
    
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
    const version = pkg.version;
    const zipName = `ai-leak-checker-v${version}.zip`;
    const zipPath = join(ROOT, zipName);
    
    // Remove old zip if exists
    if (existsSync(zipPath)) {
      rmSync(zipPath);
    }
    
    // Create zip using native zip command (cross-platform alternative would need archiver package)
    try {
      run(`cd dist && zip -r ../${zipName} .`);
      log(`ZIP created: ${zipName}`);
    } catch {
      log('Note: zip command not available. Install zip or use archiver package.');
    }
  }

  // Print next steps
  console.log('\n📦 Build successful!\n');
  console.log('To test the extension:');
  console.log('  1. Open Chrome and go to chrome://extensions');
  console.log('  2. Enable "Developer mode" (toggle in top right)');
  console.log('  3. Click "Load unpacked"');
  console.log(`  4. Select: ${DIST}`);
  console.log('  5. Navigate to chat.openai.com or claude.ai to test\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
