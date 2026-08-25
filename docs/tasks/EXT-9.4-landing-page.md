# EXT-9.4: Landing page

**Area:** Marketing · separate repo/deploy · **Priority:** P0 (with Phase 9) · **Status:** 🔲 Not started · **Estimate:** ~1 day
**Playbook:** not extension code; the validation gate does not apply.

## Why

A place to send people: what it does, Free vs Pro, install button, FAQ.

## Deliverables

- [ ] Separate repo (Astro or similar, deployed on Vercel/Cloudflare Pages).
- [ ] Hero ("100% local, zero network calls"), Free-vs-Pro feature table (no prices in this repo; the owner supplies them), Chrome Web Store install button (`https://chromewebstore.google.com/detail/ffdmphfcipjmoochiafeihceiodehjcc`), FAQ, privacy-respecting analytics (Plausible or none).
- [ ] Every prose block run through `voice-apply` (owner supplies the profile) then `stop-slop` before publishing.

## Acceptance criteria

- [ ] Lighthouse ≥ 90 on performance and accessibility.
- [ ] No third-party scripts other than the analytics choice.
- [ ] Claims on the page match `PRIVACY_POLICY.md` word for word where they overlap.

## Do / Don't

- **Don't** invent metrics, user counts, or testimonials.
- **Don't** put pricing in this repo.
