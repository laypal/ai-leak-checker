# 2. Design Decisions

[Back to index](index.md)


## 2.1 ADR-001: Hybrid Interception Strategy

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

## 2.2 ADR-002: Selector Configuration Architecture

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

## 2.3 ADR-003: Detection Engine Design

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

## 2.4 ADR-004: Storage Schema

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

## 2.5 ADR-005: Error Handling Strategy

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
