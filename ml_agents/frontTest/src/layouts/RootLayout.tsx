// SPDX-License-Identifier: MIT
// Copyright (c) 2026 AgentOPsBase contributors
//
// Part of AgentOPsBase. You may use, modify, redistribute, and sell this work
// or derivatives (including commercially) without owing the copyright holders
// anything beyond what the MIT license requires. This file is licensed under
// the terms in the LICENSE file at the repository root. The software is
// provided "AS IS", without warranty; the copyright holders are not liable for
// this code or for what anyone does with it.
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
