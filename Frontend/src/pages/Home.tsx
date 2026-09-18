import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Building } from "../lib/types";
import { useLanguage } from "../lib/i18n";

export default function Home() {
  const { t } = useLanguage(); const [buildings, setBuildings] = useState<Building[] | null>(null); const [error, setError] = useState("");
  useEffect(() => { api.getBuildings().then(setBuildings).catch((err) => setError(err.message)); }, []);
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  return <div className="page page-home">
    <section className="hero"><div className="hero-copy"><span className="eyebrow">{t("home.eyebrow")}</span><h1>{t("home.title")}</h1><p>{t("home.subtitle")}</p><div className="hero-actions"><a href="#maps" className="button button-primary">{t("home.explore")} <span aria-hidden="true">↓</span></a>{!localStorage.getItem("token") && <Link to="/register" className="button button-secondary">{t("home.account")}</Link>}</div></div><div className="hero-visual" aria-hidden="true"><div className="hero-grid"/><div className="map-orb"><span>⌖</span></div><div className="route route-a"/><div className="route route-b"/><div className="route-dot dot-a"/><div className="route-dot dot-b"/></div></section>
    <section id="maps" className="content-section"><div className="section-heading"><div><span className="eyebrow">{t("home.library")}</span><h2>{t("home.available")}</h2></div>{buildings && <span className="count-badge">{plural(buildings.length, t("home.map"), t("home.maps"))}</span>}</div>
      {error && <div className="alert alert-error" role="alert"><strong>{t("home.loadError")}</strong><span>{error}</span></div>}{!buildings && !error && <div className="loading-grid" aria-label={t("home.loading")}><span/><span/><span/></div>}{buildings?.length === 0 && <div className="empty-state"><span className="empty-icon">⌖</span><h3>{t("home.noMaps")}</h3><p>{t("home.noMapsText")}</p></div>}
      <div className="map-grid">{buildings?.map((b) => <Link to={`/view/${b._id}`} key={b._id} className="map-card"><div className="map-card-media" style={{ backgroundImage: b.floors[0]?.image ? `url(${b.floors[0].image})` : undefined }}><span className="map-card-badge">{plural(b.floors.length, t("home.floor"), t("home.floors"))}</span></div><div className="map-card-body"><div><h3>{b.name}</h3><p>{plural(b.nodes.length, t("home.point"), t("home.points"))}</p></div><span className="card-arrow" aria-hidden="true">→</span></div></Link>)}</div>
    </section></div>;
}
