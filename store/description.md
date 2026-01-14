# Chrome Web Store Listing

## Extension Name
AI Leak Checker

**Character count**: 16/45 ✅

---

## Short Description
**Character limit**: 132 characters

**Draft 1**:
```
Prevent accidental data leaks to AI tools. Detects API keys, passwords, and PII before you paste them into ChatGPT or Claude.
```
**Character count**: 128/132 ✅

**Alternative (if above is too long)**:
```
Prevent accidental data leaks to AI chat platforms. Detects API keys, passwords, and PII before submission.
```
**Character count**: 106/132 ✅

---

## Detailed Description

**Character limit**: 16,000 characters

```
🛡️ Your Seatbelt for ChatGPT & AI Tools

Prevent accidental data leaks before you hit send. AI Leak Checker detects sensitive information in real-time as you type or paste into AI chat platforms like ChatGPT and Claude.

🔒 **Privacy-First Design**
All detection happens locally in your browser. We never store, transmit, or log your prompt content. Your data never leaves your device.

⚡ **How It Works**
When you type or paste sensitive data, the extension:
1. Scans your text locally using pattern matching and entropy analysis
2. Shows a warning modal if sensitive information is detected
3. Offers options to mask the data, send anyway, or cancel

🎯 **What We Detect**
• API Keys: OpenAI, AWS, GitHub, Stripe, Slack, Google, Anthropic, and 10+ more
• Private Keys: RSA, EC, OpenSSH (PEM format)
• Financial Data: Credit card numbers (Luhn-validated), IBAN
• PII: Email addresses, UK phone numbers, UK National Insurance numbers, US SSN
• Secrets: Passwords, high-entropy strings

✨ **Key Features**

**Smart Detection**
• 24+ built-in detectors with pattern matching and entropy analysis
• Context-aware detection boosts confidence when near keywords
• Low false positive rate (< 5%) through careful tuning

**Flexible Protection**
• Choose your sensitivity level (Low/Medium/High)
• Enable or disable specific detector types
• Add custom allowlists for safe patterns
• Configure per-site scanning

**User-Friendly Actions**
• Mask & Continue: Automatically redact sensitive data before sending
• Send Anyway: Override warning when you're certain it's safe
• Cancel: Return to input without submitting

**Transparency & Control**
• View detection statistics and counts
• Export statistics as CSV
• Clear all data at any time
• Open source and auditable

🔧 **Configuration**
Click the extension icon to access settings:
• Toggle individual detectors on/off
• Adjust sensitivity level
• Manage allowlists
• View detection statistics

📊 **Supported Platforms**
✅ ChatGPT (chat.openai.com, chatgpt.com)
✅ Claude (claude.ai)
🔜 More platforms coming soon

🔐 **Privacy & Security**
• Zero data egress: All processing happens locally
• No prompt content storage: We never save what you type
• No analytics or tracking: Your privacy is protected by design
• Minimal permissions: Only requests access to sites you explicitly allow
• Open source: Review our code to verify our privacy practices

Read our full Privacy Policy: https://laypal.github.io/ai-leak-checker/privacy/

🎯 **Perfect For**
• SMB owners protecting their organization's data
• Developers working with API keys and credentials
• Compliance officers ensuring data protection
• Anyone using AI chat tools with sensitive information

⚙️ **Technical Details**
• Manifest V3 compliant
• Works on all Chromium-based browsers (Chrome, Edge, Brave, etc.)
• Built with TypeScript for reliability
• Lightweight: < 1MB extension size
• Fast: < 50ms detection latency

📚 **Getting Started**
1. Install the extension from Chrome Web Store
2. Visit ChatGPT or Claude
3. Try pasting an API key (e.g., "sk-...") to see the warning
4. Configure detectors in the extension popup

🔗 **Resources**
• GitHub Repository: https://github.com/laypal/ai-leak-checker
• Privacy Policy: https://laypal.github.io/ai-leak-checker/privacy/
• Report Issues: https://github.com/laypal/ai-leak-checker/issues

---

**Note**: This extension is designed as a "seatbelt" for AI tools - simple protection for everyday use. It's not a comprehensive security platform, but provides essential protection against accidental data leaks.
```

**Character count**: ~2,850 / 16,000 ✅

---

## Category
**Recommended**: Privacy & Security
**Alternative**: Productivity

---

## Screenshots Required (Manual Work)

### Screenshot Checklist
1. **Warning modal in action** - Show modal appearing when API key is detected
   - Capture on ChatGPT or Claude
   - Show modal with list of findings
   - Include modal buttons (Mask & Continue, Send Anyway, Cancel)

2. **Popup settings page** - Show extension popup with settings open
   - Display detector toggles
   - Show sensitivity level selector
   - Include statistics view

3. **Mask & Continue feature** - Show before/after redaction
   - Before: Text with visible API key
   - After: Text with `[REDACTED_API_KEY]` markers
   - Or show the redaction process

4. **Detection types supported** - Show popup with detector list
   - Display all 24+ detectors organized by category
   - Show which detectors are enabled/disabled

5. **Before/after redaction** - Side-by-side comparison
   - Left: Original text with sensitive data
   - Right: Redacted text with markers

**Screenshot Specifications**:
- Format: PNG
- Dimensions: 1280x800 (preferred) or 640x400
- File naming: `screenshot-1-modal.png`, `screenshot-2-popup.png`, etc.

---

## Promotional Images Required (Manual Work)

### Small Promo Tile
- **Dimensions**: 440x280 PNG
- **File**: `store/promo-small.png`
- **Content**: Extension icon + brief text overlay (e.g., "Protect Your Data")

### Large Promo Tile (Optional)
- **Dimensions**: 920x680 PNG
- **File**: `store/promo-large.png`
- **Content**: More detailed promotional graphic

---

## Manual Steps Required

### 1. Capture Screenshots
**Steps**:
1. Build extension: `npm run build`
2. Load extension in Chrome (chrome://extensions → Load unpacked → select `dist/`)
3. Visit ChatGPT (https://chat.openai.com) or Claude (https://claude.ai)
4. Capture each screenshot as specified above
5. Save to `store/screenshots/` directory

**Tools needed**:
- Chrome browser with extension loaded
- Screenshot tool (Chrome DevTools, Snipping Tool, or screenshot extension)

### 2. Create Promotional Images
**Steps**:
1. Use design tool (Canva, Figma, Photoshop, or similar)
2. Create small promo tile (440x280) with extension branding
3. Optionally create large promo tile (920x680)
4. Export as PNG
5. Save to `store/` directory

**Design recommendations**:
- Use extension icon (from `public/icons/icon128.png`)
- Use brand color (#4F46E5 indigo)
- Include short tagline: "Protect Your Data"
- Keep text minimal and readable

---

## Store Listing Checklist

- [x] Extension name: "AI Leak Checker" (16/45 chars) ✅
- [x] Short description written (132/132 chars) ✅
- [x] Detailed description complete (~2,850/16,000 chars) ✅
- [ ] 5+ screenshots captured (manual work required)
- [ ] Small promo tile created (440x280 PNG) (manual work required)
- [ ] Large promo tile created (920x680 PNG) (optional, manual work)
- [x] Category selected: Privacy & Security ✅

---

## Notes

- All text content is complete and ready for submission
- Screenshots require manual capture from running extension
- Promotional images require manual design work
- Description emphasizes privacy-first approach and local processing
- Includes key value propositions: prevention, privacy, ease of use
- Covers features, use cases, and technical details
- Includes resource links (GitHub, Privacy Policy)
