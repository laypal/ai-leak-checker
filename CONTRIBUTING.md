# Contributing to AI Leak Checker

Thank you for your interest in contributing to AI Leak Checker! This document
provides guidelines for contributing to the project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and
inclusive environment. Be kind, constructive, and professional in all
interactions.

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Chrome or Chromium browser (for testing)
- Python 3.10+ (optional, for property-based tests)

### Development Setup

```bash
# Clone the repository
git clone https://github.com/[your-username]/ai-leak-checker.git
cd ai-leak-checker

# Install dependencies
npm install

# Start development build (watches for changes)
npm run dev

# In Chrome, go to chrome://extensions
# Enable "Developer mode"
# Click "Load unpacked" and select the dist/ folder
```

### Running Tests

```bash
# Run all tests
npm test

# Unit tests only (fast)
npm run test:unit

# Unit tests in watch mode
npm run test:unit:watch

# Integration tests
npm run test:integration

# E2E tests (requires built extension)
npm run build
npm run test:e2e

# Property-based tests (requires Python)
cd tests/property
pip install -r requirements.txt
pytest -v
```

## How to Contribute

### Reporting Bugs

1. Check existing issues to avoid duplicates
2. Use the bug report template
3. Include:
   - Chrome version
   - Extension version
   - Steps to reproduce
   - Expected vs actual behavior
   - Console errors (if any)

### Suggesting Features

1. Check existing feature requests
2. Describe the use case and problem it solves
3. Consider privacy implications
4. Be specific about expected behavior

### Submitting Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Add/update tests for new functionality
5. Ensure all tests pass: `npm test`
6. Run linting: `npm run lint`
7. Update documentation if needed
8. Submit a pull request

#### PR Checklist

- [ ] Tests added/updated for changes
- [ ] All tests passing
- [ ] Linting passes (`npm run lint`)
- [ ] TypeScript compiles (`npm run typecheck`)
- [ ] Documentation updated (README, CLAUDE.md, docs/)
- [ ] No new npm dependencies (or justified if added)
- [ ] Privacy-preserving (no external data transmission)

## Code Guidelines

### TypeScript

- Use strict TypeScript - no `any` unless absolutely necessary
- Prefer interfaces over types for object shapes
- Use explicit return types for public functions
- Document non-obvious code with comments

### Testing

- Unit tests for all utility functions
- Integration tests for cross-component communication
- E2E tests for critical user flows
- Aim for 70%+ code coverage

### Security

- **Never log sensitive data**, even in development
- Validate all inputs from the page context
- Use `textContent` over `innerHTML` when displaying user data
- No `eval()`, `new Function()`, or dynamic script injection
- Minimal permissions in manifest

### Performance

- Target <50ms scan latency
- Use `quickCheck()` before full scans
- Debounce high-frequency operations
- Profile changes that affect content scripts

## Project Structure

```
ai-leak-checker/
├── src/
│   ├── shared/           # Shared code (detectors, types, utils)
│   │   ├── detectors/    # Pattern matching and detection engine
│   │   ├── types/        # TypeScript type definitions
│   │   └── utils/        # Utility functions (entropy, luhn, etc.)
│   ├── content/          # Content script (DOM interception)
│   ├── background/       # Service worker
│   ├── injected/         # Main-world script (fetch patching)
│   └── popup/            # Extension popup UI (Preact)
├── tests/
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   ├── e2e/              # Playwright E2E tests
│   ├── property/         # Python property-based tests
│   └── fixtures/         # Test data
├── docs/                 # Documentation
└── public/               # Static assets (manifest, icons)
```

## Adding New Detectors

1. Add pattern definition to `src/shared/detectors/patterns.ts`
2. Add detector type to `src/shared/types/detection.ts`
3. Update `scan()` in `src/shared/detectors/engine.ts`
4. Add test cases to `tests/fixtures/api_keys.json`
5. Add false positive cases to `tests/fixtures/false_positives.json`
6. Write unit tests in `tests/unit/`
7. Update documentation

### Pattern Guidelines

- Use conservative patterns to minimize false positives
- Include confidence scores based on pattern specificity
- Test against real-world examples (redacted)
- Consider context boosting/reduction

## Adding New Site Support

1. Add site config to `configs/selectors.json`
2. Add host permission to `public/manifest.json`
3. Test DOM selectors manually (use DevTools)
4. Add E2E test for the new site
5. Document in README

## Release Process

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create release PR
4. After merge, tag release: `git tag v1.2.3`
5. Build for production: `npm run build`
6. Create ZIP for Chrome Web Store: `npm run package`
7. Submit to Chrome Web Store

## Questions?

- Open a GitHub issue for bugs or features
- Start a discussion for general questions
- Check existing issues and discussions first

Thank you for contributing! 🛡️
