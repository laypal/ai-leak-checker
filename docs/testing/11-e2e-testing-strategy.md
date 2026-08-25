[Back to Test Strategy index](index.md)

# 11. E2E Testing Strategy

## 11.1 Overview

E2E tests use Playwright to load the extension in Chrome and verify behavior on real AI chat sites. Tests are isolated in a separate CI job due to long wait times (32s per conditional injection test). Total suite runs in ~3.2 minutes with 6 conditional injection tests (32s per test, workers: 1).

## 11.2 Test Structure

- **Location**: `tests/e2e/`
- **Framework**: Playwright
- **Browser**: Chromium (Chrome extension testing)
- **Timeout**: 60s per test (configurable in `playwright.config.ts`)

## 11.3 Test Categories

1. **Extension Loading**: Verify extension loads and initializes correctly
2. **Platform Integration**: Test detection on ChatGPT and Claude
3. **Conditional Injection**: Verify fallback activation logic (32s waits)
4. **Modal UI**: Test warning modal behavior
5. **False Positives**: Verify known false positive cases don't trigger
6. **Performance**: Measure detection latency

## 11.4 CI Integration

E2E tests run in separate GitHub Actions job (`e2e`) that:
- Runs after unit/integration tests pass (`needs: test`)
- Has 15-minute timeout to accommodate 32s waits
- Uploads test reports and videos on failure
- Does not block main CI pipeline (advisory quality gate)
- Failures are reported as status checks but do not prevent PR merges

## 11.5 Test Timing

**Conditional Injection Tests**:
- Wait 32 seconds (30s health check + 2s buffer)
- Verify `__aiLeakCheckerInjected` marker state
- Test both success (no injection) and failure (injection) paths

**Why 32s?**
- Health check runs at 30s (after retry window ends)
- 2s buffer accounts for setTimeout precision and test execution

## 11.6 Parallelization

- **Current**: Single worker (`workers: 1` in `playwright.config.ts`)
- **Reason**: Extension state is shared; parallel tests can interfere
- **Future**: Consider test sharding if suite grows >20 tests

## 11.7 Mock Pages

Tests use `createMockAIPageHTML()` helper to create pages with/without selectors:
- Allows testing selector failure scenarios without modifying real sites
- Ensures consistent test environment
- Faster than loading real ChatGPT/Claude pages

## 11.8 Debugging Failed Tests

1. Check `playwright-report/` for HTML report
2. Review videos in `test-results/` (uploaded on failure)
3. Check console logs in test output
4. Verify extension loaded correctly (`ExtensionHelper.waitForLoad()`)
