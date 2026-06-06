---
name: update-selectors
description: Update DOM selectors for AI platform UI changes in configs/selectors.json. Use when selectors break due to UI updates, when adding new AI platforms, or when the user asks to update selectors for ChatGPT, Claude, or other chat platforms.
---

# Update Site Selectors

Update DOM selectors in `configs/selectors.json` when AI platforms change their UI structure. Selectors are brittle and break frequently.

## Workflow

1. **Inspect current DOM**
   - Open target AI platform (ChatGPT/Claude) in browser
   - Right-click textarea/input → Inspect Element
   - Identify stable selector attributes:
     - `data-*` attributes (most stable)
     - `data-testid` (if present)
     - Semantic attributes (`name`, `aria-label`)
     - Stable class names (avoid generated CSS classes)

2. **Update `configs/selectors.json`**
   
   Add new selectors to the **beginning** of arrays (most specific first):
   
   ```json
   {
     "sites": {
       "chat.openai.com": {
         "inputSelectors": [
           "textarea[data-id='new-selector']",  // NEW - most specific
           "#prompt-textarea",                  // Existing fallback
           "textarea[placeholder*='Message']"
         ],
         "submitSelectors": [
           "button[data-testid='new-send-button']",  // NEW
           "button[data-testid='send-button']"
         ]
       }
     }
   }
   ```

3. **Update version and notes**
   ```json
   {
     "lastUpdated": "2026-01-28T00:00:00Z",
     "sites": {
       "chat.openai.com": {
         "notes": "Updated for Jan 2026 UI refresh. data-id selectors preferred."
       }
     }
   }
   ```

4. **Validate selectors**
   ```bash
   npm run test:e2e -- tests/e2e/chatgpt.spec.ts
   ```

5. **Test selector stability**
   - Reload page 3 times
   - Navigate away and back
   - Confirm selector still matches

## Selector Best Practices

### ✅ Preferred (stable)
- `[data-testid='prompt']` - Test IDs (most stable)
- `textarea[name='prompt']` - Semantic attributes
- `.ProseMirror[contenteditable]` - Stable class + attribute combo
- `[data-id='root']` - Data attributes

### ❌ Avoid (brittle)
- `div:nth-child(3) > textarea` - Position-based (breaks on layout changes)
- `.css-abc123` - Generated CSS classes (change on rebuild)
- `#root div div textarea` - Deep hierarchies (fragile)
- `button:last-child` - Position-dependent

## Fallback Strategy

Selectors are arrays ordered by specificity. The extension tries each selector until one matches:

```json
{
  "inputSelectors": [
    "textarea[data-id='prompt-textarea']",  // Try first (most specific)
    "#prompt-textarea",                      // Fallback 1
    "textarea[placeholder*='Message']"       // Fallback 2 (broadest)
  ]
}
```

**Keep old selectors as fallbacks** - don't remove them unless confirmed broken.

## Site-Specific Notes

### ChatGPT (`chat.openai.com`)
- Uses `textarea` or `div[contenteditable]` depending on version
- Submit button has `data-testid` attributes
- DOM changes frequently - prefer data attributes

### Claude (`claude.ai`)
- Uses ProseMirror editor (`div.ProseMirror[contenteditable]`)
- No textarea - contenteditable divs only
- Submit button uses `aria-label` attributes

## Validation Checklist

- [ ] New selectors added to **beginning** of arrays
- [ ] Old selectors kept as fallbacks
- [ ] `lastUpdated` timestamp updated
- [ ] `notes` field updated with rationale
- [ ] E2E tests pass: `npm run test:e2e`
- [ ] Selector stable across 3+ page reloads
- [ ] Selector survives navigation

## Common Issues

**Selector matches but extension doesn't detect:**
- Check if selector matches in isolated world (content script context)
- Verify selector isn't inside shadow DOM
- Check for timing issues (element not loaded yet)

**Multiple elements match:**
- Make selector more specific (add parent context)
- Use `:first-of-type` or attribute filters

**Selector works in DevTools but not extension:**
- Content scripts run in isolated world - some selectors may not work
- Prefer `querySelector`-compatible selectors over XPath
