import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthButton } from '../AuthButton.js';

const SEARCH_DEBOUNCE_MS = 300;

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialise from URL so the input reflects the current query on page load
  const [inputValue, setInputValue] = useState(() => searchParams.get('q') ?? '');

  // Keep input in sync when navigating back/forward or when `q` changes externally
  useEffect(() => {
    const urlQuery = searchParams.get('q') ?? '';
    setInputValue(urlQuery);
  }, [searchParams]);

  // Debounced navigation: update URL ?q= param after user stops typing
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const trimmed = inputValue.trim();
      const currentQ = searchParams.get('q') ?? '';

      if (trimmed === currentQ) return;

      const next = new URLSearchParams(searchParams);
      if (trimmed) {
        next.set('q', trimmed);
      } else {
        next.delete('q');
      }
      // Navigate to home with updated query; replace so back-button doesn't loop
      navigate(`/?${next.toString()}`, { replace: true });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
    // searchParams intentionally excluded — we only want to fire when inputValue changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue, navigate]);

  // Press "/" to focus the search input (discovery UI convention)
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const tag = (event.target as HTMLElement).tagName;
      if (
        event.key === '/' &&
        tag !== 'INPUT' &&
        tag !== 'TEXTAREA' &&
        tag !== 'SELECT'
      ) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="shell-header">
      <div className="shell-header-start">
        <button
          aria-label="Toggle navigation"
          className="menu-toggle"
          onClick={onMenuToggle}
          type="button"
        >
          Menu
        </button>
        <Link className="brand-link" to="/">
          MCP Registry
        </Link>
      </div>

      <label className="search-wrap">
        <span className="search-label">Search</span>
        <input
          ref={inputRef}
          aria-label="Search MCP servers"
          className="search-input"
          placeholder="Search MCP servers… (press / to focus)"
          type="search"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
      </label>

      <a
        href="/feeds/rss.xml"
        aria-label="Subscribe to RSS feed"
        title="RSS Feed"
        style={{ display: 'flex', alignItems: 'center', color: 'inherit', textDecoration: 'none' }}
        target="_blank"
        rel="noreferrer"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="6.18" cy="17.82" r="2.18" />
          <path d="M4 4.44v2.83c7.03 0 12.73 5.7 12.73 12.73h2.83c0-8.59-6.97-15.56-15.56-15.56zm0 5.66v2.83c3.9 0 7.07 3.17 7.07 7.07h2.83c0-5.47-4.43-9.9-9.9-9.9z" />
        </svg>
      </a>
      <AuthButton />
    </header>
  );
}
