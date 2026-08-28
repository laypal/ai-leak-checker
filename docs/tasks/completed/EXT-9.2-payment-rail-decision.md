# EXT-9.2: Payment rail decision

**Area:** Extension · monetisation · **Priority:** P0 · **Status:** ✅ Decided: **ExtensionPay** (owner decision 2026-08-25)

## Outcome

Pro is sold through ExtensionPay (ExtPay). No licence-issuing server, no
bespoke key format. Entitlement comes from `extpay.getUser()` and is cached
locally with an offline grace period (EXT-9.1).

## Consequences (binding for EXT-9.1 / EXT-9.3)

- ExtPay adds one network call to ExtPay's domain, made only when the user
  opens the payment page or the extension refreshes entitlement. This is the
  single documented exception to "zero network calls" and must be stated in
  `PRIVACY_POLICY.md` and the store listing **before** EXT-9.1 ships. No
  prompt content, stats, or allowlist values are ever sent.
- The ExtPay library is a new dependency: pin it, review it, and check what
  permissions/host permissions its docs require before adding it to the
  manifest. If it needs anything beyond `storage`, stop and ask the owner.
- Pricing is configured in the ExtPay dashboard by the owner; it is not in
  this repo.

## Decision log

- 2026-08-25, owner: **ExtPay**. Rejected: Stripe Checkout + webhook →
  signed licence key (needed an issuing endpoint and more code for the same
  outcome).
