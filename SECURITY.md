# Security Policy

> **AI Leak Checker** takes security seriously. This document outlines our security practices, vulnerability reporting process, and data handling policies.

---

## Supported Versions

| Version | Supported          | Notes |
|---------|--------------------|-------|
| 1.x.x   | :white_check_mark: | Current stable release |
| 0.x.x   | :x:                | Pre-release, no support |

---

## Reporting a Vulnerability

We appreciate responsible disclosure of security vulnerabilities.

### How to Report

**Email**: aileakchecker@proton.me  
**Subject**: `[SECURITY] Brief description`

Please include:
1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact assessment
4. Any proof-of-concept code (if applicable)
5. Your contact information for follow-up

### What to Expect

| Timeline | Action |
|----------|--------|
| 48 hours | Initial acknowledgment of your report |
| 7 days | Preliminary assessment and severity rating |
| 30 days | Fix developed for critical/high severity |
| 90 days | Public disclosure (coordinated with reporter) |

### Our Commitment

- We will not take legal action against security researchers acting in good faith
- We will credit reporters (unless you prefer anonymity)
- We will keep you informed of our progress
- We will work with you to understand and resolve the issue

### What NOT to Do

- Do not access or modify other users' data
- Do not disrupt service availability
- Do not publicly disclose before coordinated disclosure
- Do not demand compensation in exchange for reporting

---

## Security Practices

### Development Security

| Practice | Implementation |
|----------|----------------|
| Code Review | All changes require review before merge |
| Dependency Audit | Weekly `npm audit` runs in CI |
| Static Analysis | ESLint security rules enforced |
| Type Safety | TypeScript strict mode enabled |
| No Eval | `eval()` and `Function()` prohibited |

### Build & Release Security

| Practice | Implementation |
|----------|----------------|
| Signed Commits | GPG signing required for releases |
| Reproducible Builds | Documented build process |
| Two-Factor Auth | Required for Chrome Web Store account |
| Hardware Key | Preferred for Web Store authentication |
| Pinned Dependencies | `package-lock.json` committed |

### Extension Security

| Practice | Implementation |
|----------|----------------|
| Minimal Permissions | Only necessary host permissions |
| No `<all_urls>` | Explicitly avoided |
| No Remote Code | All logic bundled in extension |
| Content Security Policy | Strict CSP in manifest |
| Message Validation | Typed message passing |

---

## Data Handling

### What We Process

| Data Type | Processing | Storage | Transmission |
|-----------|------------|---------|--------------|
| User prompts | In-browser only | **Never** | **Never** |
| Detection findings | Local analysis | Category + count only | Never by default |
| Settings | Local preference | chrome.storage.sync | Chrome Sync only |
| Statistics | Aggregated counts | Local only | Opt-in only |

### What We NEVER Do

:x: Store full prompt text  
:x: Transmit prompt content to any server  
:x: Store clipboard history  
:x: Track individual keystrokes  
:x: Collect browsing history  
:x: Access data from non-target sites  

### Privacy by Design

```
┌─────────────────────────────────────────────────────────┐
│                    User's Browser                        │
│                                                          │
│  ┌──────────────┐    ┌──────────────┐                   │
│  │ AI Chat Site │───▶│   Content    │                   │
│  │ (ChatGPT,    │    │   Script     │                   │
│  │  Claude)     │    │              │                   │
│  └──────────────┘    └──────┬───────┘                   │
│                             │                            │
│                    ┌────────▼────────┐                  │
│                    │ Detection Engine│ ◀── Local only   │
│                    │ (Regex/Entropy) │                  │
│                    └────────┬────────┘                  │
│                             │                            │
│                    ┌────────▼────────┐                  │
│                    │  Warning Modal  │                   │
│                    └────────┬────────┘                  │
│                             │                            │
│              ┌──────────────┼──────────────┐            │
│              │              │              │             │
│        ┌─────▼────┐  ┌──────▼─────┐  ┌────▼────┐       │
│        │  Mask &  │  │   Send     │  │ Cancel  │       │
│        │ Continue │  │  Anyway    │  │         │       │
│        └──────────┘  └────────────┘  └─────────┘       │
│                                                          │
│  ╔══════════════════════════════════════════════════╗   │
│  ║        NO DATA LEAVES THIS BOUNDARY              ║   │
│  ╚══════════════════════════════════════════════════╝   │
└─────────────────────────────────────────────────────────┘
```

---

## Permissions Justification

### Required Permissions

| Permission | Justification |
|------------|---------------|
| `host_permissions: chat.openai.com` | Inject content script to monitor inputs |
| `host_permissions: claude.ai` | Inject content script to monitor inputs |
| `storage` | Persist user settings and statistics |
| `scripting` | Dynamic script injection for main world |

### NOT Requested

| Permission | Why NOT Needed |
|------------|----------------|
| `<all_urls>` | Only target AI chat sites |
| `webRequest` | Using DOM interception instead |
| `tabs` | No need to enumerate tabs |
| `history` | Not relevant to functionality |
| `cookies` | Not needed for detection |
| `downloads` | Only for explicit CSV export |

---

## Threat Model

### Assets Protected

1. **User prompt content**: Must never be exfiltrated
2. **User credentials**: Must not be intercepted by extension
3. **Detection statistics**: Aggregated counts only

### Threat Actors Considered

| Actor | Threat | Mitigation |
|-------|--------|------------|
| Malicious extension developer | Data exfiltration | Open source review, minimal permissions |
| Supply chain attacker | Compromised dependency | Pinned deps, `npm audit`, review updates |
| Web Store account compromise | Malicious update push | 2FA, hardware key, signed releases |
| Malicious website | XSS against extension | Content Security Policy, sanitized injection |

### Attack Vectors Mitigated

1. **DOM-based XSS**: Shadow DOM isolation for modal
2. **Message injection**: Typed message validation
3. **Dependency hijacking**: Pinned lockfile, audit checks
4. **Update hijacking**: Chrome Web Store signature verification

---

## Incident Response

### If a Vulnerability is Discovered

1. **Assess Severity**: Use CVSS scoring
2. **Develop Fix**: Create patch in private branch
3. **Test Fix**: Full regression testing
4. **Deploy**: Push update through Chrome Web Store
5. **Notify**: Inform affected users if data at risk
6. **Disclose**: Coordinate with reporter on public disclosure

### Severity Ratings

| Rating | Description | Response Time |
|--------|-------------|---------------|
| Critical | Data exfiltration possible | 24 hours |
| High | Bypass detection entirely | 7 days |
| Medium | Partial bypass or FP issue | 30 days |
| Low | Minor issue, no user impact | 90 days |

---

## Third-Party Dependencies

### Dependency Management

- All dependencies reviewed before addition
- Minimal dependency footprint maintained
- Regular updates via Dependabot/Renovate
- No dependencies with known vulnerabilities

### Current Dependencies

See `package.json` for current dependency list. Key dependencies:

| Package | Purpose | Security Notes |
|---------|---------|----------------|
| Preact | UI framework | Actively maintained, security-focused |
| Vitest | Testing | Dev only, not bundled |
| TypeScript | Type safety | Dev only, not bundled |

---

## Compliance

### Chrome Web Store Policies

This extension complies with:
- [Chrome Web Store Developer Program Policies](https://developer.chrome.com/docs/webstore/program-policies/)
- [Privacy Policy Requirements](https://developer.chrome.com/docs/webstore/program-policies/privacy/)
- [Single Purpose Policy](https://developer.chrome.com/docs/webstore/program-policies/quality-guidelines/)

### GDPR Compliance

- Data minimization by design
- No personal data transmission
- Clear privacy policy
- User control over all features

---

## Contact

**Security Issues**: aileakchecker@proton.me  
**General Inquiries**: aileakchecker@proton.me  
**Privacy Questions**: aileakchecker@proton.me

---

## Acknowledgments

We thank the following security researchers for responsibly disclosing vulnerabilities:

*No vulnerabilities reported yet. Be the first responsible reporter!*

---

*Last updated: January 13, 2026*
