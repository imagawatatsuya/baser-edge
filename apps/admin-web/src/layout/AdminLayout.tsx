import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { logoutApi } from "../api/client";

import { useAuth } from "../auth/AuthProvider";

import { ConsoleCapabilitiesBanner } from "../components/ConsoleCapabilitiesBanner";
import { ConsoleScopeBanner } from "../components/ConsoleScopeBanner";
import { PublicSiteLink } from "../components/PublicSiteLink";

import "./admin.css";

export function AdminLayout() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!navOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNavOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    const firstLink = sidebarRef.current?.querySelector<HTMLElement>(".admin-nav a, .admin-nav button");
    firstLink?.focus();
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navOpen]);

  return (
    <div className="admin">
      <a href="#main-content" className="skip-link">メインコンテンツへスキップ</a>
      <header className="admin-mobile-bar">
        <button
          ref={toggleRef}
          type="button"
          className="admin-nav-toggle"
          aria-expanded={navOpen}
          aria-controls="admin-sidebar"
          onClick={() => setNavOpen((open) => !open)}
        >
          {navOpen ? "メニューを閉じる" : "メニュー"}
        </button>
        <strong className="admin-mobile-title">baser-edge</strong>
      </header>
      {navOpen ? (
        <button
          type="button"
          className="admin-sidebar-backdrop"
          aria-label="メニューを閉じる"
          onClick={() => setNavOpen(false)}
        />
      ) : null}
      <aside ref={sidebarRef} id="admin-sidebar" className={`admin-sidebar${navOpen ? " is-open" : ""}`}>
        <div className="admin-brand">
          <span className="admin-brand-mark">b</span>
          <div>
            <strong>baser-edge</strong>
            <small>コンテンツ管理</small>
          </div>
        </div>
        <nav className="admin-nav">
          <NavLink to="/content" className={({ isActive }) => isActive ? "active" : undefined} aria-current={({ isActive }) => isActive ? "page" : undefined}>コンテンツ</NavLink>
          <NavLink to="/media" className={({ isActive }) => isActive ? "active" : undefined} aria-current={({ isActive }) => isActive ? "page" : undefined}>メディア</NavLink>
          <NavLink to="/approvals" className={({ isActive }) => isActive ? "active" : undefined} aria-current={({ isActive }) => isActive ? "page" : undefined}>承認</NavLink>
          <NavLink to="/trash" className={({ isActive }) => isActive ? "active" : undefined} aria-current={({ isActive }) => isActive ? "page" : undefined}>ゴミ箱</NavLink>
          <NavLink to="/custom" className={({ isActive }) => isActive ? "active" : undefined} aria-current={({ isActive }) => isActive ? "page" : undefined}>カスタム</NavLink>
          <NavLink to="/mail" className={({ isActive }) => isActive ? "active" : undefined} aria-current={({ isActive }) => isActive ? "page" : undefined}>メール</NavLink>
          <NavLink to="/themes" className={({ isActive }) => isActive ? "active" : undefined} aria-current={({ isActive }) => isActive ? "page" : undefined}>テーマ</NavLink>
          <NavLink to="/plugins" className={({ isActive }) => isActive ? "active" : undefined} aria-current={({ isActive }) => isActive ? "page" : undefined}>プラグイン</NavLink>
          <PublicSiteLink className="admin-nav-external" showVisitorLink visitorClassName="admin-nav-external admin-nav-external-secondary">
            公開サイト（ホーム）
          </PublicSiteLink>
        </nav>
        <div className="admin-sidebar-foot">
          <small className="admin-site-id">{session?.siteId?.slice(0, 12)}…</small>
          <button type="button" className="btn-text" onClick={() => { void logoutApi().then(() => { logout(); navigate("/login"); }); }}>ログアウト</button>
        </div>
      </aside>
      <div className="admin-main" id="main-content">
        <ConsoleScopeBanner />
        <ConsoleCapabilitiesBanner />
        <Outlet />
      </div>
    </div>
  );
}
