#!/usr/bin/env node

/**
 * @fileoverview Build script that builds each entry point separately using Vite's programmatic API.
 * This prevents code splitting and chunk creation, eliminating variable name collisions.
 * 
 * Builds:
 * - background.js: ES module service worker (no chunks, no IIFE)
 * - content.js: IIFE bundle for content script (no chunks)
 * - injected.js: IIFE bundle for injected script (no chunks)
 * - popup.js: ES module with code splitting allowed (can have chunks)
 */

import { build } from 'vite';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const DIST_DIR = join(ROOT, 'dist');
const PUBLIC_DIR = join(ROOT, 'public');

/**
 * Get base Vite config (shared with vite.config.ts)
 */
function getBaseConfig(mode = 'production') {
  return {
    esbuild: {
      jsxFactory: 'h',
      jsxFragment: 'Fragment',
      jsxInject: `import { h, Fragment } from 'preact'`,
      // Configure minification to prevent variable name collisions
      // 'minifyIdentifiers' can cause collisions in complex code
      // 'minifySyntax' and 'minifyWhitespace' are safer
      minifyIdentifiers: false,
      minifySyntax: true,
      minifyWhitespace: true,
    },
    resolve: {
      alias: {
        '@': resolve(ROOT, 'src'),
        '@shared': resolve(ROOT, 'src/shared'),
        '@detectors': resolve(ROOT, 'src/shared/detectors'),
        '@types': resolve(ROOT, 'src/shared/types'),
        '@utils': resolve(ROOT, 'src/shared/utils'),
        react: 'preact/compat',
        'react-dom': 'preact/compat',
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: false, // We'll handle this manually
      sourcemap: mode === 'development' ? 'inline' : false,
      // Disable minification for now to prevent variable name collision issues
      // esbuild's minifier can create duplicate variable declarations in complex code
      // We'll minify manually or use a different minifier if needed
      minify: false,
      target: 'es2022',
      rollupOptions: {
        treeshake: {
          moduleSideEffects: true,
        },
      },
    },
  };
}

/**
 * Build a single entry point
 */
async function buildEntry(entryName, entryPath, baseConfig, options = {}) {
  const { preventChunks = false, format = 'es', wrapIIFE = false, isHtml = false } = options;
  
  console.log(`[build-entries] Building ${entryName}...`);
  
  // Create a fresh config - don't inherit rollupOptions from baseConfig
  // Set configFile: false to prevent Vite from loading vite.config.ts
  // (which has manualChunks that conflicts with inlineDynamicImports)
  const config = {
    configFile: false, // Don't load vite.config.ts to avoid conflicts
    esbuild: baseConfig.esbuild,
    resolve: baseConfig.resolve,
    build: {
      outDir: baseConfig.build.outDir,
      emptyOutDir: baseConfig.build.emptyOutDir,
      sourcemap: baseConfig.build.sourcemap,
      minify: baseConfig.build.minify,
      target: baseConfig.build.target,
      rollupOptions: {},
    },
  };
  
  if (isHtml) {
    // For HTML entries (popup), use standard build with code splitting allowed
    config.build.rollupOptions = {
      input: entryPath, // Single string input, not object
      output: {
        entryFileNames: () => `${entryName}.js`, // Use entryName instead of file basename
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
      treeshake: {
        moduleSideEffects: true,
      },
    };
  } else {
    // For JS/TS entries, use regular build with single string input
    // Explicitly set inlineDynamicImports: true to prevent chunks
    // This is required to ensure no chunk files are created, preventing variable collisions
    const outputConfig = {
      format,
      entryFileNames: () => `${entryName}.js`, // Use entryName instead of file basename
      inlineDynamicImports: true, // Explicitly prevent chunks from being created
    };
    
    // IIFE format requires a 'name' property for the global variable assignment
    // Without it, Rollup will issue warnings and may generate malformed IIFE bundles
    // We use a unique name per entry to avoid conflicts
    if (format === 'iife') {
      // Use a camelCase name based on entry name, scoped to avoid global pollution
      outputConfig.name = entryName === 'content' 
        ? 'AILCContent' 
        : entryName === 'injected' 
        ? 'AILCInjected' 
        : `${entryName.charAt(0).toUpperCase()}${entryName.slice(1)}`;
    }
    
    config.build.rollupOptions = {
      input: entryPath, // Single string input
      output: outputConfig,
      treeshake: {
        moduleSideEffects: true,
      },
    };
  }
  
  // Remove plugins that handle multiple entries (copy-manifest)
  // We'll handle static assets after all builds
  if (config.plugins) {
    config.plugins = config.plugins.filter(p => p && p.name !== 'copy-manifest');
  }
  
  await build(config);
  
  // Handle IIFE wrapping for content/injected scripts
  if (wrapIIFE) {
    const outputPath = join(DIST_DIR, `${entryName}.js`);
    if (existsSync(outputPath)) {
      let content = readFileSync(outputPath, 'utf-8');
      const originalContent = content;
      
      // Remove export statements (cannot appear in IIFE)
      // Rollup with format: 'iife' should remove these, but we ensure they're gone
      content = content.replace(/export\s*\{[^}]*\}\s*;?\s*$/m, '');
      
      // Wrap in IIFE if not already wrapped
      // Check for both patterns:
      // 1. Rollup with format: 'iife' and name: outputs "var Name = (function() {...})();"
      // 2. Already wrapped: "(function() {...})();"
      const trimmed = content.trim();
      const isAlreadyWrapped = 
        trimmed.startsWith('(function') ||
        /^var\s+\w+\s*=\s*\(function\s*\(\)/.test(trimmed);
      
      if (!isAlreadyWrapped) {
        content = `(function() {\n'use strict';\n${content}\n})();`;
      }
      
      // Always write file if we made any changes (export removal or IIFE wrapping)
      if (content !== originalContent) {
        writeFileSync(outputPath, content, 'utf-8');
        if (!isAlreadyWrapped) {
          console.log(`[build-entries] ✅ Wrapped ${entryName}.js in IIFE`);
        } else {
          console.log(`[build-entries] ✅ Cleaned ${entryName}.js (removed export statements)`);
        }
      }
    }
  }
  
  console.log(`[build-entries] ✅ Built ${entryName}`);
}

/**
 * Copy static assets after all builds
 */
function copyStaticAssets() {
  console.log('[build-entries] Copying static assets...');
  
  // Copy manifest.json
  const manifestSrc = join(PUBLIC_DIR, 'manifest.json');
  const manifestDest = join(DIST_DIR, 'manifest.json');
  if (existsSync(manifestSrc)) {
    copyFileSync(manifestSrc, manifestDest);
    console.log('[build-entries] ✅ Copied manifest.json');
  }
  
  // Copy icons
  const iconsSrcDir = join(PUBLIC_DIR, 'icons');
  const iconsDestDir = join(DIST_DIR, 'icons');
  
  if (existsSync(iconsSrcDir)) {
    if (!existsSync(iconsDestDir)) {
      mkdirSync(iconsDestDir, { recursive: true });
    }
    
    for (const size of ['16', '32', '48', '128']) {
      const iconFile = `icon${size}.png`;
      const srcPath = join(iconsSrcDir, iconFile);
      if (existsSync(srcPath)) {
        copyFileSync(srcPath, join(iconsDestDir, iconFile));
      }
    }
    
    // Copy SVG source (source renamed to "AI Leak Checker.svg"; output stays icon.svg for dist)
    const svgSourcePath = join(iconsSrcDir, 'AI Leak Checker.svg');
    if (existsSync(svgSourcePath)) {
      copyFileSync(svgSourcePath, join(iconsDestDir, 'icon.svg'));
    }
    
    console.log('[build-entries] ✅ Copied icons');
  }
  
  // Move popup HTML to popup.html at root
  // Vite outputs HTML entries preserving directory structure, so it may be at:
  // - dist/src/popup/index.html (when input is src/popup/index.html)
  // - dist/popup.html (when using entryFileNames for HTML - not supported by Rollup)
  // We check both possible locations
  const popupSrcPaths = [
    join(DIST_DIR, 'src/popup/index.html'), // Vite's default behavior
    join(DIST_DIR, 'popup.html'), // Already at root (shouldn't happen but check anyway)
  ];
  
  const popupDestPath = join(DIST_DIR, 'popup.html');
  let popupSrcPath = popupSrcPaths.find(p => existsSync(p));
  
  if (popupSrcPath) {
    // Only move if it's not already at the destination
    if (popupSrcPath !== popupDestPath) {
      let html = readFileSync(popupSrcPath, 'utf-8');
      // Fix script paths: /popup.js -> popup.js
      html = html.replace(/src="\/(popup\.js)"/g, 'src="$1"');
      // Fix chunk paths: /chunks/... -> chunks/...
      html = html.replace(/href="\/(chunks\/[^"]+)"/g, 'href="$1"');
      // Fix asset paths: /assets/... -> assets/...
      html = html.replace(/(href|src)="\/(assets\/[^"]+)"/g, '$1="$2"');
      writeFileSync(popupDestPath, html, 'utf-8');
      console.log(`[build-entries] ✅ Moved popup.html from ${popupSrcPath} to root`);
    } else {
      console.log('[build-entries] ✅ popup.html already at root');
    }
  } else {
    console.warn('[build-entries] ⚠️  popup.html not found - popup may not work');
  }
}

/**
 * Main build function
 */
async function main() {
  const mode = process.env.NODE_ENV || 'production';
  console.log(`[build-entries] Starting build (mode: ${mode})...`);
  
  // Get base config
  const baseConfig = getBaseConfig(mode);
  
  // Clean dist directory
  if (existsSync(DIST_DIR)) {
    const { rmSync } = await import('fs');
    rmSync(DIST_DIR, { recursive: true });
  }
  mkdirSync(DIST_DIR, { recursive: true });
  
  // Build each entry point separately
  // Order matters: background first, then content/injected, then popup
  
  // 1. Background service worker (ES module, no chunks, no IIFE)
  await buildEntry(
    'background',
    resolve(ROOT, 'src/background/index.ts'),
    baseConfig,
    { preventChunks: true, format: 'es', wrapIIFE: false }
  );
  
  // 2. Content script (IIFE bundle, no chunks)
  await buildEntry(
    'content',
    resolve(ROOT, 'src/content/index.ts'),
    baseConfig,
    { preventChunks: true, format: 'iife', wrapIIFE: true }
  );
  
  // 3. Injected script (IIFE bundle, no chunks)
  await buildEntry(
    'injected',
    resolve(ROOT, 'src/injected/index.ts'),
    baseConfig,
    { preventChunks: true, format: 'iife', wrapIIFE: true }
  );
  
  // 4. Popup (ES module, code splitting allowed)
  await buildEntry(
    'popup',
    resolve(ROOT, 'src/popup/index.html'),
    baseConfig,
    { preventChunks: false, format: 'es', wrapIIFE: false, isHtml: true }
  );
  
  // Copy static assets
  copyStaticAssets();
  
  // Minify built files using terser (safer than esbuild minification)
  if (mode === 'production') {
    await minifyBuiltFiles();
  }
  
  console.log('[build-entries] ✅ Build complete!');
}

/**
 * Minify built JavaScript files using terser
 * This avoids variable name collision issues that esbuild minification can cause
 */
async function minifyBuiltFiles() {
  console.log('[build-entries] Minifying built files with terser...');
  
  const filesToMinify = [
    { name: 'background.js', isIIFE: false },
    { name: 'content.js', isIIFE: true },
    { name: 'injected.js', isIIFE: true },
  ];
  
  for (const { name, isIIFE } of filesToMinify) {
    const filePath = join(DIST_DIR, name);
    if (!existsSync(filePath)) {
      console.warn(`[build-entries] ⚠️  ${name} not found, skipping minification`);
      continue;
    }
    
    try {
      const content = readFileSync(filePath, 'utf-8');
      const { minify } = await import('terser');
      const result = await minify(content, {
        compress: {
          passes: 1, // Single pass to reduce risk of bugs
          unsafe: false, // Don't use unsafe optimizations
          drop_console: false, // Keep console statements for debugging
        },
        mangle: {
          safari10: true, // Fix Safari 10 issues
          keep_classnames: false, // Allow class name mangling
          keep_fnames: false, // Allow function name mangling
        },
        format: {
          comments: false,
        },
      });
      
      // Check for errors in the result object
      // Terser can return an error property even if it doesn't throw
      if (result.error) {
        throw new Error(`Terser minification error: ${result.error.message || result.error}`);
      }
      
      // Ensure we have valid code output
      if (!result.code) {
        throw new Error('Minification returned no code output');
      }
      
      writeFileSync(filePath, result.code, 'utf-8');
      console.log(`[build-entries] ✅ Minified ${name}`);
    } catch (error) {
      console.error(`[build-entries] ❌ Failed to minify ${name}:`, error);
      // Continue with other files even if one fails
    }
  }
}

main().catch((error) => {
  console.error('[build-entries] ❌ Build failed:', error);
  process.exit(1);
});