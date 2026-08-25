---
name: voice-apply
description: "Rewrite a draft through a saved voice profile so it sounds like the author, not like AI. Use when writing or finalising prose — docs, README, CV, project descriptions, blog posts — or whenever asked to match a voice / make text sound human / less AI."
version: 1.0.0
platforms: [all]
---

# Voice Apply

Transform a draft to match a saved voice profile (tone, vocabulary, structure, perspective), then run it through the anti-slop pass. Adapted from ghostwriter (angelarose210/ghostwriter, MIT).

**Default profile:** `lyall-writing` (general personal-writing voice). Use it unless a more specific profile is named.

**Critical rule:** every piece of output MUST pass the anti-slop check before delivery. Use the **stop-slop** skill as the canonical AI-tells list (do not re-vendor one). If output still contains banned vocabulary, structures, transitions, or punctuation tells, rewrite until clean.

## When this applies
- Finalising any prose you wrote: docs, README, CV, project/portfolio descriptions, blog posts, emails.
- "Make this sound like me / less AI / less slop."
- "Write this in the lyall-writing voice" or any named profile.

## Voice profile locations (checked in order)
1. Project: `.aiwg/voices/`
2. User: `~/.config/aiwg/voices/`

## Process
1. **Load** the profile YAML (default `lyall-writing`). Note `tone`, `vocabulary`, `structure`, `conventions`, `perspective`.
2. **Analyse** the draft vs the target (tone, vocabulary, rhythm, structure).
3. **Apply**: calibrate tone (formality / confidence / warmth / energy); honour `prefer`/`avoid`; weave signature phrases only where natural; match sentence rhythm and perspective. Preserve any functional structure (tables, status markers) — humanise the *prose*, not the scaffolding.
4. **Anti-slop pass (MANDATORY)** — run the **stop-slop** skill. Essentials, inline so this works standalone:
   - No banned verbs (leverage, delve, utilise, streamline…), adjectives (robust, comprehensive, seamless…), nouns (tapestry, landscape, ecosystem…), adverbs (furthermore, moreover, notably…).
   - No throat-clearing / pedagogical openers / fake-suspense / hype / bot closers.
   - No "it's not X, it's Y", self-posed-and-answered questions, anaphora abuse, trailing participles, false ranges, hedge-stacking.
   - No em dashes (commas, periods, parentheses, colons instead). No decorative semicolons/Oxford commas unless the author uses them.
   - Vary sentence and paragraph length; break robotic back-to-back Rule of Three.
   - No compulsive bold-first bullets, excessive headers, erratic bolding, or emoji in professional prose.
   - No relentless positivity, false balance, flatness, or elevated register for simple ideas.
5. **Authenticity:** only claim what's true; show tradeoffs; use specific numbers; reference real constraints.
6. **Read-aloud test:** if a sentence could be any AI's output, rewrite it until it reads like the author said it.

## Report
State briefly what changed (tone deltas, vocab replacements, em dashes removed) and confirm "Anti-slop (stop-slop): clean".

## References
- Anti-slop gate (MANDATORY): the **stop-slop** skill.
- Build/refresh a profile: the **voice-analyze** skill. Tune by description: **voice-create**.
