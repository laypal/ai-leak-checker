---
name: voice-create
description: "Generate or tune a voice profile from a plain-English description rather than from samples. Use to bootstrap a profile, or to nudge an existing one (e.g. 'make lyall-writing a touch warmer')."
version: 1.0.0
platforms: [all]
---

# voice-create

Generate a voice profile from a natural-language description, or tune an existing one. Adapted from ghostwriter (angelarose210/ghostwriter, MIT). AI-tells avoidance defers to the **stop-slop** skill rather than duplicating a banned-word list.

Prefer **voice-analyze** when you have real samples — it produces a truer profile. Use voice-create to bootstrap before samples exist, or to make a small deliberate adjustment.

## Behaviour
1. **Parse** the description for audience, tone, domain, constraints.
2. **Map to dimensions** (0-1): formality (casual↔formal), confidence (hedging↔assertive), warmth (clinical↔friendly), energy (calm↔enthusiastic), complexity (plain↔sophisticated).
3. **Generate vocabulary guidance:** preferred domain terms, terms to avoid, a few signature phrases. Reference stop-slop for AI-tells, don't inline a list.
4. **Human-rhythm defaults (always):** `sentence_length_variance: high`, `paragraph_length_variance: high`, `em_dash_usage: avoid`, break robotic Rule of Three.
5. **Emit YAML** to `.aiwg/voices/<name>.yaml` using the schema in **voice-analyze**.

## Tuning an existing profile
"Make lyall-writing a touch warmer / less terse" → load it, nudge the named dimension(s) by ~0.1-0.2, leave the rest, re-save, note the before/after.

## References
- Anti-slop reference: the **stop-slop** skill. Schema: **voice-analyze**. Apply: **voice-apply**.
