# Combining Skills and Subagents

> Part of the [AI Tooling Usage Guide](index.md).

## Pattern: Skill → Implement → Subagent → Refine
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

7. @documentation-sync
   → Update docs

8. Commit ✅
`````

## Pattern: Subagent → Diagnose → Skill → Fix
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
