import { NavLink } from 'react-router-dom';

interface SidebarProps {
  onNavigate: () => void;
}

const categoryLinks = [
  { label: 'Automation', path: '/category/automation' },
  { label: 'Developer Tools', path: '/category/developer-tools' },
  { label: 'AI Agents', path: '/category/ai-agents' },
  { label: 'Data', path: '/category/data' },
];

export function Sidebar({ onNavigate }: SidebarProps) {
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
        {categoryLinks.map((item) => (
          <NavLink className="sidebar-link" key={item.path} onClick={onNavigate} to={item.path}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
