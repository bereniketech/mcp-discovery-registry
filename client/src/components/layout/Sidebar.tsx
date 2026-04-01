import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { apiClient, type Category } from '../../lib/api.js';

interface SidebarProps {
  onNavigate: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const location = useLocation();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        const data = await apiClient.getCategories();
        if (!cancelled) {
          setCategories(data);
        }
      } catch {
        if (!cancelled) {
          setCategories([]);
        }
      }
    }

    void loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  const activeCategory = new URLSearchParams(location.search).get('category') ?? '';

  return (
    <aside className="shell-sidebar" aria-label="Primary navigation">
      <nav className="sidebar-section" aria-label="Main routes">
        <NavLink className="sidebar-link" onClick={onNavigate} to="/">
          Home
        </NavLink>
        <NavLink className="sidebar-link" onClick={onNavigate} to="/submit">
          Submit
        </NavLink>
        <NavLink className="sidebar-link" onClick={onNavigate} to="/profile">
          Profile
        </NavLink>
      </nav>

      <nav className="sidebar-section" aria-label="Categories">
        <p className="sidebar-title">Categories</p>
        <Link
          className={`sidebar-link${activeCategory ? '' : ' active'}`}
          onClick={onNavigate}
          to="/"
        >
          All categories
        </Link>
        {categories.map((item) => {
          const isActive = activeCategory === item.slug;
          const href = `/?category=${encodeURIComponent(item.slug)}`;

          return (
            <Link
              className={`sidebar-link${isActive ? ' active' : ''}`}
              key={item.id}
              onClick={onNavigate}
              to={href}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
