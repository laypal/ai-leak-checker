# AI Leak Checker — Claude Code Context

> Context for AI assistants (Claude Code) working on this repo. Read this first.
> **These instructions override default behaviour.** Where they conflict with a skill, follow these.

## What this is

**AI Leak Checker** is a **live** (Chrome Web Store, v0.1.6) Manifest V3 Chrome/Edge extension that stops accidental data leaks to AI chat platforms. It detects API keys, credentials, PII, and credit cards **locally** before submission and offers warn / mask / block. We are now (a) hardening the launched extension and (b) building a **paid MCP server** that reuses the same detection engine.

**Product philosophy:** the *seatbelt* for AI tools — simple, local-first, trustworthy. Privacy is the product: zero network calls, no prompt content ever stored or transmitted.

## Two products, one engine

| Product | Audience | Surface | Tier |
|---------|----------|---------|------|
| **Extension** (live) | individuals / SMB | ChatGPT, Claude (Gemini/Copilot/Perplexity planned) | Free + Pro |
| **MCP server** (design → build) | developers using Claude Code / Cursor / Cline / Windsurf | `scan_text` / `scan_file` / `scan_diff` / `get_patterns` / `redact` | Free / Pro / Team |

The shared idea: **one detection engine, used in the browser and in the IDE**. The planned `@ai-leak-checker/core` package is that engine. Pricing, positioning, and competitive analysis live in the local-only `docs/internal/` (git-ignored) — see there, not here, for go-to-market detail.

## Quick start

```bash
npm install
npm run dev            # watch build
npm run build          # tsc && node scripts/build-entries.js  (per-entry, MV3-safe)
npm run test           # unit + integration
npm run test:e2e       # Playwright (build first)
npm run test:corpus    # false-positive rate report
npm run lint && npm run typecheck
```

## Current repo shape (single package — pre-monorepo)

```text
src/
├── background/      # service worker (no DOM, no localStorage)
├── content/         # DOM interception, modal, window message bridge
├── injected/        # main-world fetch/XHR patch (fallback)
├── popup/           # Preact popup UI
└── shared/
    ├── detectors/   # engine.ts, patterns.ts, pii.ts, index.ts
    ├── types/       # detection.ts, messages.ts, selectors.ts, storage.ts
    └── utils/       # entropy.ts, luhn.ts, redact.ts
public/manifest.json # ← manifest lives here (NOT root)
configs/selectors.json
tests/{unit,integration,e2e,build,corpus,fixtures,property}
```

> **Planned migration (Phase MCP-0):** pnpm + Turborepo workspace → `packages/{core,extension,mcp-server}`. Until that lands, this is a single npm package and the engine still lives under `src/shared/`. See `docs/internal/MCP_SERVER_ARCHITECTURE.md` §2 (local-only).

## Core files

| File | Purpose |
|------|---------|
| `src/shared/detectors/engine.ts` | Detection orchestrator (`scan`, `quickCheck`) |
| `src/shared/detectors/patterns.ts` | API-key / secret regex registry |
| `src/shared/detectors/pii.ts` | PII detectors (email, UK phone/NINO/postcode) |
| `src/shared/utils/{entropy,luhn,redact}.ts` | Entropy, Luhn, redaction markers |
| `src/content/index.ts` | DOM interception + scan_request/scan_result handler |
| `src/content/modal.ts` | Shadow-DOM warning modal |
| `src/injected/index.ts` | fetch/XHR patch (fallback when selectors fail) |
| `public/manifest.json` | Permissions, CSP, host permissions |
| `configs/selectors.json` | Per-site selectors with fallback chains |

## Hard invariants (never violate)

- **Never** store or transmit prompt content. Storage holds metadata/stats only (`type`, offsets, confidence, domain, timestamp).
- **Never** make network requests by default / add telemetry. Local-first is the entire value prop.
- **Never** request `<all_urls>` or broad `tabs`. Permissions stay `storage` + `activeTab` + explicit host permissions.
- **Never** use `eval()`, `new Function()`, or `innerHTML` with unescaped user data. CSP forbids `unsafe-eval`/`unsafe-inline`.
- **Always** use typed messages between contexts and validate `sender.id` / `event.source`.
- **Always** handle selector failure gracefully (fallback chain → fetch patch → "unsupported" state).
- (MCP) the **`core` package must never import** `chrome.*`, `window`, `document`, `navigator`, `fetch`. The **MCP server must never persist scanned content** — counts/types/timings only.

## Code constraints

- Max **400 lines/file**, **50 lines/function**. JSDoc header on every file. Unit tests for new code.
- TypeScript strict. Preact (not React) for UI. Pre-compile regex at module scope; bound patterns (no unbounded `.*` — ReDoS).

## Where things are documented

> **Note on `docs/internal/`:** that folder is **git-ignored / local-only** (strategy, pricing, competitive research, unreleased MCP design, OSS notes, detailed task sheets). It exists on this machine for AI context but is never pushed to the public repo. Public docs live directly under `docs/`.

| Topic | Doc | Visibility |
|-------|-----|------------|
| What's shipped | `docs/internal/EXTENSION_DONE.md` | local-only |
| Extension work left | `docs/internal/EXTENSION_TODO.md` | local-only |
| MCP build (feature-by-feature, BDD) | `docs/internal/MCP_SERVER_TASKS.md` | local-only |
| MCP architecture | `docs/internal/MCP_SERVER_ARCHITECTURE.md` | local-only |
| Competitive research / marketing | `docs/internal/COMPETITIVE_RESEARCH.md`, `SALES_MARKETING_PLAN.md` | local-only |
| OSS tooling for this build | `docs/internal/OSS_INTEGRATIONS.md` | local-only |
| Status snapshot | `docs/STATUS.md` | public |
| Requirements / roadmap | `docs/requirements/` | public |
| Extension architecture | `docs/architecture/ARCHITECTURE.md` | public |
| Selector maintenance | `docs/SELECTOR_MAINTENANCE.md` | public |
| Agents / skills usage | `docs/AGENT_USAGE_GUIDE.md` | public |

## Project agents & skills (Claude Code)

Native config lives in `.claude/`:

- **Agents** (`.claude/agents/`): `security-reviewer`, `manifest-v3-compliance`, `performance-analyzer`, `selector-validator`, `test-coverage-analyzer`, `documentation-sync`.
- **Skills** (`.claude/skills/`): `add-detector-pattern`, `update-selectors`, `create-e2e-test`, `security-review-checklist`.
- **Rules** (`.claude/rules/`): detection, security, content-scripts, testing, code-style. Referenced from here.

(The `.cursor/` directory mirrors these for Cursor users — keep both in sync if you change one.)

## Common tasks

- **Add a detector** → use the `add-detector-pattern` skill (types → patterns → tests → docs; keep FP rate <5%).
- **Fix broken selectors** → use the `update-selectors` skill (new selectors prepended, old kept as fallback, E2E green).
- **Security-sensitive change** → run the `security-reviewer` agent / `security-review-checklist` skill before committing.
- **New AI platform** → selector config + host permission in `public/manifest.json` + E2E suite.

## House rules for working here

- Use **Context7 MCP** for any library/framework/SDK/API question (MCP SDK, Stripe, Vite, Playwright, Preact) — even ones you think you know.
- Confirm before destructive or outward-facing actions; don't commit/push unless asked.
- Today's product state: **launched**. Treat user-facing regressions as high severity. Prefer additive, reversible changes.
