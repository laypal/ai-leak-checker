# Conclusion

> Part of the [AI Tooling Usage Guide](index.md).

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
@documentation-sync

# Pre-Release
@performance-analyzer
@manifest-v3-compliance
@security-reviewer

# Debugging
@performance-analyzer
@selector-validator
`````

## File Locations
`````
Skills:    .cursor/skills/*.md
Subagents: .cursor/subagents/*.md
This Guide: .cursor/docs/AGENT_USAGE_GUIDE.md
`````
