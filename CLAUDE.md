# AI Leak Checker - Claude Context

> This file provides context for AI assistants working on this codebase.

## Project Overview

**AI Leak Checker** is a Manifest V3 Chrome/Edge browser extension that prevents accidental data leaks to AI chat platforms (ChatGPT, Claude). It detects sensitive information (API keys, PII, credit cards) before submission and provides warn/block/redact capabilities.

## Quick Start

```bash
# Install dependencies
npm install

# Development build (watch mode)
npm run dev

# Production build
npm run build

# Run tests
npm run test:unit
npm run test:e2e
```

## Architecture Summary

```
┌─────────────────────────────────────────────┐
│                Browser Tab                   │
│  ┌────────────┐  ┌─────────────────────┐    │
│  │ AI Chat    │  │   Content Script    │    │
│  │ (ChatGPT,  │◄─│ • DOM Interceptors  │    │
│  │  Claude)   │  │ • Detection Engine  │    │
│  └────────────┘  │ • Warning Modal     │    │
│                  └──────────┬──────────┘    │
└─────────────────────────────┼───────────────┘
                              │ chrome.runtime
┌─────────────────────────────▼───────────────┐
│            Service Worker (Background)       │
│  • Message routing                          │
│  • Storage management                       │
│  • Badge updates                            │
└─────────────────────────────────────────────┘
```

## Key Technical Decisions

1. **MV3 Constraint**: Cannot use `webRequestBlocking` for body inspection. Using DOM interception + fetch monkey-patching instead.

2. **Detection**: Regex-based with entropy analysis. No ML/AI inference to keep it local-first.

3. **Selectors**: Versioned JSON configuration. AI platforms change UI frequently - selectors will break.

4. **Privacy**: No prompt content storage. No network telemetry by default.

## File Structure

```
src/
├── background/      # Service worker
├── content/         # Content scripts (DOM interception)
├── popup/           # Extension popup UI (Preact)
├── injected/        # Main world scripts (fetch patching)
└── shared/
    ├── detectors/   # Detection engine
    ├── types/       # TypeScript definitions
    └── utils/       # Shared utilities
```

## Core Files to Know

| File | Purpose |
|------|---------|
| `src/shared/detectors/index.ts` | Main detection engine |
| `src/content/index.ts` | DOM interception, window message handler (scan_request/scan_result) |
| `src/content/modal.ts` | Warning modal component |
| `src/injected/index.ts` | Fetch/XHR patching (fallback when DOM selectors fail) |
| `configs/selectors.json` | Site-specific selectors |

## Testing

- **Unit**: Vitest - `npm run test:unit`
- **E2E**: Playwright - `npm run test:e2e`
- **Property**: Hypothesis (Python) - `npm run test:property`

Test files mirror source structure in `tests/`. Content script–specific unit tests: `content-message-handler`, `content-state-reset`, `modal`; use `tests/fixtures/ai-leak-checker-scan.ts` for window postMessage payloads.

## Common Tasks

### Add a new detector pattern

1. Add type to `src/shared/types/detection.ts`
2. Add pattern to `src/shared/detectors/patterns.ts`
3. Add tests to `tests/unit/detectors/patterns.test.ts`
4. Add property tests if needed

### Update selectors for a site

1. Inspect the site's current DOM structure
2. Update `configs/selectors.json`
3. Run E2E tests: `npm run test:e2e`
4. If remote config enabled, update CDN

### Add a new AI platform

1. Add SiteConfig to `configs/selectors.json`
2. Add host permission to `manifest.json`
3. Add E2E test in `tests/e2e/`

## Anti-Patterns to Avoid

- **Never** store prompt content
- **Never** use `eval()` or `Function()`
- **Never** request `<all_urls>` permission
- **Never** make network requests without user consent
- **Always** use typed messages between components
- **Always** handle selector failures gracefully

## Key Constraints

- **Max file size**: 400 lines
- **Max function size**: 50 lines
- **Required**: JSDoc header on every file
- **Required**: Unit tests for new code

## Current Phase

**Phase 1: MVP** - Building core detection + interception for ChatGPT + Claude.

See `docs/requirements/ROADMAP.md` for full timeline.

## Links

- [Requirements](docs/requirements/REQUIREMENTS.md)
- [Architecture](docs/architecture/ARCHITECTURE.md)
- [Task Order](docs/tasks/TASK_ORDER.md)
- [Roadmap](docs/requirements/ROADMAP.md)
- [Agent Usage Guide](docs/AGENT_USAGE_GUIDE.md) – Skills, subagents, workflows
