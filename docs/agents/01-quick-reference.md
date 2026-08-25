# Quick Reference

> Part of the [AI Tooling Usage Guide](index.md).

## Skills (Task Execution)

| Skill | Use When | Command |
|-------|----------|---------|
| `add-detector-pattern` | Adding new leak detection logic | `@skills add-detector-pattern` |
| `update-selectors` | AI platform UI changed | `@skills update-selectors` |
| `create-e2e-test` | Adding new test scenarios | `@skills create-e2e-test` |
| `security-review-checklist` | Before committing sensitive code | `@skills security-review-checklist` |

## Subagents (Code Review & Analysis)

| Subagent | Use When | Command |
|----------|----------|---------|
| `security-reviewer` | Reviewing PRs, security concerns | `@security-reviewer` |
| `test-coverage-analyzer` | Identifying missing tests | `@test-coverage-analyzer` |
| `selector-validator` | Validating DOM selector stability | `@selector-validator` |
| `documentation-sync` | After feature completion | `@documentation-sync` |
| `performance-analyzer` | Investigating slowness | `@performance-analyzer` |
| `manifest-v3-compliance` | Before Web Store submission | `@manifest-v3-compliance` |
