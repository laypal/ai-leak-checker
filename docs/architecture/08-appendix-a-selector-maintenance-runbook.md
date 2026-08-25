# Appendix A: Selector Maintenance Runbook

[Back to index](index.md)


## A.1 Monitoring

```bash
# Daily selector health check script
npx playwright test tests/e2e/selector-health.spec.ts

# Output: Pass/Fail for each supported site
```

## A.2 Emergency Selector Fix

1. Identify broken selector via test failure
2. Inspect current site DOM structure
3. Update `configs/selectors.json`
4. Run local test to verify
5. Push to CDN (if remote config enabled)
6. Extension fetches update on next launch

## A.3 Selector Fallback Chain

```typescript
// Try selectors in order until one works
const findElement = (selectors: string[]): HTMLElement | null => {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) return el as HTMLElement;
  }
  return null;
};
```
