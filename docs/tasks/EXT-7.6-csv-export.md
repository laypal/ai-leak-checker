# EXT-7.6: CSV export of stats

**Area:** Extension · popup + shared utils · **Priority:** P1 · **Status:** 🔲 Not started · **Estimate:** ~3 h · *(Pro hook, ships ungated for now)*
**Requirement:** FR-DAT-003 · **Playbook:** read `PLAYBOOK.md` first.

## Why

One-click export of detection stats. A `statsToCSV()` already exists but has
no escaping, stamps today's date on lifetime aggregates, and has no UI.

## Current-state facts (verified 2026-07-12; re-verify)

- `statsToCSV(stats)` at `src/shared/types/storage.ts:265-294` produces `Date,Detector Type,Site,Count` rows with a naive `join(',')`. Nothing imports it (grep to confirm).
- `Stats` schema (`storage.ts:108`) holds **lifetime aggregates** (`byDetector`, `bySite`, `actions`). There is **no date-bucketed history**, so a time series export is impossible from the current schema.

## Scope decision (state it in the PR)

v1 exports an honest **snapshot**: columns `exported_at,detector_type,site,count`
from the existing aggregates. A date-bucketed schema (schemaVersion 2 +
migration) is a separate task; create one if the owner wants trend export.

## Deliverables

- [ ] `src/shared/utils/csv.ts`: pure `escapeCsvField(value)` (RFC 4180: quote fields containing `,` / `"` / newline, double embedded quotes) + `rowsToCsv(rows)`.
- [ ] `src/shared/utils/stats-export.ts`: `statsToCsv(stats, now: Date)` using the helpers, snapshot columns, zero-count rows omitted, empty stats → header only. Remove the old function from the types file (types files hold no logic).
- [ ] `buildExportFilename(now: Date)` → `ai-leak-checker-stats-YYYY-MM-DD.csv`.
- [ ] Popup "Export Stats" button: `Blob` → `URL.createObjectURL` → programmatic `<a download>` click → `revokeObjectURL`. Synchronous inside the click handler.

## TDD plan (in order; RED first)

1. `tests/unit/csv.test.ts`:
   ```ts
   import { escapeCsvField } from '@/shared/utils/csv';

   it('passes plain fields through', () => expect(escapeCsvField('chatgpt.com')).toBe('chatgpt.com'));
   it('quotes fields containing commas', () => expect(escapeCsvField('a,b')).toBe('"a,b"'));
   it('doubles embedded quotes', () => expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""'));
   it('quotes fields containing newlines', () => { /* … */ });
   ```
2. `tests/unit/stats-export.test.ts`: feed a `Stats` fixture (`DEFAULT_STATS` spread with a couple of counts); assert exact CSV output including header, zero-count rows omitted, empty stats → header only, and that the row type has no field that could carry prompt content (assert on the row keys).
3. `buildExportFilename` date formatting test (fixed `Date`).
4. Popup button wiring (manual check; keep logic out of the component).

## Acceptance criteria (BDD)

- [ ] **Given** stored stats, **When** "Export Stats" is clicked, **Then** a correctly escaped CSV downloads containing only `exported_at,detector_type,site,count`. No raw values, no prompt content.
- [ ] **Given** empty stats, **Then** the export succeeds with headers only.
- [ ] **Given** Chrome and Edge, **Then** both download successfully (manual check on Edge).

## Do / Don't

- **Do** trigger the anchor click synchronously in the click handler; popups can close mid-download.
- **Do** escape every field even though `bySite` keys are hostnames.
- **Don't** add the `chrome.downloads` permission. The anchor download avoids permission creep.
- **Don't** invent a time series. The schema cannot support it.

## Verify

Gate + manual: export from the popup in Chrome and Edge, open the file, check escaping on a site name with a comma if one exists in your stats (or add a unit case).

## Decision log

- Snapshot columns over the originally advertised time series: schema reality.
