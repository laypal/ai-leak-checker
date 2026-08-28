# EXT-8.2: Custom regex rules (Pro)

**Area:** Extension · engine + options page · **Priority:** P1 · **Status:** 🔲 Not started · **Estimate:** ~8 h
**Depends on:** EXT-8.1 (UI home) · **Playbook:** read `PLAYBOOK.md` first.

## Why

Up to **20** user patterns (`{ id, name, pattern, severity, enabled }`)
producing `custom_regex` findings. The strongest "I need this" trigger for
Pro.

## Current-state facts (re-verify)

- Engine: `src/shared/detectors/engine.ts`; scan options built by `buildScanOptions()` (`src/shared/detectors/scan-options.ts:31`); settings applied via `applySettings` in content.
- Detection rule doc `.claude/rules/detection.md`: pre-compile regex at module scope; no unbounded `.*` (ReDoS).

## Deliverables

- [ ] `src/shared/utils/user-patterns.ts`: pure `validateUserPattern(raw: string): Result<ValidatedPattern, PatternError>`: must compile (`new RegExp(p, 'g')` in try/catch); length ≤ 200; reject unbounded `.*` / `.+` and nested quantifiers (`(x+)+` shapes) by heuristic; reject patterns that match the empty string.
- [ ] Compile **once at settings-apply time** (in the `applySettings` / `buildScanOptions` layer), never per scan. Engine accepts pre-compiled `customPatterns` via `ScanOptions`, runs them after built-in detectors, findings carry the rule `name`, per-rule match cap of 50.
- [ ] List helper with the EXT-7.3 Result pattern; cap 20.
- [ ] Options page UI: add/edit/delete, enable toggle, live test box (paste sample text, see matches, all client-side).

## TDD plan (in order; RED first)

1. `tests/unit/user-patterns.test.ts`: valid pattern; syntax error; too long; `(a+)+` rejected; empty-string-matching rejected.
2. Engine integration: fixture pattern `\bACME-[0-9]{6}\b` finds `ACME-123456`; respects `enabled: false`; respects per-rule severity; dedupes against an overlapping built-in finding.
3. Cap: 21st rule rejected at the helper level.
4. UI last (manual).

## Acceptance criteria (BDD)

- [ ] **Given** a valid rule, **When** its pattern appears in a prompt, **Then** a `custom_regex` finding with the rule's name and severity blocks per the normal flow.
- [ ] **Given** an invalid regex, **Then** the UI explains why and nothing is stored.
- [ ] **Given** 20 rules, **Then** `npm run test:corpus` timing stays within ±20% of the baseline.

## Do / Don't

- **Do** bound execution: match-count cap per rule; patterns validated before storage.
- **Do** store patterns as config in `chrome.storage.local`; they are user config, not prompt content.
- **Don't** echo matched *values* to the console unmasked.
- **Don't** compile per scan.
- **Don't** add a paywall here (EXT-9.3).

## Verify

Gate + corpus timing comparison + manual on chatgpt.com with one rule.
