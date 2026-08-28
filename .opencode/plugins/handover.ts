import type { Plugin } from "@opencode-ai/plugin"
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs"
import { join } from "path"

/**
 * Handover ceremony plugin.
 *
 * Three functions:
 * 1. Tracks session metrics (start time, model, token counts, tool calls) in memory.
 * 2. When the handover ritual fires (write to sessions-memory), automatically writes a
 *    session metrics doc to docs/opencode/sessions/YYYY-MM-DD-HHMM.md.
 * 3. Injects project state into compaction prompts so continuation sessions start grounded.
 *
 * The metrics docs accumulate over time and feed Task 1 (model selection optimisation)
 * in FOLLOWUP-TASKS.md — session data is the evidence base for model tier decisions.
 *
 * Use /handover command for manual triggering at ~80% context.
 */

// Directory where session metrics docs are written (relative to project root)
const SESSION_DOCS_DIR = join("docs", "opencode", "sessions")
// Context file whose top lines are injected into compaction
const CONTEXT_FILE = "OPENCODE-DEV.md"
// Substring matched against file paths to detect the handover ritual trigger
const SESSIONS_MEMORY_DIR = "sessions-memory"

interface TokenSnapshot {
  input: number | null
  output: number | null
  cacheRead: number | null
  cacheCreation: number | null
  costTotal: number | null
  costInput: number | null
  costOutput: number | null
}

interface SessionState {
  sessionId: string
  startTime: Date
  model: string | null
  toolCallCount: number
  latestTokens: TokenSnapshot
  handoverDocPath: string | null
}

function nullTokenSnapshot(): TokenSnapshot {
  return {
    input: null,
    output: null,
    cacheRead: null,
    cacheCreation: null,
    costTotal: null,
    costInput: null,
    costOutput: null,
  }
}

function extractCacheField(
  t: Record<string, unknown> | null | undefined,
  ...keys: string[]
): number | null {
  if (!t) return null
  for (const k of keys) {
    const v = t[k]
    if (typeof v === "number") return v
  }
  return null
}

function formatDuration(ms: number): string {
  const mins = Math.floor(ms / 60000)
  const secs = Math.floor((ms % 60000) / 1000)
  if (mins === 0) return `${secs}s`
  return `${mins}m ${secs}s`
}

function formatNum(n: number | null, decimals = 0): string {
  if (n == null) return "—"
  return decimals > 0
    ? n.toFixed(decimals)
    : n.toLocaleString("en-GB")
}

function cacheHitPct(snap: TokenSnapshot): string {
  const { input, cacheRead } = snap
  if (input == null || cacheRead == null || input === 0) return "—"
  return `${Math.round((cacheRead / input) * 100)}%`
}

function buildSessionDoc(state: SessionState, endTime: Date): string {
  const dateStr = state.startTime.toISOString().slice(0, 10)
  const startTimeStr = state.startTime.toISOString().slice(11, 16)
  const endTimeStr = endTime.toISOString().slice(11, 16)
  const durationMs = endTime.getTime() - state.startTime.getTime()
  const snap = state.latestTokens
  const sessionIdShort = state.sessionId.slice(0, 8)

  const inputTotal = snap.input ?? 0
  const cacheRead = snap.cacheRead ?? 0
  const cacheCreation = snap.cacheCreation ?? 0
  const cachePct = cacheHitPct(snap)
  const costStr = snap.costTotal != null
    ? `~$${snap.costTotal.toFixed(4)}`
    : snap.costInput != null && snap.costOutput != null
      ? `~$${(snap.costInput + snap.costOutput).toFixed(4)}`
      : "—"

  const handoverLink = state.handoverDocPath
    ? `\n**Handover doc:** \`${state.handoverDocPath}\``
    : ""

  return `# Session — ${dateStr} ${startTimeStr}

| Field | Value |
|-------|-------|
| Session ID | \`${sessionIdShort}…\` |
| Date | ${dateStr} |
| Start | ${startTimeStr} UTC |
| End | ${endTimeStr} UTC |
| Duration | ${formatDuration(durationMs)} |
| Agent / model | build (${state.model ?? "unknown"}) |${handoverLink}

---

## Tokens

| Metric | Count |
|--------|-------|
| Input (total) | ${formatNum(snap.input)} |
| Output | ${formatNum(snap.output)} |
| Cache read | ${formatNum(snap.cacheRead)} |
| Cache creation | ${formatNum(snap.cacheCreation)} |
| **Cache hit %** | **${cachePct}** |

Cache read = tokens served from cache at 0.1x base input cost.
Cache creation = tokens written to cache at 1.25x base input cost.${
  cacheRead === 0 && cacheCreation === 0
    ? "\n\n> Cache metrics are zero — caching may not be active. See Task 5 in FOLLOWUP-TASKS.md."
    : cacheRead === 0
    ? "\n\n> Cache read is zero — this may be the first turn that warms the prefix, or prefix stability is low."
    : ""
}

---

## Cost

| Field | Value |
|-------|-------|
| Estimated total | ${costStr} |
| Input cost | ${snap.costInput != null ? `~$${snap.costInput.toFixed(4)}` : "—"} |
| Output cost | ${snap.costOutput != null ? `~$${snap.costOutput.toFixed(4)}` : "—"} |

*Costs are the running totals from the last session.updated snapshot. Verify against the OpenRouter dashboard or Anthropic console for exact figures.*

---

## Activity

| Metric | Count |
|--------|-------|
| Tool calls / steps | ${state.toolCallCount} |

---

## Notes for Task 1 (model selection)

- Model: \`${state.model ?? "unknown"}\`
- Cache hit: ${cachePct} (target >60% on a warm session)
- Cost per tool call: ${
  state.toolCallCount > 0 && snap.costTotal != null
    ? `~$${(snap.costTotal / state.toolCallCount).toFixed(5)}`
    : "—"
}
- Duration per tool call: ${
  state.toolCallCount > 0
    ? formatDuration(Math.round(durationMs / state.toolCallCount))
    : "—"
}
`
}

export const HandoverPlugin: Plugin = async ({ directory }) => {
  // Session state tracked in closure — reset when session ID changes
  let sessionState: SessionState | null = null

  function getOrInitSession(id: string, model: string | null): SessionState {
    if (!sessionState || sessionState.sessionId !== id) {
      sessionState = {
        sessionId: id,
        startTime: new Date(),
        model,
        toolCallCount: 0,
        latestTokens: nullTokenSnapshot(),
        handoverDocPath: null,
      }
    }
    return sessionState
  }

  function writeSessionMetricsDoc(state: SessionState): void {
    try {
      const docsDir = join(directory, SESSION_DOCS_DIR)
      mkdirSync(docsDir, { recursive: true })

      const now = new Date()
      const datePart = now.toISOString().slice(0, 10)
      const timePart = now.toISOString().slice(11, 16).replace(":", "")
      const filename = `${datePart}-${timePart}.md`
      const docPath = join(docsDir, filename)

      const content = buildSessionDoc(state, now)
      writeFileSync(docPath, content, "utf-8")
    } catch {
      // Never throw — logging must not crash the session
    }
  }

  return {
    // Track session ID, model, and token snapshots
    "session.updated": async (event: any) => {
      if (event == null || !event.id) return

      const state = getOrInitSession(
        event.id as string,
        (event.model as string | null) ?? null
      )

      // Update model if it changes (e.g. on fallback)
      if (event.model) state.model = event.model as string

      // Update token snapshot
      const t = event.tokens as Record<string, unknown> | null | undefined
      const cost = event.cost as Record<string, unknown> | null | undefined

      state.latestTokens = {
        input: extractCacheField(t, "input", "inputTokens", "input_tokens"),
        output: extractCacheField(t, "output", "outputTokens", "output_tokens"),
        cacheRead: extractCacheField(
          t,
          "cacheRead", "cache_read",
          "cacheReadInputTokens", "cache_read_input_tokens"
        ),
        cacheCreation: extractCacheField(
          t,
          "cacheWrite", "cacheCreation",
          "cacheWriteInputTokens", "cache_creation_input_tokens"
        ),
        costTotal: extractCacheField(cost as any, "total", "totalCost"),
        costInput: extractCacheField(cost as any, "input", "inputCost"),
        costOutput: extractCacheField(cost as any, "output", "outputCost"),
      }
    },

    // Count tool calls; detect handover trigger and write metrics doc
    "tool.execute.after": async (input: any, _output: any) => {
      // Count every tool execution as a step
      if (sessionState) sessionState.toolCallCount++

      const filePath: string =
        input?.args?.filePath ?? input?.args?.path ?? ""

      if (filePath.includes(SESSIONS_MEMORY_DIR)) {
        // Record the handover doc path for the metrics doc
        if (sessionState) {
          // Store relative path for the link
          sessionState.handoverDocPath = filePath
            .replace(directory, "")
            .replace(/^[/\\]/, "")

          // Write the session metrics doc
          writeSessionMetricsDoc(sessionState)
        }

        // Surface ritual reminder
        console.log(
          "[handover] Handover saved. Session metrics doc written to docs/opencode/sessions/.\n" +
          "  Finish the ritual:\n" +
          "  1. Reconcile project-documentation/ with this session\n" +
          "  2. Run new prose through voice-apply (your profile, if any) then stop-slop\n" +
          "  3. Update .clinerules/current-state.md if blockers changed\n" +
          "  4. Update memory index (MEMORY.md) if applicable"
        )
      }
    },

    // Inject project state into compaction so continuation prompts are grounded
    "experimental.session.compacting": async (input: any, output: any) => {
      const contextLines: string[] = [
        "## OpenClaw Dev Session — Compaction Context",
        "",
      ]

      // Pull top of OPENCODE-DEV.md for live project context
      const contextPath = join(directory, CONTEXT_FILE)
      if (existsSync(contextPath)) {
        try {
          const lines = readFileSync(contextPath, "utf-8")
            .split("\n")
            .slice(0, 20)
            .join("\n")
          contextLines.push(`### Project state (from ${CONTEXT_FILE} top):`)
          contextLines.push(lines)
          contextLines.push("")
        } catch {
          // Non-fatal
        }
      }

      // Include session metrics summary if available
      if (sessionState && sessionState.toolCallCount > 0) {
        const snap = sessionState.latestTokens
        contextLines.push("### Current session metrics:")
        contextLines.push(`- Steps so far: ${sessionState.toolCallCount}`)
        contextLines.push(
          `- Cache hit: ${cacheHitPct(snap)} (${formatNum(snap.cacheRead)} read / ${formatNum(snap.input)} input)`
        )
        contextLines.push("")
      }

      contextLines.push("### Handover checklist (complete before ending session):")
      contextLines.push("1. Write handover to .clinerules/sessions-memory/YYYY-MM-DD-handover-<topic>.md")
      contextLines.push("2. Reconcile project-documentation/ with session outcomes")
      contextLines.push("3. Run prose through voice-apply (your profile, if any) then stop-slop")
      contextLines.push("4. Update current-state.md if blockers changed")
      contextLines.push("5. Note next-session priorities")

      output.context.push(contextLines.join("\n"))
    },
  }
}
