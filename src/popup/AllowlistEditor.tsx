/**
 * @fileoverview Popup Settings-tab editor for the user value allowlist.
 * @module popup/AllowlistEditor
 *
 * @dependencies
 *   - preact/hooks (useState)
 *   - addAllowlistEntry, removeAllowlistEntry, MAX_ALLOWLIST_ENTRIES (../shared/utils/allowlist-edit)
 *
 * @security
 *   - Never writes chrome.storage directly; persistence happens via the
 *     `onChange` callback, which the popup routes through updateSetting().
 */
import { useState } from 'preact/hooks';
import {
  addAllowlistEntry,
  removeAllowlistEntry,
  MAX_ALLOWLIST_ENTRIES,
  type AddAllowlistResult,
} from '@/shared/utils/allowlist-edit';

const REJECTION_COPY: Record<Exclude<AddAllowlistResult, { ok: true }>['reason'], string> = {
  empty: 'Enter a value',
  too_short: 'At least 4 characters',
  duplicate: 'Already in the list',
  limit: 'Limit of 100 reached',
};

const styles = {
  row: {
    display: 'flex',
    gap: '8px',
    marginBottom: '6px',
  },
  input: {
    flex: 1,
    padding: '8px 10px',
    fontSize: '13px',
    border: '1px solid #ced4da',
    borderRadius: '6px',
  },
  addButton: {
    padding: '8px 14px',
    fontSize: '13px',
    fontWeight: '600' as const,
    color: 'white',
    background: '#0d6efd',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  error: {
    fontSize: '11px',
    color: '#dc3545',
    marginBottom: '6px',
  },
  count: {
    fontSize: '11px',
    color: '#6c757d',
    marginBottom: '8px',
  },
  chipList: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '6px',
  },
  chip: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 8px',
    fontSize: '12px',
    background: '#e9ecef',
    color: '#495057',
    borderRadius: '12px',
  },
  chipRemove: {
    cursor: 'pointer',
    fontWeight: '700' as const,
    color: '#6c757d',
    lineHeight: 1,
    background: 'transparent',
    border: 'none',
    padding: 0,
    font: 'inherit',
  },
};

interface AllowlistEditorProps {
  allowlist: string[];
  onChange: (next: string[]) => void;
}

/**
 * Editor for the user's value allowlist: add via text input, remove per-chip.
 */
export function AllowlistEditor({ allowlist, onChange }: AllowlistEditorProps) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleAdd() {
    const result = addAllowlistEntry(allowlist, draft);
    if (!result.ok) {
      setError(REJECTION_COPY[result.reason]);
      return;
    }
    setError(null);
    setDraft('');
    onChange(result.list);
  }

  function handleRemove(value: string) {
    onChange(removeAllowlistEntry(allowlist, value));
  }

  return (
    <div>
      <div style={styles.row}>
        <input
          type="text"
          value={draft}
          placeholder="Value to never warn about"
          style={styles.input}
          onInput={(e) => setDraft((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd();
          }}
        />
        <button type="button" style={styles.addButton} onClick={handleAdd}>
          Add
        </button>
      </div>
      {error && <div style={styles.error}>{error}</div>}
      <div style={styles.count}>
        {allowlist.length} / {MAX_ALLOWLIST_ENTRIES}
      </div>
      <div style={styles.chipList}>
        {allowlist.map((value) => (
          <span key={value} style={styles.chip}>
            {value}
            <button
              type="button"
              style={styles.chipRemove}
              onClick={() => handleRemove(value)}
              aria-label={`Remove ${value}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
