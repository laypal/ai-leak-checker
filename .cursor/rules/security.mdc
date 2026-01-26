---
description: Security requirements and privacy constraints. Critical for a security-focused extension.
globs:
alwaysApply: true
---

# Security & Privacy Requirements

## Core Privacy Principles

### Never Store Prompt Content

```typescript
// ✅ Correct - store only metadata
interface ScanStat {
  domain: string;          // "chat.openai.com"
  detectorType: string;    // "api_key_openai"
  timestamp: string;       // ISO date bucket
  // NO prompt text ever
}

// ❌ FORBIDDEN
interface ScanStat {
  prompt: string;          // NEVER DO THIS
  clipboard: string;       // NEVER DO THIS
}
```

### Mask Before Logging

```typescript
// ✅ Correct
console.log(`[AI Leak Checker] Found ${finding.type}: ${maskValue(finding.value)}`);

// ❌ Wrong - exposes secrets
console.log(`Found: ${finding.value}`);
```

## Permission Minimization

### Manifest Permissions

```json
// ✅ Correct - specific host permissions
{
  "host_permissions": [
    "https://chat.openai.com/*",
    "https://claude.ai/*",
    "https://gemini.google.com/*"
  ]
}

// ❌ FORBIDDEN - overly broad
{
  "host_permissions": ["<all_urls>"]
}
```

### Content Security Policy

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

## Code Security

### Never Use

```typescript
// ❌ FORBIDDEN - all of these
eval(anyString);
new Function(anyString);
document.write(anything);
innerHTML = untrustedContent;
```

### Input Validation

```typescript
// ✅ Correct - validate all inputs
function processConfig(raw: unknown): Config {
  if (!isValidConfig(raw)) {
    throw new TypeError('Invalid config shape');
  }
  return raw;
}

// ❌ Wrong - blind trust
function processConfig(raw: any): Config {
  return raw as Config;
}
```

## Supply Chain Security

### Build Security

1. **Lockfile policy** - Use caret (^) ranges in package.json with committed package-lock.json
2. **Audit regularly** - Run `npm audit` before releases
3. **Reproducible builds** - Same input = same output (lockfile ensures consistency)
4. **Separate signing keys** - Don't commit to repo

### Extension Update Security

1. **Hardware 2FA** on Chrome Web Store account
2. **Review all dependency updates** manually
3. **No remote code loading** - Everything bundled

## Data Flow Rules

### What CAN Leave the Extension

- Aggregate statistics (counts only) to optional dashboard
- Error reports (no user data) if user opts in

### What MUST Stay Local

- Prompt content (never transmitted)
- Clipboard content (ephemeral only)
- Detection findings (stored locally only)
- User settings (chrome.storage.local)

## Vulnerability Classes to Prevent

| Class | Prevention |
|-------|------------|
| XSS | Shadow DOM isolation, no innerHTML with user content |
| Data exfiltration | No network calls with user content |
| Privilege escalation | Minimal permissions, no `<all_urls>` |
| Supply chain | Pinned via lockfile (use caret ranges in package.json with committed package-lock.json), code review, no remote code |
| Prompt injection | N/A - we don't send to LLMs |

## Security Review Checklist

Before any release:

- [ ] No `<all_urls>` permission
- [ ] No `eval()` or `Function()`
- [ ] All user data stays local
- [ ] Dependencies audited
- [ ] CSP configured correctly
- [ ] No secrets in code
