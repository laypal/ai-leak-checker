# OpenCode Setup — Manual Prerequisites

Things you do once per machine that cannot be automated.

## 1. Verify provider auth

```bash
opencode auth list
opencode models deepseek
```

Expect `deepseek` authenticated. `opencode.json` lists `deepseek`,
`openrouter`, `anthropic` as enabled providers; remove the ones you have not
authenticated so nothing routes there by accident.

If the model ids in `opencode.json` (`deepseek/deepseek-chat`,
`deepseek/deepseek-reasoner`) are not what `opencode models deepseek` prints,
update them there and in every `.opencode/agents/*.md` frontmatter.

## 2. Set a spend cap

DeepSeek platform: Usage → set a top-up limit. OpenRouter (if used):
Settings → Spend limits. Anthropic (if used): Console → Billing → Usage limits.

## 3. Semble MCP

```bash
uvx --from "semble[mcp]" semble --version
```

`opencode.json` wires it. The index builds on first run. If `uvx` is missing,
`pip install uv`.

## 4. Node + deps

```bash
node --version   # >= 18
npm install
npm run typecheck && npm run test
```

The suite must be green before any task is picked up; if it is not, that is
the first task.

## 5. Logs

The observability plugin writes `.opencode/logs/cost.jsonl` (git-ignored).
Session handovers go to `sessions-memory/` (tracked; review before pushing).

## 6. Optional: Claude Code alongside

`.claude/` carries the same agents and rules for Claude Code. Both tools read
`AGENTS.md`; nothing conflicts.
