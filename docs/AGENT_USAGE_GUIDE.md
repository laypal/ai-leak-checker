# Cursor Skills & Subagents Usage Guide

> Best practices for leveraging AI-powered development tools in the AI Leak Checker project

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Skills vs Subagents](#skills-vs-subagents)
3. [When to Use What](#when-to-use-what)
4. [Workflow Examples](#workflow-examples)
5. [Common Pitfalls](#common-pitfalls)

---

## Quick Reference

### Skills (Task Execution)

| Skill | Use When | Command |
|-------|----------|---------|
| `add-detector-pattern` | Adding new leak detection logic | `@skills add-detector-pattern` |
| `update-selectors` | AI platform UI changed | `@skills update-selectors` |
| `create-e2e-test` | Adding new test scenarios | `@skills create-e2e-test` |
| `security-review-checklist` | Before committing sensitive code | `@skills security-review-checklist` |

### Subagents (Code Review & Analysis)

| Subagent | Use When | Command |
|----------|----------|---------|
| `security-reviewer` | Reviewing PRs, security concerns | `@security-reviewer` |
| `test-coverage-analyzer` | Identifying missing tests | `@test-coverage-analyzer` |
| `selector-validator` | Validating DOM selector stability | `@selector-validator` |
| `documentation-sync-agent` | After feature completion | `@documentation-sync-agent` |
| `performance-analyzer` | Investigating slowness | `@performance-analyzer` |
| `manifest-v3-compliance` | Before Web Store submission | `@manifest-v3-compliance` |

---

## Skills vs Subagents

### Skills (Procedural Knowledge)

**What they are**: Step-by-step guides for common tasks

**Use for**:
- ✅ Implementing new features
- ✅ Following established patterns
- ✅ Onboarding new developers
- ✅ Standardizing workflows

**Characteristics**:
- Prescriptive (do X, then Y, then Z)
- Include code templates
- Have validation commands
- Focus on execution

**Example**:
`````
User: "I need to add detection for GitHub tokens"
Use: @skills add-detector-pattern
Result: Step-by-step implementation with tests
`````

### Subagents (Domain Expertise)

**What they are**: Specialized reviewers with deep knowledge in specific domains

**Use for**:
- ✅ Code review and analysis
- ✅ Identifying issues and anti-patterns
- ✅ Providing expert recommendations
- ✅ Validating compliance

**Characteristics**:
- Analytical (what's wrong, why, how to fix)
- Domain-specific expertise
- Provide detailed reports
- Focus on quality assurance

**Example**:
`````
User: "Review this detection code for security issues"
Use: @security-reviewer
Result: Security analysis with risk assessment
`````

---

## When to Use What

### Development Phase

#### 🟢 Starting a Feature
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

#### 🟡 Fixing Bugs
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

#### 🔴 Pre-Release
`````
1. @documentation-sync-agent
   → Ensure docs match code
   
2. @manifest-v3-compliance
   → Validate Web Store requirements
   
3. @security-reviewer (full codebase)
   → Final security audit

Example Workflow:

# Preparing for v1.0.0 release

# Step 1: Sync documentation
@documentation-sync-agent
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
@documentation-sync-agent
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
@documentation-sync-agent
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

---

## Common Pitfalls

### ❌ Pitfall 1: Using Skills for Analysis

**Wrong**:
`````
@skills security-review-checklist
# Review this code for security issues
[paste 200 lines of code]
`````

**Why Wrong**: Skills are procedural guides, not reviewers

**Correct**:
`````
@security-reviewer
# Review this code for security issues
[paste 200 lines of code]
`````

---

### ❌ Pitfall 2: Using Subagents for Implementation

**Wrong**:
`````
@security-reviewer
# Implement OAuth flow for the extension
`````

**Why Wrong**: Subagents analyze, they don't implement

**Correct**:
`````
# First implement
[write the OAuth code]

# Then review
@security-reviewer
# Review this OAuth implementation for security issues
[paste implementation]
`````

---

### ❌ Pitfall 3: Skipping Documentation Sync

**Wrong Workflow**:
`````
1. Implement feature
2. Write tests
3. Commit
4. ❌ Never update docs
`````

**Correct Workflow**:
`````
1. Implement feature
2. Write tests
3. @documentation-sync-agent ← DON'T SKIP
4. Update docs per recommendations
5. Commit
`````

**Why It Matters**: Documentation drift leads to:
- Confusion for contributors
- Inaccurate project status
- Harder maintenance

---

### ❌ Pitfall 4: Ignoring Agent Recommendations

**Wrong**:
`````
@performance-analyzer
# [Agent identifies 1200ms detection time]

User: "That's fine, shipping anyway"
`````

**Why Wrong**: Performance issues compound and affect UX

**Correct**:
`````
@performance-analyzer
# [Agent identifies 1200ms detection time]

User: "Implement the chunking recommendation"
# [Implement fix]
# [Re-benchmark to verify]
`````

---

### ❌ Pitfall 5: Running Agents Too Late

**Wrong Timeline**:
`````
Day 1-10: Write code
Day 11: @security-reviewer finds 15 issues
Day 12-14: Fix issues (should have caught early)
`````

**Correct Timeline**:
`````
Day 1: @security-reviewer (setup review)
Day 2-10: Write code + iterative reviews
Day 11: Final @security-reviewer (finds 2 minor issues)
Day 12: Ship
`````

**Principle**: Review early and often

---

## Combining Skills and Subagents

### Pattern: Skill → Implement → Subagent → Refine
`````
1. @skills add-detector-pattern
   → Get implementation structure

2. [Implement the code]

3. @security-reviewer
   → Identify issues

4. [Fix issues]

5. @test-coverage-analyzer
   → Check test gaps

6. [Add missing tests]

7. @documentation-sync-agent
   → Update docs

8. Commit ✅
`````

### Pattern: Subagent → Diagnose → Skill → Fix
`````
1. @performance-analyzer
   → Identify bottleneck

2. @skills [relevant-skill]
   → Get fix template

3. [Implement fix]

4. @performance-analyzer
   → Verify improvement

5. Commit ✅
`````

---

## Keyboard Shortcuts (Cursor IDE)
`````
Cmd/Ctrl + K        → Open Cursor chat
@skills             → Invoke skill (tab-complete)
@security-reviewer  → Invoke subagent (tab-complete)
Cmd/Ctrl + L        → Select current file for context


Integration with Git Workflow
Pre-Commit Hook

# .husky/pre-commit

# Run security check on staged files
STAGED=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|js)$')

if [ -n "$STAGED" ]; then
  echo "Running security review on staged files..."
  # Trigger @security-reviewer via CLI or skip if manual review needed
fi

Pre-Push Hook


# .husky/pre-push

# Full compliance check before pushing
npm run test:unit || exit 1
npm run lint || exit 1

echo "Consider running:"
echo "  @documentation-sync-agent"
echo "  @manifest-v3-compliance"
`````

---

## When NOT to Use Agents

### ❌ Don't Use For:

1. **Simple Refactors**
   - Renaming variables
   - Fixing typos
   - Formatting code

2. **Obvious Fixes**
   - Syntax errors caught by linter
   - Missing semicolons
   - Import organization

3. **Creative Design**
   - UI/UX design decisions
   - Product strategy
   - Feature prioritization

### ✅ Use For:

1. **Domain Expertise**
   - Security review
   - Performance optimization
   - Compliance validation

2. **Pattern Enforcement**
   - Implementing standard features
   - Following established conventions
   - Test generation

3. **Quality Assurance**
   - Coverage analysis
   - Documentation sync
   - Architecture validation

---

## Measuring Success

Track how agents improve your workflow:
`````
Metrics to Track:
- ⏱️ Time to implement features (should decrease)
- 🐛 Bugs caught before production (should increase)
- 📚 Documentation freshness (should improve)
- 🔒 Security issues found (better early than late)
- ⚡ Performance regressions caught (should increase)
`````

**Example Improvement**:
`````
Before Agents:
- Feature implementation: 3 days
- Bugs found in QA: 8
- Doc updates: Often forgotten

After Agents:
- Feature implementation: 2 days (33% faster)
- Bugs found in development: 7 (caught early)
- Bugs found in QA: 2 (75% reduction)
- Doc updates: Automatic via agent
`````

---

## Getting Help

### If a Skill/Subagent Isn't Working:

1. **Check syntax**:
`````
   @skill-name          ❌ (wrong)
   @skills skill-name   ✅ (correct)

Verify file exists:

ls .cursor/skills/
   ls .cursor/subagents/
`````

3. **Reload Cursor IDE**:
`````
   Cmd/Ctrl + Shift + P → "Reload Window"
`````

4. **Check Cursor logs**:
`````
   Help → Show Logs
`````

---

## Conclusion

**Golden Rules**:

1. **Skills for doing, Subagents for reviewing**
2. **Review early, review often**
3. **Always update docs via agent before committing**
4. **Don't skip security review**
5. **Benchmark performance changes**

**Workflow Mantra**:
`````
Plan → Skill → Implement → Subagent → Refine → Document → Ship

Appendix: Quick Command Reference
Common Commands

# Feature Development
@skills add-detector-pattern
@security-reviewer
@test-coverage-analyzer

# Maintenance
@skills update-selectors
@selector-validator
@documentation-sync-agent

# Pre-Release
@performance-analyzer
@manifest-v3-compliance
@security-reviewer

# Debugging
@performance-analyzer
@selector-validator
`````

### File Locations
`````
Skills:    .cursor/skills/*.md
Subagents: .cursor/subagents/*.md
This Guide: .cursor/docs/AGENT_USAGE_GUIDE.md
`````