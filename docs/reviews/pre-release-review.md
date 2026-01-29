# Pre-Release Review: Chrome Web Store Submission

**Date**: 2026-01-29  
**Scope**: Performance, security, Manifest V3 compliance  
**Build**: Current (v0.1.6)

---

## Executive Summary

| Area | Status | Blockers |
|------|--------|----------|
| **Security** | ✅ Pass | None |
| **Manifest V3** | ✅ Pass | None |
| **Performance** | ✅ Pass | None |

**Verdict**: **Green light** for release. No critical or major issues. A few minor items are documented for post-release hardening.

---

## 1. Security Review

### ✅ Passing

- **No prompt/content storage** – Only metadata (domain, detector type, timestamp) and settings/stats are stored. `pendingSubmission` holds `FindingMeta` (type, start, end, confidence), not raw values; Mask & Continue re-reads from input.
- **No eval / Function / string setTimeout** – Grep found no instances.
- **CSP** – `script-src 'self'; object-src 'self'`; no `unsafe-eval` or `unsafe-inline`.
- **Permissions** – Minimal: `storage`, `activeTab`, and host_permissions only for `chat.openai.com`, `chatgpt.com`, `claude.ai`. No `<all_urls>` or broad `tabs`.
- **innerHTML** – Modal uses `innerHTML` only with content built from `renderContent()`; all user-derived strings (finding type, masked value) go through `escapeHtml()` in `modal.ts`. No XSS from user data.
- **No outbound telemetry** – No `fetch`/XHR to analytics; injected script only patches fetch/XHR for interception, no external calls.
- **Shadow DOM** – Modal is in Shadow DOM for isolation.
- **Window postMessage** – Content script validates `event.source === window` and `isAILeakCheckerMessage(event.data)`; response uses `getWindowMessageTargetOrigin()` (current origin). Injected script uses `'*'` for request; handler only processes when `event.source === window`, so impact is limited (see Minor below).

### 🟡 Minor (non-blocking)

- **Background message sender** – `handleMessage` in `src/background/index.ts` does not validate `sender.id === chrome.runtime.id`. Only extension contexts can send to the background; validating sender is defense-in-depth. **Suggestion**: Add `if (sender.id !== chrome.runtime.id) return { error: 'Unauthorized' };` at the start of the async handler.
- **Injected script postMessage targetOrigin** – `injected/index.ts` uses `postMessage(..., '*')` for scan requests. The content script only handles when `event.source === window`, so other origins cannot inject scan_request. **Suggestion**: Use `window.location.origin` (or a constant derived from it at injection time) instead of `'*'` for consistency and future hardening.

---

## 2. Manifest V3 Compliance

### ✅ Passing

- **manifest_version**: 3
- **Background** – `service_worker: "background.js"`, `type: "module"`; no background page.
- **APIs** – No `chrome.browserAction`, `chrome.extension.*`, `chrome.tabs.executeScript`, or `webRequest.onBeforeRequest` (blocking).
- **Action** – Uses `chrome.action` (badge, popup) in code.
- **Popup HTML** – No inline scripts; loads `./popup.tsx` via `<script type="module" src="./popup.tsx">`.
- **CSP** – Extension pages CSP has no `unsafe-eval` or `unsafe-inline`.
- **Service worker** – Uses `chrome.storage.local`, no `window`/`document`/`localStorage`.

### 🟡 Minor

- **Settings broadcast** – `updateSettings` uses `chrome.tabs.query({})` to notify all tabs. With current permissions, `tabs.query` does not require the full `tabs` permission for basic tab list (url/title/favIconUrl are the restricted fields). A try/catch around the “notify all tabs” block was added so that any unexpected failure does not cause `updateSettings` to throw after settings are saved.

---

## 3. Performance Review

### ✅ Passing

- **Regex** – Patterns in `patterns.ts` are pre-compiled (module-level `RegExp`). No regex compiled in hot paths in `engine.ts` or content script.
- **Detection** – `quickCheck()` used before full `scan()`; performance tests enforce &lt;50ms (small), &lt;200ms (~5KB), &lt;1000ms (~50KB), &lt;5000ms (~500KB).
- **Timers** – `observerRetryInterval` in content script is cleared after 30s. No uncleared `setInterval`/`setTimeout` that would leak across navigations.
- **Listeners** – `attachedElements` WeakSet prevents duplicate attachment; form/input/submit listeners attached once per element.
- **Modal** – Content is built once and assigned via `innerHTML`; no layout thrashing (centering via CSS). No repeated offsetHeight/read-write patterns found.
- **DOM** – Input/submit elements resolved via selectors from config; MutationObserver used for dynamic attachment without unbounded re-query on every mutation.

### Performance test coverage

- `tests/e2e/performance.spec.ts`: scan latency (small/medium/large/very large), quickCheck, batch scanning, basic memory check.
- Targets align with performance budget: &lt;50ms small, &lt;200ms medium, &lt;1000ms large.

### 🟡 Optional

- **Large text** – For very large inputs (e.g. &gt;100KB), consider chunking or early exit in the engine if product requirements grow; current tests and budgets are met.

---

## 4. Fix Applied This Review

- **Background `updateSettings`** – Wrapped the “notify all tabs” block (tabs.query + sendMessage loop) in try/catch so that any failure there does not throw and cause the caller to think the settings update failed. Settings are already persisted before this block.

---

## 5. Checklist Before Submit

- [x] No critical/major security or MV3 issues
- [x] No prompt or sensitive content stored
- [x] Permissions minimal and documented
- [x] CSP strict, no eval/inline scripts
- [x] Performance budgets and tests in place
- [x] Run `npm run build` and load unpacked in Chrome to confirm no console errors
- [x] Run `npm run test:unit` and `npm run test:e2e` (including performance) before packaging
- [ ] Confirm store listing, privacy policy URL, and screenshots per store requirements

---

## 6. Verdict

**Green light** for Chrome Web Store submission for the current build. Address the minor security/MV3 items in a follow-up release if desired; they are not required for approval.
