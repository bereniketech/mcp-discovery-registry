import type { Category } from '../lib/api.js';

interface SearchBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  category: string;
  categories: Category[];
  onCategoryChange: (value: string) => void;
  availableTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
}

export function SearchBar({
  query,
  onQueryChange,
  category,
  categories,
  onCategoryChange,
  availableTags,
  selectedTags,
  onToggleTag,
}: SearchBarProps) {
  return (
    <section className="search-panel" aria-label="Search servers">
      <label className="search-panel-field" htmlFor="server-search">
        <span className="search-panel-label">Search</span>
        <input
          id="server-search"
          className="search-panel-input"
          type="search"
          value={query}
          placeholder="Search by name, description, or tag"
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>

      <label className="search-panel-field" htmlFor="category-filter">
        <span className="search-panel-label">Category</span>
        <select
          id="category-filter"
          className="search-panel-select"
          value={category}
          onChange={(event) => onCategoryChange(event.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((item) => (
            <option key={item.id} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      {availableTags.length > 0 ? (
        <div className="search-panel-tags" aria-label="Tag filters">
          {availableTags.map((tag) => {
            const isActive = selectedTags.includes(tag);

            return (
              <button
                key={tag}
                type="button"
                className="tag-chip"
                data-active={isActive}
                onClick={() => onToggleTag(tag)}
              >
                #{tag}
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
