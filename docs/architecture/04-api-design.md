# 4. API Design

[Back to index](index.md)


## 4.1 Message Protocol

All inter-component communication uses typed messages:

```typescript
// Message types
type MessageType =
  | 'SCAN_REQUEST'
  | 'SCAN_RESULT'
  | 'SETTINGS_GET'
  | 'SETTINGS_UPDATE'
  | 'STATS_GET'
  | 'STATS_INCREMENT'
  | 'SELECTOR_GET';

interface Message<T = unknown> {
  type: MessageType;
  payload: T;
  timestamp: number;
  correlationId: string;
}

// Type-safe message handlers
interface MessageHandlers {
  SCAN_REQUEST: (payload: ScanRequest) => Promise<ScanResult>;
  SETTINGS_GET: () => Promise<Settings>;
  SETTINGS_UPDATE: (payload: Partial<Settings>) => Promise<void>;
  STATS_GET: () => Promise<Stats>;
  STATS_INCREMENT: (payload: StatsIncrement) => Promise<void>;
  SELECTOR_GET: (payload: { domain: string }) => Promise<SiteConfig | null>;
}
```

## 4.2 Detection API

```typescript
// Public API for detection engine
interface DetectionAPI {
  /**
   * Scan text for sensitive data
   * @param text - Raw input text to scan
   * @param options - Detection options
   * @returns Detection result with findings
   */
  scan(text: string, options?: ScanOptions): DetectionResult;
  
  /**
   * Redact sensitive data from text
   * @param text - Original text
   * @param findings - Previously detected findings
   * @returns Text with redactions applied
   */
  redact(text: string, findings: Finding[]): string;
  
  /**
   * Calculate Shannon entropy
   * @param text - Text segment
   * @returns Entropy value (0-8 for ASCII)
   */
  calculateEntropy(text: string): number;
  
  /**
   * Validate credit card via Luhn algorithm
   * @param digits - Card number digits
   * @returns Whether checksum is valid
   */
  validateLuhn(digits: string): boolean;
}
```

## 4.3 Storage API

```typescript
interface StorageAPI {
  // Settings
  getSettings(): Promise<Settings>;
  updateSettings(partial: Partial<Settings>): Promise<void>;
  resetSettings(): Promise<void>;
  
  // Stats
  getStats(): Promise<Stats>;
  incrementStat(key: keyof Stats['byDetector'], site: string): Promise<void>;
  clearStats(): Promise<void>;
  exportStats(): Promise<string>; // CSV format
  
  // Selectors
  getSelectors(domain: string): Promise<SiteConfig | null>;
  updateSelectors(config: SelectorConfig): Promise<void>;
}
```
