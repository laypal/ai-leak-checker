/**
 * @fileoverview Extension popup UI
 * @module popup
 */

import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import type { Settings, Stats } from '@/shared/types';
import { MessageType, DetectorType, DEFAULT_SETTINGS, DEFAULT_STATS } from '@/shared/types';

// Styles
const styles = {
  container: {
    padding: '16px',
    minHeight: '400px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px',
    paddingBottom: '16px',
    borderBottom: '1px solid #e9ecef',
  },
  logo: {
    width: '32px',
    height: '32px',
    background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#212529',
  },
  subtitle: {
    fontSize: '12px',
    color: '#6c757d',
  },
  section: {
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#495057',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  statCard: {
    background: '#ffffff',
    borderRadius: '8px',
    padding: '12px',
    textAlign: 'center' as const,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#212529',
  },
  statLabel: {
    fontSize: '11px',
    color: '#6c757d',
    marginTop: '4px',
  },
  toggle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    background: '#ffffff',
    borderRadius: '8px',
    marginBottom: '8px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  toggleLabel: {
    fontSize: '13px',
    color: '#495057',
  },
  switch: {
    position: 'relative' as const,
    width: '40px',
    height: '22px',
    borderRadius: '11px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  switchKnob: {
    position: 'absolute' as const,
    top: '2px',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    background: 'white',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    transition: 'left 0.2s',
  },
  link: {
    fontSize: '12px',
    color: '#0d6efd',
    textDecoration: 'none',
    cursor: 'pointer',
  },
  footer: {
    marginTop: '20px',
    paddingTop: '16px',
    borderTop: '1px solid #e9ecef',
    textAlign: 'center' as const,
    fontSize: '11px',
    color: '#adb5bd',
  },
};

function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);
  const [activeTab, setActiveTab] = useState<'stats' | 'settings'>('stats');

  // Load settings and stats on mount
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [settingsRes, statsRes] = await Promise.all([
        chrome.runtime.sendMessage({ type: MessageType.SETTINGS_GET }),
        chrome.runtime.sendMessage({ type: MessageType.STATS_GET }),
      ]);
      if (settingsRes && !settingsRes.error) setSettings(settingsRes);
      if (statsRes && !statsRes.error) setStats(statsRes);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }

  async function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await chrome.runtime.sendMessage({
      type: MessageType.SETTINGS_UPDATE,
      payload: { settings: { [key]: value } },
    });
  }

  async function toggleDetector(type: DetectorType) {
    const detectors = { ...settings.detectors };
    detectors[type] = !detectors[type];
    await updateSetting('detectors', detectors);
  }

  async function resetStats() {
    await chrome.runtime.sendMessage({ type: MessageType.STATS_CLEAR });
    setStats(DEFAULT_STATS);
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logo}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <div>
          <div style={styles.title}>AI Leak Checker</div>
          <div style={styles.subtitle}>Protecting your sensitive data</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', marginBottom: '16px', background: '#e9ecef', borderRadius: '8px', padding: '4px' }}>
        <button
          onClick={() => setActiveTab('stats')}
          style={{
            flex: 1,
            padding: '8px',
            border: 'none',
            borderRadius: '6px',
            background: activeTab === 'stats' ? '#ffffff' : 'transparent',
            color: activeTab === 'stats' ? '#212529' : '#6c757d',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
            boxShadow: activeTab === 'stats' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          Statistics
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          style={{
            flex: 1,
            padding: '8px',
            border: 'none',
            borderRadius: '6px',
            background: activeTab === 'settings' ? '#ffffff' : 'transparent',
            color: activeTab === 'settings' ? '#212529' : '#6c757d',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
            boxShadow: activeTab === 'settings' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          Settings
        </button>
      </div>

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div>
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={{ ...styles.statValue, color: '#dc3545' }}>{stats.actions.cancelled}</div>
              <div style={styles.statLabel}>Blocked</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statValue, color: '#198754' }}>{stats.actions.masked}</div>
              <div style={styles.statLabel}>Redacted</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statValue, color: '#6c757d' }}>{stats.actions.proceeded}</div>
              <div style={styles.statLabel}>Bypassed</div>
            </div>
          </div>

          {/* Detection Breakdown */}
          {Object.keys(stats.byDetector).length > 0 && (
            <div style={{ ...styles.section, marginTop: '20px' }}>
              <div style={styles.sectionTitle}>Detection Breakdown</div>
              <div style={{ background: '#ffffff', borderRadius: '8px', padding: '12px' }}>
                {Object.entries(stats.byDetector).map(([type, count]) => (
                  <div key={type} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <span style={{ fontSize: '12px', color: '#495057' }}>{formatDetectorType(type)}</span>
                    <span style={{ fontSize: '12px', fontWeight: '600' }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <button
              onClick={resetStats}
              style={{
                padding: '8px 16px',
                border: '1px solid #dee2e6',
                borderRadius: '6px',
                background: 'transparent',
                color: '#6c757d',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Reset Statistics
            </button>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div>
          {/* Sensitivity */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Sensitivity Level</div>
            <select
              value={settings.sensitivity}
              onChange={(e) => updateSetting('sensitivity', e.currentTarget.value as Settings['sensitivity'])}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                fontSize: '13px',
                background: '#ffffff',
              }}
            >
              <option value="low">Low (High confidence only)</option>
              <option value="medium">Medium (Balanced)</option>
              <option value="high">High (Aggressive)</option>
            </select>
          </div>

          {/* Detectors */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Enabled Detectors</div>
            
            <Toggle
              label="API Keys"
              checked={settings.detectors[DetectorType.API_KEY_OPENAI]}
              onChange={() => toggleDetector(DetectorType.API_KEY_OPENAI)}
            />
            <Toggle
              label="Credit Cards"
              checked={settings.detectors[DetectorType.CREDIT_CARD]}
              onChange={() => toggleDetector(DetectorType.CREDIT_CARD)}
            />
            <Toggle
              label="Email Addresses"
              checked={settings.detectors[DetectorType.EMAIL]}
              onChange={() => toggleDetector(DetectorType.EMAIL)}
            />
            <Toggle
              label="Phone Numbers"
              checked={settings.detectors[DetectorType.PHONE_UK]}
              onChange={() => toggleDetector(DetectorType.PHONE_UK)}
            />
            <Toggle
              label="High Entropy Secrets"
              checked={settings.detectors[DetectorType.HIGH_ENTROPY]}
              onChange={() => toggleDetector(DetectorType.HIGH_ENTROPY)}
            />
          </div>

          {/* Strict Mode */}
          <div style={styles.section}>
            <Toggle
              label="Strict Mode (no bypass option)"
              checked={settings.strictMode}
              onChange={() => updateSetting('strictMode', !settings.strictMode)}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={styles.footer}>
        AI Leak Checker v{chrome.runtime.getManifest().version}
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <div style={styles.toggle}>
      <span style={styles.toggleLabel}>{label}</span>
      <div
        onClick={onChange}
        style={{
          ...styles.switch,
          background: checked ? '#198754' : '#dee2e6',
        }}
      >
        <div
          style={{
            ...styles.switchKnob,
            left: checked ? '20px' : '2px',
          }}
        />
      </div>
    </div>
  );
}

function formatDetectorType(type: string): string {
  return type
    .replace(/^api_key_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// Mount the app
render(<App />, document.getElementById('app')!);
