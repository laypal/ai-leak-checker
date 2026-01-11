/**
 * @fileoverview Post-build script to inline chunks into content and injected scripts.
 * Chrome extension content scripts must be single-file IIFE bundles.
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
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

  // Track chunk files to delete after inlining
  const chunksToDelete = [];
  
  // Read and inline each chunk (in reverse order to maintain position)
  for (const { exports, chunkFile, chunkPath, fullMatch } of imports.reverse()) {
    let chunkContent = readFileSync(chunkPath, 'utf-8');
    
    // Chunks from Vite/Rollup are typically ES modules with exports at the end
    // Remove the export statement (usually at the end: export{a as b,c as d} or export{})
    // Use [^}]* to match zero or more characters, handling both empty and non-empty exports
    chunkContent = chunkContent.replace(/export\s*\{[^}]*\}\s*;?\s*$/m, '');
    
    // Replace the import statement with the inlined chunk content
    // Use function replacement to avoid interpreting $ as regex replacement patterns
    // (e.g., $1, $&, $$) in the chunk content
    content = content.replace(fullMatch, () => chunkContent);
    
    // Mark chunk file for deletion after successful inlining
    chunksToDelete.push(chunkPath);
    
    console.log(`[inline-chunks] Inlined chunk: ${chunkFile}`);
  }
  
  // Clean up inlined chunk files
  for (const chunkPath of chunksToDelete) {
    try {
      unlinkSync(chunkPath);
      console.log(`[inline-chunks] Deleted chunk: ${chunkPath}`);
    } catch (e) {
      console.warn(`[inline-chunks] Failed to delete chunk ${chunkPath}:`, e.message);
    }
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
