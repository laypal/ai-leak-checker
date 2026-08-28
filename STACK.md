# Tech stack — locked

> Always use these tools. Never suggest alternatives unless I ask.
> If something in this stack seems like the wrong tool for the task, flag it once,
> then use it anyway unless I say otherwise.

- **Language(s):** TypeScript (strict mode everywhere)
- **Framework(s):** Chrome extension Manifest V3 (vanilla TS content scripts, Preact popup, never React)
- **Package manager:** npm (`package-lock.json` committed). The private MCP branch uses pnpm; this branch does not.
- **Build:** Vite, per-entry MV3-safe via `scripts/build-entries.js` (`npm run build`)
- **Test framework:** Vitest (unit + integration), Playwright (E2E), corpus false-positive gate <4% (`npm run test:corpus`)
- **Lint / format:** ESLint + Prettier (Husky + lint-staged pre-commit)
- **Datastore:** `chrome.storage.local` only, metadata and stats; never prompt content
- **Network:** none. Zero egress is the product.
