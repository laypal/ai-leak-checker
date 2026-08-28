[Back to Test Strategy index](index.md)

# 10. Appendix: Commands Reference

```bash
# Run all tests
npm run test

# Unit tests only
npm run test:unit

# Unit tests with coverage
npm run test:unit -- --coverage

# Unit tests in watch mode
npm run test:unit -- --watch

# Integration tests
npm run test:integration

# E2E tests (requires built extension)
npm run build && npm run test:e2e

# E2E tests with UI
npm run test:e2e -- --headed

# E2E specific browser
npm run test:e2e -- --project=chromium

# Corpus tests
npm run test:corpus

# All tests with verbose output
npm run test -- --reporter=verbose
```
