---
description: Trigger session handover ritual — write memory, reconcile docs, apply voice
agent: docs
model: anthropic/claude-haiku-4-5
subtask: true
---

Trigger the session handover ritual. Work through these steps in order:

**Step 1 — Write the handover document**

Write to `sessions-memory/YYYY-MM-DD-handover-<2-3-word-topic>.md` (use today's date). Structure:
- Session summary: what was attempted, what was completed, what was blocked
- Resolved blockers
- Current state (if changed)
- Patterns or gotchas discovered
- Next session priorities (ordered)
- Files modified this session

**Step 2 — Reconcile project-documentation/**

Check the session outcomes against existing docs. Edit existing docs by default — do not create new docs unless the session produced a substantial new subsystem. Register new docs in the index if created.

**Step 3 — Voice pass**

Run all new prose through `stop-slop` (and `voice-apply` first if a voice profile is installed). This applies to the handover doc and any project-documentation edits — not to pure tables or status markers.

**Step 4 — Update status file**

If any blockers were resolved or new ones surfaced during this session, update the project status/current-state file accordingly. Edit in place; preserve the existing format.

**Step 5 — Report**

List all files written or updated. Do not commit — leave changes in working tree.
