[Back to Test Strategy index](index.md)

# 3. Coverage Targets

## 3.1 Line Coverage Requirements

| Component | Target | Rationale |
|-----------|--------|-----------|
| `src/shared/detectors/` | **95%** | Core value proposition - must be bulletproof |
| `src/shared/utils/` | **90%** | Shared utilities affect all components |
| `src/content/` | **80%** | DOM interactions harder to unit test |
| `src/popup/` | **70%** | UI components tested primarily via E2E |
| `src/background/` | **85%** | Service worker logic critical for state |
| **Overall** | **85%** | Weighted average across all source |

## 3.2 Coverage Gates

Coverage is enforced in CI. PRs failing these gates cannot merge:

```json
{
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 85,
      "lines": 85,
      "statements": 85
    },
    "src/shared/detectors/": {
      "lines": 95
    }
  }
}
```
