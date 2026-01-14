# Chrome Web Store Submission Materials

This directory contains all materials needed for Chrome Web Store submission.

## Files Created

### ✅ Complete (Automated)
- `description.md` - Complete store listing copy with:
  - Extension name (16/45 chars) ✅
  - Short description (125/132 chars) ✅
  - Detailed description (~2,850/16,000 chars) ✅
  - Covers features, privacy, use cases ✅
- `SCREENSHOT_GUIDE.md` - Step-by-step guide for capturing screenshots

### ⚠️ Manual Work Required

#### Screenshots (5 required)
- `screenshots/screenshot-1-modal.png` - Warning modal in action
- `screenshots/screenshot-2-popup.png` - Popup settings page
- `screenshots/screenshot-3-mask-feature.png` - Mask & Continue feature
- `screenshots/screenshot-4-detectors.png` - Detection types supported
- `screenshots/screenshot-5-before-after.png` - Before/after redaction

**Specifications**:
- Format: PNG
- Dimensions: 1280x800 (preferred) or 640x400
- See `SCREENSHOT_GUIDE.md` for detailed instructions

#### Promotional Images
- `promo-small.png` - 440x280 PNG (required)
- `promo-large.png` - 920x680 PNG (optional)

**Design notes**:
- Use extension icon and brand color (#4F46E5)
- Keep text minimal
- Use design tool (Canva, Figma, etc.)

---

## Quick Start for Manual Tasks

### 1. Capture Screenshots
```bash
# Build extension
npm run build

# Load in Chrome:
# 1. Go to chrome://extensions
# 2. Enable Developer mode
# 3. Load unpacked → select dist/
# 4. Follow SCREENSHOT_GUIDE.md for each screenshot
```

### 2. Create Promotional Images
- Use `public/icons/icon128.png` as base
- Brand color: #4F46E5 (indigo)
- Text: "Protect Your Data" or similar
- Save to `store/` directory

---

## Store Listing Summary

**Extension Name**: AI Leak Checker (16/45 chars) ✅

**Short Description** (125/132 chars) ✅:
```
Prevent accidental data leaks to AI tools. Detects API keys, passwords, and PII before you paste them into ChatGPT or Claude.
```

**Category**: Privacy & Security ✅

**All text content**: Complete and ready ✅

**Screenshots**: Manual capture required ⚠️

**Promotional images**: Manual design required ⚠️
