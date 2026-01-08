# AI Leak Checker

> 🛡️ **Your seatbelt for ChatGPT & AI tools** — Prevent accidental data leaks before you hit send.

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-green?logo=googlechrome)](https://chrome.google.com/webstore)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)](https://www.typescriptlang.org/)

## What is AI Leak Checker?

AI Leak Checker is a browser extension that detects sensitive information (API keys, passwords, credit cards, PII) before you accidentally paste it into AI chat platforms like ChatGPT or Claude.

**Key Features:**
- 🔒 **Local-first** — All detection happens in your browser. No data leaves your device.
- ⚡ **Real-time** — Scans as you type and paste
- 🎯 **Low noise** — Tuned to minimize false positives
- 🔧 **Configurable** — Enable/disable detectors, add allowlists

## Supported Platforms

| Platform | Status |
|----------|--------|
| ChatGPT | ✅ Supported |
| Claude | ✅ Supported |
| Gemini | 🔜 Coming soon |
| Copilot | 🔜 Coming soon |

## Installation

### From Chrome Web Store (Recommended)

1. Visit the [Chrome Web Store listing](#) <!-- TODO: Add link -->
2. Click "Add to Chrome"
3. Done! The extension will activate on supported sites.

### From Source (Development)

```bash
# Clone the repository
git clone https://github.com/yourusername/ai-leak-checker.git
cd ai-leak-checker

# Install dependencies
npm install

# Build the extension
npm run build

# Load in Chrome:
# 1. Go to chrome://extensions
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the `dist` folder
```

## How It Works

```
You type/paste sensitive data
         │
         ▼
┌─────────────────────┐
│  Extension detects  │
│  • API keys         │
│  • Credit cards     │
│  • Email addresses  │
│  • UK phone numbers │
│  • UK NI numbers    │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Warning modal      │
│  shows detected     │
│  items              │
└─────────┬───────────┘
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
 [Mask &     [Send
 Continue]   Anyway]
```

## Detection Capabilities

### High Confidence (Low False Positives)

| Type | Example Pattern |
|------|-----------------|
| OpenAI API Key | `sk-...` |
| AWS Access Key | `AKIA...` |
| GitHub Token | `ghp_...`, `gho_...` |
| Stripe Key | `sk_live_...`, `sk_test_...` |
| Slack Token | `xoxb-...`, `xoxp-...` |

### Medium Confidence

| Type | Detection Method |
|------|------------------|
| Credit Card | Luhn algorithm validation |
| High-Entropy String | Shannon entropy > 4.5 |
| Password Context | Keywords + entropy |

### Configurable

| Type | Default |
|------|---------|
| Email | Off (often intentional) |
| UK Phone | Off (often false positive) |
| UK Postcode | Off (low risk) |

## Privacy

**We take privacy seriously:**

- ✅ All detection runs locally in your browser
- ✅ No prompt content is ever stored
- ✅ No data is transmitted to external servers
- ✅ Only anonymized statistics (counts) are tracked locally
- ✅ You can export or delete your data anytime

Read our full [Privacy Policy](#). <!-- TODO: Add link -->

## Configuration

Click the extension icon to access settings:

- **Detectors** — Enable/disable specific detection types
- **Sensitivity** — Low / Medium / High
- **Strict Mode** — Block without override option
- **Allowlist** — Strings to ignore

## Development

### Prerequisites

- Node.js 18+
- npm 9+

### Commands

```bash
# Development (watch mode)
npm run dev

# Production build
npm run build

# Run unit tests
npm run test:unit

# Run E2E tests (requires extension built)
npm run test:e2e

# Lint
npm run lint

# Type check
npm run typecheck
```

### Project Structure

```
ai-leak-checker/
├── src/
│   ├── background/      # Service worker
│   ├── content/         # Content scripts
│   ├── popup/           # Extension popup UI
│   ├── injected/        # Main world scripts
│   └── shared/          # Shared code
│       ├── detectors/   # Detection engine
│       ├── types/       # TypeScript types
│       └── utils/       # Utilities
├── tests/
│   ├── unit/            # Vitest tests
│   ├── e2e/             # Playwright tests
│   └── property/        # Hypothesis tests
├── configs/
│   └── selectors.json   # Site configurations
└── docs/
    ├── requirements/    # PRD, roadmap
    ├── architecture/    # ADRs, design docs
    └── tasks/           # Implementation plan
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

### Reporting Issues

- **False Positives** — If something is incorrectly flagged, open an issue with the (redacted) text that triggered it.
- **Site Breakage** — AI platforms update frequently. If detection stops working, let us know which site.
- **Feature Requests** — We're focused on the MVP, but we'd love to hear ideas.

## Security

If you discover a security vulnerability, please email [security@example.com](mailto:security@example.com) instead of opening a public issue.

## License

MIT — see [LICENSE](LICENSE) for details.

## Acknowledgments

- Built with [Vite](https://vitejs.dev/) and [Preact](https://preactjs.com/)
- Tested with [Vitest](https://vitest.dev/) and [Playwright](https://playwright.dev/)
- Icons from [Lucide](https://lucide.dev/)

---

<p align="center">
  Made with ❤️ for data privacy
</p>
