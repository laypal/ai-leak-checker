# Chrome Web Store Justification Notes

> **Purpose**: Documentation for Chrome Web Store reviewers explaining permission requests and design decisions.

---

## Host Permissions

### chat.openai.com and chatgpt.com

**Why both domains are required**:

OpenAI is currently transitioning between `chat.openai.com` and `chatgpt.com`. Both domains are actively used and users may land on either domain depending on:
- Geographic location
- Account type
- Redirect behavior

**Impact of removing either domain**:
- Users accessing the removed domain would have no detection protection
- Extension would fail silently on that domain
- User experience would be inconsistent

**Documentation**:
- Privacy Policy: [PRIVACY_POLICY.md](../PRIVACY_POLICY.md#L74) explains both domains
- Selector Configuration: [configs/selectors.json](../configs/selectors.json) includes both domains with separate configurations

**Future**: We monitor OpenAI's domain strategy and will remove `chat.openai.com` if/when OpenAI completes full migration to `chatgpt.com`.

### claude.ai

**Why required**:
- Primary domain for Anthropic's Claude AI chat platform
- Required for content script injection to monitor form submissions

---

## Permissions

### storage

**Why required**:
- Store user settings (detector preferences, sensitivity levels)
- Store aggregate statistics (counts only, never actual sensitive data)
- Store allowlist entries

**Data stored**: Settings and counts only. No prompt content, no PII, no sensitive data.

### activeTab

**Why required**:
- Inject content scripts on target sites when user interacts with extension
- Read page content only on current tab when extension is activated

**Scope**: Only applies to current active tab, not all tabs.

---

## Main World Script Injection

**Why required**:
- Fallback mechanism when DOM selectors fail (after 30-second retry window)
- Intercepts `window.fetch` and `XMLHttpRequest` to catch programmatic submissions
- Only activated when DOM interception fails (conditional, not always-on)

**Security**:
- Script runs in main world (required for fetch/XHR patching)
- Communicates with content script via `postMessage` (validated)
- No direct DOM manipulation from injected script

**Privacy**:
- No data transmitted to external servers
- All processing happens locally
- Intercepted data is scanned in-memory only

---

## Design Decisions

### Conditional Fallback Injection

**Decision**: Fetch/XHR patching is only injected when DOM selectors fail (after 30-second grace period).

**Rationale**:
- Minimizes main world script injection (store review concern)
- Only activates when necessary
- Prevents dual execution (DOM + fetch patching simultaneously)

**Implementation**: Health check runs after retry window ends. If selectors not found, fallback activates.

### Tab-Specific Badges

**Decision**: Warning badge (⚠) is tab-specific, not global.

**Rationale**:
- Multiple tabs may have different states (one working, one in fallback)
- Global badge would be misleading
- Tab-specific badge accurately reflects per-tab status

---

## Privacy & Security

### Zero Network Transmission

- No analytics or telemetry
- No remote configuration fetching (selectors bundled)
- No external API calls
- All processing local-only

### Data Minimization

- Never store prompt content
- Never store detected sensitive data
- Only store counts and settings
- All data stays on device

See [PRIVACY_POLICY.md](../PRIVACY_POLICY.md) for complete privacy documentation.

---

## Open Source

The extension is open source: [ai-leak-checker](https://github.com/laypal/ai-leak-checker)

All code is auditable and verifiable.
