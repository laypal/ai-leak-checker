# EXT-8.3: Custom keyword blocklist (Pro)

**Area:** Extension · engine + options page · **Priority:** P1 · **Status:** 🔲 Not started · **Estimate:** ~4 h
**Depends on:** EXT-8.1 (UI), reuses EXT-8.2's engine hook · **Playbook:** read `PLAYBOOK.md` first.

## Why

Up to **50** case-insensitive phrases (project names, client names) that
should never reach an AI chat, producing `custom_keyword` findings at
confidence 1.0.

## Deliverables

- [ ] `src/shared/utils/keywords.ts`: pure `matchKeywords(text, keywords, { wordBoundary?: boolean })` (case-insensitive contains).
- [ ] Import parser for newline-delimited text: trim, dedupe, drop empties; cap 50 with the Result pattern from EXT-7.3.
- [ ] Engine hook: same `ScanOptions` path as EXT-8.2 (`customKeywords`), findings named by keyword.
- [ ] Options page: list editor + import/export (newline-delimited).

## TDD plan (in order; RED first)

1. `tests/unit/keywords.test.ts`: case-insensitivity; overlapping keywords; unicode; empty list → no findings; word-boundary flag.
2. Import parser: trim / dedupe / drop empties / 51st rejected.
3. Engine integration through `scanWithSettings`.
4. UI last (manual).

## Acceptance criteria (BDD)

- [ ] **Given** "Project Falcon" is blocklisted, **When** a prompt contains "project falcon", **Then** a finding blocks with the keyword named.
- [ ] **Given** 50 keywords, **When** adding a 51st, **Then** the UI blocks it and storage is unchanged.

## Do / Don't

- **Do** keep the matcher pure and linear; no regex built from user input here (that is EXT-8.2).
- **Don't** log matched text unmasked.
- **Don't** add a paywall here (EXT-9.3).

## Verify

Gate + manual on chatgpt.com with one keyword.
