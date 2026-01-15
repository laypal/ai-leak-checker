import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';

/**
 * Vite configuration for AI Leak Checker Chrome Extension
 *
 * NOTE: Production builds are performed via scripts/build-entries.js which builds
 * each entry point separately to prevent code splitting and variable collisions.
 * 
 * WARNING: Dev mode (npm run dev) uses this config directly. While we attempt to
 * prevent chunks via manualChunks, Rollup may still create chunks for shared
 * dependencies when building multiple entry points. For MV3 compliance testing,
 * use production build (npm run build) which uses build-entries.js.
 *
 * Entry points:
 * - background: Service worker
 * - content: Content script (injected into target pages)
 * - popup: Extension popup UI
 * - injected: Main world script for fetch patching
 */
export default defineConfig(({ mode }) => ({
  // Preact/React config via esbuild (no plugin needed for simple JSX)
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
    jsxInject: `import { h, Fragment } from 'preact'`,
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@detectors': resolve(__dirname, 'src/shared/detectors'),
      '@types': resolve(__dirname, 'src/shared/types'),
      '@utils': resolve(__dirname, 'src/shared/utils'),
      // Preact compatibility
      react: 'preact/compat',
      'react-dom': 'preact/compat',
    },
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: mode === 'development' ? 'inline' : false,
    minify: mode === 'production' ? 'esbuild' : false,
    target: 'es2022',

    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/index.ts'),
        content: resolve(__dirname, 'src/content/index.ts'),
        popup: resolve(__dirname, 'src/popup/index.html'),
        injected: resolve(__dirname, 'src/injected/index.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        // Prevent code splitting for background/content/injected scripts (MV3 requirement)
        // In dev mode, we must prevent chunks to match production build behavior
        // Note: Popup can technically have chunks, but for simplicity in dev mode,
        // we inline everything to avoid complexity and ensure MV3 compliance
        manualChunks(id) {
          // For dev mode builds, prevent all chunks to ensure MV3 compliance
          // Production builds use build-entries.js which handles chunking differently
          // Return undefined to inline all modules into their entry points
          return undefined;
        },
      },
      // Prevent tree-shaking issues with content scripts
      treeshake: {
        moduleSideEffects: true,
      },
    },
  },

  // Copy static files after build
  plugins: [
    {
      name: 'inline-chunks-for-mv3',
      async closeBundle() {
        // In dev mode, inline any chunks created for background/content/injected scripts
        // and wrap content/injected scripts in IIFE per MV3 requirements
        if (mode === 'development') {
          const distDir = resolve(__dirname, 'dist');
          const chunksDir = resolve(distDir, 'chunks');
          
          // Content and injected scripts must be IIFE bundles
          const iifeScripts = ['content.js', 'injected.js'];
          // Background script is ES module (no IIFE)
          const esModuleScripts = ['background.js'];
          
          // Process all scripts for chunk inlining
          const allScripts = [...iifeScripts, ...esModuleScripts];
          
          for (const scriptName of allScripts) {
            const scriptPath = resolve(distDir, scriptName);
            if (!existsSync(scriptPath)) continue;
            
            let content = readFileSync(scriptPath, 'utf-8');
            const originalContent = content;
            const chunkImportRegex = /import\s*\{([^}]+)\}\s*from\s*["']\.\/chunks\/([^"']+)["'];?/g;
            
            // Find and inline chunks
            const chunksToInline: Array<{ match: string; chunkPath: string }> = [];
            let match;
            while ((match = chunkImportRegex.exec(content)) !== null) {
              const chunkFile = match[2];
              const chunkPath = resolve(chunksDir, chunkFile);
              if (existsSync(chunkPath)) {
                chunksToInline.push({ match: match[0], chunkPath });
              }
            }
            
            // Inline chunks
            for (const { match: importMatch, chunkPath } of chunksToInline.reverse()) {
              let chunkContent = readFileSync(chunkPath, 'utf-8');
              // Remove export statements from chunk
              chunkContent = chunkContent.replace(/export\s*\{[^}]*\}\s*;?\s*$/m, '');
              // Replace import with inlined content
              // Use callback function to avoid interpreting special regex characters ($, &, etc.) in chunkContent
              content = content.replace(importMatch, () => chunkContent);
            }
            
            // For content/injected scripts, wrap in IIFE and remove export statements
            if (iifeScripts.includes(scriptName)) {
              // Remove export statements (cannot appear in IIFE)
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
            }
            
            // Write back if we made any changes (chunk inlining, export removal, or IIFE wrapping)
            if (content !== originalContent) {
              writeFileSync(scriptPath, content, 'utf-8');
              
              if (chunksToInline.length > 0) {
                console.log(`[vite] Inlined ${chunksToInline.length} chunk(s) into ${scriptName}`);
              }
              
              if (iifeScripts.includes(scriptName) && !originalContent.trim().startsWith('(function')) {
                console.log(`[vite] Wrapped ${scriptName} in IIFE`);
              }
              
              // Delete chunk files after inlining
              for (const { chunkPath } of chunksToInline) {
                try {
                  unlinkSync(chunkPath);
                } catch (e) {
                  // Ignore deletion errors
                }
              }
            }
          }
        }
      },
    },
    {
      name: 'copy-manifest',
      closeBundle() {
        const distDir = resolve(__dirname, 'dist');
        const publicDir = resolve(__dirname, 'public');

        // Copy manifest.json
        copyFileSync(
          resolve(publicDir, 'manifest.json'),
          resolve(distDir, 'manifest.json')
        );

        // Copy icons if they exist
        const iconsDir = resolve(publicDir, 'icons');
        const distIconsDir = resolve(distDir, 'icons');

        if (existsSync(iconsDir)) {
          if (!existsSync(distIconsDir)) {
            mkdirSync(distIconsDir, { recursive: true });
          }

          for (const size of ['16', '32', '48', '128']) {
            const iconFile = `icon${size}.png`;
            const srcPath = resolve(iconsDir, iconFile);
            if (existsSync(srcPath)) {
              copyFileSync(srcPath, resolve(distIconsDir, iconFile));
            }
          }

          // Also copy SVG source
          const svgPath = resolve(iconsDir, 'icon.svg');
          if (existsSync(svgPath)) {
            copyFileSync(svgPath, resolve(distIconsDir, 'icon.svg'));
          }
        }

        // Move popup HTML from src/popup/index.html to popup.html at root
        // and fix script/styles paths to be relative
        const popupSrcPath = resolve(distDir, 'src/popup/index.html');
        const popupDestPath = resolve(distDir, 'popup.html');
        if (existsSync(popupSrcPath)) {
          let html = readFileSync(popupSrcPath, 'utf-8');
          // Fix script paths: /popup.js -> popup.js
          html = html.replace(/src="\/(popup\.js)"/g, 'src="$1"');
          // Fix chunk paths: /chunks/... -> chunks/...
          html = html.replace(/href="\/(chunks\/[^"]+)"/g, 'href="$1"');
          // Fix asset paths: /assets/... -> assets/... (for CSS and other assets)
          // Handle both href (for stylesheets) and src (for other assets)
          html = html.replace(/(href|src)="\/(assets\/[^"]+)"/g, '$1="$2"');
          writeFileSync(popupDestPath, html);
        }

        console.log('[vite] Copied manifest.json and icons to dist/');
      },
    },
  ],

  // Development server for popup testing
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
  },
}));
