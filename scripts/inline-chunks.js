/**
 * @fileoverview Post-build script to inline chunks into content and injected scripts.
 * Chrome extension content scripts must be single-file IIFE bundles.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DIST_DIR = join(__dirname, '..', 'dist');
const CHUNKS_DIR = join(DIST_DIR, 'chunks');

/**
 * Inline chunk imports into content or injected script.
 */
function inlineChunks(filePath, fileName) {
  if (!existsSync(filePath)) {
    console.warn(`[inline-chunks] File not found: ${filePath}`);
    return;
  }

  let content = readFileSync(filePath, 'utf-8');
  
  // Find all chunk imports: import{...}from"./chunks/file.js"
  const chunkImportRegex = /import\s*\{([^}]+)\}\s*from\s*["']\.\/chunks\/([^"']+)["'];?/g;
  const imports = [];
  let match;
  
  while ((match = chunkImportRegex.exec(content)) !== null) {
    const [, exports, chunkFile] = match;
    const chunkPath = join(CHUNKS_DIR, chunkFile);
    
    if (existsSync(chunkPath)) {
      imports.push({
        exports: exports.trim(),
        chunkFile,
        chunkPath,
        fullMatch: match[0],
      });
    }
  }

  if (imports.length === 0) {
    console.log(`[inline-chunks] No chunks to inline in ${fileName}`);
    return;
  }

  console.log(`[inline-chunks] Inlining ${imports.length} chunk(s) into ${fileName}...`);

  // Read and inline each chunk (in reverse order to maintain position)
  for (const { exports, chunkFile, chunkPath, fullMatch } of imports.reverse()) {
    let chunkContent = readFileSync(chunkPath, 'utf-8');
    
    // Chunks from Vite/Rollup are typically ES modules with exports at the end
    // Remove the export statement (usually at the end: export{a as b,c as d})
    chunkContent = chunkContent.replace(/export\s*\{[^}]+\}\s*;?\s*$/m, '');
    
    // Replace the import statement with the inlined chunk content
    content = content.replace(fullMatch, chunkContent);
    
    console.log(`[inline-chunks] Inlined chunk: ${chunkFile}`);
  }

  // Convert ES module to IIFE format only if not already wrapped
  // Don't wrap if content already starts with IIFE
  if (!content.trim().startsWith('(function')) {
    content = `(function() {\n'use strict';\n${content}\n})();`;
  }

  // Write the inlined content
  writeFileSync(filePath, content, 'utf-8');
  console.log(`[inline-chunks] ✅ Inlined chunks into ${fileName}`);
}

// Process content.js and injected.js
const contentPath = join(DIST_DIR, 'content.js');
const injectedPath = join(DIST_DIR, 'injected.js');

inlineChunks(contentPath, 'content.js');
inlineChunks(injectedPath, 'injected.js');

console.log('[inline-chunks] ✅ Done');
