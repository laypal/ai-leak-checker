# EXT-8.4: Scheduled export (Pro)

**Area:** Extension · **Priority:** P2 · **Status:** ✅ Closed, **dropped** (owner decision 2026-08-25)

## Outcome

Not built. Unattended file writes need the `downloads` permission (and
`alarms`), which means a Chrome Web Store re-review and a permission warning
shown to every existing user, for a P2 nicety. The reminder-only variant
still needed two new permissions.

## Decision log

- 2026-08-25, owner: **drop**. Minimal-permission posture (`storage` +
  `activeTab` + host permissions) stays. Manual one-click export (EXT-7.6)
  covers the need.
- Re-open only if users ask for it and the owner accepts the permission cost.
