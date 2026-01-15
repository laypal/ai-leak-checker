/**
 * @fileoverview Post-build script to wrap content and injected scripts in IIFE.
 * 
 * NOTE: This script is now simplified since chunks are prevented during build.
 * It only handles IIFE wrapping for content/injected scripts (MV3 requirement).
 * 
 * Chrome extension content scripts must be single-file IIFE bundles.
 * Background scripts should be ES modules (no IIFE wrapping needed).
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DIST_DIR = join(__dirname, '..', 'dist');

/**
 * Wrap a script file in IIFE if not already wrapped.
 * @param {string} filePath - Path to the file to process
 * @param {string} fileName - Name of the file (for logging)
 */
function wrapIIFE(filePath, fileName) {
  if (!existsSync(filePath)) {
    console.warn(`[inline-chunks] File not found: ${filePath}`);
    return;
  }

  let content = readFileSync(filePath, 'utf-8');
  
  // Remove export statements (cannot appear in IIFE)
  content = content.replace(/export\s*\{[^}]*\}\s*;?\s*$/m, '');
  
  // Wrap in IIFE if not already wrapped
  if (!content.trim().startsWith('(function')) {
    content = `(function() {\n'use strict';\n${content}\n})();`;
    writeFileSync(filePath, content, 'utf-8');
    console.log(`[inline-chunks] ✅ Wrapped ${fileName} in IIFE`);
  } else {
    console.log(`[inline-chunks] ${fileName} already wrapped in IIFE`);
  }
}

// Process content.js and injected.js (background.js doesn't need IIFE)
const contentPath = join(DIST_DIR, 'content.js');
const injectedPath = join(DIST_DIR, 'injected.js');

wrapIIFE(contentPath, 'content.js');
wrapIIFE(injectedPath, 'injected.js');

console.log('[inline-chunks] ✅ Done');
