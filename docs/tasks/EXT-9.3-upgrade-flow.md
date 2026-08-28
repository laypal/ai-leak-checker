# EXT-9.3: In-extension upgrade flow

**Area:** Extension · monetisation UX · **Priority:** P0 · **Status:** 🚫 Blocked on EXT-9.1 · **Estimate:** ~6 h
**Playbook:** read `PLAYBOOK.md` first.

## Why

The paywall shows only *after* the first detection (the moment the product
proved itself). Five staged prompts, each fired once, never nagging.

## Deliverables

- [ ] `src/shared/utils/upgrade-prompts.ts`: pure `shouldShowUpgradePrompt(trigger, stats, promptHistory, now)`.
- [ ] Triggers: first-detection toast → custom-regex paywall (EXT-8.2 UI) → strict-mode → CSV export → 30-detections banner.
- [ ] Pro badge in the popup; licence/account entry in the options page.
- [ ] Prompt history stored as metadata (trigger id + timestamp) in `chrome.storage.local`.

## TDD plan (RED first)

1. Decision-table tests: each trigger fires once; never re-nags within 14 days; never interrupts an active modal; Pro users never see prompts.
2. Toast reuse from EXT-8.5 if landed; otherwise a minimal shadow-DOM toast with the same test pattern.

## Acceptance criteria (BDD)

- [ ] **Given** a Free user's first detection, **When** they resolve the modal, **Then** one (and only ever one) "protected your first secret" toast with an upgrade link appears.
- [ ] **Given** a Free user opens the custom-regex UI, **Then** a paywall renders instead of the editor.
- [ ] **Given** a Pro user, **Then** no prompt ever renders.

## Do / Don't

- **Do** keep every prompt string constant; no user data in prompt copy.
- **Don't** store anything about *what* was detected beyond the existing stats.
- **Don't** open external URLs without a user click.
