# Contributing to AI Leak Checker

Thank you for your interest in contributing to AI Leak Checker! This document provides guidelines for contributors, including human developers and AI agents.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Pull Request Process](#pull-request-process)
5. [Coding Standards](#coding-standards)
6. [Testing Requirements](#testing-requirements)
7. [Documentation](#documentation)
8. [AI Agent Guidelines](#ai-agent-guidelines)

---

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Assume good intentions
- Keep discussions on-topic

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Chrome/Chromium browser
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/laypal/ai-leak-checker.git
cd ai-leak-checker

# Install dependencies
npm install

# Build the extension
npm run build

# Run tests
npm run test
```

### Loading the Extension

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist/` directory

---

## Development Workflow

### Branch Naming

```
<type>/<short-description>

Types:
- feat/     New features
- fix/      Bug fixes
- docs/     Documentation
- test/     Test additions/changes
- refactor/ Code refactoring
- chore/    Build/tooling changes
- hotfix/   Emergency fixes

Examples:
- feat/gemini-support
- fix/chatgpt-selector-breakage
- docs/api-key-detection
- test/corpus-expansion
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]

Examples:
- feat(detectors): add AWS credentials detection
- fix(modal): prevent double submission on Enter key
- docs(readme): update installation instructions
- test(e2e): add Claude contenteditable tests
```

### Development Commands

```bash
# Start development build (watch mode)
npm run dev

# Run linter
npm run lint

# Fix lint errors automatically
npm run lint:fix

# Type check
npm run typecheck

# Run all tests
npm run test

# Run specific test type
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:corpus

# Build for production
npm run build

# Clean build artifacts
npm run clean
```

---

## Pull Request Process

### Before Opening a PR

- [ ] Create a feature branch from `main`
- [ ] Make focused, atomic commits
- [ ] Run `npm run lint && npm run typecheck`
- [ ] Run `npm run test`
- [ ] Update documentation if needed
- [ ] Update CHANGELOG.md

### PR Template

When opening a PR, include:

```markdown
## Summary
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to change)
- [ ] Documentation update
- [ ] Test addition/update

## Related Issues
Closes #123

## Testing Done
- [ ] Unit tests pass
- [ ] E2E tests pass (if applicable)
- [ ] Manual testing on ChatGPT
- [ ] Manual testing on Claude

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-reviewed code
- [ ] Added/updated tests
- [ ] Updated documentation
- [ ] No new warnings introduced
```

### Review Process

1. Open PR against `main`
2. Automated checks run (lint, typecheck, tests)
3. Request review from maintainer
4. Address feedback
5. Merge after approval

---

## Coding Standards

### File Structure

```
src/
├── background/           # Service worker
│   └── index.ts
├── content/             # Content scripts (DOM interception, window message handler)
│   ├── index.ts
│   └── modal.ts
├── injected/            # Main world scripts (fetch/XHR patching fallback)
│   └── index.ts
├── popup/               # Extension popup
│   ├── index.html
│   └── popup.tsx
└── shared/              # Shared code
    ├── detectors/
    │   ├── index.ts
    │   ├── engine.ts
    │   ├── patterns.ts
    │   └── pii.ts
    ├── types/
    │   ├── detection.ts
    │   ├── messages.ts
    │   └── ...
    └── utils/
        ├── entropy.ts
        ├── luhn.ts
        └── redact.ts
```

### File Size Limits

- **Maximum 400 lines** per file
- **Maximum 50 lines** per function
- If a file exceeds limits, refactor into smaller modules

### TypeScript Guidelines

```typescript
// ✅ Good: Explicit types for public interfaces
export interface DetectionFinding {
  type: DetectionType;
  start: number;
  end: number;
  confidence: number;
  redactedValue: string;
}

// ✅ Good: Type guards for runtime checking
function isValidFinding(obj: unknown): obj is DetectionFinding {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    'start' in obj &&
    'end' in obj
  );
}

// ❌ Bad: any type
function processData(data: any) { ... }

// ❌ Bad: Type assertion without validation
const finding = data as DetectionFinding;
```

### Security Rules

```typescript
// ❌ NEVER use eval or Function constructor
eval(userInput);                    // Prohibited
new Function('return ' + code)();   // Prohibited

// ❌ NEVER store prompt content
storage.set({ prompt: userText });  // Prohibited

// ✅ Store only aggregated statistics
storage.set({
  stats: {
    domain: 'chat.openai.com',
    detectionType: 'api_key',
    count: 1,
    timestamp: Date.now(),
  }
});
```

### Import Ordering

```typescript
// 1. Node built-ins (rarely used in extension)
import { readFile } from 'fs';

// 2. External packages
import { render } from 'preact';
import { signal } from '@preact/signals';

// 3. Internal absolute imports (using @ alias)
import { detect } from '@/shared/detectors';
import { Finding } from '@/shared/types';

// 4. Relative imports
import { Modal } from './modal';
import { styles } from './styles.css';
```

---

## Testing Requirements

### New Code Must Have Tests

| Code Type | Required Tests |
|-----------|----------------|
| Detection pattern | Unit test with 5+ positive, 5+ negative cases |
| Utility function | Unit test with edge cases |
| UI component | Integration test for key interactions |
| User journey | E2E test |

### Test File Location

```
src/shared/detectors/patterns.ts
→ tests/unit/detectors/patterns.test.ts

src/content/modal.ts
→ tests/integration/content/modal.test.ts

New platform integration
→ tests/e2e/{platform}.spec.ts
```

### Test Naming

```typescript
describe('FunctionOrComponent', () => {
  it('should_ExpectedBehavior_When_Condition', () => {
    // ...
  });
});

// Examples:
it('should_DetectOpenAIKey_When_SkProjPrefixPresent', () => {});
it('should_ReturnEmpty_When_InputIsEmptyString', () => {});
it('should_ShowModal_When_SensitiveDataDetected', () => {});
```

---

## Documentation

### JSDoc Requirements

Every exported function must have JSDoc:

```typescript
/**
 * Detects sensitive information in the provided text.
 *
 * @param text - The text to scan for sensitive data
 * @param options - Detection configuration options
 * @returns Array of findings, empty if nothing detected
 *
 * @example
 * ```typescript
 * const findings = detect('My API key is sk-proj-123...');
 * // Returns: [{ type: 'api_key_openai', ... }]
 * ```
 */
export function detect(text: string, options?: DetectOptions): Finding[] {
  // ...
}
```

### README Updates

Update README.md when:
- Adding new features
- Changing installation steps
- Adding dependencies
- Changing configuration

### CHANGELOG Updates

Add entry for every PR:

```markdown
## [Unreleased]

### Added
- Gemini support (#123)

### Fixed
- ChatGPT selector breakage (#124)

### Changed
- Improved entropy threshold (#125)
```

---

## AI Agent Guidelines

These guidelines help AI agents (Claude, Cursor, etc.) work effectively on this codebase.

### Before Making Changes

1. **Read relevant docs**: Check CLAUDE.md, TASK_ORDER_v2.md, and this file
2. **Understand the task**: Reference task number and requirements
3. **Check existing code**: Look for similar patterns in the codebase
4. **Review tests**: Understand expected behavior from existing tests

### Making Changes

1. **Small, focused changes**: One concern per commit
2. **Follow existing patterns**: Match code style of surrounding code
3. **Add tests first**: Write failing test, then implement
4. **Verify locally**: Run `npm run lint && npm run test`

### File Constraints

```
Maximum file length: 400 lines
Maximum function length: 50 lines
Maximum complexity: 10 (cyclomatic)
```

If a file is too long, suggest refactoring into separate modules.

### Task Completion Checklist

When completing a task from TASK_ORDER_v2.md:

- [ ] All acceptance criteria met (check boxes in task)
- [ ] Verification commands pass
- [ ] All files in checklist created/modified
- [ ] Unit tests added for new code
- [ ] E2E tests added (if applicable)
- [ ] Documentation updated
- [ ] No lint errors
- [ ] No type errors
- [ ] CHANGELOG updated

### Communication Style

```
✅ Good:
"I've implemented the API key detection for AWS credentials.
 Added 12 unit tests covering positive/negative cases.
 Entropy threshold set at 4.5 based on testing."

❌ Bad:
"Done! Let me know if you need anything else."
```

### Error Handling

When encountering issues:

1. **Explain the problem clearly**
2. **Show the error message**
3. **Suggest possible solutions**
4. **Ask for clarification if needed**

### Requesting Clarification

```
✅ Good:
"Task 5.2 requires ChatGPT E2E tests, but the selectors in
 configs/selectors.json may be outdated. Should I:
 1. Update selectors first and document changes?
 2. Create mock page for offline testing?
 3. Skip live site tests and use recorded fixtures?"

❌ Bad:
"I don't understand what to do."
```

---

## Questions?

- **GitHub Issues**: For bugs and feature requests
- **Discussions**: For questions and ideas
- **Email**: [maintainer email]

---

*Last updated: January 13, 2026*
