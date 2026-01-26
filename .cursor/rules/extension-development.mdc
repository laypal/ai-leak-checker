---
description: Chrome Extension Manifest V3 development patterns, APIs, and common pitfalls. Use when working on manifest, background scripts, or extension-specific code.
globs:
  - "**/manifest.json"
  - "**/background/**/*.ts"
  - "**/content/**/*.ts"
  - "**/injected/**/*.ts"
alwaysApply: false
# Note: This rule is manually applied when working on extension-specific code (manifest, background, content scripts).
# The globs above match common extension files but alwaysApply is false to avoid auto-applying to all TypeScript files.
---

# Chrome Extension (MV3) Development

## Manifest V3 Key Differences

| Feature | MV2 | MV3 |
|---------|-----|-----|
| Background | Persistent page | Service worker |
| Network blocking | `webRequestBlocking` | `declarativeNetRequest` (no body) |
| Remote code | Allowed | Forbidden |
| Host permissions | In `permissions` | Separate `host_permissions` |

## Service Worker Lifecycle

```typescript
// Service workers are ephemeral - don't rely on global state
// ❌ Wrong
let globalState = {};

// ✅ Correct - use storage
chrome.storage.local.get('state', ({ state }) => {
  // Use state
});
```

## Message Passing

### Content Script ↔ Service Worker

```typescript
// content.ts
const response = await chrome.runtime.sendMessage({
  type: 'SCAN_REQUEST',
  payload: { text }
});

// background.ts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SCAN_REQUEST') {
    const result = scan(message.payload.text);
    sendResponse({ type: 'SCAN_RESULT', payload: result });
  }
  return true; // Required for async sendResponse
});
```

### Popup ↔ Service Worker

```typescript
// popup.tsx
const response = await chrome.runtime.sendMessage({ type: 'GET_STATS' });

// background.ts - same pattern as content script
```

## Storage APIs

```typescript
// Local storage (per-device)
await chrome.storage.local.set({ settings });
const { settings } = await chrome.storage.local.get('settings');

// Sync storage (across devices, 100KB limit)
await chrome.storage.sync.set({ preferences });

// Session storage (cleared on browser restart)
await chrome.storage.session.set({ tempData });
```

## Badge Updates

```typescript
// Update extension icon badge
function updateBadge(count: number): void {
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
  chrome.action.setBadgeBackgroundColor({ 
    color: count > 0 ? '#dc2626' : '#16a34a' 
  });
}
```

## Content Script Injection

```json
// manifest.json - declarative
{
  "content_scripts": [{
    "matches": ["https://chat.openai.com/*"],
    "js": ["content/index.js"],
    "run_at": "document_idle"
  }]
}
```

```typescript
// Programmatic injection
await chrome.scripting.executeScript({
  target: { tabId },
  files: ['content/index.js'],
  world: 'ISOLATED', // or 'MAIN' for fetch patching
});
```

## Main World Injection

For monkey-patching `fetch`:

```typescript
// content.ts - inject into main world
const script = document.createElement('script');
script.src = chrome.runtime.getURL('injected/index.js');
(document.head || document.documentElement).appendChild(script);
script.onload = () => script.remove();
```

```json
// manifest.json - expose to web
{
  "web_accessible_resources": [{
    "resources": ["injected/index.js"],
    "matches": ["https://chat.openai.com/*"]
  }]
}
```

## Common Pitfalls

### Service Worker Wake-up

```typescript
// ❌ Wrong - alarm might not fire if SW is asleep
setTimeout(() => doSomething(), 60000);

// ✅ Correct - use alarms API
chrome.alarms.create('cleanup', { delayInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cleanup') doSomething();
});
```

### Popup Communication

```typescript
// ❌ Wrong - popup might close before response
sendMessage().then(handleResponse);

// ✅ Correct - handle popup closing
sendMessage()
  .then(handleResponse)
  .catch(() => {/* Popup closed */});
```

### Permission Errors

```typescript
// Always check for permission errors
try {
  await chrome.storage.local.set({ data });
} catch (error) {
  if (error.message.includes('QUOTA_EXCEEDED')) {
    // Handle storage quota
  }
}
```

## Debugging

```bash
# Load unpacked extension
chrome://extensions → Developer mode → Load unpacked → dist/

# Service worker logs
chrome://extensions → Details → Inspect service worker

# Content script logs  
Regular DevTools console (F12) on the page
```
