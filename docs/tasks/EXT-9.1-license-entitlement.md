# EXT-9.1: Licence / entitlement (ExtensionPay)

**Area:** Extension · monetisation · **Priority:** P0 · **Status:** 🔲 Not started (unblocked: rail = ExtPay, see `completed/EXT-9.2-payment-rail-decision.md`) · **Estimate:** ~1 day
**Depends on:** privacy-policy update for the ExtPay call (part of this task) · **Playbook:** read `PLAYBOOK.md` first.

## Why

Pro features (EXT-7.5, EXT-7.6, EXT-8.2, EXT-8.3) need an entitlement check.
The owner chose ExtensionPay, so this task is: integrate ExtPay, cache the
result, degrade gracefully offline.

## Current-state facts (re-verify)

- No licensing code exists. No network calls exist anywhere in `src/`.
- Manifest permissions: `storage`, `activeTab`, three host permissions.
- Settings flow: popup `updateSetting` → `SETTINGS_UPDATE` → background merges → `SETTINGS_UPDATED` broadcast.

## Deliverables

- [ ] Research first (Context7 / ExtPay docs, on the day): required manifest changes, which contexts can call `extpay.getUser()`, and whether it needs a host permission. **If it needs any permission beyond `storage`, stop and ask the owner.**
- [ ] `src/shared/utils/entitlement.ts`: pure `resolveEntitlement(cached: CachedEntitlement | null, now: Date): { tier: 'free' | 'pro'; source: 'live' | 'grace' | 'none' }` with a **7-day** offline grace.
- [ ] `src/shared/utils/pro-features.ts`: pure `isProFeatureEnabled(entitlement, feature)`.
- [ ] Background: refresh entitlement on startup and daily via `chrome.alarms` (check whether `alarms` is already a permission; if not, refresh on popup open instead, no new permission), store `{ paid, paidAt, checkedAt }` in `chrome.storage.local` (metadata only).
- [ ] Popup: Pro badge; "Manage subscription" opens `extpay.openPaymentPage()` on click only.
- [ ] `PRIVACY_POLICY.md` + `docs/privacy/`: state the ExtPay call, what it carries (ExtPay user id only), and when it happens.

## TDD plan (RED first)

1. `tests/unit/entitlement.test.ts`: null cache → free; paid + checked today → pro/live; paid + checked 6 days ago → pro/grace; paid + checked 8 days ago → free/none; unpaid → free.
2. `tests/unit/pro-features.test.ts`: truth table for the four Pro features.
3. Background wiring test via the chrome-stub pattern with an injected `getUser` function (never call ExtPay in tests).
4. Popup manual check.

## Acceptance criteria (BDD)

- [ ] **Given** a paid ExtPay user, **When** the extension starts, **Then** Pro features unlock and a Pro badge shows.
- [ ] **Given** a paid user offline for 6 days, **Then** Pro still works (grace).
- [ ] **Given** grace exhausted, **Then** graceful downgrade to Free: no data loss; custom rules kept but inactive.
- [ ] **Given** a Free user, **Then** no ExtPay call is made except when they click the upgrade/manage button.
- [ ] **Given** the privacy policy, **Then** it names the ExtPay call before this ships.

## Do / Don't

- **Do** keep ExtPay behind an injectable interface so tests never hit the network.
- **Do** pin the ExtPay dependency and review its source before adding it.
- **Don't** send anything but what ExtPay's own client sends. Never stats, allowlists, or prompt content.
- **Don't** log ExtPay user ids.
- **Don't** add permissions without the owner's explicit yes.

## Decision log

- Rail: ExtPay (2026-08-25, owner). Bespoke signed-key path removed from scope.
