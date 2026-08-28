# ai-leak-checker — Documentation Index

> Numbered docs capturing the architecture, decisions, bugs, and lessons from
> building the AI Leak Checker extension. Written for a future reader
> (including future-me) and flagged for blog reuse. Updated during the
> handover ritual (see `AGENTS.md`).

**Started:** 2026-08-25 (public branch; earlier MCP-server docs live in the
private repo and are not mirrored here)

---

## Documents

| #   | Document | Blog-ready? | Description |
| --- | -------- | ----------- | ----------- |
| 01  | _(not yet written)_ Detection engine and the false-positive tuning story | 🟡 WIP | 23.7% → 3.19% corpus FP rate; the two suppression layers; sources: `docs/detection/FALSE_POSITIVES.md`, PR #22 |
| 02  | _(not yet written)_ Decision journal | 🟡 WIP | Aggressive-suppression policy (2026-06-06), canonical-fixture rule, bundled-only selectors |
| 03  | _(not yet written)_ Debugging war stories | 🟡 WIP | Push-protection vs fake secrets; selector JSON vs TS constant drift |

Blog-ready flags: ✅ ready · Partial · 🟡 WIP · N/A

Start new docs from `TEMPLATE.md`. Typical set (create on demand, not upfront):
architecture overview · decision journal · debugging war stories ·
integrations/tools evaluated · lessons learned.

---

## Blog Post Mapping

| Blog post (working title, plain statement) | Primary sources |
| ------------------------------------------ | --------------- |
| Getting a secret detector from 24% to 3% false positives without losing real keys | 01, `docs/detection/FALSE_POSITIVES.md` |
| GitHub push protection vs a repo full of fake secrets | 03, `ERRORS.md` |

---

## How to use these docs

- **For blog posts:** start with the Blog-ready ✅ docs. No post without a source doc; that is the fabrication firewall.
- **For onboarding / handover:** architecture (`docs/architecture/index.md`) first, then the newest entries here.
- **For debugging reference:** the war-stories doc records every significant bug in a fixed format; `ERRORS.md` is the quick scratch log that feeds it.
