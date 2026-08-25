# Selector Maintenance Runbook

> **Purpose**: Guide for updating and maintaining DOM selectors for AI chat platforms.
> **Audience**: Developers, on-call responders
> **Criticality**: HIGH - Selector breakage = extension non-functional

---

## Overview

AI chat platforms (ChatGPT, Claude, Gemini, etc.) frequently update their UI. When this happens, our DOM selectors may break, causing the extension to fail silently. This document provides procedures for:

1. Detecting selector breakage
2. Investigating selector failures
3. Updating selectors
4. Testing updates
5. Deploying fixes

---

## Sections

> Split from `docs/SELECTOR_MAINTENANCE.md` on 2026-08-25. Status/routing only — the content lives in the leaves.

| Section | File | Covers |
|---|---|---|
| 1. Detection | [01-detection.md](01-detection.md) | Automated Health Checks, Manual Detection, Monitoring Dashboard (Optional) |
| 2. Investigation | [02-investigation.md](02-investigation.md) | Quick Diagnosis, Identifying New Selectors, Common Selector Patterns |
| 3. Selector Configuration | [03-selector-configuration.md](03-selector-configuration.md) | Config File Location, Schema, Example Configuration |
| 4. Update Procedure | [04-update-procedure.md](04-update-procedure.md) | Standard Update (Non-Emergency), Emergency Hotfix, Remote Config Update (Future Feature) |
| 5. Testing | [05-testing.md](05-testing.md) | Unit Tests for Selector Logic, E2E Selector Health Tests, Manual Testing Checklist |
| 6. Monitoring & Alerting | [06-monitoring-alerting.md](06-monitoring-alerting.md) | Slack/Discord Alerts, PagerDuty Integration (Optional) |
| 7. Troubleshooting | [07-troubleshooting.md](07-troubleshooting.md) | Common Issues, Debug Commands, Escalation Path |
| 8. Appendix | [08-appendix.md](08-appendix.md) | Selector Stability Heuristics, Platform-Specific Notes |
