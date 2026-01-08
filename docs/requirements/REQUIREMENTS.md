# AI Leak Checker - Requirements Specification

> **Document Purpose**: Defines functional and non-functional requirements for MVP launch.
> **Version**: 1.0.0 | **Last Updated**: 2026-01-07

---

## 1. Executive Summary

AI Leak Checker is a browser extension that prevents accidental data leaks to AI chat platforms (ChatGPT, Claude, etc.) by detecting sensitive information before submission and providing warn/block/redact capabilities.

### 1.1 Core Value Proposition
- **Target User**: SMB owners, ops leads, compliance officers (10-200 person businesses)
- **Pain Point**: Employees inadvertently paste API keys, PII, client data into AI tools
- **Solution**: Local-first detection with zero data egress

### 1.2 MVP Scope (Phase 1)
- Chrome/Edge support only (Chromium-based)
- 2 AI platforms: ChatGPT, Claude
- Core detector categories: secrets, PII basics
- UX: Warn → Redact → Proceed or Block

---

## 2. Functional Requirements

### 2.1 Detection Engine (FR-DET)

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-DET-001 | Detect API keys by prefix pattern | P0 | Flags `sk-`, `AKIA`, `ghp_`, `gho_`, `xoxb-`, `xoxp-` |
| FR-DET-002 | Detect high-entropy strings | P0 | Shannon entropy > 4.5 + length > 20 chars |
| FR-DET-003 | Detect credit card numbers | P0 | Luhn-valid 13-19 digit sequences |
| FR-DET-004 | Detect email addresses | P1 | RFC 5322 compliant, configurable domain filter |
| FR-DET-005 | Detect UK phone numbers | P1 | Formats: +44, 07xxx, 01onal |
| FR-DET-006 | Detect UK National Insurance numbers | P1 | Pattern: `[A-CEGHJ-PR-TW-Z]{2}\d{6}[A-D]` |
| FR-DET-007 | Configurable allowlist | P1 | User-defined strings/patterns to ignore |
| FR-DET-008 | Context-aware detection | P2 | Boost confidence when near keywords ("key", "password", "secret") |

### 2.2 Interception Layer (FR-INT)

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-INT-001 | Intercept ChatGPT submissions | P0 | Catch Enter key + Send button on chat.openai.com |
| FR-INT-002 | Intercept Claude submissions | P0 | Catch Enter key + Send button on claude.ai |
| FR-INT-003 | Prevent submission when risk detected | P0 | `event.preventDefault()` stops network request |
| FR-INT-004 | Graceful degradation on selector failure | P0 | Show "Site unsupported" message, log to local stats |
| FR-INT-005 | Fetch monkey-patching fallback | P1 | Intercept `window.fetch` as secondary capture |
| FR-INT-006 | Support composition (IME) input | P1 | Handle CJK text input correctly |
| FR-INT-007 | Handle paste events | P0 | Intercept `paste` event for immediate scanning |

### 2.3 User Interface (FR-UI)

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-UI-001 | Warning modal on detection | P0 | Shows detected items, risk level, recommended action |
| FR-UI-002 | "Mask & Continue" action | P0 | Replaces sensitive data with `[REDACTED_TYPE]` |
| FR-UI-003 | "Send Anyway" action | P0 | User override with confirmation |
| FR-UI-004 | "Cancel" action | P0 | Returns focus to input, clears warning state |
| FR-UI-005 | Popup settings page | P0 | Toggle detectors, view stats, access settings |
| FR-UI-006 | Options page | P1 | Detailed configuration, allowlists, export |
| FR-UI-007 | Visual indicator (badge) | P1 | Icon badge shows detection count or status |
| FR-UI-008 | Non-blocking toast for low-risk | P2 | Subtle notification for minor detections |

### 2.4 Data & Storage (FR-DAT)

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-DAT-001 | Local-only statistics | P0 | Store: domain, category, timestamp (no content) |
| FR-DAT-002 | Settings persistence | P0 | chrome.storage.local for user preferences |
| FR-DAT-003 | Export stats as CSV | P1 | One-click download of aggregated data |
| FR-DAT-004 | Clear all data | P0 | User can wipe all stored data |
| FR-DAT-005 | No network telemetry (default) | P0 | Zero outbound requests in default config |

### 2.5 Configuration (FR-CFG)

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-CFG-001 | Per-detector toggle | P0 | Enable/disable each detector type |
| FR-CFG-002 | Sensitivity levels | P1 | Low/Medium/High affecting entropy thresholds |
| FR-CFG-003 | Site allowlist | P1 | Exclude specific domains from scanning |
| FR-CFG-004 | Strict mode toggle | P1 | Block (no override) vs Warn (allow override) |
| FR-CFG-005 | Remote selector updates | P2 | Fetch selector config from CDN (opt-in) |

---

## 3. Non-Functional Requirements

### 3.1 Performance (NFR-PERF)

| ID | Requirement | Target | Measurement |
|----|-------------|--------|-------------|
| NFR-PERF-001 | Detection latency | < 50ms | Time from input to scan complete |
| NFR-PERF-002 | Memory footprint | < 50MB | Chrome task manager |
| NFR-PERF-003 | CPU impact | < 5% | During active typing |
| NFR-PERF-004 | Extension load time | < 200ms | Time to ready state |

### 3.2 Security (NFR-SEC)

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-SEC-001 | Minimal permissions | Only `host_permissions` for target sites |
| NFR-SEC-002 | No remote code execution | All logic bundled, no eval() |
| NFR-SEC-003 | CSP compliant | No inline scripts in extension pages |
| NFR-SEC-004 | Pinned dependencies | package-lock.json committed |
| NFR-SEC-005 | Supply chain protection | Reproducible builds, signed releases |

### 3.3 Privacy (NFR-PRIV)

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-PRIV-001 | No prompt content storage | Never persist user input text |
| NFR-PRIV-002 | No prompt content transmission | Zero network requests containing prompt data |
| NFR-PRIV-003 | Anonymized stats only | No PII in stored statistics |
| NFR-PRIV-004 | GDPR compliant | Lawful basis: legitimate interest for security |

### 3.4 Compatibility (NFR-COMP)

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-COMP-001 | Chrome version | 120+ (MV3 stable) |
| NFR-COMP-002 | Edge version | 120+ (Chromium-based) |
| NFR-COMP-003 | OS support | Windows 10+, macOS 12+ |
| NFR-COMP-004 | Screen sizes | 1280x720 minimum |

### 3.5 Reliability (NFR-REL)

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-REL-001 | Uptime (extension active) | 99.9% when browser running |
| NFR-REL-002 | False positive rate | < 5% on test corpus |
| NFR-REL-003 | Selector resilience | Graceful failure within 24h of site change |

---

## 4. User Stories

### 4.1 Core User Stories (MVP)

```
US-001: As a recruiter, I want to be warned before pasting a CV into ChatGPT,
        so that I don't accidentally leak candidate PII.

US-002: As a developer, I want API keys detected before submission,
        so that I don't expose credentials in AI prompts.

US-003: As an office manager, I want to redact sensitive data with one click,
        so that I can still use AI tools productively.

US-004: As a business owner, I want local-only processing,
        so that no additional data leaves my organization.

US-005: As a compliance officer, I want to export usage statistics,
        so that I can demonstrate due diligence.

US-006: As a user, I want to override warnings when appropriate,
        so that false positives don't block my work.

US-007: As a power user, I want to configure which detectors are active,
        so that I can reduce noise for my workflow.
```

### 4.2 Edge Case Stories

```
US-E01: As a user on a changed ChatGPT UI, I want a clear message when
        detection is unavailable, so I know to be extra careful.

US-E02: As a user with custom regex patterns, I want to add allowlist rules,
        so that my internal project codes aren't flagged.

US-E03: As a user typing in a non-English language, I want detection to work,
        so that international PII is also caught.
```

---

## 5. Constraints & Assumptions

### 5.1 Technical Constraints
- **MV3 Limitation**: Cannot use `webRequestBlocking` for body inspection
- **Store Policy**: No obfuscated code, must declare all permissions
- **DOM Dependency**: Selectors will break when AI platforms update UI

### 5.2 Business Constraints
- **Solo developer**: Limited bandwidth for multi-platform support
- **Zero marketing budget**: Organic acquisition only
- **UK-first**: Compliance focus on UK GDPR initially

### 5.3 Assumptions
- Users will accept a warning-based UX (not silent blocking)
- AI platforms will not actively block extensions
- Target users understand basic data sensitivity concepts

---

## 6. Out of Scope (MVP)

- Firefox support
- Safari support
- Mobile browsers
- Enterprise MDM deployment
- Central admin dashboard
- AI-based classification
- Real-time prompt analysis beyond regex
- Gemini, Copilot, Perplexity support (Phase 2)

---

## 7. Success Metrics

| Metric | Target (Month 3) | Measurement |
|--------|------------------|-------------|
| Chrome Store installs | 500+ | Store analytics |
| 7-day active users | 200+ | Local stats (opt-in) |
| False positive rate | < 5% | User feedback + test suite |
| Store rating | 4.0+ stars | Chrome Web Store |
| Support tickets/week | < 10 | Email inbox |

---

## Appendix A: Detector Pattern Specifications

### A.1 API Key Patterns (High Confidence)

```typescript
const API_KEY_PATTERNS = {
  openai: /sk-[a-zA-Z0-9]{20,}/,
  aws_access: /AKIA[0-9A-Z]{16}/,
  aws_secret: /[a-zA-Z0-9/+=]{40}/,  // Context-dependent
  github_pat: /ghp_[a-zA-Z0-9]{36}/,
  github_oauth: /gho_[a-zA-Z0-9]{36}/,
  slack_bot: /xoxb-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24}/,
  slack_user: /xoxp-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24}/,
  stripe_live: /sk_live_[a-zA-Z0-9]{24,}/,
  stripe_test: /sk_test_[a-zA-Z0-9]{24,}/,
};
```

### A.2 PII Patterns (UK-Focused)

```typescript
const PII_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  uk_phone: /(?:\+44|0)(?:\d\s?){9,10}/,
  uk_nino: /[A-CEGHJ-PR-TW-Z]{2}\d{6}[A-D]/i,
  uk_postcode: /[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/i,
};
```

### A.3 Credit Card (Luhn Validation)

```typescript
function luhnCheck(num: string): boolean {
  const digits = num.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  
  let sum = 0;
  let isEven = false;
  
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);
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

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| MV3 | Manifest Version 3 - Chrome extension platform |
| DNR | declarativeNetRequest API |
| PII | Personally Identifiable Information |
| DOM | Document Object Model |
| Entropy | Shannon entropy - measure of randomness |
| Luhn | Checksum algorithm for credit card validation |
| NINO | UK National Insurance Number |

---

*Document End*
