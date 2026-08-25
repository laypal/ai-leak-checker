[Back to Test Strategy index](index.md)

# 6. CI/CD Pipeline

## 6.1 Pipeline Stages

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:unit -- --coverage
      - uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run build
      - run: npm run test:e2e

  corpus-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:corpus
      - name: Check FP Rate
        run: |
          FP_RATE=$(npm run test:corpus --json | jq '.fpRate')
          if (( $(echo "$FP_RATE > 5" | bc -l) )); then
            echo "FP rate $FP_RATE exceeds 5% threshold"
            exit 1
          fi
```

## 6.2 Quality Gates

| Gate | Threshold | Blocks Merge |
|------|-----------|--------------|
| Unit test pass rate | 100% | Yes |
| E2E test pass rate | 100% | No (advisory) |
| Line coverage | 85% | Yes |
| FP corpus rate | < 5% | Yes |
| Lint errors | 0 | Yes |
| TypeScript errors | 0 | Yes |

**Note**: E2E tests run as an advisory quality gate that does not block merges but is reported as a quality metric. Failures are surfaced via status checks but do not prevent PR merges.
