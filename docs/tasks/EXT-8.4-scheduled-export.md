# EXT-8.4: Scheduled export (Pro)

**Area:** Extension · **Priority:** P2 · **Status:** 🚫 Blocked (permission decision, owner) · **Estimate:** ~4 h once decided
**Depends on:** EXT-7.6 · **Playbook:** read `PLAYBOOK.md` first.

## Why

Daily / weekly / monthly automatic export of stats via `chrome.alarms`.

## The blocker

Unattended file writes need the `downloads` permission. A new permission
means Chrome Web Store re-review and a user-visible warning, for a P2 nicety.
Options for the owner:

| Option | Permissions | Notes |
| --- | --- | --- |
| (a) Real scheduled file export | `alarms` + `downloads` | Violates the minimal-permission posture |
| (b) Reminder notification that opens the popup for one-click manual export | `alarms` + `notifications` | Still two new permissions, no file write |
| (c) Drop the feature | none | Simplest |

## If unblocked

- Pure `nextExportDue(schedule, lastExportAt, now)` first; RED tests for daily/weekly/monthly boundaries and DST.
- `chrome.alarms` handler in background; export reuses EXT-7.6's `statsToCsv`.

## Do / Don't

- **Don't** add any permission until the owner's choice is recorded below.

## Decision log

- _(pending)_
