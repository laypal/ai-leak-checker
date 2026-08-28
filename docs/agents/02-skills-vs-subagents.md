# Skills vs Subagents

> Part of the [AI Tooling Usage Guide](index.md).

## Skills (Procedural Knowledge)

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

## Subagents (Domain Expertise)

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
