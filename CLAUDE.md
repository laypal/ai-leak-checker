# AI Leak Checker — Claude Code Context

> Context for AI assistants (Claude Code) working on this repo. Read this first.
> **These instructions override default behaviour.** Where they conflict with a skill, follow these.
> Cross-tool conventions (task hygiene, delegation, handover ritual, voice) are in `AGENTS.md`;
> OpenCode users start at `OPENCODE-DEV.md`. **Work items live in `docs/tasks/index.md`.**

## What this is

**AI Leak Checker** is a **live** (Chrome Web Store, v0.1.6) Manifest V3 Chrome/Edge extension that stops accidental data leaks to AI chat platforms. It detects API keys, credentials, PII, and credit cards **locally** before submission and offers warn / mask / block. We are now (a) hardening the launched extension and (b) building a **paid MCP server** that reuses the same detection engine.

**Product philosophy:** the *seatbelt* for AI tools — simple, local-first, trustworthy. Privacy is the product: zero network calls, no prompt content ever stored or transmitted.

## Two products, one engine

| Product | Audience | Surface | Tier |
|---------|----------|---------|------|
| **Extension** (live) | individuals / SMB | ChatGPT, Claude (Gemini/Copilot/Perplexity planned) | Free + Pro |
| **MCP server** (design → build) | developers using Claude Code / Cursor / Cline / Windsurf | `scan_text` / `scan_file` / `scan_diff` / `get_patterns` / `redact` | Free / Pro / Team |

The shared idea: **one detection engine, used in the browser and in the IDE**. The MCP server is developed in a **separate private repository**; nothing in this repo depends on it and no task here touches it. Pricing, positioning, and competitive analysis are not in this repo.

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

> This branch is a single **npm** package and the engine lives under `src/shared/`. The private MCP repo extracted the engine into a `packages/core` workspace; that layout is **not** coming here unless the owner decides otherwise. Locked stack: `STACK.md`.

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

> `docs/internal/` is **git-ignored / local-only** on the owner's machine (strategy, pricing, competitive research). Everything an agent needs to execute work is public under `docs/`. If a file you are pointed at does not exist, it is local-only; do not guess its contents.

| Topic | Doc |
|-------|-----|
| **What to work on next** | `docs/tasks/index.md` (Next up) |
| How to execute any task | `docs/tasks/PLAYBOOK.md` |
| One file per task (facts, TDD plan, BDD ACs, do/don't) | `docs/tasks/EXT-*.md`; done → `docs/tasks/completed/` |
| Status snapshot | `docs/STATUS.md` |
| Requirements / roadmap | `docs/requirements/` |
| Extension architecture | `docs/architecture/index.md` (split per section) |
| Test strategy | `docs/testing/index.md` |
| Selector maintenance | `docs/selectors/index.md` |
| False-positive suppression | `docs/detection/FALSE_POSITIVES.md` |
| Agents / skills usage | `docs/agents/index.md` |
| Historical reviews | `docs/reviews/` |
| Narrative docs (decisions, war stories) | `project-documentation/00-index.md` |
| Failed-approach log / locked stack / voice | `ERRORS.md`, `STACK.md`, `VOICE.md` |

## Project agents & skills (Claude Code)

Native config lives in `.claude/`:

- **Agents** (`.claude/agents/`): `security-reviewer`, `manifest-v3-compliance`, `performance-analyzer`, `selector-validator`, `test-coverage-analyzer`, `documentation-sync`, plus the delegation trio `worker` / `advisor` / `verifier` (policy in `AGENTS.md`).
- **Skills** (`.claude/skills/`): `add-detector-pattern`, `update-selectors`, `create-e2e-test`, `security-review-checklist`, `voice-apply` / `voice-analyze` / `voice-create`.
- **Rules** (`.claude/rules/`): detection, security, content-scripts, testing, code-style, **tasks** (task-sheet + 400-line context-file hygiene). Referenced from here.
- **Hook** (`.claude/settings.json`): `scripts/check-context-size.mjs` warns after any Write/Edit that pushes a context file past 400 lines.

(The `.cursor/` directory mirrors rules and skills for Cursor users; `.opencode/` + `opencode.json` carry the same agents for OpenCode. Keep them in sync if you change one.)

## Task workflow (all agents)

1. Open `docs/tasks/index.md`, take the top **Next up** item that is ✅ Ready (or the task the user names).
2. Read `docs/tasks/PLAYBOOK.md` once, then the task file. Re-verify its `file:line` facts.
3. RED test first, per the task's TDD plan; validation gate before every commit.
4. Flip the task status, tick ACs, re-order Next up, all **in the same commit** as the code. Done means verified (gate output seen + manual check in Chrome), else 🟡 Partial.
5. Substantive session → handover ritual in `AGENTS.md`.

## Common tasks

- **Add a detector** → use the `add-detector-pattern` skill (types → patterns → tests → docs; keep FP rate <5%).
- **Fix broken selectors** → use the `update-selectors` skill (new selectors prepended, old kept as fallback, E2E green).
- **Security-sensitive change** → run the `security-reviewer` agent / `security-review-checklist` skill before committing.
- **New AI platform** → selector config + host permission in `public/manifest.json` + E2E suite.

## House rules for working here

- Use **Context7 MCP** for any library/framework/SDK/API question (MCP SDK, Stripe, Vite, Playwright, Preact) — even ones you think you know.
- Confirm before destructive or outward-facing actions; don't commit/push unless asked.
- Today's product state: **launched**. Treat user-facing regressions as high severity. Prefer additive, reversible changes.
