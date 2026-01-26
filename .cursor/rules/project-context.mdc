---
description: Core project context for AI Leak Checker browser extension. Provides essential background on architecture, tech stack, and constraints.
globs:
alwaysApply: true
---

# AI Leak Checker - Project Context

## What This Is

A **Manifest V3 Chrome/Edge browser extension** that prevents accidental data leaks to AI chat platforms (ChatGPT, Claude). Uses local-first detection with zero data egress.

## Product Philosophy

- **Seatbelt, not security platform** - Simple protection for SMBs without IT teams
- **Privacy-first** - All processing local, never store prompt content, no telemetry by default
- **Trust through transparency** - Minimal permissions, auditable code

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Chrome Extension (Manifest V3) |
| Language | TypeScript (strict mode) |
| Build | Vite |
| UI | Preact (popup), vanilla TS (content scripts) |
| Testing | Vitest (unit), Playwright (E2E) |
| Styling | Shadow DOM (content scripts), CSS (popup) |

## Architecture Overview

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
│  • Message routing • Storage • Badge        │
└─────────────────────────────────────────────┘
```

## Key Constraints

1. **MV3 Limitation**: Cannot use `webRequestBlocking` for body inspection. Must use DOM interception + fetch monkey-patching
2. **Bundle Size**: Keep dependencies minimal - Preact over React, no heavy libraries
3. **Selector Brittleness**: AI platforms change UI frequently - selectors will break
4. **Privacy**: Never store prompt content, never transmit user data

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
tests/
├── unit/            # Vitest
├── integration/     # Component interaction
├── e2e/             # Playwright browser tests
└── fixtures/        # Test data
```

## Key Files Reference

- `src/shared/detectors/engine.ts` - Main detection orchestrator
- `src/shared/detectors/patterns.ts` - API key regex patterns
- `src/content/index.ts` - DOM interception entry point
- `configs/selectors.json` - Site-specific CSS selectors
