# 7. Troubleshooting

[← Selector maintenance index](index.md)

## 7.1 Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| All selectors null | Site redesign | Full selector audit needed |
| Intermittent failures | Dynamic loading | Add wait/retry logic |
| Works locally, fails in CI | Auth required | Use mock page or login fixture |
| Multiple elements found | Ambiguous selector | Make selector more specific |

## 7.2 Debug Commands

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

## 7.3 Escalation Path

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
