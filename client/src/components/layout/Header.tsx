import { Link } from 'react-router-dom';

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
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
          className="search-input"
          placeholder="Search MCP servers..."
          type="search"
        />
      </label>

      <button className="auth-button" type="button">
        Sign in
      </button>
    </header>
  );
}
