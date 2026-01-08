/**
 * @fileoverview Main world script for fetch/XHR interception
 * @module injected
 * 
 * Runs in the page's main world to intercept fetch() and XMLHttpRequest
 * calls to AI API endpoints. This is a fallback mechanism when DOM
 * interception fails to catch submissions.
 * 
 * IMPORTANT: This script runs in an untrusted context. It communicates
 * with the content script via window.postMessage.
 */

// Marker to prevent multiple injections
if ((window as Window & { __aiLeakCheckerInjected?: boolean }).__aiLeakCheckerInjected) {
  console.log('[AI Leak Checker] Already injected, skipping');
} else {
  (window as Window & { __aiLeakCheckerInjected?: boolean }).__aiLeakCheckerInjected = true;

  const EXTENSION_MESSAGE_TYPE = 'AI_LEAK_CHECKER';

  // API endpoints to monitor
  const MONITORED_ENDPOINTS = [
    '/backend-api/conversation',  // ChatGPT
    '/api/chat',                  // Generic
    '/v1/chat/completions',       // OpenAI API
    '/api/append_message',        // Claude
  ];

  /**
   * Check if URL matches a monitored endpoint.
   */
  function isMonitoredEndpoint(url: string | URL): boolean {
    const urlString = url.toString();
    return MONITORED_ENDPOINTS.some(endpoint => urlString.includes(endpoint));
  }

  /**
   * Extract message content from request body.
   */
  function extractMessageContent(body: unknown): string | null {
    if (!body) return null;

    try {
      // Handle string body
      if (typeof body === 'string') {
        const parsed = JSON.parse(body);
        return extractFromParsed(parsed);
      }

      // Handle object body
      if (typeof body === 'object') {
        return extractFromParsed(body);
      }
    } catch {
      // Not JSON - could be FormData or other format
    }

    return null;
  }

  /**
   * Extract message from parsed JSON structure.
   */
  function extractFromParsed(data: unknown): string | null {
    if (!data || typeof data !== 'object') return null;

    const obj = data as Record<string, unknown>;

    // ChatGPT format: { messages: [{ content: { parts: ["text"] } }] }
    if (Array.isArray(obj.messages)) {
      const messages = obj.messages as Array<{ content?: unknown }>;
      for (const msg of messages) {
        if (msg.content) {
          if (typeof msg.content === 'string') {
            return msg.content;
          }
          if (typeof msg.content === 'object') {
            const content = msg.content as { parts?: string[] };
            if (Array.isArray(content.parts)) {
              return content.parts.join('\n');
            }
          }
        }
      }
    }

    // Claude format: { prompt: "text" } or { completion: { prompt: "text" } }
    if (typeof obj.prompt === 'string') {
      return obj.prompt;
    }

    // Generic: { message: "text" } or { text: "text" }
    if (typeof obj.message === 'string') {
      return obj.message;
    }
    if (typeof obj.text === 'string') {
      return obj.text;
    }

    return null;
  }

  /**
   * Send message to content script for scanning.
   */
  function requestScan(content: string): Promise<{ hasSensitiveData: boolean }> {
    return new Promise((resolve) => {
      const messageId = `scan_${Date.now()}_${Math.random()}`;

      const handler = (event: MessageEvent): void => {
        if (
          event.source === window &&
          event.data?.type === EXTENSION_MESSAGE_TYPE &&
          event.data?.action === 'scan_result' &&
          event.data?.messageId === messageId
        ) {
          window.removeEventListener('message', handler);
          resolve(event.data.result);
        }
      };

      window.addEventListener('message', handler);

      // Request scan from content script
      window.postMessage({
        type: EXTENSION_MESSAGE_TYPE,
        action: 'scan_request',
        messageId,
        content,
      }, '*');

      // Timeout after 5 seconds
      setTimeout(() => {
        window.removeEventListener('message', handler);
        resolve({ hasSensitiveData: false });
      }, 5000);
    });
  }

  // Store original fetch
  const originalFetch = window.fetch;

  /**
   * Patched fetch function.
   */
  window.fetch = async function patchedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const url = input instanceof Request ? input.url : input.toString();

    // Only intercept monitored endpoints
    if (isMonitoredEndpoint(url)) {
      const body = init?.body ?? (input instanceof Request ? input.body : null);
      const content = extractMessageContent(body);

      if (content) {
        console.log('[AI Leak Checker] Intercepted fetch to:', url);

        const scanResult = await requestScan(content);

        if (scanResult.hasSensitiveData) {
          // Content script will handle blocking - we just log here
          console.warn('[AI Leak Checker] Sensitive data detected in fetch request');
        }
      }
    }

    // Proceed with original fetch
    return originalFetch.call(window, input, init);
  };

  // Store original XMLHttpRequest
  const OriginalXHR = window.XMLHttpRequest;

  /**
   * Patched XMLHttpRequest class.
   */
  class PatchedXHR extends OriginalXHR {
    private _url: string = '';
    private _method: string = '';

    open(method: string, url: string | URL, async?: boolean, username?: string | null, password?: string | null): void {
      this._method = method;
      this._url = url.toString();
      super.open(method, url, async ?? true, username ?? null, password ?? null);
    }

    send(body?: Document | XMLHttpRequestBodyInit | null): void {
      if (isMonitoredEndpoint(this._url)) {
        const content = extractMessageContent(body);

        if (content) {
          console.log('[AI Leak Checker] Intercepted XHR to:', this._url);

          // Async scan - can't easily block XHR
          requestScan(content).then(result => {
            if (result.hasSensitiveData) {
              console.warn('[AI Leak Checker] Sensitive data detected in XHR request');
            }
          });
        }
      }

      super.send(body);
    }
  }

  window.XMLHttpRequest = PatchedXHR as typeof XMLHttpRequest;

  console.log('[AI Leak Checker] Fetch/XHR interception active');
}

export {};
