/**
 * @fileoverview Selector health check (Task 7.2)
 * @module scripts/check-selectors
 *
 * Two modes:
 *   1. Structural (default): validate configs/selectors.json — missing/empty/
 *      duplicate selectors and shallow fallback chains. Deterministic, runs in
 *      CI on every change, and is the authoritative pass/fail signal.
 *   2. Live (--live): best-effort. Loads each enabled site and checks whether
 *      any configured input/submit selector resolves. AI platforms gate their
 *      composer behind auth, so a login wall is reported as "skipped" rather
 *      than failing the run (avoids constant false alarms in CI without creds).
 *
 * Exit code is non-zero only on structural errors (and live failures when
 * --live-strict is passed), so the GitHub workflow can open an issue reliably.
 *
 * Usage:
 *   tsx scripts/check-selectors.ts            # structural only
 *   tsx scripts/check-selectors.ts --live     # + best-effort live DOM check
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { validateSelectorConfig } from '../src/shared/utils/selector-validation';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, '../configs/selectors.json');

interface SiteEntry {
  name?: string;
  enabled?: boolean;
  inputSelectors?: string[];
  submitSelectors?: string[];
}

/** Load and parse selectors.json (tolerating a UTF-8 BOM). */
function loadConfig(): { version?: string; sites?: Record<string, SiteEntry> } {
  const raw = readFileSync(CONFIG_PATH, 'utf-8').replace(/^﻿/, '');
  return JSON.parse(raw);
}

/** Run the deterministic structural validation. Returns true on success. */
function runStructuralCheck(config: unknown): boolean {
  const result = validateSelectorConfig(config);

  for (const w of result.warnings) {
    console.warn(`⚠️  ${w}`);
  }
  for (const e of result.errors) {
    console.error(`❌ ${e}`);
  }

  if (result.ok) {
    console.log('✅ Selector config structurally valid.');
  }
  return result.ok;
}

/**
 * Best-effort live DOM check. Dynamically imports Playwright so the structural
 * check works even when Playwright/browsers are not installed.
 *
 * @returns Number of sites where NO configured selector resolved (and the page
 *          was not an auth wall) — i.e. likely-broken sites.
 */
async function runLiveCheck(sites: Record<string, SiteEntry>): Promise<number> {
  let chromium: typeof import('@playwright/test').chromium;
  try {
    ({ chromium } = await import('@playwright/test'));
  } catch {
    console.warn('⚠️  Playwright not available; skipping live check.');
    return 0;
  }

  const browser = await chromium.launch();
  let likelyBroken = 0;

  try {
    for (const [host, site] of Object.entries(sites)) {
      if (site.enabled === false) continue;

      const page = await browser.newPage();
      try {
        await page.goto(`https://${host}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2500);

        const selectors = [...(site.inputSelectors ?? []), ...(site.submitSelectors ?? [])];
        let anyResolved = false;
        for (const sel of selectors) {
          if ((await page.locator(sel).count()) > 0) {
            anyResolved = true;
            break;
          }
        }

        // Heuristic auth-wall detection: a login/signup affordance is present.
        const looksAuthGated =
          (await page.locator('input[type=password], [href*="login"], [href*="auth"]').count()) > 0;

        if (anyResolved) {
          console.log(`✅ ${host}: at least one selector resolved.`);
        } else if (looksAuthGated) {
          console.warn(`⏭️  ${host}: auth-gated, composer not reachable — skipped.`);
        } else {
          console.error(`❌ ${host}: no configured selector resolved.`);
          likelyBroken += 1;
        }
      } catch (err) {
        console.warn(`⚠️  ${host}: live check error (${(err as Error).message}); skipped.`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  return likelyBroken;
}

async function main(): Promise<void> {
  const config = loadConfig();
  const structurallyOk = runStructuralCheck(config);

  let liveBroken = 0;
  if (process.argv.includes('--live')) {
    liveBroken = await runLiveCheck(config.sites ?? {});
  }

  const liveStrict = process.argv.includes('--live-strict');
  const failed = !structurallyOk || (liveStrict && liveBroken > 0);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error('Selector health check crashed:', err);
  process.exit(1);
});
