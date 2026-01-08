# AI Leak Checker - Product Roadmap

> **Document Purpose**: Strategic product roadmap with milestones and success criteria.
> **Version**: 1.0.0 | **Last Updated**: 2026-01-07

---

## Vision Statement

**"Be the seatbelt for AI tools - simple, trustworthy, local-first protection against accidental data leaks."**

---

## Phase Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PRODUCT ROADMAP                                │
├──────────────┬──────────────┬──────────────┬──────────────┬────────────────┤
│   Phase 0    │   Phase 1    │   Phase 2    │   Phase 3    │   Phase 4      │
│   SETUP      │   MVP        │   HARDEN     │   MONETIZE   │   SCALE        │
│  (Week 1)    │  (Weeks 2-7) │  (Weeks 8-10)│ (Weeks 11-16)│  (Months 5-6)  │
├──────────────┼──────────────┼──────────────┼──────────────┼────────────────┤
│ • Scaffold   │ • Detection  │ • FP Tuning  │ • Stripe     │ • Gemini       │
│ • CI/CD      │ • DOM Hook   │ • Selector   │ • Pro Tier   │ • Copilot      │
│ • Docs       │ • Modal UI   │   Resilience │ • Landing    │ • Firefox      │
│              │ • Popup      │ • E2E Suite  │   Page       │ • Team Tier    │
│              │ • Store      │ • Beta Users │ • Marketing  │ • Dashboard    │
└──────────────┴──────────────┴──────────────┴──────────────┴────────────────┘
```

---

## Phase 0: Foundation (Week 1)

### Objectives
- Establish development environment
- Create project scaffold
- Set up CI/CD pipeline

### Deliverables

| Deliverable | Status | Owner | Due |
|-------------|--------|-------|-----|
| Git repository initialized | ⬜ | Dev | Day 1 |
| TypeScript + Vite configured | ⬜ | Dev | Day 1 |
| MV3 manifest scaffold | ⬜ | Dev | Day 1 |
| ESLint + Prettier setup | ⬜ | Dev | Day 1 |
| GitHub Actions CI | ⬜ | Dev | Day 2 |
| Vitest + Playwright setup | ⬜ | Dev | Day 2 |
| Documentation structure | ⬜ | Dev | Day 2 |

### Success Criteria
- [ ] `npm run build` produces valid extension
- [ ] Extension loads in Chrome without errors
- [ ] CI pipeline runs on push

### Risks
| Risk | Mitigation |
|------|------------|
| Vite extension bundling issues | Use proven vite-plugin-web-extension |

---

## Phase 1: MVP (Weeks 2-7)

### Objectives
- Build core detection engine
- Implement DOM interception
- Ship to Chrome Web Store

### Milestone 1.1: Detection Engine (Week 2-3)

| Feature | Priority | Estimate | Status |
|---------|----------|----------|--------|
| API key patterns (OpenAI, AWS, GitHub) | P0 | 4h | ⬜ |
| Shannon entropy calculator | P0 | 2h | ⬜ |
| Luhn credit card validator | P0 | 1h | ⬜ |
| Email pattern (RFC 5322) | P1 | 1h | ⬜ |
| UK phone patterns | P1 | 1h | ⬜ |
| UK NINO pattern | P1 | 1h | ⬜ |
| Context keyword boosting | P1 | 2h | ⬜ |
| Unit test coverage (>80%) | P0 | 4h | ⬜ |
| Property tests (Hypothesis) | P0 | 4h | ⬜ |

**Exit Criteria**:
- [ ] Detection engine passes 100+ test cases
- [ ] False positive rate < 10% on test corpus
- [ ] Scan latency < 50ms for 10KB text

### Milestone 1.2: DOM Interception (Week 4-5)

| Feature | Priority | Estimate | Status |
|---------|----------|----------|--------|
| ChatGPT selector config | P0 | 2h | ⬜ |
| Claude selector config | P0 | 2h | ⬜ |
| MutationObserver setup | P0 | 3h | ⬜ |
| Keydown/click interceptors | P0 | 4h | ⬜ |
| Paste event handling | P0 | 2h | ⬜ |
| Fetch monkey-patching | P1 | 4h | ⬜ |
| Shadow DOM warning modal | P0 | 4h | ⬜ |
| Redaction function | P0 | 2h | ⬜ |

**Exit Criteria**:
- [ ] Submission blocked when API key detected
- [ ] Modal displays findings clearly
- [ ] "Mask & Continue" replaces sensitive data
- [ ] Works on both ChatGPT and Claude

### Milestone 1.3: Service Worker & Popup (Week 6)

| Feature | Priority | Estimate | Status |
|---------|----------|----------|--------|
| Message handler | P0 | 3h | ⬜ |
| Storage schema | P0 | 2h | ⬜ |
| Settings persistence | P0 | 2h | ⬜ |
| Stats tracking | P1 | 2h | ⬜ |
| Popup UI (settings) | P0 | 4h | ⬜ |
| Popup UI (stats) | P1 | 2h | ⬜ |
| Badge indicator | P1 | 1h | ⬜ |

**Exit Criteria**:
- [ ] Settings persist across browser restart
- [ ] Popup displays detection stats
- [ ] User can enable/disable detectors

### Milestone 1.4: Chrome Store Submission (Week 7)

| Task | Priority | Estimate | Status |
|------|----------|----------|--------|
| Privacy policy draft | P0 | 2h | ⬜ |
| Store listing copy | P0 | 2h | ⬜ |
| Screenshots (5+) | P0 | 2h | ⬜ |
| Demo video (30s) | P1 | 3h | ⬜ |
| Icon assets (16, 48, 128) | P0 | 1h | ⬜ |
| Submission | P0 | 1h | ⬜ |
| Review response prep | P0 | 1h | ⬜ |

**Exit Criteria**:
- [ ] Extension approved on Chrome Web Store
- [ ] No permission warnings beyond expected
- [ ] Privacy policy URL active

### MVP Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Store approval | Yes | Binary |
| Install errors | 0 | Sentry/console |
| Core detection works | 100% | Manual QA |
| Modal UX acceptable | 4/5 | User feedback |

---

## Phase 2: Hardening (Weeks 8-10)

### Objectives
- Reduce false positive rate
- Improve selector resilience
- Onboard beta users

### Milestone 2.1: False Positive Tuning

| Task | Priority | Estimate |
|------|----------|----------|
| Build FP corpus (500+ samples) | P0 | 4h |
| Tune entropy thresholds | P0 | 4h |
| Add common FP allowlist | P0 | 2h |
| Improve context analysis | P1 | 4h |
| A/B test sensitivity levels | P2 | 8h |

**Target**: FP rate < 5%

### Milestone 2.2: Selector Resilience

| Task | Priority | Estimate |
|------|----------|----------|
| Daily selector health check script | P0 | 4h |
| Automated selector update pipeline | P1 | 8h |
| Fallback selector chains (3 deep) | P0 | 4h |
| "Site unsupported" graceful degradation | P0 | 2h |

### Milestone 2.3: Beta Program

| Task | Priority | Estimate |
|------|----------|----------|
| Recruit 10 SMB beta users | P0 | 8h |
| Feedback collection form | P0 | 2h |
| Weekly feedback synthesis | P0 | 2h/week |
| Prioritize issues | P0 | 2h/week |

### Phase 2 Success Metrics

| Metric | Target |
|--------|--------|
| False positive rate | < 5% |
| Beta user retention (7-day) | > 70% |
| NPS score | > 30 |
| Critical bugs | 0 |

---

## Phase 3: Monetization (Weeks 11-16)

### Objectives
- Launch Pro tier
- Build landing page
- Start marketing

### Milestone 3.1: Payment Integration

| Task | Priority | Estimate |
|------|----------|----------|
| Stripe account setup | P0 | 2h |
| License key generation | P0 | 4h |
| License validation in extension | P0 | 4h |
| Upgrade flow in popup | P0 | 4h |
| Webhook handling | P0 | 4h |

### Milestone 3.2: Pro Features

| Feature | Priority | Estimate |
|---------|----------|----------|
| Custom regex rules | P0 | 4h |
| Custom keyword blocklist | P0 | 2h |
| Scheduled CSV export | P1 | 4h |
| Strict mode (block, no override) | P0 | 2h |
| Priority support channel | P1 | 2h |

### Milestone 3.3: Marketing Launch

| Task | Priority | Estimate |
|------|----------|----------|
| Landing page (Vercel) | P0 | 8h |
| SEO optimization | P0 | 4h |
| Product Hunt prep | P1 | 4h |
| Hacker News "Show HN" | P1 | 2h |
| LinkedIn launch post | P0 | 2h |
| AccountingWEB article | P1 | 4h |
| Recruiter forum posts | P1 | 4h |

### Pricing Strategy

| Tier | Price | Features |
|------|-------|----------|
| Free | £0 | Core detection, warn/mask, basic stats |
| Pro | £5/month or £49/year | Custom rules, strict mode, export, priority support |

### Phase 3 Success Metrics

| Metric | Target |
|--------|--------|
| Chrome Store installs | 500+ |
| Paid conversions | 20+ |
| MRR | £100+ |
| Landing page visitors | 2,000/month |

---

## Phase 4: Scale (Months 5-6)

### Objectives
- Expand platform support
- Launch Team tier
- Build admin dashboard

### Milestone 4.1: Platform Expansion

| Platform | Priority | Estimate |
|----------|----------|----------|
| Google Gemini | P0 | 8h |
| Microsoft Copilot | P1 | 8h |
| Perplexity | P2 | 4h |
| Firefox port | P1 | 16h |

### Milestone 4.2: Team Tier

| Feature | Priority | Estimate |
|---------|----------|----------|
| Team license management | P0 | 8h |
| Shared policy JSON | P0 | 4h |
| Admin dashboard (Supabase) | P0 | 16h |
| Aggregated stats (no content) | P0 | 8h |
| Compliance export (PDF) | P1 | 8h |

### Team Pricing

| Seats | Price |
|-------|-------|
| Up to 10 | £49/month |
| Up to 25 | £99/month |
| Up to 50 | £179/month |
| 50+ | Contact |

### Milestone 4.3: Partnership Program

| Task | Priority | Estimate |
|------|----------|----------|
| MSP partner program design | P1 | 8h |
| Referral tracking system | P1 | 8h |
| Partner documentation | P1 | 4h |
| Recruit 5 MSP partners | P1 | 16h |

### Phase 4 Success Metrics

| Metric | Target |
|--------|--------|
| Chrome Store installs | 2,000+ |
| Paid users | 100+ |
| MRR | £1,000+ |
| Team accounts | 5+ |
| MSP partners | 3+ |

---

## Risk Register

| Risk | Probability | Impact | Mitigation | Owner |
|------|-------------|--------|------------|-------|
| Chrome Store rejection | Medium | High | Follow policies exactly, prepare appeal | Dev |
| High false positive churn | High | High | Conservative patterns, quick iteration | Dev |
| Selector breakage (ChatGPT) | High | Medium | Fallback chain, daily monitoring | Dev |
| Competitor launch | Medium | Medium | Focus on trust/privacy differentiator | Dev |
| Low adoption | Medium | High | SEO, community marketing | Dev |
| Supply chain attack | Low | Critical | Hardware 2FA, minimal deps | Dev |
| Legal challenge | Low | High | Ltd company, PI insurance | Dev |

---

## Key Decisions Log

| Date | Decision | Rationale | Impact |
|------|----------|-----------|--------|
| 2026-01-07 | MV3 only (no MV2) | MV2 deprecated, future-proof | No legacy support |
| 2026-01-07 | Chrome+Edge first | 85%+ market share | Delay Firefox |
| 2026-01-07 | 2 platforms MVP | Reduce scope | Add more in Phase 4 |
| 2026-01-07 | Regex-only detection | No AI inference cost | May miss edge cases |
| 2026-01-07 | Local-first | Trust differentiator | Limited team features |

---

## Appendix: KPI Dashboard

### Weekly Tracking

```
Week: ____

Installs (cumulative): ____
Active users (7-day): ____
Detection events: ____
False positive reports: ____
Support tickets: ____
Store rating: ____
MRR: £____

Notes:
_______________________
```

---

*Document End*
