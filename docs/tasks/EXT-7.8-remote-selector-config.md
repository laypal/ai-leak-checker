# EXT-7.8: Remote selector config delivery

**Area:** Extension · **Priority:** P2 · **Status:** ❓ Decision needed (owner) · **Estimate:** n/a until decided
**Carried from:** 7.2 · **Playbook:** read `PLAYBOOK.md` first.

## Why

Selectors break when ChatGPT/Claude change their DOM; today a fix needs a
store release. Remote config would shorten that loop.

## The decision (do not build until the owner picks)

Remote config means a network call, which collides with the "zero network
calls" claim the product is marketed on. Options:

| Option | What it means | Risk |
| --- | --- | --- |
| (a) Bundled-only + weekly release cadence | Status quo | None; slower fixes |
| (b) Opt-in remote refresh from a static GitHub Pages JSON | Off by default; no user data outbound; signed config | An egress surprise for users who read "zero network calls" |
| (c) Drop the absoluteness of the claim | Marketing change | Trust cost |

## If (b) is chosen

- Unify `SelectorConfigFile` ↔ runtime `SiteConfig` (`src/shared/types/selectors.ts:78`); the EXT-TYPE-DRIFT follow-up.
- Signature verification of the fetched config (public key embedded; reject on mismatch; fall back to bundled).
- Opt-in toggle in the popup/options, default off, documented in the privacy policy before shipping.
- TDD: pure `verifyConfigSignature`, pure `mergeRemoteConfig(bundled, remote)`; fetch behind an injectable function so tests never hit the network.

## Do / Don't

- **Don't** write any code for this task until the status changes from ❓.
- **Do** record the owner's choice and reasoning in the Decision log below.

## Decision log

- _(pending)_
