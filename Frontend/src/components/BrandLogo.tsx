import { Link } from "react-router-dom";

export default function BrandLogo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className={`brand ${light ? "brand-light" : ""}`} aria-label="MapGen home">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 48 48" role="presentation">
          <path d="M8 34 18 26 25 31 34 18 41 23" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M24 6.5c-7 0-12.5 5.1-12.5 11.7C11.5 27 24 40.5 24 40.5S36.5 27 36.5 18.2C36.5 11.6 31 6.5 24 6.5Z" fill="none" stroke="var(--logo-lime)" strokeWidth="2.8"/>
          <circle cx="18" cy="26" r="2.7" fill="currentColor"/><circle cx="25" cy="31" r="2.7" fill="currentColor"/><circle cx="34" cy="18" r="2.7" fill="currentColor"/>
          <circle cx="24" cy="18" r="3.2" fill="var(--logo-lime)"/>
        </svg>
      </span>
      <span className="brand-wordmark">Map<strong>Gen</strong></span>
    </Link>
  );
}
