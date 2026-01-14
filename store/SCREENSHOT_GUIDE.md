# Screenshot Capture Guide

This guide helps you capture the required screenshots for Chrome Web Store submission.

## Prerequisites

1. **Build the extension**:
   ```bash
   npm run build
   ```

2. **Load extension in Chrome**:
   - Go to `chrome://extensions`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `dist/` directory

3. **Prepare test accounts** (optional but recommended):
   - Have ChatGPT account ready: https://chat.openai.com
   - Have Claude account ready: https://claude.ai

---

## Screenshot Specifications

- **Format**: PNG
- **Dimensions**: 1280x800 (preferred) or 640x400
- **Save location**: `store/screenshots/`
- **Naming**: `screenshot-1-modal.png`, `screenshot-2-popup.png`, etc.

---

## Screenshot 1: Warning Modal in Action

**File**: `store/screenshots/screenshot-1-modal.png`  
**Dimensions**: 1280x800  
**Purpose**: Show the warning modal appearing when sensitive data is detected

**Steps**:
1. Navigate to https://chat.openai.com (ChatGPT) or https://claude.ai
2. Open the chat interface
3. Type or paste this test API key:
   ```
   sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234yzABC567DEF890GHI
   ```
4. Press Enter or click Send button
5. **Capture**: The warning modal should appear showing:
   - Modal title: "Sensitive Data Detected"
   - List of findings (e.g., "OpenAI API Key")
   - Three buttons: "Mask & Continue", "Send Anyway", "Cancel"
6. Make sure the modal is clearly visible and centered
7. Adjust browser window to 1280x800 if possible, or resize screenshot after capture

---

## Screenshot 2: Popup Settings Page

**File**: `store/screenshots/screenshot-2-popup.png`  
**Dimensions**: 1280x800  
**Purpose**: Show the extension popup with settings visible

**Steps**:
1. Click the extension icon in the Chrome toolbar
2. The popup should open showing:
   - Tabs: "Settings" and "Statistics"
   - Settings tab should show:
     - Sensitivity level selector (Low/Medium/High)
     - List of detectors organized by category
     - Toggle switches for each detector
3. Expand the detector list to show multiple categories
4. **Capture**: Take screenshot of the popup window
5. Note: Popup size is fixed, so you may need to capture just the popup or show it on a larger canvas

**Alternative approach**: Capture popup and paste onto a 1280x800 canvas with extension branding

---

## Screenshot 3: Mask & Continue Feature

**File**: `store/screenshots/screenshot-3-mask-feature.png`  
**Dimensions**: 1280x800  
**Purpose**: Show the redaction functionality

**Steps**:
1. Navigate to ChatGPT or Claude
2. Type a message with sensitive data, for example:
   ```
   My API key is sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234yzABC567DEF890GHI and my email is john@example.com
   ```
3. Press Enter to trigger the warning modal
4. Click "Mask & Continue" button
5. **Capture**: Show the input field after redaction with masked values:
   - Original: `sk-proj-abc123...`
   - Redacted: `[REDACTED_API_KEY_OPENAI]` or similar
6. Make sure both the input field and the redacted text are visible

---

## Screenshot 4: Detection Types Supported

**File**: `store/screenshots/screenshot-4-detectors.png`  
**Dimensions**: 1280x800  
**Purpose**: Display all supported detection types

**Steps**:
1. Open extension popup
2. Navigate to Settings tab
3. Scroll to show all detector categories:
   - API Keys (OpenAI, AWS, GitHub, etc.)
   - Secrets (Private Keys, Passwords)
   - Financial (Credit Cards, IBAN)
   - PII (Email, UK Phone, UK NI, US SSN)
   - Generic (High Entropy)
4. **Capture**: Show the full detector list with:
   - Category headers
   - Individual detector toggles
   - Visual grouping
5. Ensure at least 3-4 categories are visible

---

## Screenshot 5: Before/After Redaction

**File**: `store/screenshots/screenshot-5-before-after.png`  
**Dimensions**: 1280x800  
**Purpose**: Side-by-side comparison of original vs redacted text

**Steps**:
1. Open an image editor (or use a tool that supports side-by-side capture)
2. **Before**: Capture ChatGPT/Claude input field with sensitive data visible:
   ```
   My API key is sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234yzABC567DEF890GHI
   ```
3. **After**: Trigger mask and capture the same field with redacted data:
   ```
   My API key is [REDACTED_API_KEY_OPENAI]
   ```
4. **Combine**: Create a side-by-side comparison in an image editor
5. Add labels: "Before" and "After" or "Original" and "Redacted"
6. Export as 1280x800 PNG

**Alternative**: Capture two separate screenshots and combine them later

---

## Tips for Best Screenshots

1. **Clean browser**: Close unnecessary tabs, use a clean profile if possible
2. **Good contrast**: Ensure text is readable and UI elements are clear
3. **Highlight key features**: Use annotations or arrows if needed (optional)
4. **Consistent style**: Keep browser window size consistent across screenshots
5. **Test data**: Use obviously fake API keys (like the examples above)
6. **Modal visibility**: Ensure warning modal is clearly visible and not cut off

---

## Tools for Screenshot Capture

**Built-in options**:
- **Windows**: Snipping Tool or Windows + Shift + S
- **macOS**: Command + Shift + 4
- **Chrome DevTools**: F12 → More tools → Screenshot

**Third-party tools**:
- **Lightshot**: https://app.prntscr.com/
- **Greenshot**: https://getgreenshot.org/
- **ShareX**: https://getsharex.com/ (Windows)

**Image editing** (for combining/annotating):
- **GIMP**: Free, open-source
- **Canva**: Online tool, free tier available
- **Figma**: Free for personal use

---

## Verification Checklist

After capturing screenshots, verify:
- [ ] All 5 screenshots saved to `store/screenshots/`
- [ ] Each screenshot is PNG format
- [ ] Dimensions are 1280x800 (or 640x400)
- [ ] File sizes are reasonable (< 2MB each)
- [ ] Text is readable and clear
- [ ] UI elements are not cut off
- [ ] Sensitive data in screenshots is fake/test data only

---

## Notes

- Use fake/test API keys and data for all screenshots
- Do not use real credentials or personal information
- Screenshots may need to be updated if UI changes
- Consider creating multiple variants for A/B testing
