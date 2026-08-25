# When to Use What

> Part of the [AI Tooling Usage Guide](index.md).

## Development Phase

### 🟢 Starting a Feature
`````
1. Use @skills for implementation
   → Provides structure and boilerplate
   
2. Use @security-reviewer during development
   → Catches issues early
   
3. Use @test-coverage-analyzer before PR
   → Ensures adequate testing

Example Workflow:

# Step 1: Implement detector
@skills add-detector-pattern
# "Add support for AWS access keys"

# Step 2: Security check
@security-reviewer
# [paste implementation code]

# Step 3: Coverage check
@test-coverage-analyzer
# Analyze: src/shared/detectors/aws-keys.ts
`````

---

### 🟡 Fixing Bugs
`````
1. Use @performance-analyzer for slowness
   → Identifies bottlenecks
   
2. Use @selector-validator for DOM issues
   → Diagnoses selector failures
   
3. Use relevant @skills for fixes
   → Implements proper solution

Example Workflow:

# Bug: "Detection is slow on long prompts"

# Step 1: Profile performance
@performance-analyzer
# Analyze: src/shared/detectors/index.ts

# Step 2: Implement fix based on recommendations
@skills add-detector-pattern
# Add chunking logic as suggested

# Step 3: Verify fix
npm run test:bench
`````

---

### 🔴 Pre-Release
`````
1. @documentation-sync
   → Ensure docs match code
   
2. @manifest-v3-compliance
   → Validate Web Store requirements
   
3. @security-reviewer (full codebase)
   → Final security audit

Example Workflow:

# Preparing for v1.0.0 release

# Step 1: Sync documentation
@documentation-sync
# Review: All docs in /docs folder

# Step 2: MV3 compliance
@manifest-v3-compliance
# Validate: manifest.json and all source files

# Step 3: Security audit
@security-reviewer
# Review: Entire src/ directory

# Step 4: Generate changelog
git log --oneline v0.9.0..HEAD > CHANGELOG.md

Workflow Examples

Example 1: Adding Anthropic API Key Detection
Scenario: Project needs to detect Claude API keys (sk-ant-api03-...)
Workflow:

# 1. Implement using skill
@skills add-detector-pattern
`````

**In chat**:
`````
I need to add detection for Anthropic API keys.

Format: sk-ant-api03-[A-Za-z0-9-_]{95}
Example: sk-ant-api03-abc123def456...

Severity: high

After implementation:

# 2. Run security review
@security-reviewer
`````

**In chat**:
`````
Review this new detector for security issues:

[paste: src/shared/detectors/anthropic-keys.ts]

After review passes:

# 3. Check test coverage
@test-coverage-analyzer
`````

**In chat**:
`````
Analyze test coverage for the new Anthropic key detector

Before committing:

# 4. Update documentation
@documentation-sync
`````

**In chat**:
`````
I just added Anthropic API key detection.
Update ROADMAP.md and DETECTORS.md to reflect this.

Example 2: ChatGPT UI Changed (Selectors Broken)
Scenario: Extension stopped working on ChatGPT after UI update

Workflow:

# 1. Diagnose selector issues
@selector-validator
`````

**In chat**:
`````
ChatGPT selectors are failing. Here's the current config:

{
  "textarea": "textarea.css-abc123",
  "submitButton": "button[type='submit']"
}

The textarea selector is not finding any elements.

After getting recommendations:

# 2. Update selectors using skill
@skills update-selectors
`````

**In chat**:
`````
Update ChatGPT selectors based on new DOM structure:

New textarea: [data-testid='prompt-textarea']
New button: button[aria-label='Submit']

After updating:

# 3. Run E2E tests
npm run test:e2e -- tests/e2e/chatgpt.spec.ts

# 4. If tests pass, commit
git add configs/selectors.json
git commit -m "fix: Update ChatGPT selectors for 2025-01 UI"


Example 3: Performance Issue Report
Scenario: User reports "Extension slows down ChatGPT with long prompts"

Workflow:

# 1. Profile performance
@performance-analyzer
`````

**In chat**:
`````
Users report slowness when typing long prompts (10KB+).
Analyze detection performance in:
- src/shared/detectors/index.ts
- src/content/index.ts

After analysis identifies bottleneck:

# 2. Implement optimization
Based on agent recommendations:

// BEFORE (from analysis)
function detect(text: string) {
  patterns.forEach(p => text.match(p.regex)); // Slow on large text
}

// AFTER (implement chunking)
function detect(text: string) {
  const CHUNK_SIZE = 10000;
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    const chunk = text.slice(i, i + CHUNK_SIZE);
    patterns.forEach(p => chunk.match(p.regex));
  }
}

# 3. Benchmark improvements
npm run test:bench

# 4. Verify in E2E
npm run test:e2e -- tests/e2e/performance.spec.ts


Example 4: Pre-Submit Web Store Checklist
Scenario: Ready to submit extension to Chrome Web Store

Complete Workflow:

# Step 1: Documentation sync
@documentation-sync
`````
**In chat**:
`````
About to submit v1.0.0 to Web Store.
Verify all documentation is current and accurate.

# Step 2: MV3 compliance check
@manifest-v3-compliance
`````
**In chat**:
`````
Validate entire codebase for Manifest V3 compliance.
This is for Chrome Web Store submission.

# Step 3: Security audit
@security-reviewer
`````
**In chat**:
`````
Perform full security audit of:
- All src/ files
- manifest.json
- configs/

Focus on:
- Privacy (no data leaks)
- Permissions (minimal scope)
- CSP compliance

# Step 4: Performance validation
@performance-analyzer
`````
**In chat**:
`````
Run full performance analysis to ensure:
- Detection < 100ms for 10KB text
- No layout thrashing
- No memory leaks

# Step 5: Build and package
npm run build
npm run package

# Step 6: Manual testing
# Load unpacked extension and test:
# - ChatGPT (3 test cases)
# - Claude (3 test cases)
# - Edge cases (false positives, large text)

# Step 7: Submit to Web Store
# Use the generated .zip from step 5
`````
