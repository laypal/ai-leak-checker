# 1. System Overview

[Back to index](index.md)


## 1.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser Context                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌─────────────────────────────────────┐   │
│  │   Popup UI   │    │           Content Script             │   │
│  │  (React/TS)  │    │  ┌─────────────┐  ┌──────────────┐  │   │
│  │              │    │  │  DOM        │  │  Injected    │  │   │
│  │ - Settings   │    │  │  Listeners  │  │  Script      │  │   │
│  │ - Stats      │    │  │  (Primary)  │  │  (Fallback)  │  │   │
│  │ - Controls   │    │  └──────┬──────┘  └──────┬───────┘  │   │
│  └──────┬───────┘    │         │                │          │   │
│         │            │         └───────┬────────┘          │   │
│         │            │                 │                   │   │
│         │            │         ┌───────▼────────┐          │   │
│         │            │         │  Detection     │          │   │
│         │            │         │  Engine        │          │   │
│         │            │         │  (Local)       │          │   │
│         │            │         └───────┬────────┘          │   │
│         │            │                 │                   │   │
│         │            │         ┌───────▼────────┐          │   │
│         │            │         │  Warning       │          │   │
│         │            │         │  Modal UI      │          │   │
│         │            │         └────────────────┘          │   │
│         │            └─────────────────────────────────────┘   │
│         │                              │                       │
│  ┌──────▼──────────────────────────────▼──────────────────┐   │
│  │              Service Worker (Background)                │   │
│  │  - Message routing                                      │   │
│  │  - Storage management                                   │   │
│  │  - Badge updates                                        │   │
│  │  - Selector config cache                                │   │
│  └──────────────────────────┬─────────────────────────────┘   │
│                             │                                  │
│  ┌──────────────────────────▼─────────────────────────────┐   │
│  │              chrome.storage.local                       │   │
│  │  - User settings                                        │   │
│  │  - Detection stats (anonymized)                         │   │
│  │  - Selector cache                                       │   │
│  └────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 1.2 Component Responsibilities

| Component | Responsibility | Communication |
|-----------|---------------|---------------|
| Service Worker | Lifecycle, storage, messaging | chrome.runtime API |
| Content Script | DOM monitoring, injection | postMessage, chrome.runtime |
| Injected Script | Fetch interception | postMessage to content script |
| Detection Engine | Pattern matching, entropy | Direct function calls |
| Popup UI | User settings, stats display | chrome.runtime.sendMessage |
| Warning Modal | User decision capture | DOM events |
