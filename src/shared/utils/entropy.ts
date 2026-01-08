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
