/**
 * @fileoverview Convert persisted user Settings into engine ScanOptions.
 * @module detectors/scan-options
 *
 * Bridges the storage-shaped {@link Settings} (a Record of detector → boolean,
 * plus sensitivity and allowlist) and the engine-shaped {@link ScanOptions}
 * consumed by {@link scan}. Without this mapping the content script scanned with
 * default options (every detector enabled, medium sensitivity), so user toggles
 * had no effect.
 *
 * @dependencies
 *   - Settings (../types/storage)
 *   - ScanOptions, DetectorType (../types/detection)
 *
 * @security
 *   - Pure function; no DOM, network, or storage access.
 */

import { DetectorType, type ScanOptions } from '@/shared/types';
import type { Settings } from '@/shared/types';

/**
 * Build engine {@link ScanOptions} from persisted user {@link Settings}.
 *
 * Only detectors the user has left enabled are included in `enabledDetectors`,
 * so disabling a detector in the popup actually stops it from firing.
 *
 * @param settings - The user's persisted settings.
 * @returns Partial scan options to pass to `scan(text, options)`.
 */
export function buildScanOptions(settings: Settings): Partial<ScanOptions> {
  const enabledDetectors = new Set<DetectorType>();
  for (const type of Object.values(DetectorType)) {
    if (settings.detectors[type]) {
      enabledDetectors.add(type);
    }
  }

  return {
    enabledDetectors,
    sensitivityLevel: settings.sensitivity,
    allowlist: settings.allowlist,
  };
}
