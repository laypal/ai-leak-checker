import type { Plugin } from "@opencode-ai/plugin"
import { appendFileSync, mkdirSync } from "fs"
import { join } from "path"

/**
 * Observability plugin — local JSONL cost and error logging.
 *
 * Writes to .opencode/logs/cost.jsonl and .opencode/logs/errors.jsonl.
 * Grep these for pattern analysis; pair with OpenRouter dashboard for
 * per-call cost detail (OR shows exact $ per request natively).
 *
 * Cache field notes:
 *   cache_read:     tokens served from cache (0.1x base input cost on Anthropic)
 *   cache_creation: tokens written to cache (1.25x–2x base input cost)
 *   cache_hit_pct:  derived hit rate for this snapshot
 *
 * If cache_read stays null after several sessions, check:
 *   1. That you're on a direct Anthropic provider (not OpenRouter for Claude)
 *   2. That setCacheKey:true is set in provider.anthropic.options
 *   3. That the always-loaded instruction files are stable between turns
 *
 * Never throws — logging must never crash the agent session.
 */
export const ObservabilityPlugin: Plugin = async ({ directory }) => {
  const logDir = join(directory, ".opencode", "logs")

  try {
    mkdirSync(logDir, { recursive: true })
  } catch {
    // Directory may already exist
  }

  function append(file: string, record: unknown): void {
    try {
      const entry =
        JSON.stringify({
          ts: new Date().toISOString(),
          ...(typeof record === "object" && record !== null
            ? (record as Record<string, unknown>)
            : { data: record }),
        }) + "\n"
      appendFileSync(join(logDir, file), entry, "utf-8")
    } catch {
      // Silent — never let logging crash the session
    }
  }

  return {
    // Log every tool execution for usage pattern analysis
    "tool.execute.after": async (input: any, _output: any) => {
      append("cost.jsonl", {
        type: "tool.execute",
        tool: input?.tool ?? "unknown",
      })
    },

    // Log session errors with full payload for debugging
    "session.error": async (event: any) => {
      append("errors.jsonl", {
        type: "session.error",
        sessionId: event?.sessionId ?? event?.id ?? null,
        error: event?.error ?? event ?? null,
      })
    },

    // Capture cost/token snapshots when session state updates.
    // Cache fields are pulled to top-level for easy grepping.
    "session.updated": async (event: any) => {
      if (event == null) return
      const { cost, tokens, model, id } = event as Record<string, unknown>
      if (cost !== undefined || tokens !== undefined) {
        const t = tokens as Record<string, unknown> | null | undefined
        // Try multiple naming conventions the SDK or proxy layer might use
        const cacheRead =
          t?.cacheRead ??
          t?.cache_read ??
          t?.cacheReadInputTokens ??
          t?.cache_read_input_tokens ??
          null
        const cacheCreation =
          t?.cacheWrite ??
          t?.cacheCreation ??
          t?.cacheWriteInputTokens ??
          t?.cache_creation_input_tokens ??
          null
        append("cost.jsonl", {
          type: "session.cost_snapshot",
          sessionId: id ?? null,
          model: model ?? null,
          cost,
          tokens,
          cache_read: cacheRead,
          cache_creation: cacheCreation,
          // Derived hit rate: null until both fields populate
          cache_hit_pct:
            cacheRead != null && typeof cacheRead === "number" &&
            t?.input != null && typeof t.input === "number" && t.input > 0
              ? Math.round((cacheRead / (t.input as number)) * 100)
              : null,
        })
      }
    },
  }
}
