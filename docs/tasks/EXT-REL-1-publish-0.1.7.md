# EXT-REL-1: Publish v0.1.7 to the Chrome Web Store

**Area:** Extension · release · **Priority:** P0 once EXT-7.3 / 7.4 / 7.5 / 7.6 land (or sooner if the owner says so) · **Status:** 🔲 Not started · **Estimate:** ~2 h
**Playbook:** read `PLAYBOOK.md` first. **Owner action:** the store upload is manual and needs the owner's account; agents prepare, the owner uploads.

## Why

0.1.7 is bumped in-repo and contains EXT-SEC hardening and the false-positive
tuning, but users are still on 0.1.6.

## Current-state facts (re-verify)

- Version lives in **two** files: `package.json` and `public/manifest.json`. Both say 0.1.7.
- `npm run package` builds and zips `dist/`.
- Release checklist: `.claude/rules/workflows.md` §Release Checklist.
- README store link: `https://chromewebstore.google.com/detail/ffdmphfcipjmoochiafeihceiodehjcc`; check `store/` for any leftover `#` placeholder.

## Deliverables

- [ ] `CHANGELOG.md` entry for 0.1.7 (EXT-SEC, FP tuning, selector health, PR #23 detector-settings fix, plus whatever landed since).
- [ ] Full gate green + `npm run build` + `npm run test:build` + manual smoke in Chrome and Edge.
- [ ] `npm run package` → zip in `releases/` (git-ignored).
- [ ] Git tag `v0.1.7` (owner confirms before tagging).
- [ ] After publish: `docs/STATUS.md` live version updated; README/`store/` links verified.

## Acceptance criteria

- [ ] **Given** the packaged zip, **When** loaded unpacked from its contents, **Then** detection works on chatgpt.com and claude.ai with no console errors.
- [ ] **Given** the store listing after review, **Then** version shows 0.1.7.

## Do / Don't

- **Do** run the `manifest-v3-compliance` agent before packaging.
- **Don't** bump the version again unless a change since 0.1.7 requires it.
- **Don't** upload; that is the owner's step.
