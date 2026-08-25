---
name: voice-analyze
description: "Reverse-engineer a voice profile from genuine writing samples, flagging AI tells so the profile produces human-sounding output. Use when building or refreshing a voice profile from pasted samples."
version: 1.0.0
platforms: [all]
---

# voice-analyze

Build a voice profile by analysing genuine writing samples. Adapted from ghostwriter (angelarose210/ghostwriter, MIT).

## ⚠️ Sample-source rule (read first)
A profile is only as honest as its samples. **Do NOT analyse AI-generated text as a voice sample** — that clones the slop you are trying to remove. Use prose the author confirms is genuinely their own (notes, emails, posts, cover letters). 500+ words, 3+ samples ideal, consistent genre. If a sample is partly AI-written, flag it and keep its tells out of the profile.

## Behaviour
1. **Measure features:** avg sentence length (→ complexity), sentence-length variance (→ burstiness; human = high), contraction frequency (→ formality inverse), first/second-person frequency (→ warmth), passive-voice % and hedging (→ confidence inverse), exclamation frequency (→ energy), domain-term density (→ complexity), em-dash frequency (→ ai_tell score).
2. **AI-tells scan** using the **stop-slop** skill as the reference list. Anything found goes into `vocabulary.avoid` and `ai_tells_report`.
3. **Calibrate dimensions** (0-1): formality, confidence, warmth, energy, complexity.
4. **Extract** signature phrases (repeated, distinctive constructions), domain vocabulary, opening/closing patterns. Separate genuine *prose voice* (tone dims, phrases) from *format conventions* (kept verbatim in `conventions`).
5. **Emit YAML** to `.aiwg/voices/<name>.yaml` using the schema below.

## Output schema
```yaml
name: lyall-writing
version: 1.0.0
description: <author>'s writing voice
analysis_source: { sample_words: 0, sample_count: 0, confidence: 0.0 }
tone: { formality: 0.0, confidence: 0.0, warmth: 0.0, energy: 0.0, complexity: 0.0 }
vocabulary:
  prefer: []
  avoid: []          # full AI-tells list deferred to stop-slop
  signature_phrases: []
structure:
  sentence_length: short|medium|long
  sentence_length_variance: low|medium|high
  paragraph_length_variance: low|medium|high
  use_lists: rarely|when-appropriate|frequently
  em_dash_usage: avoid|sparingly
  rule_of_three: natural|break-pattern
conventions: []      # format scaffolding to PRESERVE, not flatten
perspective: { person: first|second|third|mixed, voice: active, tense: present }
ai_tells_report: { tells_found: 0, em_dash_frequency: 0.0, overall_human_score: 0.0 }
```

## References
- AI tells reference: the **stop-slop** skill.
- Apply a finished profile: the **voice-apply** skill.
