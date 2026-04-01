import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { SearchBar } from './SearchBar.js';

describe('SearchBar', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  function renderComponent() {
    const onQueryChange = vi.fn();
    const onCategoryChange = vi.fn();
    const onToggleTag = vi.fn();

    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        <SearchBar
          query=""
          onQueryChange={onQueryChange}
          category=""
          categories={[
            { id: 'cat-1', name: 'Utilities', slug: 'utilities', description: 'Utilities servers' },
            { id: 'cat-2', name: 'Agents', slug: 'agents', description: 'Agent servers' },
          ]}
          onCategoryChange={onCategoryChange}
          availableTags={['cli', 'sse']}
          selectedTags={['cli']}
          onToggleTag={onToggleTag}
        />,
      );
    });

    return { onQueryChange, onCategoryChange, onToggleTag };
  }

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
      root = null;
    }

    if (container) {
      container.remove();
      container = null;
    }

    vi.clearAllMocks();
  });

  it('propagates query input changes', () => {
    const { onQueryChange } = renderComponent();
    const input = container?.querySelector<HTMLInputElement>('#server-search');

    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    act(() => {
      descriptor?.set?.call(input, 'postgres');
      input?.dispatchEvent(new Event('input', { bubbles: true }));
      input?.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(onQueryChange).toHaveBeenCalledWith('postgres');
  });

  it('propagates category changes', () => {
    const { onCategoryChange } = renderComponent();
    const select = container?.querySelector<HTMLSelectElement>('#category-filter');

    const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
    act(() => {
      descriptor?.set?.call(select, 'agents');
      select?.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(onCategoryChange).toHaveBeenCalledWith('agents');
  });

  it('toggles tags through chip clicks and marks active chip state', () => {
    const { onToggleTag } = renderComponent();
    const chips = Array.from(container?.querySelectorAll<HTMLButtonElement>('.tag-chip') ?? []);

    const activeChip = chips.find((chip) => chip.textContent?.includes('#cli'));
    const inactiveChip = chips.find((chip) => chip.textContent?.includes('#sse'));

    expect(activeChip?.getAttribute('data-active')).toBe('true');
    expect(inactiveChip?.getAttribute('data-active')).toBe('false');

    act(() => {
      inactiveChip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onToggleTag).toHaveBeenCalledWith('sse');
  });
});
