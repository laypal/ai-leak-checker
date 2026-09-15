# Task index — AI Leak Checker (extension)

> Status and routing only. Detail lives in each task file; how to execute any
> task is in [PLAYBOOK.md](PLAYBOOK.md). Rules for keeping this file true:
> `.claude/rules/tasks.md` (same-commit updates, done means verified,
> re-order Next up on every status change).
> **Last updated:** 2026-09-15 · live extension **v0.1.6** · in-repo **0.1.7** (unpublished)

Legend: 🔲 Not started · 🔄 In progress · 🟡 Partial · ✅ Done · 🚫 Blocked (named) · ❓ Decision needed

## Next up (top 5, in order)

| # | Task | Why now | Ready? |
|---|------|---------|--------|
| 1 | [EXT-7.5 Strict mode](EXT-7.5-strict-mode.md) | Popup toggle exists and does nothing; small, self-contained | ✅ Ready |
| 2 | [EXT-7.3 User value allowlist UI](EXT-7.3-user-value-allowlist-ui.md) | Engine side works; users can't populate it | ✅ Ready |
| 3 | [EXT-7.6 CSV export](EXT-7.6-csv-export.md) | `statsToCSV` exists, needs escaping + a button | ✅ Ready |
| 4 | [EXT-REL-1 Publish 0.1.7](EXT-REL-1-publish-0.1.7.md) | Users still lack EXT-SEC hardening + FP tuning | ⚠️ Owner uploads; agents prepare after 1–3 land |
| 5 | [EXT-7.7 Unsupported-site runtime UX](EXT-7.7-unsupported-site-ux.md) | Next P2 after the P1 batch | ✅ Ready |

No owner decisions open. Decided 2026-08-25: EXT-7.8 bundled-only, EXT-8.4 dropped, EXT-9.2 ExtensionPay, EXT-HK-3 closed (see Completed).

## Open tasks

| ID | Task | Pri | Status | Est |
|----|------|-----|--------|-----|
| EXT-7.3 | [User value allowlist UI](EXT-7.3-user-value-allowlist-ui.md) | P1 | 🟡 code done, Chrome smoke pending | 4 h |
| EXT-7.5 | [Strict mode](EXT-7.5-strict-mode.md) | P1 | 🔲 | 3 h |
| EXT-7.6 | [CSV export](EXT-7.6-csv-export.md) | P1 | 🔲 | 3 h |
| EXT-7.7 | [Unsupported-site runtime UX](EXT-7.7-unsupported-site-ux.md) | P2 | 🔲 | 4 h |
| EXT-8.1 | [Options page](EXT-8.1-options-page.md) | P1 | 🔲 | 8 h |
| EXT-8.2 | [Custom regex rules (Pro)](EXT-8.2-custom-regex-rules.md) | P1 | 🔲 needs 8.1 | 8 h |
| EXT-8.3 | [Custom keyword blocklist (Pro)](EXT-8.3-custom-keyword-blocklist.md) | P1 | 🔲 needs 8.1 | 4 h |
| EXT-8.5 | [Low-risk toast](EXT-8.5-low-risk-toast.md) | P2 | 🔲 | 4 h |
| EXT-9.1 | [Licence / entitlement (ExtPay)](EXT-9.1-license-entitlement.md) | P0 | 🔲 (rail decided) | 1 d |
| EXT-9.3 | [Upgrade flow](EXT-9.3-upgrade-flow.md) | P0 | 🚫 on 9.1 | 6 h |
| EXT-9.4 | [Landing page](EXT-9.4-landing-page.md) | P0 | 🔲 separate repo | 1 d |
| EXT-10.1 | [Gemini](EXT-10.1-gemini.md) | P0/phase | 🔲 | 6 h |
| EXT-10.2 | [Copilot](EXT-10.2-copilot.md) | P1 | 🔲 | 6 h |
| EXT-10.3 | [Perplexity](EXT-10.3-perplexity.md) | P2 | 🔲 | 5 h |
| EXT-10.4 | [Firefox port](EXT-10.4-firefox-port.md) | P1 | 🔲 | 2 d |
| EXT-REL-1 | [Publish 0.1.7](EXT-REL-1-publish-0.1.7.md) | P0 | 🔲 | 2 h |
| EXT-HK-1 | [Test-file JSDoc sweep](EXT-HK-1-test-file-jsdoc-sweep.md) | P2 | 🔲 | 1 h |
| EXT-HK-2 | [`isProductCode` edge tests](EXT-HK-2-isproductcode-edge-tests.md) | P2 | 🔲 | 30 m |

Sequencing: 9.1 → 9.3. 8.1 → 8.2 / 8.3. 10.1 is the recipe for 10.2 / 10.3. Selector fixes are releases (EXT-7.8 decision).

## Completed / closed

| ID | Task | Outcome |
|----|------|---------|
| EXT-7.4 | [Site allowlist](completed/EXT-7.4-site-allowlist.md) | Done 2026-08-29, PR #25 |
| EXT-9.2 | [Payment rail decision](completed/EXT-9.2-payment-rail-decision.md) | Decided ExtensionPay, 2026-08-25 |
| EXT-7.8 | [Remote selector config](completed/EXT-7.8-remote-selector-config.md) | Decided bundled-only, 2026-08-25 |
| EXT-8.4 | [Scheduled export](completed/EXT-8.4-scheduled-export.md) | Dropped, 2026-08-25 |
| EXT-HK-3 | [Stricter selector validation](completed/EXT-HK-3-stricter-selector-validation.md) | Closed, not needed, 2026-08-25 |
| EXT-7.1 | [False-positive tuning](completed/EXT-7.1-false-positive-tuning.md) | Done 2026-06-06, PR #22 |
| EXT-7.2 | [Selector health monitoring](completed/EXT-7.2-selector-health-monitoring.md) | Done 2026-06-06, PR #22 |
| EXT-SEC-1 | [Sender + origin hardening](completed/EXT-SEC-1-sender-and-origin-hardening.md) | Done 2026-06-07 |
| EXT-TYPE-DRIFT-1 | [Selector config types](completed/EXT-TYPE-DRIFT-1-selector-config-types.md) | Done 2026-06-07 |
| Phases 0–6 | [Pre-launch task order (archive)](completed/ARCHIVE-2026-01-pre-launch-task-order.md) | Launched v0.1.6 |

## Out of scope for this repo

The paid MCP server (same detection engine, IDE surface) is developed in a
separate private repository with its own backlog. No task here touches it.
If a detector or engine fix lands here, the owner ports it there.
