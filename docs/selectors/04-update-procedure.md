# 4. Update Procedure

[← Selector maintenance index](index.md)

## 4.1 Standard Update (Non-Emergency)

```bash
# 1. Create branch
git checkout -b fix/selector-chatgpt-20260113

# 2. Update selectors.json
# Edit configs/selectors.json with new selectors

# 3. Update version and lastVerified
# Increment version, update date

# 4. Run selector tests
npm run test:selectors

# 5. Run E2E tests
npm run build
npm run test:e2e

# 6. Commit and push
git add configs/selectors.json
git commit -m "fix(selectors): update ChatGPT selectors for Jan 2026 UI"
git push origin fix/selector-chatgpt-20260113

# 7. Create PR with test evidence
```

## 4.2 Emergency Hotfix

If selectors break in production:

```bash
# 1. Verify breakage
npm run test:selector-health -- --site=chat.openai.com

# 2. Quick investigation
# Open DevTools on site, find working selectors

# 3. Update config
vim configs/selectors.json

# 4. Test locally
npm run build
# Load unpacked extension, verify on live site

# 5. Fast-track PR
git checkout -b hotfix/selector-chatgpt-emergency
git add configs/selectors.json
git commit -m "hotfix(selectors): emergency fix for ChatGPT UI change"
git push origin hotfix/selector-chatgpt-emergency

# 6. Request expedited review
# Tag maintainer, explain urgency

# 7. Deploy immediately after merge
```

## 4.3 Remote Config Update (Future Feature)

If remote selector config is enabled:

1. Update `cdn.example.com/selectors.json`
2. Extension fetches on startup (24h cache)
3. No extension update required
