# 2. Investigation

[← Selector maintenance index](index.md)

## 2.1 Quick Diagnosis

```bash
# 1. Open the affected site in Chrome
# 2. Open DevTools (F12)
# 3. Run in Console:

// ChatGPT selectors
document.querySelector('[data-testid="prompt-textarea"]')
document.querySelector('button[data-testid="send-button"]')

// Claude selectors  
document.querySelector('[contenteditable="true"]')
document.querySelector('button[aria-label="Send message"]')

// If any return null, selector is broken
```

## 2.2 Identifying New Selectors

1. **Inspect the input element**:
   - Right-click on chat input → Inspect
   - Look for stable attributes: `data-testid`, `aria-*`, `role`
   - Avoid: dynamic classes, generated IDs

2. **Inspect the submit button**:
   - Right-click on send button → Inspect
   - Look for: `button[type="submit"]`, `aria-label`, `data-testid`

3. **Test selector stability**:
   ```javascript
   // In DevTools Console
   const selector = 'YOUR_NEW_SELECTOR';
   const el = document.querySelector(selector);
   console.log('Element found:', !!el);
   console.log('Element type:', el?.tagName);
   console.log('Element text:', el?.textContent?.slice(0, 50));
   ```

## 2.3 Common Selector Patterns

| Pattern | Stability | Example |
|---------|-----------|---------|
| `data-testid` | High | `[data-testid="chat-input"]` |
| `aria-label` | High | `[aria-label="Send message"]` |
| `role` + context | Medium | `div[role="textbox"]` |
| Semantic elements | Medium | `textarea`, `button[type="submit"]` |
| Class names | Low | `.css-1a2b3c` (avoid!) |
| Dynamic IDs | Very Low | `#input-12345` (never use!) |
