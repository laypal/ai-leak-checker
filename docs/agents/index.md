# AI Tooling Usage Guide (Claude Code + Cursor)

> Best practices for leveraging AI-powered development tools in the AI Leak Checker project.

## Claude Code (primary)

Native config lives in `.claude/` and is the maintained source:

- **Agents** — `.claude/agents/`: `security-reviewer`, `manifest-v3-compliance`, `performance-analyzer`, `selector-validator`, `test-coverage-analyzer`, `documentation-sync`. Launch via the Agent tool.
- **Skills** — `.claude/skills/`: `add-detector-pattern`, `update-selectors`, `create-e2e-test`, `security-review-checklist` (invoke with the Skill tool / `/<skill>`). Plus installed `superpowers` workflow skills (brainstorming, writing-plans, TDD, subagent-driven-development) — use these for the MCP build (maintainers only; tracked in the local-only, git-ignored `docs/internal/MCP_SERVER_TASKS.md`). External contributors don't need that file; see `CONTRIBUTING.md` for the contributor workflow.
- **Rules** — `.claude/rules/`: detection, security, content-scripts, testing, code-style — referenced from `CLAUDE.md`.
- **Context & memory** — use **Context7** for library docs, **claude-mem** + the project memory dir for cross-session memory. See `docs/internal/OSS_INTEGRATIONS.md` Part A (local-only).

The `.cursor/` directory mirrors the same agents/skills/rules for Cursor users. **Keep both in sync** when you change one.

## Cursor (mirror)

> The tables below describe the `.cursor/` equivalents (same intent, Cursor invocation syntax).

## Contents

| File | Covers |
|------|--------|
| [Quick Reference](01-quick-reference.md) | Skill and subagent lookup tables (Cursor `@` syntax) |
| [Skills vs Subagents](02-skills-vs-subagents.md) | What each is for; procedural vs analytical |
| [When to Use What](03-when-to-use-what.md) | Dev-phase guidance plus the four worked workflow examples |
| [Common Pitfalls](04-common-pitfalls.md) | Five misuse patterns and the fix for each |
| [Combining Skills and Subagents](05-combining-skills-and-subagents.md) | Skill-then-subagent and subagent-then-skill patterns |
| [Keyboard Shortcuts (Cursor IDE)](06-keyboard-shortcuts-cursor-ide.md) | Cursor shortcuts and husky hook snippets |
| [When NOT to Use Agents](07-when-not-to-use-agents.md) | Tasks too small (or too critical) for agents |
| [Measuring Success](08-measuring-success.md) | Metrics to track and an example before/after |
| [Getting Help](09-getting-help.md) | Troubleshooting a skill/subagent that will not run |
| [Conclusion](10-conclusion.md) | Golden rules, workflow mantra, command appendix, file locations |

> Split from `docs/AGENT_USAGE_GUIDE.md` on 2026-08-25; bodies are verbatim.
