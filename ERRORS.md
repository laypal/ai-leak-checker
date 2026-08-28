# Errors

> Log here when an approach takes more than 2 attempts to work.
> Check this file before suggesting approaches to similar tasks.
> If a task matches a logged failure, say so and skip to what worked.
> Solved bugs with a full story belong in
> `project-documentation/` war stories; this file is the quick in-repo
> scratch log that feeds it.

## Format

```markdown
## [YYYY-MM-DD] <Task type or description>

**What didn't work:** <approaches that failed and why>
**What worked:** <the approach that finally succeeded>
**Note for next time:** <anything worth remembering for similar tasks>
```

## Entries

<!-- Append new entries below this line -->

## [2026-06-07] Realistic-looking secrets in test fixtures

**What didn't work:** Committing vendor-shaped fake keys (Stripe `sk_live_`,
GitHub `ghp_`, AWS `AKIA…`) as fixtures. GitHub push protection blocked the
whole push; scrubbing them out of history afterwards took longer than the
feature.
**What worked:** Canonical, allowlisted example values (`AKIAIOSFODNN7EXAMPLE`,
`user@example.com`, `sk-test…` shapes) plus `scan(text, { disableBuiltinAllowlist: true })`
in tests that need raw detector coverage.
**Note for next time:** grep the diff for `sk_live_|ghp_|AKIA[A-Z0-9]{16}|whsec_|xox`
before every push.

## [2026-06-07] Selector config type vs runtime

**What didn't work:** Assuming the extension reads `configs/selectors.json` at
runtime and editing only the JSON.
**What worked:** The runtime reads the TS constant `BUNDLED_SELECTORS` in
`src/shared/types/selectors.ts`; the JSON is a mirror validated by tests.
Change both.
**Note for next time:** any selector task edits the TS constant first, then
the JSON, then runs `npm run check:selectors`.
