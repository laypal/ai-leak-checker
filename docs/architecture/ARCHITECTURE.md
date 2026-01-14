# AI Leak Checker - Architectural Design Document

> **Document Purpose**: Technical architecture, design decisions, and implementation patterns.
> **Version**: 1.0.0 | **Last Updated**: 2026-01-15

---

## 1. System Overview

### 1.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser Context                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌─────────────────────────────────────┐   │
│  │   Popup UI   │    │           Content Script             │   │
│  │  (React/TS)  │    │  ┌─────────────┐  ┌──────────────┐  │   │
│  │              │    │  │  DOM        │  │  Injected    │  │   │
│  │ - Settings   │    │  │  Listeners  │  │  Script      │  │   │
│  │ - Stats      │    │  │  (Primary)  │  │  (Fallback)  │  │   │
│  │ - Controls   │    │  └──────┬──────┘  └──────┬───────┘  │   │
│  └──────┬───────┘    │         │                │          │   │
│         │            │         └───────┬────────┘          │   │
│         │            │                 │                   │   │
│         │            │         ┌───────▼────────┐          │   │
│         │            │         │  Detection     │          │   │
│         │            │         │  Engine        │          │   │
│         │            │         │  (Local)       │          │   │
│         │            │         └───────┬────────┘          │   │
│         │            │                 │                   │   │
│         │            │         ┌───────▼────────┐          │   │
│         │            │         │  Warning       │          │   │
│         │            │         │  Modal UI      │          │   │
│         │            │         └────────────────┘          │   │
│         │            └─────────────────────────────────────┘   │
│         │                              │                       │
│  ┌──────▼──────────────────────────────▼──────────────────┐   │
│  │              Service Worker (Background)                │   │
│  │  - Message routing                                      │   │
│  │  - Storage management                                   │   │
│  │  - Badge updates                                        │   │
│  │  - Selector config cache                                │   │
│  └──────────────────────────┬─────────────────────────────┘   │
│                             │                                  │
│  ┌──────────────────────────▼─────────────────────────────┐   │
│  │              chrome.storage.local                       │   │
│  │  - User settings                                        │   │
│  │  - Detection stats (anonymized)                         │   │
│  │  - Selector cache                                       │   │
│  └────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Component Responsibilities

| Component | Responsibility | Communication |
|-----------|---------------|---------------|
| Service Worker | Lifecycle, storage, messaging | chrome.runtime API |
| Content Script | DOM monitoring, injection | postMessage, chrome.runtime |
| Injected Script | Fetch interception | postMessage to content script |
| Detection Engine | Pattern matching, entropy | Direct function calls |
| Popup UI | User settings, stats display | chrome.runtime.sendMessage |
| Warning Modal | User decision capture | DOM events |

---

## 2. Design Decisions

### 2.1 ADR-001: Hybrid Interception Strategy

**Status**: Accepted

**Context**: MV3 prevents body inspection via `declarativeNetRequest`. Need reliable submission interception.

**Decision**: Implement two-layer interception:
1. **Primary**: DOM event listeners (submit, keydown, click)
2. **Fallback**: Main World `fetch` monkey-patching

**Consequences**:
- (+) Redundancy against UI changes
- (+) Catches programmatic submissions
- (-) Policy scrutiny risk for fetch patching
- (-) Complexity in maintaining two systems

**Implementation**:
```typescript
// Primary: DOM interception
const interceptDOM = (textarea: HTMLElement, button: HTMLElement) => {
  textarea.addEventListener('keydown', handleKeyDown, true);
  button.addEventListener('click', handleClick, true);
};

// Fallback: Fetch patching (injected into main world)
const patchFetch = () => {
  const originalFetch = window.fetch;
  window.fetch = async (input, init) => {
    if (shouldIntercept(input, init)) {
      const result = await analyzeBody(init?.body);
      if (result.hasRisk) {
        return Promise.reject(new Error('Blocked by AI Leak Checker'));
      }
    }
    return originalFetch(input, init);
  };
};
```

---

### 2.2 ADR-002: Selector Configuration Architecture

**Status**: Accepted

**Context**: AI platform UIs change frequently. Hardcoded selectors will break.

**Decision**: Versioned selector configuration with local fallback.

**Configuration Schema**:
```typescript
interface SelectorConfig {
  version: string;
  updated: string;
  sites: {
    [domain: string]: SiteConfig;
  };
}

interface SiteConfig {
  enabled: boolean;
  inputSelectors: string[];      // CSS selectors for textarea
  submitSelectors: string[];     // CSS selectors for send button
  containerSelector: string;     // Parent container for MutationObserver
  apiEndpoints: string[];        // URLs to intercept (fetch fallback)
  bodyExtractor: string;         // JSON path to prompt in request body
}
```

**Example**:
```json
{
  "version": "1.0.0",
  "updated": "2026-01-07",
  "sites": {
    "chat.openai.com": {
      "enabled": true,
      "inputSelectors": [
        "#prompt-textarea",
        "[data-id='root'] textarea",
        "form textarea"
      ],
      "submitSelectors": [
        "button[data-testid='send-button']",
        "form button[type='submit']"
      ],
      "containerSelector": "main",
      "apiEndpoints": [
        "/backend-api/conversation"
      ],
      "bodyExtractor": "messages[0].content.parts[0]"
    },
    "claude.ai": {
      "enabled": true,
      "inputSelectors": [
        "[contenteditable='true']",
        "div.ProseMirror"
      ],
      "submitSelectors": [
        "button[aria-label='Send message']"
      ],
      "containerSelector": "main",
      "apiEndpoints": [
        "/api/organizations/*/chat_conversations/*/completion"
      ],
      "bodyExtractor": "prompt"
    }
  }
}
```

---

### 2.3 ADR-003: Detection Engine Design

**Status**: Accepted

**Context**: Need reliable secret/PII detection without AI inference costs.

**Decision**: Layered detection with confidence scoring.

**Architecture**:
```typescript
interface DetectionResult {
  hasRisk: boolean;
  findings: Finding[];
  overallConfidence: 'low' | 'medium' | 'high';
}

interface Finding {
  type: DetectorType;
  value: string;           // Masked: "sk-***abc"
  position: [number, number];
  confidence: number;      // 0-1
  context: string;         // Surrounding text snippet
}

type DetectorType = 
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
```

**Detection Pipeline**:
```
Input Text
    │
    ▼
┌───────────────┐
│ Preprocessor  │  - Normalize whitespace
│               │  - Extract code blocks
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ Pattern Match │  - Prefix patterns (sk-, AKIA, etc.)
│ (Fast Path)   │  - Known formats
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ Entropy Scan  │  - Shannon entropy calculation
│               │  - Flag high-entropy segments
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ Context Boost │  - Check for nearby keywords
│               │  - Adjust confidence scores
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ Allowlist     │  - User-defined exceptions
│ Filter        │  - Known false positive patterns
└───────┬───────┘
        │
        ▼
Detection Result
```

---

### 2.4 ADR-004: Storage Schema

**Status**: Accepted

**Context**: Need to persist settings and stats without storing sensitive data.

**Decision**: Structured storage with explicit schema.

**Schema**:
```typescript
interface StorageSchema {
  // User preferences
  settings: {
    detectors: Record<DetectorType, boolean>;
    sensitivity: 'low' | 'medium' | 'high';
    strictMode: boolean;
    allowlist: string[];
    siteAllowlist: string[];
  };
  
  // Anonymized statistics
  stats: {
    totalScans: number;
    totalDetections: number;
    byDetector: Record<DetectorType, number>;
    bySite: Record<string, number>;  // domain only
    lastScan: string;                 // ISO timestamp
  };
  
  // Selector cache
  selectors: {
    version: string;
    data: SelectorConfig;
    fetchedAt: string;
  };
  
  // Schema version for migrations
  schemaVersion: number;
}
```

---

### 2.5 ADR-005: Error Handling Strategy

**Status**: Accepted

**Context**: Extension must fail gracefully without breaking user workflow.

**Decision**: Defensive error handling with user feedback.

**Error Categories**:
```typescript
enum ErrorCategory {
  SELECTOR_FAILURE = 'selector_failure',
  DETECTION_ERROR = 'detection_error',
  STORAGE_ERROR = 'storage_error',
  INJECTION_BLOCKED = 'injection_blocked',
}

interface ErrorHandler {
  handle(error: Error, category: ErrorCategory): void;
}

// Implementation: Show non-blocking notification, log locally, continue
```

**Graceful Degradation**:
```typescript
const attemptInterception = async (site: SiteConfig): Promise<boolean> => {
  // Try primary selectors
  for (const selector of site.inputSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      attachListeners(element);
      return true;
    }
  }
  
  // Fall back to fetch patching
  if (site.apiEndpoints.length > 0) {
    injectFetchPatcher(site.apiEndpoints);
    return true;
  }
  
  // Show "unsupported" indicator
  showUnsupportedBadge();
  return false;
};
```

---

## 3. Security Architecture

### 3.1 Threat Model

| Threat | Impact | Mitigation |
|--------|--------|------------|
| Extension compromise (supply chain) | Critical | Hardware 2FA, reproducible builds, minimal deps |
| Malicious site injection | High | CSP, isolated content script world |
| Data exfiltration via telemetry | High | No network by default, local-only storage |
| Prompt content exposure | High | Never store prompt text, mask in findings |
| Selector config tampering | Medium | SRI hashes on config fetch, local fallback |

### 3.2 Permission Model

```json
{
  "permissions": [
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "https://chat.openai.com/*",
    "https://claude.ai/*"
  ]
}
```

**Permission Justification**:
- `storage`: Persist settings and anonymized stats
- `activeTab`: Inject content script on user action
- `host_permissions`: Required for content script injection on target sites

**Explicitly NOT requested**:
- `<all_urls>`: Too broad, trust issue
- `webRequest`: Not needed for MV3 approach
- `tabs`: Not needed for core functionality
- `cookies`: No session handling required

### 3.3 Content Security Policy

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

### 3.4 Data Flow Security

```
User Input → Content Script → Detection Engine → Result
                    │
                    └──→ Storage (stats only, no content)
```

**Never transmitted**: Prompt text, full findings, user PII
**Stored locally**: Detection counts, timestamps, domains

---

## 4. API Design

### 4.1 Message Protocol

All inter-component communication uses typed messages:

```typescript
// Message types
type MessageType =
  | 'SCAN_REQUEST'
  | 'SCAN_RESULT'
  | 'SETTINGS_GET'
  | 'SETTINGS_UPDATE'
  | 'STATS_GET'
  | 'STATS_INCREMENT'
  | 'SELECTOR_GET';

interface Message<T = unknown> {
  type: MessageType;
  payload: T;
  timestamp: number;
  correlationId: string;
}

// Type-safe message handlers
interface MessageHandlers {
  SCAN_REQUEST: (payload: ScanRequest) => Promise<ScanResult>;
  SETTINGS_GET: () => Promise<Settings>;
  SETTINGS_UPDATE: (payload: Partial<Settings>) => Promise<void>;
  STATS_GET: () => Promise<Stats>;
  STATS_INCREMENT: (payload: StatsIncrement) => Promise<void>;
  SELECTOR_GET: (payload: { domain: string }) => Promise<SiteConfig | null>;
}
```

### 4.2 Detection API

```typescript
// Public API for detection engine
interface DetectionAPI {
  /**
   * Scan text for sensitive data
   * @param text - Raw input text to scan
   * @param options - Detection options
   * @returns Detection result with findings
   */
  scan(text: string, options?: ScanOptions): DetectionResult;
  
  /**
   * Redact sensitive data from text
   * @param text - Original text
   * @param findings - Previously detected findings
   * @returns Text with redactions applied
   */
  redact(text: string, findings: Finding[]): string;
  
  /**
   * Calculate Shannon entropy
   * @param text - Text segment
   * @returns Entropy value (0-8 for ASCII)
   */
  calculateEntropy(text: string): number;
  
  /**
   * Validate credit card via Luhn algorithm
   * @param digits - Card number digits
   * @returns Whether checksum is valid
   */
  validateLuhn(digits: string): boolean;
}
```

### 4.3 Storage API

```typescript
interface StorageAPI {
  // Settings
  getSettings(): Promise<Settings>;
  updateSettings(partial: Partial<Settings>): Promise<void>;
  resetSettings(): Promise<void>;
  
  // Stats
  getStats(): Promise<Stats>;
  incrementStat(key: keyof Stats['byDetector'], site: string): Promise<void>;
  clearStats(): Promise<void>;
  exportStats(): Promise<string>; // CSV format
  
  // Selectors
  getSelectors(domain: string): Promise<SiteConfig | null>;
  updateSelectors(config: SelectorConfig): Promise<void>;
}
```

---

## 5. Testing Strategy

### 5.1 Test Pyramid

```
        ┌─────────┐
        │   E2E   │  - Playwright browser tests
        │   10%   │  - Real AI site interaction
        └────┬────┘
             │
       ┌─────┴─────┐
       │Integration│  - Component interaction
       │    20%    │  - Message passing
       └─────┬─────┘
             │
    ┌────────┴────────┐
    │   Unit Tests    │  - Detection engine
    │      70%        │  - Utility functions
    │                 │  - Pattern validation
    └─────────────────┘
```

### 5.2 Property-Based Testing (Hypothesis)

```python
# Example: Entropy calculation properties
from hypothesis import given, strategies as st

@given(st.text(min_size=1, max_size=1000))
def test_entropy_bounds(text):
    """Entropy is always between 0 and log2(alphabet_size)"""
    entropy = calculate_entropy(text)
    assert 0 <= entropy <= 8  # For ASCII

@given(st.text(alphabet='a', min_size=1, max_size=100))
def test_entropy_zero_for_uniform(text):
    """Single character strings have zero entropy"""
    entropy = calculate_entropy(text)
    assert entropy == 0

@given(st.from_regex(r'sk-[a-zA-Z0-9]{20,40}'))
def test_openai_key_always_detected(key):
    """Valid OpenAI key format is always detected"""
    result = scan(key)
    assert any(f.type == 'api_key_openai' for f in result.findings)
```

### 5.3 Test Fixtures

Located in `/tests/fixtures/`:
- `api_keys.json` - Known API key formats
- `false_positives.json` - Strings that look like secrets but aren't
- `pii_samples.json` - Anonymized PII patterns
- `edge_cases.json` - Unicode, long strings, edge cases

---

## 6. Deployment Architecture

### 6.1 Build Pipeline

The build process uses Vite for bundling with a custom post-build step to handle Chrome Extension Manifest V3 requirements.

**Build Steps**:

1. **TypeScript Compilation** (`tsc --noEmit`)
   - Type checking without emission
   - Validates type safety before build

2. **Vite Build** (`vite build`)
   - Bundles all entry points (background, content, popup, injected)
   - Uses Rollup under the hood with code splitting enabled
   - Outputs ES modules for background/popup, chunks for content/injected

3. **Post-Build: Chunk Inlining** (`scripts/inline-chunks.js`)
   - **Purpose**: Chrome Extension content scripts must be single-file IIFE bundles (cannot use ES modules or separate chunks)
   - **Process**:
     - Recursively inlines chunk imports into `content.js` and `injected.js`
     - Removes export statements from chunks and entry files
     - Wraps content in IIFE: `(function() { 'use strict'; ... })()`
     - Handles nested chunk dependencies (chunks importing other chunks)
     - Deletes inlined chunk files after successful inlining
   - **Output**: Single-file, IIFE-wrapped bundles ready for MV3

4. **Static Asset Copy**
   - Copies `manifest.json` from `public/`
   - Copies icon files (16x16, 48x48, 128x128)
   - Moves popup HTML to root and fixes relative paths

**Build Configuration**:

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        background: 'src/background/index.ts',  // ES module (allowed)
        content: 'src/content/index.ts',        // Will be IIFE after inlining
        popup: 'src/popup/index.html',          // ES module (allowed)
        injected: 'src/injected/index.ts',      // Will be IIFE after inlining
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
      },
    },
  },
});
```

**Chunk Inlining Details**:

```javascript
// scripts/inline-chunks.js
// Recursively processes:
// 1. Find all chunk imports: import{...}from"./chunks/file.js"
// 2. Read chunk files and remove export statements
// 3. Replace import with inlined content
// 4. Repeat until no imports remain (handles nested chunks)
// 5. Remove export statements from main file
// 6. Wrap in IIFE if not already wrapped
// 7. Delete processed chunk files
```

**Build Output Structure**:

```
dist/
├── manifest.json          # MV3 manifest
├── background.js          # ES module (service worker)
├── content.js             # IIFE bundle (content script)
├── injected.js            # IIFE bundle (main world script)
├── popup.html             # Popup entry point
├── popup.js               # ES module (popup script)
├── chunks/                # Empty (all chunks inlined)
└── icons/                 # Icon assets
```

### 6.2 CI/CD Pipeline

```yaml
# .github/workflows/build.yml
name: Build & Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:unit
      - run: npm run test:integration
      
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: extension-${{ github.sha }}
          path: dist/
```

### 6.3 Release Process

1. Version bump in `manifest.json` and `package.json`
2. Changelog update
3. Tag release (`v1.0.0`)
4. CI builds reproducible artifact
5. Manual review of built extension
6. Upload to Chrome Web Store
7. Publish documentation updates

---

## 7. Module Structure

```
src/
├── background/
│   ├── index.ts              # Service worker entry
│   ├── message-handler.ts    # Message routing
│   └── storage.ts            # Storage operations
├── content/
│   ├── index.ts              # Content script entry
│   ├── dom-interceptor.ts    # DOM event listeners
│   ├── fetch-patcher.ts      # Main world injection
│   ├── modal.ts              # Warning modal component
│   └── mutation-observer.ts  # DOM change detection
├── popup/
│   ├── App.tsx               # Popup UI root
│   ├── components/           # UI components
│   └── hooks/                # React hooks
├── shared/
│   ├── detectors/
│   │   ├── index.ts          # Detection engine
│   │   ├── patterns.ts       # Regex patterns
│   │   ├── entropy.ts        # Entropy calculation
│   │   ├── luhn.ts           # Credit card validation
│   │   └── context.ts        # Context boosting
│   ├── types/
│   │   ├── index.ts          # Shared type exports
│   │   ├── messages.ts       # Message types
│   │   ├── storage.ts        # Storage schema
│   │   └── detection.ts      # Detection types
│   ├── utils/
│   │   ├── mask.ts           # Value masking
│   │   ├── validate.ts       # Input validation
│   │   └── logger.ts         # Logging utility
│   └── constants.ts          # Shared constants
└── manifest.json
```

---

## Appendix A: Selector Maintenance Runbook

### A.1 Monitoring

```bash
# Daily selector health check script
npx playwright test tests/e2e/selector-health.spec.ts

# Output: Pass/Fail for each supported site
```

### A.2 Emergency Selector Fix

1. Identify broken selector via test failure
2. Inspect current site DOM structure
3. Update `configs/selectors.json`
4. Run local test to verify
5. Push to CDN (if remote config enabled)
6. Extension fetches update on next launch

### A.3 Selector Fallback Chain

```typescript
// Try selectors in order until one works
const findElement = (selectors: string[]): HTMLElement | null => {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) return el as HTMLElement;
  }
  return null;
};
```

---

*Document End*
