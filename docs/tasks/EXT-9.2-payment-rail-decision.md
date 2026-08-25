# EXT-9.2: Payment rail decision + integration

**Area:** Extension · monetisation · **Priority:** P0 (gates all of Phase 9) · **Status:** ❓ Decision needed (owner) · **Estimate:** ~1 day once decided
**Playbook:** read `PLAYBOOK.md` first.

## Why

Pro is feature-gated (never usage-gated). Before any licence code exists the
owner must pick the rail, because the rail decides whether a bespoke key
format is needed at all. Pricing lives outside this repo; do not invent
numbers.

## Options

| Rail | Pros | Cons |
| --- | --- | --- |
| ExtensionPay (ExtPay) | Fastest; handles receipts/refunds; no server; entitlement via `extpay.getUser()` | Third-party dependency and their fee; adds one permitted network call to their domain (a documented, opt-in-by-purchase exception to the zero-egress claim) |
| Stripe Checkout + webhook → licence issue | Full control; reuses the owner's existing Stripe account | Needs a tiny issuing endpoint and a signed-key format (EXT-9.1 bespoke path) |

## Do / Don't

- **Don't** write any licensing code until the choice is recorded below.
- **Do** note in the privacy policy any network call the chosen rail introduces before shipping.

## Decision log

- _(pending)_ Rail: ExtPay / Stripe. Reason:
