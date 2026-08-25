# AI Leak Checker - Architectural Design Document

> **Document Purpose**: Technical architecture, design decisions, and implementation patterns.
> **Version**: 1.0.0 | **Last Updated**: 2026-01-28

---

> Split from `ARCHITECTURE.md` on 2026-08-25 into one file per top-level section.

## Sections

| # | Section | What it covers |
|---|---------|----------------|
| 01 | [1. System Overview](01-system-overview.md) | Architecture diagram and component responsibilities. |
| 02 | [2. Design Decisions](02-design-decisions.md) | ADR-001 to ADR-005: interception, selector config, detection engine, storage schema, error handling. |
| 03 | [3. Security Architecture](03-security-architecture.md) | Threat model, permission model, CSP, data-flow security. |
| 04 | [4. API Design](04-api-design.md) | All inter-component communication uses typed messages; detection and storage APIs. |
| 05 | [5. Testing Strategy](05-testing-strategy.md) | Test pyramid, property-based testing, test fixtures. |
| 06 | [6. Deployment Architecture](06-deployment-architecture.md) | The build process uses Vite for bundling with a custom post-build step for MV3; CI/CD and release. |
| 07 | [7. Module Structure](07-module-structure.md) | Source tree layout under `src/`. |
| 08 | [Appendix A: Selector Maintenance Runbook](08-appendix-a-selector-maintenance-runbook.md) | Monitoring, emergency selector fix, fallback chain. |

---

*Document End*
