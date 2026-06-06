/**
 * @fileoverview Shannon entropy calculator for high-entropy string detection
 * @module utils/entropy
 * 
 * Used to identify potentially sensitive strings that have high randomness,
 * such as API keys, tokens, and passwords.
 */

/**
 * Calculate Shannon entropy of a string.
 * Higher values indicate more randomness/unpredictability.
 * 
 * @param text - Input string to analyze
 * @returns Entropy value in bits per character (0 to ~4.7 for printable ASCII)
 * 
 * @example
 * calculateEntropy('aaaa') // ~0 (very predictable)
 * calculateEntropy('sk-abc123XYZ') // ~3.5 (moderately random)
 * calculateEntropy('aB3$kL9@mN2!pQ5') // ~4.0 (high entropy)
 */
export function calculateEntropy(text: string): number {
  if (!text || text.length === 0) {
    return 0;
  }

  // Count character frequencies
  const frequencies = new Map<string, number>();
  for (const char of text) {
    frequencies.set(char, (frequencies.get(char) ?? 0) + 1);
  }

  // Calculate Shannon entropy: H = -Σ p(x) * log2(p(x))
  const length = text.length;
  let entropy = 0;

  for (const count of frequencies.values()) {
    const probability = count / length;
    entropy -= probability * Math.log2(probability);
  }

  return entropy;
}

/**
 * Calculate entropy using a sliding window approach.
 * Useful for finding high-entropy substrings within larger text.
 * 
 * @param text - Input text to analyze
 * @param windowSize - Size of sliding window (default: 20)
 * @returns Array of { start, end, entropy } for each window
 */
export function calculateSlidingEntropy(
  text: string,
  windowSize: number = 20
): Array<{ start: number; end: number; entropy: number; substring: string }> {
  const results: Array<{ start: number; end: number; entropy: number; substring: string }> = [];

  if (text.length < windowSize) {
    return [{
      start: 0,
      end: text.length,
      entropy: calculateEntropy(text),
      substring: text,
    }];
  }

  for (let i = 0; i <= text.length - windowSize; i++) {
    const substring = text.slice(i, i + windowSize);
    results.push({
      start: i,
      end: i + windowSize,
      entropy: calculateEntropy(substring),
      substring,
    });
  }

  return results;
}

/**
 * Check if a string segment is part of a URL.
 * URLs contain high-entropy segments (IDs, tokens) but are not secrets.
 * 
 * This function handles long URLs by searching backwards from the segment
 * to find the URL start (http:// or https://), ensuring segments deep in
 * long paths are correctly identified.
 * 
 * @param text - Full text containing the segment
 * @param start - Start index of the segment
 * @param end - End index of the segment
 * @returns true if the segment is part of a URL
 */
function isPartOfUrl(text: string, start: number, end: number): boolean {
  // Strategy: Search backwards from segment to find URL start
  // This handles very long URLs where the context window doesn't include the scheme
  
  // Search backwards from segment start to find URL scheme
  // Look back up to 2048 characters (reasonable max URL length)
  const searchStart = Math.max(0, start - 2048);
  const textBeforeSegment = text.slice(searchStart, start + 1);
  
  // Find all http:// or https:// occurrences before segment start, take the last one
  // Use + (one or more) to require at least one character after scheme (valid URL requirement)
  const allMatches = Array.from(textBeforeSegment.matchAll(/https?:\/\/[^\s<>"']+/gi));
  
  if (allMatches.length > 0) {
    // Use the last match (closest to the segment)
    const lastMatch = allMatches[allMatches.length - 1];
    // Check explicitly for undefined (index 0 is valid, so can't use falsy check)
    if (lastMatch?.index === undefined) {
      // Skip if match is invalid (shouldn't happen, but TypeScript safety)
      return false;
    }
    const matchIndex = lastMatch.index;
    const urlStart = searchStart + matchIndex;
    
    // Match the URL pattern from urlStart in the FULL text to get complete URL including segment
    // This ensures we capture the full URL even if it extends beyond the segment
    const textFromUrlStart = text.slice(urlStart);
    const urlEndMatch = textFromUrlStart.match(/^[^\s<>"']+/);
    if (urlEndMatch) {
      const urlEnd = urlStart + urlEndMatch[0].length;
      
      // If segment overlaps with or is within the URL bounds, it's part of a URL
      // Use overlap check: segment starts before URL ends AND segment ends after URL starts
      if (start < urlEnd && end > urlStart) {
        return true;
      }
    }
  }
  
  // Fallback: Also check for URLs in expanded context window
  // This catches cases where URL is nearby but scheme wasn't found in backward search
  const contextStart = Math.max(0, start - 200);
  const contextEnd = Math.min(text.length, end + 200);
  const context = text.slice(contextStart, contextEnd);
  
  const urlPattern = /https?:\/\/[^\s<>"']+/gi;
  const matches = Array.from(context.matchAll(urlPattern));
  
  for (const match of matches) {
    if (match.index === undefined) {
      continue;
    }
    const urlStart = contextStart + match.index;
    const urlEnd = urlStart + match[0].length;
    
    if (start < urlEnd && end > urlStart) {
      return true;
    }
  }
  
  return false;
}

/**
 * Minimum length at which a pure-hex string is treated as a digest/identifier
 * rather than a random secret. Covers MD5(32), SHA-1/git(40), SHA-256(64),
 * SHA-512(128) and concatenated/truncated hex blobs in between.
 */
const HEX_DIGEST_MIN_LENGTH = 32;

/**
 * File extensions that mark a token as a filename, not a secret.
 */
const FILENAME_EXTENSION =
  /\.(js|ts|jsx|tsx|mjs|cjs|json|ya?ml|lock|md|txt|csv|css|scss|less|html?|xml|toml|ini|cfg|conf|config|sh|py|rb|go|rs|java|php|sql)$/i;

/**
 * Semantic-version shape, e.g. `1.0.0`, `2.3.4-alpha.1+build.123`.
 */
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.+-]+)?$/;

/**
 * Check whether a candidate is a well-known, non-secret high-entropy structure.
 *
 * These structures have high Shannon entropy by nature but are not secrets:
 *  - Cryptographic digests / git commit SHAs (pure hex of standard lengths)
 *  - base64-encoded payloads inside a `data:...;base64,` URI (e.g. inline images)
 *
 * @param text - Full text containing the candidate
 * @param start - Start index of the candidate in `text`
 * @param fullToken - The full matched token (before any length truncation)
 * @returns true if the candidate is a known-safe structure that should not be flagged
 */
function isKnownSafeStructure(text: string, start: number, fullToken: string): boolean {
  // Cryptographic digest / git SHA / hex identifier: long pure-hex string.
  // Use the full (untruncated) token so long digests like SHA-512 are matched.
  if (fullToken.length >= HEX_DIGEST_MIN_LENGTH && /^[0-9a-fA-F]+$/.test(fullToken)) {
    return true;
  }

  // Filenames (e.g. webpack.config.js, package-lock.json).
  if (FILENAME_EXTENSION.test(fullToken)) {
    return true;
  }

  // Semantic version strings (e.g. 1.0.0-alpha.1+build.123).
  if (SEMVER_PATTERN.test(fullToken)) {
    return true;
  }

  // base64 data-URI payload: candidate is immediately preceded by `base64,`.
  // Look back a few characters to catch the `;base64,` marker.
  const prefix = text.slice(Math.max(0, start - 8), start).toLowerCase();
  if (prefix.includes('base64')) {
    return true;
  }

  return false;
}

/**
 * Find high-entropy regions in text.
 * Merges adjacent high-entropy windows into contiguous regions.
 * 
 * @param text - Input text to analyze
 * @param threshold - Minimum entropy to consider "high" (default: 4.0)
 * @param minLength - Minimum substring length (default: 16)
 * @param maxLength - Maximum substring length to check (default: 100)
 * @returns Array of high-entropy substrings with their positions
 */
export function findHighEntropyRegions(
  text: string,
  threshold: number = 4.0,
  minLength: number = 16,
  maxLength: number = 100
): Array<{ start: number; end: number; entropy: number; value: string }> {
  const regions: Array<{ start: number; end: number; entropy: number; value: string }> = [];

  // Skip if text is too short
  if (text.length < minLength) {
    return regions;
  }

  // Use word boundary detection to find potential tokens
  // Matches sequences of alphanumeric + common token chars
  const tokenPattern = /[A-Za-z0-9_\-+=/.]{16,}/g;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(text)) !== null) {
    const candidate = match[0].slice(0, maxLength);
    const entropy = calculateEntropy(candidate);

    if (entropy >= threshold && candidate.length >= minLength) {
      // Skip if this is part of a URL
      if (isPartOfUrl(text, match.index, match.index + candidate.length)) {
        continue;
      }

      // Skip known-safe high-entropy structures (hashes, git SHAs, base64 data URIs).
      // Pass the full match (not the truncated candidate) so long digests are caught.
      if (isKnownSafeStructure(text, match.index, match[0])) {
        continue;
      }

      regions.push({
        start: match.index,
        end: match.index + candidate.length,
        entropy,
        value: candidate,
      });
    }
  }

  return regions;
}

/**
 * Quick check if a string likely contains high-entropy content.
 * Faster than full analysis, useful for pre-filtering.
 * 
 * @param text - Input text
 * @param threshold - Entropy threshold (default: 3.5)
 * @returns true if text appears to have high entropy
 */
export function hasHighEntropy(text: string, threshold: number = 3.5): boolean {
  // Quick length check
  if (text.length < 12) {
    return false;
  }

  // Sample entropy from middle portion (more representative)
  const sampleStart = Math.floor(text.length * 0.25);
  const sampleEnd = Math.min(sampleStart + 32, text.length);
  const sample = text.slice(sampleStart, sampleEnd);

  return calculateEntropy(sample) >= threshold;
}
