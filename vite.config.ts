import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';

/**
 * Vite configuration for AI Leak Checker Chrome Extension
 *
 * Builds multiple entry points:
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
        // Ensure no code splitting for content scripts (must be single file)
        manualChunks: undefined,
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
        // and fix script paths to be relative
        const popupSrcPath = resolve(distDir, 'src/popup/index.html');
        const popupDestPath = resolve(distDir, 'popup.html');
        if (existsSync(popupSrcPath)) {
          let html = readFileSync(popupSrcPath, 'utf-8');
          // Fix script paths: /popup.js -> popup.js, /chunks/ -> chunks/
          html = html.replace(/src="\/(popup\.js)"/g, 'src="$1"');
          html = html.replace(/href="\/(chunks\/[^"]+)"/g, 'href="$1"');
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
