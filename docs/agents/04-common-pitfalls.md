# Common Pitfalls

> Part of the [AI Tooling Usage Guide](index.md).

## ❌ Pitfall 1: Using Skills for Analysis

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

## ❌ Pitfall 2: Using Subagents for Implementation

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

## ❌ Pitfall 3: Skipping Documentation Sync

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
3. @documentation-sync ← DON'T SKIP
4. Update docs per recommendations
5. Commit
`````

**Why It Matters**: Documentation drift leads to:
- Confusion for contributors
- Inaccurate project status
- Harder maintenance

---

## ❌ Pitfall 4: Ignoring Agent Recommendations

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

## ❌ Pitfall 5: Running Agents Too Late

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
