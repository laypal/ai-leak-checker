# AI Leak Checker — Status

> One-screen snapshot. Work items live in [docs/tasks/index.md](tasks/index.md);
> this file only records headline facts. **Last updated:** 2026-08-29.
> History: the pre-launch phase tables that used to live here are archived in
> `tasks/completed/ARCHIVE-2026-01-pre-launch-task-order.md`.

## Headline

| Fact | Value |
|------|-------|
| Live on Chrome Web Store | **v0.1.6** ([listing](https://chromewebstore.google.com/detail/ffdmphfcipjmoochiafeihceiodehjcc)) |
| In-repo version | 0.1.7, unpublished (EXT-SEC hardening + FP tuning) → `EXT-REL-1` |
| Platforms | ChatGPT (`chat.openai.com`, `chatgpt.com`), Claude (`claude.ai`) |
| Detectors | 26 types: API keys (OpenAI, AWS, GitHub, Stripe, Slack), PII (email, UK phone/NINO/postcode), credit cards (Luhn), high-entropy |
| Corpus false-positive rate | **3.19%** at `high` (gate fails above 4%, `npm run test:corpus`) |
| Permissions | `storage`, `activeTab`, three host permissions. No network calls. |
| Selector health | Daily workflow opens a GitHub issue on breakage (`.github/workflows/selector-health.yml`) |
| Tests | Vitest unit + integration, Playwright E2E (8 suites), build-output tests, 530-sample FP corpus |

## What's next

See **Next up** in [docs/tasks/index.md](tasks/index.md). As of 2026-08-29:
the site allowlist is live (EXT-7.4); remaining: wire strict mode (EXT-7.5),
user allowlist UI (EXT-7.3), CSV export (EXT-7.6), then publish 0.1.7.

## Known limitations (tracked as tasks)

- No Shadow DOM traversal; fine today (both supported composers are light DOM).
- Silent failure when all selectors fail *and* the fetch patch is not confirmed → EXT-7.7.
- `allowlist` settings have no UI → EXT-7.3.
- `strictMode` toggle has no consumer → EXT-7.5.

## Related product

A paid MCP server reusing the same detection engine is developed in a
separate private repository. Nothing in this repo depends on it.
