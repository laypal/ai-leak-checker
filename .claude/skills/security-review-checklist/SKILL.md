---
name: security-review-checklist
description: Run security and privacy checks before committing Chrome extension code. Use when reviewing PRs, before commits, or when the user asks for a security review.
---

# Security Review Checklist

Run through this checklist before committing or merging. Report any failures with concrete locations and fixes.

## 1. Privacy Audit

- [ ] No prompt content stored in `chrome.storage`
- [ ] No network requests without user consent
- [ ] No telemetry/analytics endpoints
- [ ] No third-party scripts in `manifest.json`
- [ ] Content Security Policy is restrictive

## 2. Permission Audit

Check `permissions` and `host_permissions` in manifest (e.g. `public/manifest.json`):

```bash
rg -A 20 '"permissions"' manifest.json public/manifest.json 2>/dev/null || true
rg -A 20 '"host_permissions"' manifest.json public/manifest.json 2>/dev/null || true
```

**Allow:** `storage` (user settings), `activeTab` (current tab only), specific host_permissions (e.g. `https://chat.openai.com/*`).

**Reject:** `<all_urls>`, broad `tabs` (access to all tabs).

## 3. Injection Attack Prevention

- [ ] No `eval(...)` or `new Function(...)` with user or external input

```typescript
// ❌ FORBIDDEN
eval(userInput);
new Function(userInput)();

// ✅ Use safe alternatives (e.g. JSON.parse with try/catch)
```

## 4. XSS Prevention

- [ ] No `innerHTML = userInput` or similar raw DOM injection of untrusted data

```typescript
// ❌ Avoid
element.innerHTML = userInput;

// ✅ Prefer textContent or sanitize
element.textContent = userInput;
// OR
element.innerHTML = DOMPurify.sanitize(userInput);
```

## 5. Message Validation

- [ ] Extension message listeners validate sender and message shape

```typescript
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!sender.id || sender.id !== chrome.runtime.id) return false;
  if (!isValidMessage(msg)) {
    console.error('[AI Leak Checker] Invalid message format');
    return false;
  }
  // handle...
});
```

## 6. Secrets Check

Before committing, scan staged changes for accidental secrets:

```bash
git diff --cached | rg -i -E "(sk-[a-zA-Z0-9]{32,}|api[_-]?key|password|secret)" || true
```

If matches found: unstage, remove secrets, then re-add.

## Code Review Questions

When reviewing changes, answer:

1. Could this code leak prompt content?
2. Does this make network requests? Are they user-initiated?
3. Are permissions minimal for this feature?
4. Is user input sanitized before DOM insertion?
5. Are `chrome.storage` writes necessary?

---

For project-specific security rules, see `.claude/rules/security.md`.
