# 3. Security Architecture

[Back to index](index.md)


## 3.1 Threat Model

| Threat | Impact | Mitigation |
|--------|--------|------------|
| Extension compromise (supply chain) | Critical | Hardware 2FA, reproducible builds, minimal deps |
| Malicious site injection | High | CSP, isolated content script world |
| Data exfiltration via telemetry | High | No network by default, local-only storage |
| Prompt content exposure | High | Never store prompt text, mask in findings |
| Selector config tampering | Medium | SRI hashes on config fetch, local fallback |

## 3.2 Permission Model

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

## 3.3 Content Security Policy

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

## 3.4 Data Flow Security

```
User Input → Content Script → Detection Engine → Result
                    │
                    └──→ Storage (stats only, no content)
```

**Never transmitted**: Prompt text, full findings, user PII  
**Stored locally**: Detection counts, timestamps, domains

**Content script**: Does not persist raw prompt text. Pending submission holds only metadata (findings, detector types, timestamp); Mask & Continue re-reads from the input when the user acts. **Window postMessage** (injected ↔ content): Injected script sends `scan_request` with content; content script replies with `scan_result` containing `hasSensitiveData` only (no `finding.value`). `postMessage` uses `targetOrigin` = `window.location.origin`, not `*`.
