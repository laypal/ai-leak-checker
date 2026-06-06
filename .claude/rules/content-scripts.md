---
description: Content script patterns for DOM interception, event handling, and UI injection.
globs:
  - src/content/**/*.ts
  - src/injected/**/*.ts
alwaysApply: false
---

# Content Scripts & DOM Interception

## MV3 Constraints

### Cannot Use Network Interception

```typescript
// ❌ NOT AVAILABLE in MV3 for Web Store extensions
chrome.webRequest.onBeforeRequest.addListener(
  (details) => { /* inspect body */ },
  { urls: ['*://chat.openai.com/*'] },
  ['blocking', 'requestBody']
);
```

### Must Use DOM Interception

Two approaches (use both for resilience):

1. **DOM Event Listeners** - Capture submit events
2. **Fetch Monkey-Patching** - Override `window.fetch` in main world

## DOM Event Interception

```typescript
// Listen on capture phase for early interception
document.addEventListener('submit', handleSubmit, { capture: true });
document.addEventListener('keydown', handleKeydown, { capture: true });

function handleSubmit(event: Event): void {
  const target = event.target as HTMLElement;
  if (!isTargetTextarea(target)) return;
  
  const text = getTextareaContent(target);
  const result = engine.scan(text);
  
  if (result.hasSensitiveData) {
    event.preventDefault();
    event.stopPropagation();
    showWarningModal(result);
  }
}
```

## Fetch Monkey-Patching (Main World)

```typescript
// Injected into page's main world
const originalFetch = window.fetch;

window.fetch = async function(input: RequestInfo, init?: RequestInit) {
  const body = init?.body;
  
  if (body && isAIChatEndpoint(input)) {
    const text = extractPromptFromBody(body);
    const hasRisk = await checkForSensitiveData(text);
    
    if (hasRisk) {
      return Promise.reject(new Error('Blocked by AI Leak Checker'));
    }
  }
  
  return originalFetch.call(this, input, init);
};
```

## Selector Strategy

### Expect Selectors to Break

AI platforms change their UI frequently. Design for failure:

```typescript
// ✅ Correct - fallback chain
const TEXTAREA_SELECTORS = [
  '#prompt-textarea',                    // Current
  '[data-testid="prompt-textarea"]',     // Test ID
  'textarea[placeholder*="Message"]',    // Fallback
  'div[contenteditable="true"]',         // Generic
];

function findTextarea(): HTMLElement | null {
  for (const selector of TEXTAREA_SELECTORS) {
    const el = document.querySelector(selector);
    if (el) return el as HTMLElement;
  }
  return null;
}
```

### Remote Selector Updates

```typescript
// Fetch updated selectors without extension update
async function getSelectors(domain: string): Promise<string[]> {
  try {
    const remote = await fetch(`${CONFIG_CDN}/selectors/${domain}.json`);
    if (remote.ok) return (await remote.json()).selectors;
  } catch {
    // Fall through to bundled
  }
  return BUNDLED_SELECTORS[domain] ?? DEFAULT_SELECTORS;
}
```

## Shadow DOM UI

Isolate extension UI from page styles:

```typescript
class WarningModal {
  private shadow: ShadowRoot;

  constructor() {
    const host = document.createElement('div');
    host.id = 'ai-leak-checker-modal';
    this.shadow = host.attachShadow({ mode: 'closed' });
    document.body.appendChild(host);
  }

  // Build via DOM APIs + textContent — never innerHTML with finding data
  // (see the security rule: no innerHTML with non-constant content).
  show(result: DetectionResult): void {
    const style = document.createElement('style');
    style.textContent = this.getStyles();

    const modal = document.createElement('div');
    modal.className = 'modal';

    const heading = document.createElement('h2');
    heading.textContent = '⚠️ Sensitive Data Detected';

    const list = document.createElement('ul');
    for (const f of result.findings) {
      const li = document.createElement('li');
      li.textContent = f.type; // textContent, not innerHTML
      list.appendChild(li);
    }

    const maskBtn = document.createElement('button');
    maskBtn.id = 'mask-btn';
    maskBtn.textContent = 'Mask & Continue';

    const cancelBtn = document.createElement('button');
    cancelBtn.id = 'cancel-btn';
    cancelBtn.textContent = 'Cancel';

    modal.append(heading, list, maskBtn, cancelBtn);
    this.shadow.replaceChildren(style, modal);
    this.attachHandlers();
  }
}
```

## MutationObserver Pattern

Watch for dynamically loaded textareas:

```typescript
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node instanceof HTMLElement) {
        const textarea = node.matches('textarea') 
          ? node 
          : node.querySelector('textarea');
        if (textarea) attachInterceptor(textarea);
      }
    }
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});
```

## Communication with Service Worker

```typescript
// Content script → Service worker
async function sendToBackground(message: Message): Promise<Response> {
  return chrome.runtime.sendMessage(message);
}

// Service worker → Content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SETTINGS_UPDATED') {
    reloadSettings(message.payload);
  }
  return true; // Keep channel open for async
});
```
