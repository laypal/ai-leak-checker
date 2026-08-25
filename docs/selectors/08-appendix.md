# 8. Appendix

[← Selector maintenance index](index.md)

## 8.1 Selector Stability Heuristics

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

## 8.2 Platform-Specific Notes

### ChatGPT
- Frequent A/B testing = selector variation
- Check for `/backend-api` in network tab
- Uses React with predictable `data-testid` pattern

### Claude
- ProseMirror contenteditable editor
- Anthropic ships frequent UI updates
- Selectors more stable than ChatGPT

### Gemini
- Material Design components
- Check for `mat-*` classes
- Google changes UI less frequently

---

*Last updated: January 15, 2026*
