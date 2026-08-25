# Task Playbook — how to execute any task in `docs/tasks/`

> Read this once per session. Every task file assumes you have. It is written
> so a cheap coding model can follow it literally; nothing here needs
> interpretation.
> **Last verified against `main` @ `f95b555`:** 2026-08-25.

## 1. Branch rules

- All extension work branches off `main`:
  `git checkout main && git pull && git checkout -b feature/<kebab-name>`.
- This branch uses **npm** (`package-lock.json`). Do not introduce pnpm/yarn.
- The paid MCP server lives in a separate private repo. It is not in this
  repo and no task here touches it.
- Before pushing, grep your diff for realistic secret shapes:
  `git diff | grep -E 'sk_live_|ghp_|AKIA[A-Z0-9]{16}|whsec_|xox'`. GitHub
  push protection blocks the push and scrubbing history afterwards is slow.
- Don't push or open a PR unless asked. Commit in the slices the task suggests.

## 2. The TDD loop (mandatory for every task)

Each task file has a **TDD plan** with ordered steps. For each step:

1. **RED**: write the test *first*, in the file the step names. Run only that
   file and watch it fail for the right reason:
   `npx vitest run tests/unit/<file>.test.ts`
2. **GREEN**: write the *minimum* implementation to pass. Re-run that file.
3. **REFACTOR** while green: file ≤400 lines, function ≤50 lines, JSDoc
   `@file` + `@description` header on every new file.
4. Run the validation gate (§3) before the next step or a commit.

Prefer **pure, injectable functions** so tests don't need heavy chrome/DOM
mocks. That is the house pattern (§5).

## 3. Validation gate (must pass before every commit)

```bash
npm run typecheck        # tsc --noEmit, strict
npm run lint             # 0 errors; don't add no-console warnings
npm run test             # unit + integration, all green
npm run test:corpus      # false-positive rate must stay < 4%
npm run build            # MV3 build must succeed
```

Then a **manual smoke test** for anything user-facing: `chrome://extensions`
→ Developer mode → Load unpacked → `dist/` → exercise the changed behaviour on
chatgpt.com with the DevTools console open (no errors). For UI/E2E-relevant
changes also run `npm run test:e2e` (build first; auth walls may skip tests,
that is not a failure).

Paste the summary lines of each command in your report. No output, no claim.

## 4. Hard invariants (violating any one fails review)

- **Never** store or transmit prompt content. Storage holds metadata/stats
  only (detector type, offsets, confidence, domain, timestamp).
- **Never** add network calls or telemetry. Zero egress is the product.
- **Never** widen permissions. No `<all_urls>`, no broad `tabs`, no
  `downloads` unless a task file says the owner decided it. Any new
  permission triggers Chrome Web Store re-review and a user-visible warning.
- **Never** `eval()` / `new Function()` / `innerHTML` with non-constant
  content. Modal templates escape every finding value via `escapeHtml()`.
- **Always** use typed messages (`src/shared/types/messages.ts`) and keep the
  sender gates: `isTrustedSender()` in background, `event.source === window`
  in content.
- **Fixtures:** canonical, push-protection-safe examples only
  (`AKIAIOSFODNN7EXAMPLE`, `user@example.com`, `sk-test…` shapes). Never
  invent realistic fake secrets. Tests that need raw detector coverage on a
  canonical value pass `scan(text, { disableBuiltinAllowlist: true })`.

## 5. House patterns (copy these, don't invent new ones)

| Need | Pattern | Exemplar |
| --- | --- | --- |
| Persist + broadcast a setting | popup `updateSetting(key, value)` → `SETTINGS_UPDATE` message → background merges + `chrome.storage.local.set` + broadcasts `SETTINGS_UPDATED` (full `Settings`) to all tabs. **Never write storage directly from the popup.** | `src/popup/popup.tsx:208`, `src/background/index.ts:304` |
| React to settings in content | `currentSettings` + `applySettings(partial)`; `SETTINGS_UPDATED` handler applies live, sender-gated | `src/content/index.ts:55-87` |
| Scan with user settings | All scan entry points route through `scanWithSettings()`; options built by pure `buildScanOptions()` | `src/shared/detectors/scan-options.ts:31` |
| Pure helper + unit test | No `chrome.*`/DOM imports; exhaustive edge cases | `tests/unit/scan-options.test.ts`, `tests/unit/placeholders.test.ts` |
| Content-script logic test | `simulate*` mirror functions + injectable `scanFn`, jsdom | `tests/unit/content-message-handler.test.ts` |
| Chrome API mocking | `vi.fn()` stubs on a `chrome` global | `tests/unit/background-sender.test.ts`, `tests/unit/storage.test.ts` |
| Modal UI test | `new WarningModal(callbacks, { shadowMode: 'open' })`, query the open shadow root | `tests/unit/modal.test.ts` |
| E2E on a platform | Playwright, selector-driven, clean-text negative case included | `tests/e2e/chatgpt.spec.ts` |
| Result type for errors | `{ ok: true, value } \| { ok: false, reason }` | `.claude/rules/code-style.md` |

Project skills that map to tasks: `add-detector-pattern` (new detector),
`update-selectors` (selector changes), `create-e2e-test` (new platform),
`security-reviewer` agent / `security-review-checklist` skill (before any
storage / messaging / permission change lands).

## 6. Definition of done (per task)

- [ ] Every TDD-plan test written first and green; every BDD acceptance
      criterion covered by at least one test or an explicit manual step.
- [ ] Validation gate (§3) green with output seen; manual smoke test done.
- [ ] No invariant (§4) violated; security-sensitive changes reviewed with
      the `security-reviewer` agent (Claude Code) or `@reviewer` (OpenCode).
- [ ] Docs synced in the same commit: task file status + AC ticks,
      `docs/tasks/index.md` row and Next up re-ordered, `docs/STATUS.md` if a
      headline fact changed, `docs/architecture/` if behaviour/settings changed.
- [ ] Commit messages follow `feat(scope): …` / `fix(scope): …`.

## 7. Reading a task file

Every task file has the same sections, in this order:

| Section | What it is for |
| --- | --- |
| Header | ID, area, priority, status, estimate, requirement refs |
| Why | one paragraph; the reason the task exists |
| Current-state facts | verified `file:line` facts. **Re-verify before acting**; fix the task file if stale |
| Deliverables | checkboxes; what must exist when done |
| TDD plan | ordered RED tests with example code |
| Acceptance criteria (BDD) | Given / When / Then; each must map to a test or manual step |
| Do / Don't | the traps for this specific task |
| Verify | the gate plus the manual check for this task |
| Decision log | locked decisions and rejected options (so nobody re-opens them) |

If a section says **DECISION NEEDED**, stop and ask the owner; do not build.
