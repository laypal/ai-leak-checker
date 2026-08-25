# Task index — AI Leak Checker (extension)

> Status and routing only. Detail lives in each task file; how to execute any
> task is in [PLAYBOOK.md](PLAYBOOK.md). Rules for keeping this file true:
> `.claude/rules/tasks.md` (same-commit updates, done means verified,
> re-order Next up on every status change).
> **Last updated:** 2026-08-25 · live extension **v0.1.6** · in-repo **0.1.7** (unpublished)

Legend: 🔲 Not started · 🔄 In progress · 🟡 Partial · ✅ Done · 🚫 Blocked (named) · ❓ Decision needed

## Next up (top 5, in order)

| # | Task | Why now | Ready? |
|---|------|---------|--------|
| 1 | [EXT-7.4 Site allowlist](EXT-7.4-site-allowlist.md) | Tasks 1–2 of 7 done and pushed on `origin/feature/site-allowlist`; dead `siteAllowlist` config is a trust risk in a launched privacy tool | ✅ Ready (rebase onto `main` first) |
| 2 | [EXT-7.5 Strict mode](EXT-7.5-strict-mode.md) | Popup toggle exists and does nothing; small, self-contained | ✅ Ready |
| 3 | [EXT-7.3 User value allowlist UI](EXT-7.3-user-value-allowlist-ui.md) | Engine side works; users can't populate it | ✅ Ready |
| 4 | [EXT-7.6 CSV export](EXT-7.6-csv-export.md) | `statsToCSV` exists, needs escaping + a button | ✅ Ready |
| 5 | [EXT-REL-1 Publish 0.1.7](EXT-REL-1-publish-0.1.7.md) | Users still lack EXT-SEC hardening + FP tuning | ⚠️ Owner uploads; agents prepare after 1–4 land |

Decisions the owner must make before their tasks can start: EXT-7.8, EXT-8.4, EXT-9.2, EXT-HK-3.

## Open tasks

| ID | Task | Pri | Status | Est |
|----|------|-----|--------|-----|
| EXT-7.3 | [User value allowlist UI](EXT-7.3-user-value-allowlist-ui.md) | P1 | 🔲 | 4 h |
| EXT-7.4 | [Site allowlist](EXT-7.4-site-allowlist.md) | P1 | 🟡 Tasks 1–2/7 on `origin/feature/site-allowlist` | 3 h |
| EXT-7.5 | [Strict mode](EXT-7.5-strict-mode.md) | P1 | 🔲 | 3 h |
| EXT-7.6 | [CSV export](EXT-7.6-csv-export.md) | P1 | 🔲 | 3 h |
| EXT-7.7 | [Unsupported-site runtime UX](EXT-7.7-unsupported-site-ux.md) | P2 | 🔲 | 4 h |
| EXT-7.8 | [Remote selector config](EXT-7.8-remote-selector-config.md) | P2 | ❓ owner | – |
| EXT-8.1 | [Options page](EXT-8.1-options-page.md) | P1 | 🔲 | 8 h |
| EXT-8.2 | [Custom regex rules (Pro)](EXT-8.2-custom-regex-rules.md) | P1 | 🔲 needs 8.1 | 8 h |
| EXT-8.3 | [Custom keyword blocklist (Pro)](EXT-8.3-custom-keyword-blocklist.md) | P1 | 🔲 needs 8.1 | 4 h |
| EXT-8.4 | [Scheduled export (Pro)](EXT-8.4-scheduled-export.md) | P2 | 🚫 permission decision | 4 h |
| EXT-8.5 | [Low-risk toast](EXT-8.5-low-risk-toast.md) | P2 | 🔲 | 4 h |
| EXT-9.2 | [Payment rail decision](EXT-9.2-payment-rail-decision.md) | P0 | ❓ owner | 1 d |
| EXT-9.1 | [Licence / entitlement](EXT-9.1-license-entitlement.md) | P0 | 🚫 on 9.2 | 1 d |
| EXT-9.3 | [Upgrade flow](EXT-9.3-upgrade-flow.md) | P0 | 🚫 on 9.1 | 6 h |
| EXT-9.4 | [Landing page](EXT-9.4-landing-page.md) | P0 | 🔲 separate repo | 1 d |
| EXT-10.1 | [Gemini](EXT-10.1-gemini.md) | P0/phase | 🔲 | 6 h |
| EXT-10.2 | [Copilot](EXT-10.2-copilot.md) | P1 | 🔲 | 6 h |
| EXT-10.3 | [Perplexity](EXT-10.3-perplexity.md) | P2 | 🔲 | 5 h |
| EXT-10.4 | [Firefox port](EXT-10.4-firefox-port.md) | P1 | 🔲 | 2 d |
| EXT-REL-1 | [Publish 0.1.7](EXT-REL-1-publish-0.1.7.md) | P0 | 🔲 | 2 h |
| EXT-HK-1 | [Test-file JSDoc sweep](EXT-HK-1-test-file-jsdoc-sweep.md) | P2 | 🔲 | 1 h |
| EXT-HK-2 | [`isProductCode` edge tests](EXT-HK-2-isproductcode-edge-tests.md) | P2 | 🔲 | 30 m |
| EXT-HK-3 | [Stricter selector validation](EXT-HK-3-stricter-selector-validation.md) | P2 | ❓ owner | 1 h |

Sequencing: 9.2 → 9.1 → 9.3 (rail decides the licence shape). 8.1 → 8.2 / 8.3. 10.1 is the recipe for 10.2 / 10.3.

## Completed

| ID | Task | Landed |
|----|------|--------|
| EXT-7.1 | [False-positive tuning](completed/EXT-7.1-false-positive-tuning.md) | 2026-06-06, PR #22 |
| EXT-7.2 | [Selector health monitoring](completed/EXT-7.2-selector-health-monitoring.md) | 2026-06-06, PR #22 |
| EXT-SEC-1 | [Sender + origin hardening](completed/EXT-SEC-1-sender-and-origin-hardening.md) | 2026-06-07 |
| EXT-TYPE-DRIFT-1 | [Selector config types](completed/EXT-TYPE-DRIFT-1-selector-config-types.md) | 2026-06-07 |
| Phases 0–6 | [Pre-launch task order (archive)](completed/ARCHIVE-2026-01-pre-launch-task-order.md) | launched v0.1.6 |

## Out of scope for this repo

The paid MCP server (same detection engine, IDE surface) is developed in a
separate private repository with its own backlog. No task here touches it.
If a detector or engine fix lands here, the owner ports it there.
