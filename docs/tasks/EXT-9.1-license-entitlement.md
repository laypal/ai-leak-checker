# EXT-9.1: Licence / entitlement system

**Area:** Extension · monetisation · **Priority:** P0 · **Status:** 🚫 Blocked on EXT-9.2 · **Estimate:** ~1 day
**Playbook:** read `PLAYBOOK.md` first.

## Why

Pro features (EXT-7.5, EXT-7.6, EXT-8.2, EXT-8.3) need an entitlement check.

## Two shapes (pick the one EXT-9.2 chose)

**ExtPay:** entitlement = `extpay.getUser()` cached in storage with a 7-day
offline grace. Pure `resolveEntitlement(cached, now)` decides Pro / grace /
Free.

**Bespoke (Stripe):** offline-verifiable signed key. Ed25519 signature over a
`{ plan, expiry }` payload, public key embedded, pure
`validateLicenseKey(key): Result<Entitlement, LicenseError>` in
`src/shared/utils/license.ts`. State in `chrome.storage.sync`. Graceful
degradation to Free.

## TDD plan (RED first, either shape)

1. `tests/unit/license.test.ts` or `entitlement.test.ts`: valid; expired; tampered; wrong format; within grace; grace exhausted → Free.
2. Pure `isProFeatureEnabled(entitlement, feature)` truth table.
3. UI: Pro badge in the popup; licence entry in the options page (EXT-8.1).

## Acceptance criteria (BDD)

- [ ] **Given** a valid Pro entitlement, **When** activated, **Then** Pro features unlock immediately and a Pro badge shows.
- [ ] **Given** an invalid/tampered key, **Then** a clear error and no unlock.
- [ ] **Given** an expired entitlement within 7 days of the last successful validation, **Then** Pro still works (grace).
- [ ] **Given** grace exhausted, **Then** graceful downgrade to Free: no data loss; custom rules kept but inactive.

## Do / Don't

- **Do** keep verification pure and offline-testable.
- **Don't** send anything but the licence check itself over the network, and only what the chosen rail requires.
- **Don't** log keys.

## Decision log

- _(pending EXT-9.2)_
