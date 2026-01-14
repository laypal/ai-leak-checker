# Selector Maintenance Runbook

> **Purpose**: Guide for updating and maintaining DOM selectors for AI chat platforms.
> **Audience**: Developers, on-call responders
> **Criticality**: HIGH - Selector breakage = extension non-functional

---

## Overview

AI chat platforms (ChatGPT, Claude, Gemini, etc.) frequently update their UI. When this happens, our DOM selectors may break, causing the extension to fail silently. This document provides procedures for:

1. Detecting selector breakage
2. Investigating selector failures
3. Updating selectors
4. Testing updates
5. Deploying fixes

---

## 1. Detection

### 1.1 Automated Health Checks

A GitHub Actions workflow runs daily to verify selectors:

```yaml
# .github/workflows/selector-health.yml
name: Selector Health Check
on:
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM UTC
  workflow_dispatch:  # Manual trigger

jobs:
  check-selectors:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install chromium
      - run: npm run build
      - run: npm run test:selector-health
      - name: Create Issue on Failure
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: '🚨 Selector Health Check Failed',
              body: 'Daily selector health check failed. Check workflow logs.',
              labels: ['selector-breakage', 'urgent']
            })
```

### 1.2 Manual Detection

Signs of selector breakage:
- Extension popup shows 0 intercepts on sites that were working
- Console errors: `Cannot find element matching selector...`
- User reports: "Extension does nothing on ChatGPT"

### 1.3 Monitoring Dashboard (Optional)

If telemetry is enabled, monitor:
- `extension_injection_success` rate
- `selector_match_failure` events
- Drop in daily active users on specific sites

---

## 2. Investigation

### 2.1 Quick Diagnosis

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

### 2.2 Identifying New Selectors

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

### 2.3 Common Selector Patterns

| Pattern | Stability | Example |
|---------|-----------|---------|
| `data-testid` | High | `[data-testid="chat-input"]` |
| `aria-label` | High | `[aria-label="Send message"]` |
| `role` + context | Medium | `div[role="textbox"]` |
| Semantic elements | Medium | `textarea`, `button[type="submit"]` |
| Class names | Low | `.css-1a2b3c` (avoid!) |
| Dynamic IDs | Very Low | `#input-12345` (never use!) |

---

## 3. Selector Configuration

### 3.1 Config File Location

```
configs/selectors.json
```

### 3.2 Schema

```typescript
interface SiteConfig {
  site: string;           // Domain (e.g., "chat.openai.com")
  version: string;        // Config version (semver)
  lastVerified: string;   // ISO date of last verification
  selectors: {
    input: SelectorChain;
    submit: SelectorChain;
    container?: SelectorChain;
  };
}

interface SelectorChain {
  primary: string;        // First try this selector
  fallback1: string;      // If primary fails, try this
  fallback2: string;      // Last resort
  type: 'textarea' | 'contenteditable' | 'input';
}
```

### 3.3 Example Configuration

```json
{
  "sites": [
    {
      "site": "chat.openai.com",
      "version": "2.1.0",
      "lastVerified": "2026-01-13",
      "selectors": {
        "input": {
          "primary": "[data-testid=\"prompt-textarea\"]",
          "fallback1": "textarea[placeholder*=\"Send a message\"]",
          "fallback2": "#prompt-textarea",
          "type": "textarea"
        },
        "submit": {
          "primary": "button[data-testid=\"send-button\"]",
          "fallback1": "button[aria-label=\"Send message\"]",
          "fallback2": "form button[type=\"submit\"]",
          "type": "button"
        },
        "container": {
          "primary": "[data-testid=\"chat-input-container\"]",
          "fallback1": "form[action*=\"conversation\"]",
          "fallback2": ".chat-input-wrapper",
          "type": "container"
        }
      }
    },
    {
      "site": "claude.ai",
      "version": "1.3.0",
      "lastVerified": "2026-01-13",
      "selectors": {
        "input": {
          "primary": "div[contenteditable=\"true\"][data-placeholder]",
          "fallback1": ".ProseMirror[contenteditable=\"true\"]",
          "fallback2": "[role=\"textbox\"][contenteditable]",
          "type": "contenteditable"
        },
        "submit": {
          "primary": "button[aria-label=\"Send message\"]",
          "fallback1": "button:has(svg[data-icon=\"send\"])",
          "fallback2": "button[type=\"button\"]:last-of-type",
          "type": "button"
        }
      }
    }
  ],
  "metadata": {
    "schemaVersion": "1.0.0",
    "lastUpdated": "2026-01-13T12:00:00Z",
    "updateURL": "https://cdn.example.com/selectors.json"
  }
}
```

---

## 4. Update Procedure

### 4.1 Standard Update (Non-Emergency)

```bash
# 1. Create branch
git checkout -b fix/selector-chatgpt-20260113

# 2. Update selectors.json
# Edit configs/selectors.json with new selectors

# 3. Update version and lastVerified
# Increment version, update date

# 4. Run selector tests
npm run test:selectors

# 5. Run E2E tests
npm run build
npm run test:e2e

# 6. Commit and push
git add configs/selectors.json
git commit -m "fix(selectors): update ChatGPT selectors for Jan 2026 UI"
git push origin fix/selector-chatgpt-20260113

# 7. Create PR with test evidence
```

### 4.2 Emergency Hotfix

If selectors break in production:

```bash
# 1. Verify breakage
npm run test:selector-health -- --site=chat.openai.com

# 2. Quick investigation
# Open DevTools on site, find working selectors

# 3. Update config
vim configs/selectors.json

# 4. Test locally
npm run build
# Load unpacked extension, verify on live site

# 5. Fast-track PR
git checkout -b hotfix/selector-chatgpt-emergency
git add configs/selectors.json
git commit -m "hotfix(selectors): emergency fix for ChatGPT UI change"
git push origin hotfix/selector-chatgpt-emergency

# 6. Request expedited review
# Tag maintainer, explain urgency

# 7. Deploy immediately after merge
```

### 4.3 Remote Config Update (Future Feature)

If remote selector config is enabled:

1. Update `cdn.example.com/selectors.json`
2. Extension fetches on startup (24h cache)
3. No extension update required

---

## 5. Testing

### 5.1 Unit Tests for Selector Logic

```typescript
// tests/unit/selectors/selector-chain.test.ts
import { describe, it, expect, vi } from 'vitest';
import { findElement } from '@/content/selector-chain';

describe('SelectorChain', () => {
  it('should use primary selector when available', () => {
    document.body.innerHTML = '<input data-testid="chat-input" />';
    
    const chain = {
      primary: '[data-testid="chat-input"]',
      fallback1: 'input.chat',
      fallback2: 'input',
    };
    
    const element = findElement(chain);
    expect(element).toBeTruthy();
    expect(element?.getAttribute('data-testid')).toBe('chat-input');
  });

  it('should fallback when primary fails', () => {
    document.body.innerHTML = '<input class="chat" />';
    
    const chain = {
      primary: '[data-testid="chat-input"]',  // Won't match
      fallback1: 'input.chat',                 // Will match
      fallback2: 'input',
    };
    
    const element = findElement(chain);
    expect(element).toBeTruthy();
    expect(element?.className).toBe('chat');
  });

  it('should return null when all selectors fail', () => {
    document.body.innerHTML = '<div>No inputs</div>';
    
    const chain = {
      primary: '[data-testid="chat-input"]',
      fallback1: 'input.chat',
      fallback2: 'input',
    };
    
    const element = findElement(chain);
    expect(element).toBeNull();
  });
});
```

### 5.2 E2E Selector Health Tests

```typescript
// tests/e2e/selector-health.spec.ts
import { test, expect } from '@playwright/test';
import selectors from '../../configs/selectors.json';

for (const site of selectors.sites) {
  test.describe(`${site.site} Selectors`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`https://${site.site}`);
      // Wait for page to stabilize
      await page.waitForLoadState('networkidle');
    });

    test('input selector chain works', async ({ page }) => {
      const input = await page.locator(site.selectors.input.primary)
        .or(page.locator(site.selectors.input.fallback1))
        .or(page.locator(site.selectors.input.fallback2))
        .first();
      
      await expect(input).toBeVisible({ timeout: 10000 });
    });

    test('submit selector chain works', async ({ page }) => {
      const submit = await page.locator(site.selectors.submit.primary)
        .or(page.locator(site.selectors.submit.fallback1))
        .or(page.locator(site.selectors.submit.fallback2))
        .first();
      
      await expect(submit).toBeAttached({ timeout: 10000 });
    });
  });
}
```

### 5.3 Manual Testing Checklist

Before merging selector updates:

- [ ] Primary selector matches on live site
- [ ] Fallback1 matches if primary removed
- [ ] Fallback2 matches if primary and fallback1 removed
- [ ] Extension intercepts paste of API key
- [ ] Modal appears correctly
- [ ] "Mask & Continue" works
- [ ] No console errors
- [ ] Works in both logged-in and logged-out states
- [ ] Works after page refresh
- [ ] Works after navigation within site

---

## 6. Monitoring & Alerting

### 6.1 Slack/Discord Alerts

Configure webhook for immediate notification:

```yaml
# In selector-health workflow
- name: Notify on Failure
  if: failure()
  run: |
    curl -X POST "$SLACK_WEBHOOK_URL" \
      -H 'Content-Type: application/json' \
      -d '{
        "text": "🚨 Selector Health Check Failed",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*Selector breakage detected!*\n<${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View Workflow>"
            }
          }
        ]
      }'
```

### 6.2 PagerDuty Integration (Optional)

For production incidents, trigger PagerDuty:

```yaml
- name: Trigger PagerDuty
  if: failure()
  run: |
    curl -X POST "https://events.pagerduty.com/v2/enqueue" \
      -H 'Content-Type: application/json' \
      -d '{
        "routing_key": "${{ secrets.PAGERDUTY_ROUTING_KEY }}",
        "event_action": "trigger",
        "payload": {
          "summary": "AI Leak Checker selector breakage",
          "severity": "critical",
          "source": "GitHub Actions"
        }
      }'
```

---

## 7. Troubleshooting

### 7.1 Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| All selectors null | Site redesign | Full selector audit needed |
| Intermittent failures | Dynamic loading | Add wait/retry logic |
| Works locally, fails in CI | Auth required | Use mock page or login fixture |
| Multiple elements found | Ambiguous selector | Make selector more specific |

### 7.2 Debug Commands

```javascript
// Run in DevTools Console

// List all potential input elements
document.querySelectorAll('textarea, [contenteditable], input[type="text"]')
  .forEach((el, i) => console.log(i, el.tagName, el.className, el.id));

// Test selector performance
const start = performance.now();
for (let i = 0; i < 1000; i++) {
  document.querySelector('[data-testid="prompt-textarea"]');
}
console.log(`1000 queries took ${performance.now() - start}ms`);

// Find elements with stable attributes
document.querySelectorAll('[data-testid]')
  .forEach(el => console.log(el.tagName, el.getAttribute('data-testid')));
```

### 7.3 Escalation Path

1. **Level 1**: On-call developer
   - Diagnose issue
   - Apply fallback selectors
   - Update config

2. **Level 2**: Core maintainer
   - Refactor selector logic
   - Add new platform support
   - Architecture decisions

3. **Level 3**: External escalation
   - Report to platform (if API available)
   - Community notification
   - Rollback if unresolvable

---

## 8. Appendix

### 8.1 Selector Stability Heuristics

Score your selectors (higher = more stable):

| Criterion | Points |
|-----------|--------|
| Uses `data-testid` | +3 |
| Uses `aria-*` attribute | +2 |
| Uses semantic element (`textarea`, `button`) | +2 |
| Uses `role` attribute | +1 |
| Contains text content matcher | +1 |
| Uses class name | -2 |
| Uses dynamically generated ID | -3 |
| Relies on DOM position (`:nth-child`) | -2 |

**Target**: 3+ points per selector

### 8.2 Platform-Specific Notes

#### ChatGPT
- Frequent A/B testing = selector variation
- Check for `/backend-api` in network tab
- Uses React with predictable `data-testid` pattern

#### Claude
- ProseMirror contenteditable editor
- Anthropic ships frequent UI updates
- Selectors more stable than ChatGPT

#### Gemini
- Material Design components
- Check for `mat-*` classes
- Google changes UI less frequently

---

*Last updated: January 15, 2026*
