# 3. Selector Configuration

[← Selector maintenance index](index.md)

## 3.1 Config File Location

```
configs/selectors.json
```

## 3.2 Schema

The file conforms to the `SelectorConfigFile` type in
`src/shared/types/selectors.ts` and is validated by `configs/selectors.schema.json`
(`$schema`). `sites` is a **record keyed by hostname**; each selector group is an
**ordered array** (fallback chain — most-stable first), and `bodyExtractor` is a
**structured object**:

```typescript
interface SelectorConfigFile {
  $schema?: string;
  version: string;        // Config version (semver)
  lastUpdated: string;    // ISO-8601 datetime
  sites: Record<string, SiteConfigFile>; // keyed by hostname
  fallbackBehavior?: FallbackBehavior;
  monitoring?: MonitoringConfig;
}

interface SiteConfigFile {
  name: string;
  enabled: boolean;
  inputSelectors: string[];      // fallback chain, tried in order
  submitSelectors: string[];
  containerSelectors: string[];
  apiEndpoints: string[];        // fetch-patch fallback
  bodyExtractor: { type: 'json'; path: string };
  notes?: string;
}
```

## 3.3 Example Configuration

```json
{
  "$schema": "./selectors.schema.json",
  "version": "1.0.0",
  "lastUpdated": "2026-01-07T00:00:00Z",
  "sites": {
    "chat.openai.com": {
      "name": "ChatGPT",
      "enabled": true,
      "inputSelectors": [
        "#prompt-textarea",
        "[data-id='root'] textarea",
        "textarea[placeholder*='Message']"
      ],
      "submitSelectors": [
        "button[data-testid='send-button']",
        "form button[type='submit']"
      ],
      "containerSelectors": ["form.stretch", "main form"],
      "apiEndpoints": ["/backend-api/conversation"],
      "bodyExtractor": { "type": "json", "path": "messages[0].content.parts[0]" },
      "notes": "ChatGPT changes DOM frequently. Fallback chain ordered by stability."
    },
    "claude.ai": {
      "name": "Claude",
      "enabled": true,
      "inputSelectors": [
        "div[contenteditable='true'][data-placeholder]",
        "div.ProseMirror[contenteditable='true']"
      ],
      "submitSelectors": [
        "button[aria-label='Send message']",
        "button[data-testid='send-button']"
      ],
      "containerSelectors": ["div[class*='composer']"],
      "apiEndpoints": ["/api/organizations/*/chat_conversations/*/completion"],
      "bodyExtractor": { "type": "json", "path": "prompt" },
      "notes": "Claude uses ProseMirror editor. contenteditable div, not textarea."
    }
  },
  "fallbackBehavior": {
    "onSelectorFailure": "warn",
    "maxRetries": 3,
    "retryIntervalMs": 1000,
    "gracePeriodMs": 5000
  },
  "monitoring": {
    "healthCheckIntervalMs": 3600000,
    "reportEndpoint": null,
    "localLogging": true
  }
}
```
