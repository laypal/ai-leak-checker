# 7. Module Structure

[Back to index](index.md)


```
src/
├── background/
│   ├── index.ts              # Service worker entry
│   ├── message-handler.ts    # Message routing
│   └── storage.ts            # Storage operations
├── content/
│   ├── index.ts              # Content script entry (DOM interception, window message handler)
│   └── modal.ts              # Warning modal component
├── popup/
│   ├── App.tsx               # Popup UI root
│   ├── components/           # UI components
│   └── hooks/                # React hooks
├── shared/
│   ├── detectors/
│   │   ├── index.ts          # Detection engine
│   │   ├── patterns.ts       # Regex patterns
│   │   ├── entropy.ts        # Entropy calculation
│   │   ├── luhn.ts           # Credit card validation
│   │   └── context.ts        # Context boosting
│   ├── types/
│   │   ├── index.ts          # Shared type exports
│   │   ├── messages.ts       # Message types
│   │   ├── storage.ts        # Storage schema
│   │   └── detection.ts      # Detection types
│   ├── utils/
│   │   ├── mask.ts           # Value masking
│   │   ├── validate.ts       # Input validation
│   │   └── logger.ts         # Logging utility
│   └── constants.ts          # Shared constants
└── manifest.json
```
