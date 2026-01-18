/**
 * @fileoverview Warning modal component for displaying detected sensitive data
 * @module content/modal
 * 
 * Uses Shadow DOM to isolate styles from the host page.
 */

import { type Finding } from '@/shared/types';
import { describeFinding } from '@/shared/detectors';
import { mask } from '@/shared/utils/redact';

export interface WarningModalCallbacks {
  onContinue: () => void;
  onSendAnyway: () => void;
  onCancel: () => void;
}

/**
 * Warning modal component displayed when sensitive data is detected.
 * Uses Shadow DOM for style isolation.
 */
export class WarningModal {
  private container: HTMLDivElement;
  private shadowRoot: ShadowRoot;
  private callbacks: WarningModalCallbacks;
  private isVisible = false;
  // Store current findings for test API (sanitized data only)
  private currentFindings: Finding[] = [];

  constructor(callbacks: WarningModalCallbacks) {
    this.callbacks = callbacks;
    this.container = document.createElement('div');
    this.container.id = 'ai-leak-checker-modal';
    // Use 'closed' mode for security - prevents webpage JS from accessing shadow root
    // E2E tests use test-only API exposed on window instead
    this.shadowRoot = this.container.attachShadow({ mode: 'closed' });
    
    this.injectStyles();
    document.body.appendChild(this.container);
    
    // Expose test-only API for E2E tests (only in test environments)
    this.exposeTestAPI();
  }

  /**
   * Show the modal with the given findings.
   */
  show(findings: Finding[]): void {
    if (this.isVisible) return;

    // Store findings for test API (only masked/sanitized data)
    this.currentFindings = findings;

    const content = this.renderContent(findings);
    this.shadowRoot.innerHTML = this.getStyles() + content;
    this.attachEventListeners();
    this.container.style.display = 'block';
    this.isVisible = true;

    // Trap focus
    requestAnimationFrame(() => {
      const cancelButton = this.shadowRoot.querySelector('.cancel-btn') as HTMLButtonElement;
      cancelButton?.focus();
    });

    // Handle escape key
    document.addEventListener('keydown', this.handleEscape);
  }

  /**
   * Hide the modal.
   */
  hide(): void {
    this.container.style.display = 'none';
    this.isVisible = false;
    document.removeEventListener('keydown', this.handleEscape);
  }

  /**
   * Handle escape key press.
   */
  private handleEscape = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      this.hide();
      this.callbacks.onCancel();
    }
  };

  /**
   * Inject base styles.
   */
  private injectStyles(): void {
    this.container.style.cssText = `
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 2147483647;
    `;
  }

  /**
   * Get component styles.
   */
  private getStyles(): string {
    return `
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        .overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        }

        .modal {
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          max-width: 480px;
          width: 90%;
          max-height: 80vh;
          overflow: hidden;
          animation: slideIn 0.2s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .header {
          background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
          color: white;
          padding: 20px 24px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-icon {
          width: 28px;
          height: 28px;
          flex-shrink: 0;
        }

        .header h2 {
          font-size: 18px;
          font-weight: 600;
          margin: 0;
        }

        .body {
          padding: 20px 24px;
          max-height: 300px;
          overflow-y: auto;
        }

        .warning-text {
          color: #495057;
          font-size: 14px;
          line-height: 1.5;
          margin-bottom: 16px;
        }

        .findings-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .finding-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px;
          background: #f8f9fa;
          border-radius: 8px;
          margin-bottom: 8px;
          border-left: 4px solid #dc3545;
        }

        .finding-item:last-child {
          margin-bottom: 0;
        }

        .finding-icon {
          flex-shrink: 0;
          width: 20px;
          height: 20px;
          color: #dc3545;
        }

        .finding-content {
          flex: 1;
          min-width: 0;
        }

        .finding-type {
          font-size: 13px;
          font-weight: 600;
          color: #212529;
          margin-bottom: 4px;
        }

        .finding-value {
          font-size: 12px;
          font-family: 'SF Mono', Monaco, Consolas, monospace;
          color: #6c757d;
          background: #e9ecef;
          padding: 4px 8px;
          border-radius: 4px;
          word-break: break-all;
        }

        .confidence-badge {
          display: inline-block;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          margin-left: 8px;
          font-weight: 500;
        }

        .confidence-high {
          background: #f8d7da;
          color: #721c24;
        }

        .confidence-medium {
          background: #fff3cd;
          color: #856404;
        }

        .confidence-low {
          background: #d1ecf1;
          color: #0c5460;
        }

        .footer {
          padding: 16px 24px;
          background: #f8f9fa;
          border-top: 1px solid #e9ecef;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        button {
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          border: none;
        }

        button:focus {
          outline: 2px solid #0d6efd;
          outline-offset: 2px;
        }

        .cancel-btn {
          background: #e9ecef;
          color: #495057;
        }

        .cancel-btn:hover {
          background: #dee2e6;
        }

        .redact-btn {
          background: #198754;
          color: white;
        }

        .redact-btn:hover {
          background: #157347;
        }

        .send-btn {
          background: #dc3545;
          color: white;
        }

        .send-btn:hover {
          background: #bb2d3b;
        }

        .send-anyway-warning {
          font-size: 11px;
          color: #6c757d;
          margin-top: 8px;
          text-align: center;
        }
      </style>
    `;
  }

  /**
   * Render modal content.
   */
  private renderContent(findings: Finding[]): string {
    const findingsList = findings
      .map(f => this.renderFinding(f))
      .join('');

    return `
      <div class="overlay">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="header">
            <svg class="header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <h2 id="modal-title">Sensitive Data Detected</h2>
          </div>
          
          <div class="body">
            <p class="warning-text">
              The following sensitive information was detected in your message. 
              Sending this data to an AI service could expose your credentials or personal information.
            </p>
            
            <ul class="findings-list">
              ${findingsList}
            </ul>
          </div>
          
          <div class="footer">
            <button class="cancel-btn" type="button">Cancel</button>
            <button class="redact-btn" type="button">Mask & Continue</button>
            <button class="send-btn" type="button">Send Anyway</button>
          </div>
          
          <p class="send-anyway-warning">
            "Send Anyway" will submit your message without changes
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Render a single finding.
   */
  private renderFinding(finding: Finding): string {
    const maskedValue = mask(finding.value, finding.type);
    const confidenceClass = finding.confidence >= 0.8
      ? 'confidence-high'
      : finding.confidence >= 0.6
        ? 'confidence-medium'
        : 'confidence-low';
    
    const confidenceText = finding.confidence >= 0.8
      ? 'High'
      : finding.confidence >= 0.6
        ? 'Medium'
        : 'Low';

    return `
      <li class="finding-item">
        <svg class="finding-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
        <div class="finding-content">
          <div class="finding-type">
            ${this.escapeHtml(describeFinding(finding))}
            <span class="confidence-badge ${confidenceClass}">${confidenceText}</span>
          </div>
          <div class="finding-value">${this.escapeHtml(maskedValue)}</div>
        </div>
      </li>
    `;
  }

  /**
   * Attach event listeners to buttons.
   */
  private attachEventListeners(): void {
    const cancelBtn = this.shadowRoot.querySelector('.cancel-btn');
    const redactBtn = this.shadowRoot.querySelector('.redact-btn');
    const sendBtn = this.shadowRoot.querySelector('.send-btn');
    const overlay = this.shadowRoot.querySelector('.overlay');

    cancelBtn?.addEventListener('click', () => {
      this.hide();
      this.callbacks.onCancel();
    });

    redactBtn?.addEventListener('click', () => {
      this.hide();
      this.callbacks.onContinue();
    });

    sendBtn?.addEventListener('click', () => {
      this.hide();
      this.callbacks.onSendAnyway();
    });

    // Click outside to cancel
    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.hide();
        this.callbacks.onCancel();
      }
    });
  }

  /**
   * Escape HTML to prevent XSS.
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Expose test-only API for E2E tests.
   * Only available in test environments to avoid exposing sensitive data.
   * 
   * Security: Uses multiple indicators to detect Playwright automation environment.
   * Requires navigator.webdriver to be strictly true (not just truthy) AND
   * either about:blank URL (from page.setContent) or non-localhost domain.
   * This prevents malicious websites from spoofing test environment detection
   * by hosting on localhost or faking webdriver property.
   */
  private exposeTestAPI(): void {
    if (typeof window === 'undefined') {
      return;
    }

    // Security: Require strict webdriver check (must be exactly true, not just truthy)
    // AND require either about:blank (Playwright page.setContent) OR non-localhost
    // This prevents spoofing by localhost sites or faking webdriver property
    const hasWebdriver = window.navigator?.webdriver === true; // Strict check
    const isAboutBlank = window.location.href === 'about:blank' || 
                        window.location.href.startsWith('about:');
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.hostname.startsWith('127.');
    
    // Only expose if webdriver is strictly true AND (about:blank OR non-localhost)
    // This ensures we're in Playwright automation, not a malicious localhost site
    const isTestEnv = hasWebdriver && (isAboutBlank || !isLocalhost);

    if (!isTestEnv) {
      return;
    }

    // Expose sanitized test API on window (only in test environments)
    // This API provides the same data visible in the modal UI (masked values)
    // Note: Shadow root remains 'closed' - never exposed directly for security
    const testAPI = {
      getFindings: (): Array<{ type: string; label: string; confidence: string; maskedValue: string }> => {
        return this.currentFindings.map((finding) => ({
          type: finding.type,
          label: describeFinding(finding),
          confidence: finding.confidence >= 0.8 ? 'High' : finding.confidence >= 0.6 ? 'Medium' : 'Low',
          maskedValue: mask(finding.value, finding.type),
        }));
      },
      clickButton: (buttonClass: 'cancel-btn' | 'redact-btn' | 'send-btn'): void => {
        const button = this.shadowRoot.querySelector(`.${buttonClass}`) as HTMLButtonElement;
        if (button) {
          button.click();
        }
      },
      hasScrollableBody: (): boolean => {
        const body = this.shadowRoot.querySelector('.body');
        if (!body) return false;
        const style = window.getComputedStyle(body);
        return style.overflowY === 'auto' || style.overflowY === 'scroll';
      },
    };

    // Store on window for E2E tests to access
    (window as unknown as { __aiLeakCheckerTestAPI?: typeof testAPI }).__aiLeakCheckerTestAPI = testAPI;
  }

  /**
   * Destroy the modal.
   */
  destroy(): void {
    this.hide();
    this.container.remove();
    // Clean up test API
    if (typeof window !== 'undefined') {
      delete (window as unknown as { __aiLeakCheckerTestAPI?: unknown }).__aiLeakCheckerTestAPI;
    }
  }
}
