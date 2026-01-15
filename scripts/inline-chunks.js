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
  const originalContent = content;
  
  // Remove export statements (cannot appear in IIFE)
  content = content.replace(/export\s*\{[^}]*\}\s*;?\s*$/m, '');
  
  // Wrap in IIFE if not already wrapped
  // Check for both patterns:
  // 1. Rollup with format: 'iife' and name: outputs "var Name = (function() {...})();"
  // 2. Already wrapped: "(function() {...})();"
  const trimmed = content.trim();
  const isAlreadyWrapped = 
    trimmed.startsWith('(function') ||
    /^var\s+\w+\s*=\s*\(function\s*\(/.test(trimmed);
  
  if (!isAlreadyWrapped) {
    content = `(function() {\n'use strict';\n${content}\n})();`;
  }
  
  // Always write file if we made any changes (export removal or IIFE wrapping)
  if (content !== originalContent) {
    writeFileSync(filePath, content, 'utf-8');
    if (!isAlreadyWrapped) {
      console.log(`[inline-chunks] ✅ Wrapped ${fileName} in IIFE`);
    } else {
      console.log(`[inline-chunks] ✅ Cleaned ${fileName} (removed export statements)`);
    }
  } else {
    console.log(`[inline-chunks] ${fileName} already correct (IIFE wrapped, no exports)`);
  }
}

// Process content.js and injected.js (background.js doesn't need IIFE)
const contentPath = join(DIST_DIR, 'content.js');
const injectedPath = join(DIST_DIR, 'injected.js');

wrapIIFE(contentPath, 'content.js');
wrapIIFE(injectedPath, 'injected.js');

console.log('[inline-chunks] ✅ Done');
