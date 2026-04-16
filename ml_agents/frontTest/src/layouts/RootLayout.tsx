import { NavLink, Outlet } from "react-router-dom";
import { NAV_AGENTS } from "../agents/registry";

export default function RootLayout() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-title">frontTest</span>
          <span className="sidebar-sub">ml_agents UI</span>
        </div>
        <nav className="sidebar-nav" aria-label="Primary">
          <NavLink to="/" end className="nav-link">
            Overview
          </NavLink>
          <div className="nav-section-label">Agents</div>
          {NAV_AGENTS.map((agent) => (
            <NavLink key={agent.id} to={agent.path} className="nav-link">
              {agent.title}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="shell-main">
        <Outlet />
      </div>
    </div>
  );
}
