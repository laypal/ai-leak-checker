# Design — Per-Site Pause (`siteAllowlist`)

> Status: approved 2026-06-07. Branch: `feature/site-allowlist` (off `main`).
> Supersedes the scope discussion in `docs/internal/SITE_ALLOWLIST_SPEC.md`
> for the parts being built now (T5 allowlist editor deferred).

## 1. Goal & scope

Wire up `Settings.siteAllowlist` (declared in
[storage.ts](../../../src/shared/types/storage.ts#L34) with a `[]` default but
never read and no UI) so a user can **pause all scanning on the current
supported site**, live (no page refresh), with a clear "protection is OFF"
indicator.

**In scope:** per-site pause toggle (DOM + fetch-fallback paths), live apply,
badge + popup indicator that protection is off, docs.

**Out of scope:** the user `allowlist` string editor (spec T5 — deferred to a
separate branch/PR); regex/wildcard site patterns; import/export; sync storage;
subdomain globbing.

## 2. Matching — pure helper

New `src/shared/utils/site-match.ts`. Pure, no `chrome.*` / DOM imports, so it
is unit-testable and reusable by both popup and content script.

- `normalizeHost(h: string): string` — lowercase, trim, strip a single leading
  `www.`.
- `isHostExcluded(host: string, siteAllowlist: string[]): boolean` — normalize
  both sides, **exact match only**. Empty host or empty list ⇒ `false`.
- `toggleSiteExclusion(host: string, list: string[]): string[]` — return a new
  list with the normalized host added (if absent) or removed (if present);
  deduped. Used by the popup toggle.

Stored value is the normalized host (e.g. `chatgpt.com`). No subdomain globbing
in v1.

## 3. Enforcement — content script (one DRY gate)

In [src/content/index.ts](../../../src/content/index.ts):

- Add `isCurrentSiteExcluded(): boolean` =
  `isHostExcluded(window.location.hostname, currentSettings.siteAllowlist)`.
- `scanWithSettings(text)` returns an **empty `DetectionResult`** when excluded,
  produced via `scan('', currentScanOptions)` — the engine short-circuits an
  empty string to `createEmptyResult()`, giving the exact `DetectionResult`
  shape (`hasSensitiveData:false`, `findings:[]`, `summary`, `scanTime`,
  `textLength:0`) with **no new engine export**.
- All five scan call sites — `handleEnterKey`, `handlePaste`,
  `handleSubmitClick`, `handleFormSubmit`, `handleWindowMessage` — inherit the
  gate automatically, so live toggling needs **zero listener teardown**.
- `handleWindowMessage` (injected fetch-fallback path) consequently posts
  `{ hasSensitiveData: false }` and shows no modal when excluded.

**Why gate at scan time rather than tear down interception in `initialize()`:**
a live toggle from the popup must work without refresh. Gating at the scan call
keeps one code path for both initial-load and live SETTINGS_UPDATED updates,
mirroring the detector-toggle approach already shipped in fix #23.

## 4. Live update

Already supported by existing plumbing:

- Popup `updateSetting('siteAllowlist', next)` →
  `SETTINGS_UPDATE` → background `updateSettings()` merges + persists +
  broadcasts `SETTINGS_UPDATED` (full merged `Settings`) to all tabs.
- Content `applySettings()` shallow-merges `siteAllowlist` (array replacement is
  correct), and the `SETTINGS_UPDATED` handler is `isTrustedSender`-gated.

No new content-script update code. A test asserts that after
`applySettings({ siteAllowlist: [host] })`, the next `scanWithSettings` is gated.

## 5. "Protection OFF" indicator — badge + popup notice

> Deviation from the original `SITE_ALLOWLIST_SPEC.md`: that spec did not include
> a badge indicator. Added per the approved design choice ("Badge + popup
> notice"). Reuses the existing per-tab badge precedent, so it is low-risk, but
> it is genuinely new code (a message type + a background handler).

- **Badge (per-tab, mirrors `SET_FALLBACK_BADGE`):** new `SET_PAUSED_BADGE`
  message. The content script sends it on init and on every `SETTINGS_UPDATED`
  with `{ paused: isCurrentSiteExcluded() }`. Background, using `sender.tab.id`:
  - paused ⇒ `chrome.action.setBadgeText({ text: '⏸', tabId })` +
    `setBadgeBackgroundColor({ color: '#6c757d', tabId })` (muted grey).
  - unpaused ⇒ call existing `updateBadgeForTab(tabId)` to restore the normal
    (cancelled-count) badge.
  - Handler is sender-gated like the rest.
- **Popup notice:** when the current host is excluded, the Settings tab shows a
  clear "⏸ Scanning paused on `<host>`" notice adjacent to the toggle.

## 6. Popup — "Pause on this site" toggle

In [src/popup/popup.tsx](../../../src/popup/popup.tsx), new Settings-tab section:

- On mount: `chrome.tabs.query({ active: true, currentWindow: true })` → take
  **`tab.id` only** (never read `tab.url`) → send `GET_SITE` to that tab's
  content script → content replies `{ host: window.location.hostname }`.
  - Reply ⇒ supported site ⇒ show toggle "Disable scanning on `<host>`",
    reflecting whether the host is currently in `siteAllowlist`.
  - No reply / no content script ⇒ unsupported site ⇒ hide toggle + notice.
- On toggle: `next = toggleSiteExclusion(host, settings.siteAllowlist)` then
  `updateSetting('siteAllowlist', next)` — reuses the existing persist +
  broadcast path. **No background `updateSettings` changes.**

## 7. New message types

Added to the `MessageType` enum + typed payload interfaces in
[messages.ts](../../../src/shared/types/messages.ts), exported via
[types/index.ts](../../../src/shared/types/index.ts):

- `GET_SITE` — popup → content. Reply: `{ host: string }`.
- `SET_PAUSED_BADGE` — content → background. Payload: `{ paused: boolean }`
  (tabId taken from `sender.tab.id`). Sender-gated.

## 8. Testing

- `tests/unit/site-match.test.ts` — `normalizeHost` (case, `www.` strip, trim);
  `isHostExcluded` (exact-match-only / no accidental subdomain match, empty host,
  empty list); `toggleSiteExclusion` (add / remove / dedupe / normalize).
- Content-level test (pattern: `content-message-handler.test.ts` with a
  `simulate*` mirror + injectable `scanFn`): excluded host ⇒ no modal,
  `hasSensitiveData:false`; non-excluded host ⇒ normal behaviour. Plus the
  live-update assertion from §4 (gate engages after `applySettings`).
  - jsdom origin: follow how existing content tests set `window.location`.
- Popup toggle UI: light logic — pure `toggleSiteExclusion` carries unit
  coverage; the toggle itself is smoke-tested manually.

## 9. Permissions & privacy

- **No new permissions** — `activeTab` + `storage` only. `tab.url` is never read;
  hostname comes from the content script via `GET_SITE`.
- `siteAllowlist` stores a **hostname** (not prompt content) — within the privacy
  invariant. Zero network egress. The badge/notice exist specifically so disabled
  protection is never silently forgotten (trust posture for a safety tool).

## 10. Docs (T6)

- [ARCHITECTURE.md](../../architecture/ARCHITECTURE.md) — update the
  `siteAllowlist` line (~L278) to describe real behaviour.
- `docs/internal/EXTENSION_TODO.md` → move the item to `EXTENSION_DONE.md`.
- `docs/STATUS.md` — update if it enumerates settings.

## 11. Commit slices

1. T1 `site-match.ts` + tests.
2. Content enforcement (`isCurrentSiteExcluded`, gated `scanWithSettings`) + tests.
3. Message types + badge wiring (`GET_SITE`, `SET_PAUSED_BADGE`, background handler).
4. Popup toggle + paused notice.
5. Docs.

## 12. Validation gate (must pass before PR)

```bash
npm run typecheck
npm run lint            # 0 errors; no new no-console warnings
npx vitest run          # all green incl. new tests
npm run test:corpus     # FP rate < 4% (currently 3.19%)
npm run build           # MV3 build succeeds
```

Manual: reload unpacked, on chatgpt.com toggle "Pause on this site" → scanning
stops live (no refresh) and badge shows `⏸`; untoggle → resumes and badge
restores. Confirm a non-supported site doesn't break the popup (toggle hidden).

## 13. Risks / gotchas

- **`GET_SITE` timing:** content script must be loaded for the popup to get a
  host. On supported sites it is; on unsupported sites the absence of a reply is
  the intended "hide toggle" signal. Use a short timeout / callback-error guard
  in the popup so a missing content script resolves to "unsupported", not a hang.
- **Don't tear down listeners on exclude** — gate at scan time so live re-enable
  works without re-running `initialize()`.
- **Sender gate:** keep `SET_PAUSED_BADGE` and the `SETTINGS_UPDATED` path
  `isTrustedSender`-gated; don't regress EXT-SEC.
- **Empty-result shape:** must match `DetectionResult` exactly so callers/stats
  don't choke — `scan('', currentScanOptions)` guarantees this.
- **Badge restore:** unpause must call `updateBadgeForTab(tabId)`, not blindly
  clear, so an existing cancelled-count badge is preserved.
