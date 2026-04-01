import { FormEvent, useMemo, useState } from 'react';

interface TagInputProps {
  currentTags: string[];
  suggestions: string[];
  disabled?: boolean;
  onAddTag: (tag: string) => Promise<void>;
}

function normalizeTag(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function TagInput({ currentTags, suggestions, disabled = false, onAddTag }: TagInputProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedValue = normalizeTag(value);

  const filteredSuggestions = useMemo(
    () =>
      suggestions
        .filter((tag) => !currentTags.includes(tag))
        .filter((tag) => (normalizedValue ? tag.startsWith(normalizedValue) : true))
        .slice(0, 8),
    [currentTags, normalizedValue, suggestions],
  );

  async function submitTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!normalizedValue) {
      setError('Enter a tag before adding.');
      return;
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedValue)) {
      setError('Use lowercase letters, numbers, and hyphens only.');
      return;
    }

    if (currentTags.includes(normalizedValue)) {
      setError('This tag is already attached.');
      return;
    }

    setIsSubmitting(true);

    try {
      await onAddTag(normalizedValue);
      setValue('');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to add tag.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="detail-section" aria-label="Tag management">
      <div className="detail-section-header">
        <h2>Tags</h2>
      </div>

      <form className="tag-input-form" onSubmit={submitTag}>
        <label className="search-panel-label" htmlFor="tag-input-field">
          Add tag
        </label>
        <div className="tag-input-row">
          <input
            id="tag-input-field"
            className="search-panel-input"
            value={value}
            disabled={disabled || isSubmitting}
            onChange={(event) => setValue(event.target.value)}
            placeholder="e.g. ai-tools"
            list="tag-suggestions"
          />
          <button type="submit" className="action-button" disabled={disabled || isSubmitting}>
            {isSubmitting ? 'Adding...' : 'Add'}
          </button>
        </div>

        <datalist id="tag-suggestions">
          {filteredSuggestions.map((tag) => (
            <option key={tag} value={tag} />
          ))}
        </datalist>

        {error ? <p className="status-text">{error}</p> : null}
      </form>

      <div className="server-taxonomy" aria-label="Current tags">
        {currentTags.map((tag) => (
          <span key={tag} className="tag-badge">
            #{tag}
          </span>
        ))}
      </div>
    </section>
  );
}
