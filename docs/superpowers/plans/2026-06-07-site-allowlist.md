# Per-Site Pause (`siteAllowlist`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user pause all scanning on the current supported AI site (live, no refresh), with a toolbar-badge + popup indicator that protection is OFF.

**Architecture:** A pure `site-match` helper decides host exclusion. The content script gates `scanWithSettings()` on that helper so all five scan call sites + the fetch fallback inherit the pause with zero listener teardown. The popup learns the current host via a new `GET_SITE` content-script round-trip (never reads `tab.url`), toggles `siteAllowlist` through the existing settings persistence/broadcast path, and the content script reports paused state to the background via a new `SET_PAUSED_BADGE` message that mirrors the existing `SET_FALLBACK_BADGE` per-tab badge.

**Tech Stack:** TypeScript (strict), Preact (popup), Vitest (jsdom), Chrome MV3 messaging.

**Design doc:** `docs/superpowers/specs/2026-06-07-site-allowlist-design.md`

---

## File map

- **Create** `src/shared/utils/site-match.ts` — pure `normalizeHost`, `isHostExcluded`, `toggleSiteExclusion`.
- **Create** `tests/unit/site-match.test.ts` — unit tests for the three helpers.
- **Create** `tests/unit/content-site-exclusion.test.ts` — mirror-simulation test for the scan gate (house pattern: real helper + real engine, mirrored glue).
- **Modify** `src/shared/types/messages.ts` — add `GET_SITE` + `SET_PAUSED_BADGE` enum members, payload/message types, union entries.
- **Modify** `src/shared/types/index.ts` — re-export the new message/payload types.
- **Modify** `src/content/index.ts` — import helper, add `isCurrentSiteExcluded()`, gate `scanWithSettings`, add `notifyPausedState()`, call it on init + on `SETTINGS_UPDATED`, add `GET_SITE` handler case.
- **Modify** `src/background/index.ts` — add `SET_PAUSED_BADGE` handler case (mirrors `SET_FALLBACK_BADGE`).
- **Modify** `tests/integration/fallback-badge.test.ts` OR new `tests/unit/paused-badge.test.ts` — assert paused-badge handler behaviour. (Plan uses a new file to avoid disturbing existing suite.)
- **Modify** `src/popup/popup.tsx` — host discovery on mount, "Pause on this site" toggle + paused notice.
- **Modify** `docs/architecture/ARCHITECTURE.md`, `docs/internal/EXTENSION_TODO.md`, `docs/internal/EXTENSION_DONE.md`, `docs/STATUS.md` — docs.

---

## Task 1: Pure host-match helper (`site-match.ts`)

**Files:**
- Create: `src/shared/utils/site-match.ts`
- Test: `tests/unit/site-match.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/site-match.test.ts`:

```typescript
/**
 * @file site-match.test.ts
 * @description Unit tests for pure hostname matching helpers used by the
 *              per-site pause (siteAllowlist) feature.
 */
import { describe, it, expect } from 'vitest';
import { normalizeHost, isHostExcluded, toggleSiteExclusion } from '@/shared/utils/site-match';

describe('normalizeHost', () => {
  it('lowercases and trims', () => {
    expect(normalizeHost('  ChatGPT.com  ')).toBe('chatgpt.com');
  });
  it('strips a single leading www.', () => {
    expect(normalizeHost('www.claude.ai')).toBe('claude.ai');
  });
  it('does not strip non-leading www', () => {
    expect(normalizeHost('app.www.example.com')).toBe('app.www.example.com');
  });
  it('returns empty string for empty/invalid input', () => {
    expect(normalizeHost('')).toBe('');
    expect(normalizeHost('   ')).toBe('');
  });
});

describe('isHostExcluded', () => {
  it('matches an exact normalized host', () => {
    expect(isHostExcluded('chatgpt.com', ['chatgpt.com'])).toBe(true);
  });
  it('matches case-insensitively and ignoring www.', () => {
    expect(isHostExcluded('WWW.ChatGPT.com', ['chatgpt.com'])).toBe(true);
    expect(isHostExcluded('chatgpt.com', ['www.ChatGPT.COM'])).toBe(true);
  });
  it('does not match a different subdomain (no globbing)', () => {
    expect(isHostExcluded('chat.chatgpt.com', ['chatgpt.com'])).toBe(false);
  });
  it('returns false for empty host or empty list', () => {
    expect(isHostExcluded('', ['chatgpt.com'])).toBe(false);
    expect(isHostExcluded('chatgpt.com', [])).toBe(false);
  });
});

describe('toggleSiteExclusion', () => {
  it('adds a normalized host when absent', () => {
    expect(toggleSiteExclusion('WWW.Claude.ai', ['chatgpt.com'])).toEqual([
      'chatgpt.com',
      'claude.ai',
    ]);
  });
  it('removes a host when present (normalized comparison)', () => {
    expect(toggleSiteExclusion('chatgpt.com', ['www.chatgpt.com', 'claude.ai'])).toEqual([
      'claude.ai',
    ]);
  });
  it('dedupes the existing list', () => {
    expect(toggleSiteExclusion('claude.ai', ['chatgpt.com', 'chatgpt.com'])).toEqual([
      'chatgpt.com',
      'claude.ai',
    ]);
  });
  it('returns a copy unchanged for empty host', () => {
    expect(toggleSiteExclusion('', ['chatgpt.com'])).toEqual(['chatgpt.com']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/site-match.test.ts`
Expected: FAIL — `Failed to resolve import "@/shared/utils/site-match"`.

- [ ] **Step 3: Write the implementation**

Create `src/shared/utils/site-match.ts`:

```typescript
/**
 * @file site-match.ts
 * @description Pure hostname matching helpers for the per-site pause feature
 *              (siteAllowlist). No chrome.* or DOM dependencies, so this is
 *              unit-testable and shared by the popup and content script.
 *
 * @security
 *   - Operates only on hostnames (never prompt content). No network or storage.
 */

/**
 * Normalize a hostname for comparison: lowercase, trimmed, with a single
 * leading "www." stripped. Returns '' for empty/invalid input.
 */
export function normalizeHost(host: string): string {
  if (!host || typeof host !== 'string') return '';
  const trimmed = host.trim().toLowerCase();
  return trimmed.startsWith('www.') ? trimmed.slice(4) : trimmed;
}

/**
 * True when `host` is present in `siteAllowlist` under normalized, exact-match
 * comparison. No subdomain globbing. Empty host or empty list => false.
 */
export function isHostExcluded(host: string, siteAllowlist: string[]): boolean {
  const target = normalizeHost(host);
  if (!target || !Array.isArray(siteAllowlist) || siteAllowlist.length === 0) {
    return false;
  }
  return siteAllowlist.some((h) => normalizeHost(h) === target);
}

/**
 * Toggle a host's membership in a siteAllowlist. Returns a NEW array with the
 * normalized host removed if already present (normalized comparison) or
 * appended if absent. Result is normalized and deduped.
 */
export function toggleSiteExclusion(host: string, list: string[]): string[] {
  const source = Array.isArray(list) ? list : [];
  const deduped = Array.from(new Set(source.map(normalizeHost).filter(Boolean)));
  const target = normalizeHost(host);
  if (!target) return deduped;
  return deduped.includes(target)
    ? deduped.filter((h) => h !== target)
    : [...deduped, target];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/site-match.test.ts`
Expected: PASS (13 tests).

- [ ] **Step 5: Commit**

```bash
git add src/shared/utils/site-match.ts tests/unit/site-match.test.ts
git commit -m "feat(site-allowlist): pure hostname match helpers + tests"
```

---

## Task 2: Content-script scan gate

**Files:**
- Modify: `src/content/index.ts` (imports near line 10; `scanWithSettings` at lines 85-87)
- Test: `tests/unit/content-site-exclusion.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/content-site-exclusion.test.ts`. This mirrors the production gate glue (house pattern from `content-message-handler.test.ts`) but exercises the REAL `isHostExcluded` helper and the REAL `scan` engine:

```typescript
/**
 * @file content-site-exclusion.test.ts
 * @description Verifies the content-script scan gate: when the current host is
 * in siteAllowlist, scanning is short-circuited to an empty result so no modal
 * fires. Mirrors the production glue (scanWithSettings) while using the real
 * isHostExcluded helper and real engine.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { scan } from '@/shared/detectors';
import { isHostExcluded } from '@/shared/utils/site-match';
import type { DetectionResult } from '@/shared/types';

// Mirror of production scanWithSettings gate (src/content/index.ts).
function simulateScanWithSettings(
  text: string,
  host: string,
  siteAllowlist: string[]
): DetectionResult {
  if (isHostExcluded(host, siteAllowlist)) {
    return scan('');
  }
  return scan(text);
}

const SECRET = 'My key is sk-abcdefghijklmnopqrstuvwxyz0123456789ABCD';

describe('content scan gate (siteAllowlist)', () => {
  it('returns no sensitive data when the host is excluded', () => {
    const result = simulateScanWithSettings(SECRET, 'chatgpt.com', ['chatgpt.com']);
    expect(result.hasSensitiveData).toBe(false);
    expect(result.findings).toHaveLength(0);
  });

  it('detects normally when the host is NOT excluded', () => {
    const result = simulateScanWithSettings(SECRET, 'chatgpt.com', []);
    expect(result.hasSensitiveData).toBe(true);
  });

  it('engages live after the host is added to the allowlist', () => {
    let allowlist: string[] = [];
    expect(simulateScanWithSettings(SECRET, 'claude.ai', allowlist).hasSensitiveData).toBe(true);
    allowlist = ['claude.ai']; // mirrors applySettings({ siteAllowlist:[host] })
    expect(simulateScanWithSettings(SECRET, 'claude.ai', allowlist).hasSensitiveData).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/content-site-exclusion.test.ts`
Expected: FAIL — `Failed to resolve import "@/shared/utils/site-match"` is already resolved by Task 1, so instead this FAILS only if Task 1 was skipped. If Task 1 is done, this test PASSES immediately because it imports the real helper. That is acceptable: it locks the gate contract the production code must satisfy. Proceed to Step 3 to make production match the contract.

- [ ] **Step 3: Modify production `scanWithSettings`**

In `src/content/index.ts`, add the import next to the existing `redact` import (line 10):

```typescript
import { isHostExcluded } from '@/shared/utils/site-match';
```

Replace the existing `scanWithSettings` function (lines 85-87):

```typescript
function scanWithSettings(text: string): DetectionResult {
  return scan(text, currentScanOptions);
}
```

with:

```typescript
/**
 * True when the current page's host is in the user's siteAllowlist, meaning
 * scanning is paused for this site.
 */
function isCurrentSiteExcluded(): boolean {
  return isHostExcluded(window.location.hostname, currentSettings.siteAllowlist);
}

/**
 * Scan text using the user's current detector settings. When the current site
 * is paused (siteAllowlist), short-circuit to the engine's empty result so all
 * call sites (DOM + fetch fallback) treat it as "no sensitive data".
 */
function scanWithSettings(text: string): DetectionResult {
  if (isCurrentSiteExcluded()) {
    return scan('', currentScanOptions);
  }
  return scan(text, currentScanOptions);
}
```

- [ ] **Step 4: Run typecheck + the test**

Run: `npm run typecheck && npx vitest run tests/unit/content-site-exclusion.test.ts`
Expected: typecheck clean; test PASSES (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/content/index.ts tests/unit/content-site-exclusion.test.ts
git commit -m "feat(site-allowlist): gate content scanWithSettings on excluded host"
```

---

## Task 3: New message types (`GET_SITE`, `SET_PAUSED_BADGE`)

**Files:**
- Modify: `src/shared/types/messages.ts` (enum line 51; payloads after line 167; union after line 231)
- Modify: `src/shared/types/index.ts` (exports near lines 74-75)

- [ ] **Step 1: Add enum members**

In `src/shared/types/messages.ts`, replace:

```typescript
  // Fallback Status
  SET_FALLBACK_BADGE: 'SET_FALLBACK_BADGE',
} as const;
```

with:

```typescript
  // Fallback Status
  SET_FALLBACK_BADGE: 'SET_FALLBACK_BADGE',
  // Per-site pause (siteAllowlist)
  GET_SITE: 'GET_SITE',
  SET_PAUSED_BADGE: 'SET_PAUSED_BADGE',
} as const;
```

- [ ] **Step 2: Add payload + message types**

In `src/shared/types/messages.ts`, immediately after the `SetFallbackBadgeMessage` type (line 167), add:

```typescript

// =============================================================================
// Per-Site Pause Messages
// =============================================================================

/** Reply payload for GET_SITE (popup -> content). */
export interface GetSiteResponse {
  host: string;
}

export type GetSiteMessage = BaseMessage<'GET_SITE', undefined>;

/** Payload for SET_PAUSED_BADGE message (content -> background). */
export interface SetPausedBadgePayload {
  paused: boolean;
}

export type SetPausedBadgeMessage = BaseMessage<'SET_PAUSED_BADGE', SetPausedBadgePayload>;
```

- [ ] **Step 3: Add to the `ExtensionMessage` union**

In `src/shared/types/messages.ts`, replace:

```typescript
  | StatusMessage
  | SetFallbackBadgeMessage;
```

with:

```typescript
  | StatusMessage
  | SetFallbackBadgeMessage
  | GetSiteMessage
  | SetPausedBadgeMessage;
```

- [ ] **Step 4: Re-export from `types/index.ts`**

In `src/shared/types/index.ts`, replace:

```typescript
  SetFallbackBadgePayload,
  SetFallbackBadgeMessage,
```

with:

```typescript
  SetFallbackBadgePayload,
  SetFallbackBadgeMessage,
  GetSiteResponse,
  GetSiteMessage,
  SetPausedBadgePayload,
  SetPausedBadgeMessage,
```

> NOTE: confirm these names sit inside the existing `export type { ... } from './messages';` block. If `index.ts` uses a different re-export form, match it — the goal is that `import { SetPausedBadgePayload } from '@/shared/types'` resolves.

- [ ] **Step 5: Typecheck + commit**

Run: `npm run typecheck`
Expected: clean.

```bash
git add src/shared/types/messages.ts src/shared/types/index.ts
git commit -m "feat(site-allowlist): add GET_SITE and SET_PAUSED_BADGE message types"
```

---

## Task 4: Background paused-badge handler

**Files:**
- Modify: `src/background/index.ts` (add a case after the `SET_FALLBACK_BADGE` case, ~line 241)
- Test: `tests/unit/paused-badge.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/paused-badge.test.ts`. It mirrors the handler's pure decision (which badge call to make) using a small extracted helper, matching how `badge.test.ts`/`fallback-badge.test.ts` test badge logic:

```typescript
/**
 * @file paused-badge.test.ts
 * @description Verifies the per-tab paused-badge decision: paused => grey pause
 * glyph for that tab; unpaused => restore the normal tab badge.
 */
import { describe, it, expect, vi } from 'vitest';

// Mirror of the SET_PAUSED_BADGE handler's side-effect decision.
async function applyPausedBadge(
  paused: boolean,
  tabId: number,
  api: {
    setBadgeText: (o: { text: string; tabId: number }) => Promise<void>;
    setBadgeBackgroundColor: (o: { color: string; tabId: number }) => Promise<void>;
    restore: (tabId: number) => Promise<void>;
  }
): Promise<void> {
  if (paused) {
    await api.setBadgeText({ text: '⏸', tabId });
    await api.setBadgeBackgroundColor({ color: '#6c757d', tabId });
  } else {
    await api.restore(tabId);
  }
}

describe('paused badge', () => {
  it('sets a grey pause glyph for the tab when paused', async () => {
    const api = {
      setBadgeText: vi.fn().mockResolvedValue(undefined),
      setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined),
      restore: vi.fn().mockResolvedValue(undefined),
    };
    await applyPausedBadge(true, 7, api);
    expect(api.setBadgeText).toHaveBeenCalledWith({ text: '⏸', tabId: 7 });
    expect(api.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#6c757d', tabId: 7 });
    expect(api.restore).not.toHaveBeenCalled();
  });

  it('restores the normal tab badge when unpaused', async () => {
    const api = {
      setBadgeText: vi.fn().mockResolvedValue(undefined),
      setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined),
      restore: vi.fn().mockResolvedValue(undefined),
    };
    await applyPausedBadge(false, 7, api);
    expect(api.restore).toHaveBeenCalledWith(7);
    expect(api.setBadgeText).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it passes (contract lock)**

Run: `npx vitest run tests/unit/paused-badge.test.ts`
Expected: PASS (2 tests). This locks the badge contract; Step 3 makes production conform.

- [ ] **Step 3: Add the background handler case**

In `src/background/index.ts`, immediately after the closing `}` of the `SET_FALLBACK_BADGE` case (line 241, before the `default:` case), add:

```typescript
    case MessageType.SET_PAUSED_BADGE: {
      const payload = message.payload;
      const tabId = sender.tab?.id;

      if (!tabId) {
        return { error: 'No tab ID available' };
      }
      if (!payload || typeof payload !== 'object') {
        return { error: 'Invalid payload: payload must be an object' };
      }
      if (!('paused' in payload) || typeof payload.paused !== 'boolean') {
        return { error: 'Invalid payload: payload.paused must be a boolean' };
      }

      try {
        if (payload.paused === true) {
          await chrome.action.setBadgeText({ text: '⏸', tabId });
          await chrome.action.setBadgeBackgroundColor({ color: '#6c757d', tabId });
        } else {
          await updateBadgeForTab(tabId);
        }
        return { success: true };
      } catch (error) {
        console.warn('[AI Leak Checker] Failed to update paused badge:', error);
        return { success: false, error: String(error) };
      }
    }
```

- [ ] **Step 4: Typecheck + full unit run for the two new badge/site tests**

Run: `npm run typecheck && npx vitest run tests/unit/paused-badge.test.ts`
Expected: typecheck clean; tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/background/index.ts tests/unit/paused-badge.test.ts
git commit -m "feat(site-allowlist): background SET_PAUSED_BADGE per-tab handler"
```

---

## Task 5: Content wiring — `GET_SITE` reply + paused-badge notify

**Files:**
- Modify: `src/content/index.ts` — add `notifyPausedState()` near `notifyFallbackActive` (~line 355); call it at the end of `initialize()` (after line 234 settings load / near line 261); add `GET_SITE` case + call in `SETTINGS_UPDATED` case in `handleMessage` (lines 883-903).

- [ ] **Step 1: Add `notifyPausedState()` helper**

In `src/content/index.ts`, immediately after the `notifyFallbackActive` function (ends line 355), add:

```typescript
/**
 * Inform the background script whether scanning is currently paused on this
 * tab (siteAllowlist) so it can show/clear the per-tab paused badge.
 */
function notifyPausedState(): void {
  safeSendMessage({
    type: MessageType.SET_PAUSED_BADGE,
    payload: { paused: isCurrentSiteExcluded() },
  });
}
```

- [ ] **Step 2: Call it on initial load**

In `src/content/index.ts` `initialize()`, after the `window.addEventListener('message', handleWindowMessage);` line (line 261), add:

```typescript

  // Reflect the initial paused state on the badge (settings already applied above).
  notifyPausedState();
```

- [ ] **Step 3: Add `GET_SITE` handler + notify on settings change**

In `src/content/index.ts` `handleMessage`, update the `SETTINGS_UPDATED` case so it refreshes the badge after applying settings. Replace:

```typescript
        const payload = (message as { payload?: { settings?: Partial<Settings> } }).payload;
        if (payload?.settings && typeof payload.settings === 'object') {
          applySettings(payload.settings);
        }
        break;
```

with:

```typescript
        const payload = (message as { payload?: { settings?: Partial<Settings> } }).payload;
        if (payload?.settings && typeof payload.settings === 'object') {
          applySettings(payload.settings);
          // siteAllowlist may have changed — update the per-tab paused badge live.
          notifyPausedState();
        }
        break;
```

Then add a `GET_SITE` case to the same `switch` (after the `GET_STATUS` case, before the closing `}` at line 904):

```typescript

      case MessageType.GET_SITE:
        sendResponse({ host: window.location.hostname });
        return true;
```

- [ ] **Step 4: Typecheck + build**

Run: `npm run typecheck`
Expected: clean. (No new unit test here — behaviour is exercised by Task 2's gate test and Task 4's badge test; the messaging glue is verified manually in the validation gate.)

- [ ] **Step 5: Commit**

```bash
git add src/content/index.ts
git commit -m "feat(site-allowlist): content GET_SITE reply + paused-badge notify"
```

---

## Task 6: Popup "Pause on this site" toggle + notice

**Files:**
- Modify: `src/popup/popup.tsx` — import helper; add host-discovery state + effect; render toggle/notice in the Settings tab (insert after the Sensitivity section, which ends at line 380).

- [ ] **Step 1: Add the import**

In `src/popup/popup.tsx`, add to the imports (alongside the existing `@/shared` imports):

```typescript
import { toggleSiteExclusion, normalizeHost } from '@/shared/utils/site-match';
```

- [ ] **Step 2: Add host-discovery state + effect**

Inside the component, near the other `useState` hooks (the `activeTab` state is at line 145), add:

```typescript
  const [currentHost, setCurrentHost] = useState<string | null>(null);
```

Add an effect that asks the active tab's content script for its host (uses `tab.id` only — never `tab.url`):

```typescript
  useEffect(() => {
    let cancelled = false;
    async function discoverHost() {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return;
        const resp = (await chrome.tabs.sendMessage(tab.id, {
          type: MessageType.GET_SITE,
          payload: undefined,
          timestamp: Date.now(),
          correlationId: `popup-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          source: 'popup',
        })) as { host?: string } | undefined;
        if (!cancelled && resp && typeof resp.host === 'string') {
          setCurrentHost(normalizeHost(resp.host));
        }
      } catch {
        // No content script on this tab => unsupported site => leave host null.
      }
    }
    void discoverHost();
    return () => {
      cancelled = true;
    };
  }, []);
```

> NOTE: ensure `useEffect` is imported from `preact/hooks` (check the existing hook imports at the top of the file; add `useEffect` if it is not already imported).

- [ ] **Step 3: Add a pause helper inside the component**

Near `toggleDetector` (line 221), add:

```typescript
  const isSitePaused = currentHost
    ? settings.siteAllowlist.some((h) => normalizeHost(h) === currentHost)
    : false;

  async function toggleSitePause() {
    if (!currentHost) return;
    const next = toggleSiteExclusion(currentHost, settings.siteAllowlist);
    await updateSetting('siteAllowlist', next);
  }
```

- [ ] **Step 4: Render the toggle + notice**

In the Settings tab, immediately after the Sensitivity section's closing `</div>` (line 380), insert:

```tsx
          {/* Per-site pause */}
          {currentHost && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>This Site</div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  border: '1px solid #dee2e6',
                  borderRadius: '8px',
                  background: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                <span>Pause scanning on {currentHost}</span>
                <input
                  type="checkbox"
                  checked={isSitePaused}
                  onChange={() => { void toggleSitePause(); }}
                />
              </label>
              {isSitePaused && (
                <div
                  style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: '#fff3cd',
                    color: '#664d03',
                    fontSize: '12px',
                  }}
                >
                  ⏸ Scanning paused on {currentHost}. Protection is off for this site.
                </div>
              )}
            </div>
          )}
```

- [ ] **Step 5: Typecheck + lint + build**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: typecheck clean; lint 0 errors; build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/popup/popup.tsx
git commit -m "feat(site-allowlist): popup pause-on-this-site toggle + notice"
```

---

## Task 7: Docs

**Files:**
- Modify: `docs/architecture/ARCHITECTURE.md` (the `siteAllowlist` line, ~L278)
- Modify: `docs/internal/EXTENSION_TODO.md`, `docs/internal/EXTENSION_DONE.md`
- Modify: `docs/STATUS.md` (if it enumerates settings)

- [ ] **Step 1: Update ARCHITECTURE.md**

Open `docs/architecture/ARCHITECTURE.md`, find the `siteAllowlist` line near L278, and replace its description with text describing real behaviour, e.g.:

```markdown
- `siteAllowlist: string[]` — normalized hostnames the user has paused. When the
  current host matches, the content script short-circuits every scan to an empty
  result (DOM + fetch fallback) and the toolbar badge shows a grey ⏸. Toggled
  from the popup's "Pause scanning on <host>" control; applies live via the
  SETTINGS_UPDATED broadcast (no page refresh).
```

- [ ] **Step 2: Move the task entry to DONE**

In `docs/internal/EXTENSION_TODO.md`, remove the siteAllowlist/site-allowlist item; in `docs/internal/EXTENSION_DONE.md`, add an entry noting: per-site pause shipped (siteAllowlist consumed in content script, popup toggle, per-tab paused badge, `GET_SITE`/`SET_PAUSED_BADGE` messages), with the design doc path.

- [ ] **Step 3: Update STATUS.md if needed**

Open `docs/STATUS.md`; if it lists settings or features, add per-site pause. If it does not enumerate settings, skip.

- [ ] **Step 4: Commit**

```bash
git add docs/architecture/ARCHITECTURE.md docs/internal/EXTENSION_TODO.md docs/internal/EXTENSION_DONE.md docs/STATUS.md
git commit -m "docs(site-allowlist): document per-site pause behaviour"
```

---

## Final validation gate (run before opening the PR)

```bash
npm run typecheck
npm run lint            # 0 errors; no new no-console warnings
npx vitest run          # all green incl. site-match, content-site-exclusion, paused-badge
npm run test:corpus     # FP rate < 4% (baseline 3.19%)
npm run build           # MV3 build succeeds
```

**Manual smoke test (reload unpacked from `dist/`):**
1. On `chatgpt.com`, open the popup → Settings → toggle "Pause scanning on chatgpt.com" ON. Badge shows grey ⏸; popup shows the paused notice.
2. Without refreshing, paste/type a fake secret (`sk-` + 30 random chars) and submit → NO modal fires.
3. Toggle OFF → badge restores; paste the secret again → modal fires.
4. Open the popup on a non-supported site (e.g. `example.com`) → the "This Site" section is hidden and the popup does not error.

---

## Self-review notes (author)

- **Spec coverage:** §2 matching → Task 1; §3 enforcement → Task 2; §4 live update → Task 2 test 3 + Task 5 SETTINGS_UPDATED notify; §5 badge+notice → Task 4 (badge) + Task 6 (notice); §6 popup → Task 6; §7 messages → Task 3; §8 testing → Tasks 1/2/4; §9 permissions (no new perms, no `tab.url`) → Task 6 uses `tab.id` only; §10 docs → Task 7. All covered.
- **Type consistency:** `isCurrentSiteExcluded`, `scanWithSettings`, `notifyPausedState`, `toggleSiteExclusion`, `normalizeHost`, `isHostExcluded`, `SetPausedBadgePayload.paused`, `GetSiteResponse.host`, `MessageType.GET_SITE`, `MessageType.SET_PAUSED_BADGE` used consistently across tasks.
- **Contract-lock tests:** Tasks 2 and 4 tests may pass before the production edit because they exercise extracted/mirrored logic (house pattern). That is intentional — they lock the contract the production glue must match; Steps 3 wire production to it, verified by typecheck + the manual gate.
```
