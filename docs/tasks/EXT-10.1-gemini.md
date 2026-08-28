# EXT-10.1: Google Gemini support

**Area:** Extension · new platform · **Priority:** P0 within Phase 10 · **Status:** 🔲 Not started · **Estimate:** ~6 h
**Playbook:** read `PLAYBOOK.md` first. This file is the recipe for EXT-10.2 and EXT-10.3.

## Why

Breadth across ChatGPT + Claude + Gemini + Copilot + Perplexity is the
clearest differentiator. Gemini first.

## Current-state facts (re-verify)

- Runtime reads the TS constant `BUNDLED_SELECTORS` at `src/shared/types/selectors.ts:210`, **not** `configs/selectors.json`. Both must be updated and stay in sync (`tests/unit/selectors-config-type.test.ts` enforces the JSON shape).
- Manifest lists per-site `host_permissions`, `content_scripts.matches`, and `web_accessible_resources.matches`.
- Skills: `update-selectors`, `create-e2e-test`.

## Steps (in order)

1. **Discover real selectors first.** Open `gemini.google.com`, inspect the composer (input, send button, container) and the prompt-bearing XHR/fetch endpoint + JSON body path. Record 3+ fallback selectors per slot ordered by stability (id > data-attr > aria > structural). **Every selector must be verified against the live DOM on the day you write it.** Do not invent selectors.
2. **Config:** add a `gemini.google.com` entry to `configs/selectors.json` (shape: `name/enabled/inputSelectors/submitSelectors/containerSelectors/apiEndpoints/bodyExtractor/notes`; copy the `chat.openai.com` entry) **and** to `BUNDLED_SELECTORS`.
3. **Manifest:** `host_permissions`, `content_scripts.matches`, `web_accessible_resources.matches` each gain `https://gemini.google.com/*`.
4. **TDD (RED first):** extend `tests/unit/selectors-config-type.test.ts` and `tests/unit/selector-validation.test.ts` (new site passes validation, fallback depth ≥ 3); extend `tests/build/build-output.test.ts` if it asserts manifest match lists. GREEN: config + manifest edits.
5. **E2E:** `tests/e2e/gemini.spec.ts` patterned on `chatgpt.spec.ts`: warning modal on a canonical test key; clean text passes; mask flow rewrites the input. Follow whatever auth strategy `chatgpt.spec.ts` uses.
6. `npm run check:selectors`; manual smoke on the live site.

## Acceptance criteria (BDD)

- [ ] **Given** the extension is loaded, **When** a canonical test key is typed into Gemini and sent, **Then** the warning modal blocks submission.
- [ ] **Given** clean text, **Then** no modal and the message sends.
- [ ] **Given** the mask action, **Then** the composer content is rewritten with `[REDACTED_*]` markers.

## Do / Don't

- **Do** expect a `contenteditable` rich editor (ProseMirror-like); see how Claude's config handles `bodyExtractor`.
- **Do** check how existing E2E handles auth before promising live E2E in CI; Google logins in Playwright are hard.
- **Don't** add any host beyond `gemini.google.com`.
- **Don't** invent selectors from memory.

## Verify

Gate + `npm run check:selectors` + manual on gemini.google.com.
