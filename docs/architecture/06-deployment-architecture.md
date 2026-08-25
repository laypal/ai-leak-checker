# 6. Deployment Architecture

[Back to index](index.md)


## 6.1 Build Pipeline

The build process uses Vite for bundling with a custom post-build step to handle Chrome Extension Manifest V3 requirements.

**Build Steps**:

1. **TypeScript Compilation** (`tsc --noEmit`)
   - Type checking without emission
   - Validates type safety before build

2. **Vite Build** (`vite build`)
   - Bundles all entry points (background, content, popup, injected)
   - Uses Rollup under the hood with code splitting enabled
   - Outputs ES modules for background/popup, chunks for content/injected

3. **Post-Build: Chunk Inlining** (`scripts/inline-chunks.js`)
   - **Purpose**: Chrome Extension content scripts must be single-file IIFE bundles (cannot use ES modules or separate chunks)
   - **Process**:
     - Recursively inlines chunk imports into `content.js` and `injected.js`
     - Removes export statements from chunks and entry files
     - Wraps content in IIFE: `(function() { 'use strict'; ... })()`
     - Handles nested chunk dependencies (chunks importing other chunks)
     - Deletes inlined chunk files after successful inlining
   - **Output**: Single-file, IIFE-wrapped bundles ready for MV3

4. **Static Asset Copy**
   - Copies `manifest.json` from `public/`
   - Copies icon files (16x16, 48x48, 128x128)
   - Moves popup HTML to root and fixes relative paths

**Build Configuration**:

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        background: 'src/background/index.ts',  // ES module (allowed)
        content: 'src/content/index.ts',        // Will be IIFE after inlining
        popup: 'src/popup/index.html',          // ES module (allowed)
        injected: 'src/injected/index.ts',      // Will be IIFE after inlining
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
      },
    },
  },
});
```

**Chunk Inlining Details**:

```javascript
// scripts/inline-chunks.js
// Recursively processes:
// 1. Find all chunk imports: import{...}from"./chunks/file.js"
// 2. Read chunk files and remove export statements
// 3. Replace import with inlined content
// 4. Repeat until no imports remain (handles nested chunks)
// 5. Remove export statements from main file
// 6. Wrap in IIFE if not already wrapped
// 7. Delete processed chunk files
```

**Build Output Structure**:

```
dist/
├── manifest.json          # MV3 manifest
├── background.js          # ES module (service worker)
├── content.js             # IIFE bundle (content script)
├── injected.js            # IIFE bundle (main world script)
├── popup.html             # Popup entry point
├── popup.js               # ES module (popup script)
├── chunks/                # Empty (all chunks inlined)
└── icons/                 # Icon assets
```

## 6.2 CI/CD Pipeline

```yaml
# .github/workflows/build.yml
name: Build & Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:unit
      - run: npm run test:integration
      
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: extension-${{ github.sha }}
          path: dist/
```

## 6.3 Release Process

1. Version bump in `manifest.json` and `package.json`
2. Changelog update
3. Tag release (`v1.0.0`)
4. CI builds reproducible artifact
5. Manual review of built extension
6. Upload to Chrome Web Store
7. Publish documentation updates
