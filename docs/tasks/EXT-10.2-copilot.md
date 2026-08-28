# EXT-10.2: Microsoft Copilot support

**Area:** Extension · new platform · **Priority:** P1 · **Status:** 🔲 Not started · **Estimate:** ~6 h
**Playbook:** read `PLAYBOOK.md` first.

Run the EXT-10.1 recipe against `copilot.microsoft.com`. Same steps, same
tests, same acceptance criteria with the host swapped. Record discovered
selectors and the prompt endpoint in the Decision log below before writing
config.

## Acceptance criteria (BDD)

- [ ] Warning modal blocks a canonical test key on Copilot.
- [ ] Clean text sends without a modal.
- [ ] Mask flow rewrites the composer.

## Decision log

- _(selectors + endpoint discovered on: …)_
