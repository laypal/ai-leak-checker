# AI Leak Checker - Task Order & Implementation Roadmap

> **Document Purpose**: Detailed, ordered task breakdown for MVP implementation.
> **Version**: 1.0.0 | **Last Updated**: 2026-01-07

---

## Phase 0: Project Setup (Days 1-2)

### Task 0.1: Repository Initialization
**Estimate**: 2 hours | **Priority**: P0

```bash
# Tasks
- [ ] Initialize Git repository
- [ ] Create .gitignore (node_modules, dist, .env)
- [ ] Initialize npm project
- [ ] Configure TypeScript (tsconfig.json)
- [ ] Configure ESLint + Prettier
- [ ] Set up Vite for extension bundling
- [ ] Create base directory structure
```

**Acceptance Criteria**:
- `npm run build` produces valid MV3 extension
- `npm run lint` runs without errors
- TypeScript strict mode enabled

**Tests**: N/A (infrastructure)

---

### Task 0.2: Manifest V3 Scaffold
**Estimate**: 2 hours | **Priority**: P0

**Deliverables**:
- `manifest.json` with minimal permissions
- Background service worker stub
- Content script stub
- Popup HTML + basic React mount

**manifest.json**:
```json
{
  "manifest_version": 3,
  "name": "AI Leak Checker",
  "version": "0.1.0",
  "description": "Prevent accidental data leaks to AI chat platforms",
  "permissions": ["storage"],
  "host_permissions": [
    "https://chat.openai.com/*",
    "https://claude.ai/*"
  ],
  "background": {
    "service_worker": "background/index.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["https://chat.openai.com/*", "https://claude.ai/*"],
      "js": ["content/index.js"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup/index.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

**Acceptance Criteria**:
- Extension loads in Chrome without errors
- Popup opens and displays content
- Console logs appear from content script on target sites

**Tests**: Manual verification

---

### Task 0.3: Testing Infrastructure
**Estimate**: 3 hours | **Priority**: P0

```bash
# Setup
- [ ] Install Vitest for unit tests
- [ ] Install Playwright for E2E tests
- [ ] Install Hypothesis (Python) for property tests
- [ ] Configure test directories
- [ ] Create test utilities and mocks
- [ ] Set up CI workflow (GitHub Actions)
```

**Config Files**:
- `vitest.config.ts`
- `playwright.config.ts`
- `pytest.ini` (for Hypothesis tests)

**Acceptance Criteria**:
- `npm run test:unit` runs successfully
- `npm run test:e2e` runs with extension loaded
- CI pipeline passes on push

---

## Phase 1: Detection Engine (Days 3-7)

### Task 1.1: Core Types Definition
**Estimate**: 2 hours | **Priority**: P0

**File**: `src/shared/types/detection.ts`

```typescript
// Define all detection-related types
export type DetectorType = 
  | 'api_key_openai'
  | 'api_key_aws'
  | 'api_key_github'
  | 'api_key_stripe'
  | 'api_key_slack'
  | 'api_key_generic'
  | 'credit_card'
  | 'email'
  | 'phone_uk'
  | 'nino'
  | 'high_entropy';

export interface Finding {
  type: DetectorType;
  value: string;
  maskedValue: string;
  position: [start: number, end: number];
  confidence: number;
  context: string;
}

export interface DetectionResult {
  hasRisk: boolean;
  findings: Finding[];
  overallConfidence: 'low' | 'medium' | 'high';
  scannedLength: number;
  scanDurationMs: number;
}

export interface ScanOptions {
  enabledDetectors?: DetectorType[];
  sensitivity?: 'low' | 'medium' | 'high';
  maxFindings?: number;
}
```

**Acceptance Criteria**:
- Types compile without errors
- Types are exported and importable

**Tests**: TypeScript compilation

---

### Task 1.2: Pattern Definitions
**Estimate**: 3 hours | **Priority**: P0

**File**: `src/shared/detectors/patterns.ts`

**Deliverables**:
- API key regex patterns (OpenAI, AWS, GitHub, Stripe, Slack)
- PII patterns (UK-focused: phone, NINO, postcode)
- Credit card base pattern
- Context keyword lists

**Unit Tests** (`tests/unit/patterns.test.ts`):
```typescript
describe('API Key Patterns', () => {
  test.each([
    ['sk-1234567890abcdefghij', 'api_key_openai'],
    ['AKIAIOSFODNN7EXAMPLE', 'api_key_aws'],
    ['ghp_1234567890abcdefghijklmnopqrstuvwxyz', 'api_key_github'],
  ])('detects %s as %s', (input, expected) => {
    const result = matchPatterns(input);
    expect(result).toContainEqual(expect.objectContaining({ type: expected }));
  });
});

describe('False Positive Resistance', () => {
  test.each([
    'uuid: 550e8400-e29b-41d4-a716-446655440000',
    'commit: a1b2c3d4e5f6789012345678901234567890abcd',
    'color: #1a2b3c4d5e6f',
  ])('does not flag: %s', (input) => {
    const result = matchPatterns(input);
    expect(result.findings).toHaveLength(0);
  });
});
```

**Property Tests** (`tests/property/patterns_test.py`):
```python
from hypothesis import given, strategies as st
import re

OPENAI_PATTERN = re.compile(r'sk-[a-zA-Z0-9]{20,}')

@given(st.from_regex(r'sk-[a-zA-Z0-9]{20,50}', fullmatch=True))
def test_openai_pattern_matches_valid_keys(key):
    assert OPENAI_PATTERN.match(key) is not None

@given(st.text(alphabet='0123456789', min_size=16, max_size=16))
def test_no_false_positive_on_numeric_strings(text):
    # Should not match API key patterns
    assert OPENAI_PATTERN.match(text) is None
```

---

### Task 1.3: Entropy Calculator
**Estimate**: 2 hours | **Priority**: P0

**File**: `src/shared/detectors/entropy.ts`

```typescript
/**
 * Calculate Shannon entropy of a string
 * Used to detect high-randomness strings (potential secrets)
 */
export function calculateEntropy(text: string): number {
  if (text.length === 0) return 0;
  
  const freq = new Map<string, number>();
  for (const char of text) {
    freq.set(char, (freq.get(char) || 0) + 1);
  }
  
  let entropy = 0;
  const len = text.length;
  for (const count of freq.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  
  return entropy;
}

/**
 * Detect high-entropy segments in text
 */
export function findHighEntropySegments(
  text: string,
  options: { minLength: number; threshold: number; windowSize: number }
): Array<{ start: number; end: number; entropy: number }> {
  // Sliding window approach
}
```

**Unit Tests**:
```typescript
describe('calculateEntropy', () => {
  test('returns 0 for empty string', () => {
    expect(calculateEntropy('')).toBe(0);
  });

  test('returns 0 for single character repeated', () => {
    expect(calculateEntropy('aaaaaaaaaa')).toBe(0);
  });

  test('returns ~1 for two equally distributed characters', () => {
    expect(calculateEntropy('abababab')).toBeCloseTo(1, 5);
  });

  test('returns high value for random-looking string', () => {
    expect(calculateEntropy('aB3$kL9@mN2!')).toBeGreaterThan(3.5);
  });
});
```

**Property Tests**:
```python
@given(st.text(min_size=1))
def test_entropy_is_non_negative(text):
    entropy = calculate_entropy(text)
    assert entropy >= 0

@given(st.text(min_size=1))
def test_entropy_bounded_by_log_alphabet(text):
    entropy = calculate_entropy(text)
    unique_chars = len(set(text))
    max_entropy = math.log2(unique_chars) if unique_chars > 1 else 0
    assert entropy <= max_entropy + 0.001  # floating point tolerance
```

---

### Task 1.4: Luhn Validator
**Estimate**: 1 hour | **Priority**: P0

**File**: `src/shared/detectors/luhn.ts`

```typescript
/**
 * Validate credit card number using Luhn algorithm
 */
export function validateLuhn(digits: string): boolean {
  const cleaned = digits.replace(/\D/g, '');
  if (cleaned.length < 13 || cleaned.length > 19) return false;
  
  let sum = 0;
  let isEven = false;
  
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}
```

**Unit Tests**:
```typescript
describe('validateLuhn', () => {
  test.each([
    '4532015112830366',  // Valid Visa
    '5425233430109903',  // Valid Mastercard
    '374245455400126',   // Valid Amex
  ])('validates real card format: %s', (card) => {
    expect(validateLuhn(card)).toBe(true);
  });

  test.each([
    '1234567890123456',  // Random number
    '0000000000000000',  // All zeros (invalid)
  ])('rejects invalid checksum: %s', (card) => {
    expect(validateLuhn(card)).toBe(false);
  });
});
```

---

### Task 1.5: Context Analyzer
**Estimate**: 2 hours | **Priority**: P1

**File**: `src/shared/detectors/context.ts`

```typescript
const CONTEXT_KEYWORDS = {
  high: ['password', 'secret', 'key', 'token', 'api_key', 'apikey', 'credential'],
  medium: ['auth', 'bearer', 'authorization', 'private', 'access'],
  low: ['config', 'env', 'setting'],
};

/**
 * Boost confidence based on nearby keywords
 */
export function analyzeContext(
  text: string,
  position: [number, number],
  windowSize = 50
): { boost: number; keywords: string[] } {
  const start = Math.max(0, position[0] - windowSize);
  const end = Math.min(text.length, position[1] + windowSize);
  const context = text.slice(start, end).toLowerCase();
  
  // Check for keywords and calculate boost
}
```

**Tests**: Similar pattern to above.

---

### Task 1.6: Detection Engine Integration
**Estimate**: 3 hours | **Priority**: P0

**File**: `src/shared/detectors/index.ts`

```typescript
export class DetectionEngine {
  private enabledDetectors: Set<DetectorType>;
  private sensitivity: 'low' | 'medium' | 'high';
  private allowlist: Set<string>;

  constructor(options: ScanOptions = {}) {
    // Initialize with defaults
  }

  scan(text: string): DetectionResult {
    const startTime = performance.now();
    const findings: Finding[] = [];

    // 1. Pattern matching (fast path)
    findings.push(...this.runPatternDetectors(text));

    // 2. Entropy analysis
    if (this.enabledDetectors.has('high_entropy')) {
      findings.push(...this.runEntropyDetector(text));
    }

    // 3. Context boosting
    for (const finding of findings) {
      finding.confidence = this.applyContextBoost(text, finding);
    }

    // 4. Allowlist filtering
    const filtered = findings.filter(f => !this.isAllowlisted(f.value));

    // 5. Calculate overall risk
    return {
      hasRisk: filtered.length > 0,
      findings: filtered,
      overallConfidence: this.calculateOverallConfidence(filtered),
      scannedLength: text.length,
      scanDurationMs: performance.now() - startTime,
    };
  }

  redact(text: string, findings: Finding[]): string {
    // Replace findings with [REDACTED_TYPE] markers
  }
}
```

**Integration Tests**:
```typescript
describe('DetectionEngine Integration', () => {
  test('full pipeline detects multiple types', () => {
    const engine = new DetectionEngine();
    const text = `
      My API key is sk-1234567890abcdefghij
      Contact me at test@example.com
      Card: 4532015112830366
    `;
    
    const result = engine.scan(text);
    
    expect(result.hasRisk).toBe(true);
    expect(result.findings).toHaveLength(3);
    expect(result.findings.map(f => f.type)).toContain('api_key_openai');
    expect(result.findings.map(f => f.type)).toContain('email');
    expect(result.findings.map(f => f.type)).toContain('credit_card');
  });

  test('redaction preserves text structure', () => {
    const engine = new DetectionEngine();
    const text = 'Key: sk-abcdefghij1234567890';
    const result = engine.scan(text);
    const redacted = engine.redact(text, result.findings);
    
    expect(redacted).toBe('Key: [REDACTED_API_KEY]');
  });
});
```

---

## Phase 2: DOM Interception (Days 8-14)

### Task 2.1: Selector Configuration
**Estimate**: 2 hours | **Priority**: P0

**File**: `configs/selectors.json`

Create initial selector configuration for ChatGPT and Claude.

**File**: `src/shared/types/selectors.ts`

Define selector schema types.

---

### Task 2.2: MutationObserver Setup
**Estimate**: 3 hours | **Priority**: P0

**File**: `src/content/mutation-observer.ts`

```typescript
/**
 * Watch for target elements appearing in the DOM
 */
export class ElementWatcher {
  private observer: MutationObserver;
  private callbacks: Map<string, (el: HTMLElement) => void>;

  watch(selector: string, callback: (el: HTMLElement) => void): void {
    // Store callback
    // Check if element already exists
    // Set up observer for future appearances
  }

  disconnect(): void {
    this.observer.disconnect();
  }
}
```

---

### Task 2.3: DOM Event Interceptors
**Estimate**: 4 hours | **Priority**: P0

**File**: `src/content/dom-interceptor.ts`

```typescript
export class DOMInterceptor {
  private engine: DetectionEngine;
  private siteConfig: SiteConfig;

  attachToInput(textarea: HTMLElement): void {
    textarea.addEventListener('keydown', this.handleKeyDown, true);
    textarea.addEventListener('paste', this.handlePaste, true);
  }

  attachToButton(button: HTMLElement): void {
    button.addEventListener('click', this.handleClick, true);
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' && !event.shiftKey) {
      this.interceptSubmission(event);
    }
  };

  private handlePaste = (event: ClipboardEvent): void => {
    const text = event.clipboardData?.getData('text');
    if (text) {
      this.scanAndWarn(text, event);
    }
  };

  private interceptSubmission(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    const text = this.getInputText();
    const result = this.engine.scan(text);
    
    if (result.hasRisk) {
      this.showWarningModal(result);
    } else {
      this.allowSubmission();
    }
  }
}
```

**E2E Tests** (`tests/e2e/interception.spec.ts`):
```typescript
test('intercepts Enter key on ChatGPT', async ({ page }) => {
  await page.goto('https://chat.openai.com');
  await page.fill('#prompt-textarea', 'My key is sk-test1234567890abcdef');
  await page.keyboard.press('Enter');
  
  // Warning modal should appear
  await expect(page.locator('[data-testid="leak-warning-modal"]')).toBeVisible();
});
```

---

### Task 2.4: Fetch Monkey-Patching (Fallback)
**Estimate**: 4 hours | **Priority**: P1

**File**: `src/content/fetch-patcher.ts`

```typescript
/**
 * Inject script into main world to intercept fetch calls
 */
export function injectFetchPatcher(endpoints: string[]): void {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected/fetch-patch.js');
  script.dataset.endpoints = JSON.stringify(endpoints);
  (document.head || document.documentElement).appendChild(script);
  script.remove();
}
```

**File**: `src/injected/fetch-patch.js`

```javascript
(function() {
  const endpoints = JSON.parse(document.currentScript.dataset.endpoints);
  const originalFetch = window.fetch;

  window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : input.url;
    
    if (endpoints.some(ep => url.includes(ep))) {
      // Send message to content script for scanning
      const body = init?.body;
      if (body) {
        window.postMessage({
          type: 'AI_LEAK_CHECK_REQUEST',
          body: typeof body === 'string' ? body : JSON.stringify(body),
        }, '*');
        
        // Wait for response
        const response = await new Promise((resolve) => {
          window.addEventListener('message', function handler(event) {
            if (event.data.type === 'AI_LEAK_CHECK_RESPONSE') {
              window.removeEventListener('message', handler);
              resolve(event.data);
            }
          });
        });
        
        if (response.blocked) {
          throw new Error('Blocked by AI Leak Checker');
        }
      }
    }
    
    return originalFetch.call(this, input, init);
  };
})();
```

---

### Task 2.5: Warning Modal Component
**Estimate**: 4 hours | **Priority**: P0

**File**: `src/content/modal.ts`

Create a shadow DOM component for the warning modal to avoid CSS conflicts.

```typescript
export class WarningModal {
  private shadow: ShadowRoot;
  private container: HTMLElement;

  constructor() {
    this.container = document.createElement('div');
    this.shadow = this.container.attachShadow({ mode: 'closed' });
    this.injectStyles();
  }

  show(result: DetectionResult): Promise<UserAction> {
    return new Promise((resolve) => {
      this.render(result, resolve);
      document.body.appendChild(this.container);
    });
  }

  private render(result: DetectionResult, onAction: (action: UserAction) => void): void {
    this.shadow.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-content">
          <h2>⚠️ Sensitive Data Detected</h2>
          <p>The following items were found:</p>
          <ul>
            ${result.findings.map(f => `
              <li>
                <strong>${f.type}</strong>: ${f.maskedValue}
                <span class="confidence">(${Math.round(f.confidence * 100)}% confidence)</span>
              </li>
            `).join('')}
          </ul>
          <div class="actions">
            <button data-action="mask">Mask & Continue</button>
            <button data-action="proceed">Send Anyway</button>
            <button data-action="cancel">Cancel</button>
          </div>
        </div>
      </div>
    `;

    this.shadow.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action as UserAction;
        this.hide();
        onAction(action);
      });
    });
  }

  private hide(): void {
    this.container.remove();
  }
}

type UserAction = 'mask' | 'proceed' | 'cancel';
```

---

## Phase 3: Service Worker & Storage (Days 15-18)

### Task 3.1: Message Handler
**Estimate**: 3 hours | **Priority**: P0

**File**: `src/background/message-handler.ts`

### Task 3.2: Storage Operations
**Estimate**: 3 hours | **Priority**: P0

**File**: `src/background/storage.ts`

### Task 3.3: Badge Updates
**Estimate**: 1 hour | **Priority**: P1

**File**: `src/background/badge.ts`

---

## Phase 4: Popup UI (Days 19-22)

### Task 4.1: Popup Shell
**Estimate**: 2 hours | **Priority**: P0

**File**: `src/popup/App.tsx`

### Task 4.2: Settings Panel
**Estimate**: 3 hours | **Priority**: P0

**File**: `src/popup/components/Settings.tsx`

### Task 4.3: Stats Display
**Estimate**: 2 hours | **Priority**: P1

**File**: `src/popup/components/Stats.tsx`

---

## Phase 5: E2E Testing & Polish (Days 23-28)

### Task 5.1: Playwright Test Suite
**Estimate**: 6 hours | **Priority**: P0

```typescript
// tests/e2e/chatgpt.spec.ts
test.describe('ChatGPT Integration', () => {
  test.beforeEach(async ({ context }) => {
    await context.addExtension('./dist');
  });

  test('warns on API key paste', async ({ page }) => {
    await page.goto('https://chat.openai.com');
    // ...
  });

  test('allows clean text through', async ({ page }) => {
    // ...
  });

  test('mask function works correctly', async ({ page }) => {
    // ...
  });
});
```

### Task 5.2: False Positive Corpus Testing
**Estimate**: 4 hours | **Priority**: P0

Run detection engine against corpus of safe text to measure false positive rate.

### Task 5.3: Performance Benchmarks
**Estimate**: 2 hours | **Priority**: P1

Measure scan latency on various text sizes.

---

## Phase 6: Documentation & Launch (Days 29-35)

### Task 6.1: Privacy Policy
**Estimate**: 2 hours | **Priority**: P0

### Task 6.2: Chrome Store Listing
**Estimate**: 3 hours | **Priority**: P0

### Task 6.3: Landing Page
**Estimate**: 4 hours | **Priority**: P0

### Task 6.4: Security Documentation
**Estimate**: 2 hours | **Priority**: P0

---

## Summary Timeline

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| 0: Setup | Days 1-2 | Repo, scaffold, CI |
| 1: Detection | Days 3-7 | Pattern engine, entropy, Luhn |
| 2: DOM Interception | Days 8-14 | Selectors, events, modal |
| 3: Service Worker | Days 15-18 | Messaging, storage |
| 4: Popup UI | Days 19-22 | Settings, stats |
| 5: Testing | Days 23-28 | E2E, benchmarks |
| 6: Launch | Days 29-35 | Docs, store listing |

**Total**: ~7 weeks for MVP

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Selector breaks on ChatGPT update | High | High | Fallback to fetch patching, daily monitoring |
| Chrome Store rejection | Medium | High | Follow policy exactly, no obfuscation |
| High false positive rate | Medium | Medium | Conservative patterns, user feedback loop |
| Low adoption | Medium | Medium | SEO, community engagement |
| Competitor release | Low | Medium | Focus on trust/privacy differentiator |

---

*Document End*
