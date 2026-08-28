# Test Strategy - AI Leak Checker

> **Document Purpose**: Define comprehensive testing approach, coverage targets, and quality gates.
> **Version**: 1.0.0 | **Last Updated**: 2026-01-15
> **Owner**: QA/Development Team

---

# 1. Overview

This document defines the testing strategy for the AI Leak Checker browser extension. Our approach prioritizes:

1. **Detection accuracy** - Core value proposition must be reliable
2. **User experience** - Modal interactions must be smooth
3. **Platform stability** - Extension must not break target sites
4. **Privacy compliance** - No data leaks from the leak checker itself

---

## Sections

Split from `docs/TEST_STRATEGY.md` on 2026-08-25, one file per top-level section.

| Section | What it covers |
| --- | --- |
| [2. Test Pyramid](02-test-pyramid.md) | Unit / integration / E2E split and why |
| [3. Coverage Targets](03-coverage-targets.md) | Line-coverage targets per directory and the CI coverage gate |
| [4. Test Types & Frameworks](04-test-types-frameworks.md) | Unit, integration, E2E and property tests: frameworks, layout, examples |
| [5. Corpus Testing](05-corpus-testing.md) | False-positive and true-positive corpora and the corpus runner |
| [6. CI/CD Pipeline](06-ci-cd-pipeline.md) | GitHub Actions stages and merge-blocking quality gates |
| [7. Test Data Management](07-test-data-management.md) | Fake-key rules and fixtures layout |
| [8. Testing Best Practices](08-testing-best-practices.md) | Naming, arrange-act-assert, isolation |
| [9. Metrics & Reporting](09-metrics-reporting.md) | Key metrics table and where results are reported |
| [10. Appendix: Commands Reference](10-appendix-commands-reference.md) | Every npm test command in one place |
| [11. E2E Testing Strategy](11-e2e-testing-strategy.md) | Playwright suite: structure, categories, 32s timing, CI job, debugging |

---

*End of Test Strategy Document*
