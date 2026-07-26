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



  return (

    <div className="admin">

      <a href="#main-content" className="skip-link">メインコンテンツへスキップ</a>

      <aside className="admin-sidebar">

        <div className="admin-brand">

          <span className="admin-brand-mark">b</span>

          <div>

            <strong>baser-edge</strong>

            <small>コンテンツ管理</small>

          </div>

        </div>

        <nav className="admin-nav">

          <NavLink to="/content" className={({ isActive }) => isActive ? "active" : undefined}>コンテンツ</NavLink>

          <NavLink to="/media" className={({ isActive }) => isActive ? "active" : undefined}>メディア</NavLink>

          <NavLink to="/approvals" className={({ isActive }) => isActive ? "active" : undefined}>承認</NavLink>

          <NavLink to="/trash" className={({ isActive }) => isActive ? "active" : undefined}>ゴミ箱</NavLink>

          <NavLink to="/custom" className={({ isActive }) => isActive ? "active" : undefined}>カスタム</NavLink>

          <NavLink to="/mail" className={({ isActive }) => isActive ? "active" : undefined}>メール</NavLink>

          <NavLink to="/themes" className={({ isActive }) => isActive ? "active" : undefined}>テーマ</NavLink>
          <NavLink to="/plugins" className={({ isActive }) => isActive ? "active" : undefined}>プラグイン</NavLink>
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

