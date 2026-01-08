# Privacy Policy

**AI Leak Checker Browser Extension**

Last updated: January 2026

## Overview

AI Leak Checker is a browser extension designed to prevent accidental exposure
of sensitive data (API keys, credentials, personal information) when using AI
chat platforms. We are committed to protecting your privacy and being
transparent about our data practices.

## Data Collection

### What We DO NOT Collect

- **No prompt content**: We never store, transmit, or log the actual text you
  type into AI chat interfaces
- **No personal information**: We do not collect names, email addresses, or any
  identifying information
- **No browsing history**: We do not track which websites you visit
- **No analytics or telemetry**: We do not send any data to external servers
- **No API keys or credentials**: Detected sensitive data is never stored or
  transmitted

### What We Store Locally

The extension stores the following data **locally on your device only** using
Chrome's `chrome.storage.local` API:

1. **Settings preferences**: Your configuration choices (sensitivity level,
   enabled detectors, allowlist entries)
2. **Aggregate statistics**: Counts only (e.g., "5 potential leaks blocked
   today") - never the actual sensitive content
3. **Allowlist entries**: Domains or patterns you've explicitly marked as safe

This data:
- Never leaves your device
- Is not synced to any cloud service
- Can be cleared at any time via the extension settings
- Is automatically deleted when you uninstall the extension

## How the Extension Works

1. **Local scanning**: When you submit text to supported AI platforms (ChatGPT,
   Claude), the extension scans the text locally in your browser
2. **Pattern matching**: We use regex patterns and entropy analysis to detect
   potential sensitive data
3. **User notification**: If sensitive data is detected, you're shown a warning
   modal with options to cancel, mask, or proceed
4. **No external communication**: All processing happens locally - we never
   send your data anywhere

## Permissions Explained

The extension requests the following Chrome permissions:

| Permission | Why We Need It |
|------------|----------------|
| `storage` | Store your settings and aggregate stats locally |
| `activeTab` | Read/modify content only on the current tab when you click the extension |
| Host permissions for `chat.openai.com`, `chatgpt.com`, `claude.ai` | Inject content scripts to monitor form submissions on these specific sites only |

We follow the principle of **least privilege** - we only request permissions
absolutely necessary for the extension to function.

## Third-Party Services

AI Leak Checker does not use any third-party services, analytics, or tracking.
There are no:
- Google Analytics or similar tracking
- Crash reporting services
- A/B testing platforms
- Advertising networks
- External API calls

## Data Security

- All processing occurs locally in your browser's sandboxed environment
- We use Chrome's built-in storage APIs which are encrypted at rest
- The extension code is open source and auditable at
  [GitHub repository URL]
- We do not have access to any of your data

## Children's Privacy

AI Leak Checker is not directed at children under 13 and we do not knowingly
collect data from children.

## Changes to This Policy

We may update this privacy policy from time to time. We will notify users of
any material changes by updating the "Last updated" date and, for significant
changes, through the Chrome Web Store update notes.

## Your Rights

Since we don't collect personal data, there is no personal data to access,
correct, or delete. However, you can:
- Clear all locally stored data via the extension settings
- Uninstall the extension at any time to remove all associated data
- Review the source code to verify our privacy practices

## Contact

If you have questions about this privacy policy or the extension's data
practices, please:
- Open an issue on our GitHub repository
- Email: [your contact email]

## Open Source

AI Leak Checker is open source software. You can review the complete source
code to verify that we handle your data as described in this policy.

---

**Summary**: AI Leak Checker processes everything locally, stores only settings
and counts (never actual sensitive data), and never transmits anything to
external servers. Your privacy is protected by design.
