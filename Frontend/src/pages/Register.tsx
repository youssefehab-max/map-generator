import { FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api";
import BrandLogo from "../components/BrandLogo";
import { useLanguage } from "../lib/i18n";

export default function Register() {
  const { t, lang } = useLanguage();
  const [username, setUsername] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(""); const [success, setSuccess] = useState(false); const [loading, setLoading] = useState(false); const navigate = useNavigate();
  const submit = async (e: FormEvent) => { e.preventDefault(); setError(""); setLoading(true); try { await api.register(username, email, password); setSuccess(true); setTimeout(() => navigate("/login"), 1200); } catch (err: any) { setError(err.message); } finally { setLoading(false); } };
  return <div className={`auth-layout ${lang === "ar" ? "rtl-auth" : ""}`}>
    <aside className="auth-aside"><BrandLogo light /><div className="auth-aside-copy"><span className="eyebrow">{t("auth.creator")}</span><h1>{t("auth.registerHero")}</h1><p>{t("auth.registerHeroText")}</p></div><div className="auth-decoration" aria-hidden="true"><span/><span/><span/></div></aside>
    <div className="auth-main"><div className="auth-card"><span className="mobile-brand"><BrandLogo /></span><span className="eyebrow">{t("auth.registerEyebrow")}</span><h2>{t("auth.registerTitle")}</h2><p className="auth-subtitle">{t("auth.registerSubtitle")}</p>
      <form onSubmit={submit} className="form">
        <label>{t("auth.username")}<input autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required /></label>
        <label>{t("auth.email")}<input autoComplete="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label>{t("auth.password")}<span className="password-field"><input autoComplete="new-password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required /><button type="button" className="password-toggle" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? t("auth.hide") : t("auth.show")} title={showPassword ? t("auth.hide") : t("auth.show")}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.7"/>{showPassword && <path d="m4 4 16 16"/>}</svg></button></span><span className="hint">{t("auth.passwordHint")}</span></label>
        {error && <div className="alert alert-error" role="alert">{error}</div>}{success && <div className="alert alert-success" role="status">{t("auth.created")}</div>}
        <button className="button button-primary button-block" type="submit" disabled={loading || success}>{loading ? t("auth.creating") : t("auth.signupAction")}</button>
      </form><p className="auth-footer">{t("auth.haveAccount")} <Link to="/login">{t("auth.loginAction")}</Link></p>
    </div></div></div>;
}
