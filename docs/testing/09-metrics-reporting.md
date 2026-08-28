[Back to Test Strategy index](index.md)

# 9. Metrics & Reporting

## 9.1 Key Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Test execution time | < 5 min | CI pipeline duration |
| Flaky test rate | < 1% | Failed tests that pass on retry |
| Coverage delta | >= 0% | New code coverage |
| FP rate | < 5% | Corpus test results |
| TP rate | > 95% | Corpus test results |

## 9.2 Reporting

- **Codecov**: Line coverage visualization
- **GitHub Actions**: Test results in PR checks
- **Weekly report**: FP rate trends, coverage changes
