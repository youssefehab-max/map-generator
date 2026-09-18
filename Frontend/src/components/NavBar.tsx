import { Link, useLocation, useNavigate } from "react-router-dom";
import BrandLogo from "./BrandLogo";
import { useLanguage } from "../lib/i18n";
import { useEffect, useState } from "react";

function GlobeIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M3.8 12h16.4M12 3.5c2.4 2.2 3.6 5 3.6 8.5S14.4 18.3 12 20.5c-2.4-2.2-3.6-5-3.6-8.5S9.6 5.7 12 3.5Z"/></svg>;
}

export default function NavBar() {
  const [theme, setTheme] = useState<"light" | "dark">(() => (localStorage.getItem("mapgen-theme") as "light" | "dark") || "light");
  useEffect(() => {
    document.documentElement.classList.toggle("theme-dark", theme === "dark");
    localStorage.setItem("mapgen-theme", theme);
  }, [theme]);
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, setLang, t } = useLanguage();
  const isLoggedIn = !!localStorage.getItem("token");
  const username = localStorage.getItem("username");
  const logout = () => { localStorage.removeItem("token"); localStorage.removeItem("username"); navigate("/"); window.location.reload(); };
  const isActive = (path: string) => path === "/" ? location.pathname === "/" || location.pathname.startsWith("/view/") : location.pathname.startsWith(path);
  const toggleLanguage = () => setLang(lang === "en" ? "ar" : "en");
  return (
    <header className="site-header">
      <div className="nav-shell">
        <BrandLogo />
        <nav className="primary-nav" aria-label="Primary navigation">
          <Link className={isActive("/") ? "nav-link active" : "nav-link"} to="/">{t("nav.browse")}</Link>
          {isLoggedIn && <Link className={isActive("/create") ? "nav-link active" : "nav-link"} to="/create">{t("nav.create")}</Link>}
        </nav>
        <div className="nav-actions">
          <button className="theme-toggle" type="button" onClick={() => setTheme(theme === "light" ? "dark" : "light")} aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"} title={theme === "light" ? "Dark mode" : "Light mode"}>
            <svg viewBox="0 0 24 24" aria-hidden="true">{theme === "light" ? <path d="M21 12.7A8.8 8.8 0 0 1 11.3 3a7 7 0 1 0 9.7 9.7Z"/> : <><circle cx="12" cy="12" r="3.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>}</svg>
          </button>
          <button className="language-switch" onClick={toggleLanguage} aria-label={lang === "en" ? "Switch to Arabic" : "التبديل إلى الإنجليزية"} title={t("nav.language")}>
            <span className="language-globe"><GlobeIcon /></span><span>{lang === "en" ? "ع" : "EN"}</span>
          </button>
          {isLoggedIn ? <>
            <span className="user-chip" title={username || undefined}><span className="avatar" aria-hidden="true">{(username || "U").charAt(0).toUpperCase()}</span><span className="user-name">{username || "User"}</span></span>
            <button className="logout-button" onClick={logout}><span className="logout-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M10 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H10M14 8l4 4-4 4M9 12h9"/></svg></span>{t("nav.logout")}</button>
          </> : <>
            <Link className="button button-ghost button-small" to="/login">{t("nav.login")}</Link>
            <Link className="button button-primary button-small" to="/register">{t("nav.signup")}</Link>
          </>}
        </div>
      </div>
    </header>
  );
}
