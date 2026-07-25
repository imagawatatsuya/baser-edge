import { NavLink, Outlet } from "react-router-dom";
import { PublicMediaDeliveryGuide } from "../../components/PublicMediaDeliveryGuide";

export function MediaLayout() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>メディア</h1>
          <p>画像などのアセットをワークスペースに登録し、ライブラリから再利用できます。</p>
        </div>
      </div>
      <nav className="page-tabs" aria-label="メディア">
        <NavLink to="/media" end className={({ isActive }) => (isActive ? "active" : undefined)}>
          ライブラリ
        </NavLink>
        <NavLink to="/media/upload" className={({ isActive }) => (isActive ? "active" : undefined)}>
          アップロード
        </NavLink>
      </nav>
      <PublicMediaDeliveryGuide className="public-media-guide-in-page" />
      <Outlet />
    </div>
  );
}
