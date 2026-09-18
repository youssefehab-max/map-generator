import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { Building, MapNode, PathData } from "../lib/types";
import FloorCanvas from "../components/FloorCanvas";
import { useLanguage } from "../lib/i18n";
import { generateNavigationSteps, NavStep } from "../lib/navigationUtils";

function nodeLabel(node: MapNode, building: Building, unnamed: string) {
  const floorIndex = building.floors.findIndex((f) => f.id === node.floorId);
  const floorLabel = floorIndex >= 0 ? `Floor ${floorIndex + 1}` : node.floorId;
  return node.name?.trim() ? `${node.name} — ${floorLabel}` : `${unnamed} — ${floorLabel}`;
}

export default function Viewer() {
  const { t, lang } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [building, setBuilding] = useState<Building | null>(null);
  const [error, setError] = useState("");
  const [startId, setStartId] = useState("");
  const [endId, setEndId] = useState("");
  const [path, setPath] = useState<PathData | null>(null);
  const [pathError, setPathError] = useState("");
  const [floorIndex, setFloorIndex] = useState(0);
  const [loadingPath, setLoadingPath] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.getBuilding(id).then((b) => {
      setBuilding(b);
      const usable = b.nodes.filter((n) => n._id);
      setStartId(usable[0]?._id ?? "");
      setEndId(usable[1]?._id ?? "");
    }).catch((err) => setError(err.message));
  }, [id]);

  const currentFloor = useMemo(() => {
    if (!building) return null;
    if (!path?.reachable) return building.floors[0] ?? null;
    return path.floors[floorIndex] ?? null;
  }, [building, path, floorIndex]);

  // تحويل جميع نقاط المسار في كل الطوابق إلى قائمة نقطية متسلسلة لحساب الإرشادات
  const fullPathNodes = useMemo(() => {
    if (!path?.reachable) return [];
    return path.floors.flatMap((f) =>
      f.points.map((p) => ({
        x: p.x,
        y: p.y,
        name: p.name,
        floorId: f.floorId,
      }))
    );
  }, [path]);

  const navigationSteps = useMemo(() => {
    return generateNavigationSteps(fullPathNodes);
  }, [fullPathNodes]);

  const findPath = async () => {
    if (!id || !startId || !endId || startId === endId) return;
    setLoadingPath(true); setPathError(""); setPath(null); setFloorIndex(0);
    try {
      const result = await api.getPath(id, startId, endId);
      setPath(result);
      if (!result.reachable || result.floors.length === 0) setPathError(t("viewer.noPath"));
    } catch (err: any) { setPathError(err.message || t("viewer.noPath")); }
    finally { setLoadingPath(false); }
  };

  // دالة حذف المبنى
  const handleDeleteBuilding = async () => {
    if (!id) return;
    const confirmMessage = lang === "ar"
      ? "هل أنت تأكد من حذف هذا المبنى بالكامل؟"
      : "Are you sure you want to delete this building?";

    if (window.confirm(confirmMessage)) {
      setDeleting(true);
      try {
        await api.deleteBuilding(id);
        navigate("/");
      } catch (err: any) {
        setError(err.message || "Failed to delete building");
        setDeleting(false);
      }
    }
  };

  if (error) return <div className="page"><div className="alert alert-error" role="alert">{error}</div></div>;
  if (!building) return <div className="page"><div className="loading-panel"><span className="spinner" />{t("viewer.loading")}</div></div>;

  const segment = path?.reachable ? path.floors[floorIndex] : null;
  const imageUrl = segment?.image ?? currentFloor?.image;
  const allNodes = building.nodes.filter((n) => n._id);

  return (
    <div className={`page viewer-page ${lang === "ar" ? "rtl-content" : ""}`}>
      <div className="breadcrumb"><Link to="/">{t("viewer.map")}</Link><span>/</span><span>{building.name}</span></div>
      
      <div className="page-title-row">
        <div>
          <span className="eyebrow">{t("viewer.eyebrow")}</span>
          <h1>{building.name}</h1>
          <p className="muted">{t("viewer.instructions")}</p>
        </div>
        
        <div className="button-row" style={{ alignItems: "center" }}>
          <span className="count-badge">
            {building.floors.length} {building.floors.length === 1 ? t("home.floor") : t("home.floors")}
          </span>
          <button 
            className="button button-secondary danger" 
            onClick={handleDeleteBuilding}
            disabled={deleting}
          >
            {deleting 
              ? (lang === "ar" ? "جاري الحذف..." : "Deleting...") 
              : (lang === "ar" ? "حذف المبنى" : "Delete Building")}
          </button>
        </div>
      </div>

      <section className="route-panel" aria-label="Route planner">
        <div className="route-step"><span className="step-number">1</span><label>{t("viewer.start")}<select value={startId} onChange={(e) => { setStartId(e.target.value); setPath(null); setPathError(""); }}>{allNodes.map((n) => <option key={n._id} value={n._id}>{nodeLabel(n, building, t("viewer.unnamed"))}</option>)}</select></label></div>
        <div className="route-connector" aria-hidden="true">→</div>
        <div className="route-step"><span className="step-number">2</span><label>{t("viewer.destination")}<select value={endId} onChange={(e) => { setEndId(e.target.value); setPath(null); setPathError(""); }}>{allNodes.map((n) => <option key={n._id} value={n._id}>{nodeLabel(n, building, t("viewer.unnamed"))}</option>)}</select></label></div>
        <button className="button button-primary route-submit" onClick={findPath} disabled={loadingPath || !startId || !endId || startId === endId}>{loadingPath ? t("viewer.finding") : t("viewer.find")}</button>
      </section>

      {startId === endId && startId && <div className="route-validation" role="status">{t("viewer.chooseDifferent")}</div>}
      {pathError && <div className="alert alert-error" role="alert">{pathError}</div>}
      
      {path?.reachable && (
        <div className="route-summary" role="status">
          <div><span className="summary-label">{t("viewer.routeFound")}</span><strong>{path.distance?.toFixed(1)} <small>{t("viewer.distance")}</small></strong></div>
          <span className="summary-divider"/>
          <div><span className="summary-label">{t("viewer.floors")}</span><strong>{path.floors.length}</strong></div>
          <span className="summary-note">{t("viewer.routeHint")}</span>
        </div>
      )}

      {imageUrl && (
        <section className="viewer-stage">
          <div className="stage-header">
            <div><h2>{path?.reachable ? `${t("viewer.floorSegment")} ${floorIndex + 1}` : t("viewer.overview")}</h2><span>{path?.reachable ? `${lang === "ar" ? "من" : "of"} ${path.floors.length}` : ""}</span></div>
            {path?.reachable && path.floors.length > 1 && (
              <div className="floor-pills" role="group" aria-label={t("viewer.floors")}>
                {path.floors.map((_, i) => (
                  <button key={i} className={i === floorIndex ? "floor-pill active" : "floor-pill"} onClick={() => setFloorIndex(i)} aria-label={`${t("viewer.floorSegment")} ${i + 1}`}>{i + 1}</button>
                ))}
              </div>
            )}
          </div>
          <FloorCanvas imageUrl={imageUrl} pathPoints={segment?.points} nodes={segment?.points.map((p, i) => ({ id: p.nodeId, x: p.x, y: p.y, label: p.name || undefined, variant: i === 0 && floorIndex === 0 ? "start" : i === segment.points.length - 1 && floorIndex === (path?.floors.length ?? 1) - 1 ? "end" : "path" })) ?? []} />
          {path?.reachable && path.floors.length > 1 && (
            <div className="floor-nav">
              <button className="button button-secondary" disabled={floorIndex === 0} onClick={() => setFloorIndex((i) => Math.max(0, i - 1))}>← {t("viewer.previous")}</button>
              <span>{t("viewer.segment")} {floorIndex + 1} / {path.floors.length}</span>
              <button className="button button-secondary" disabled={floorIndex === path.floors.length - 1} onClick={() => setFloorIndex((i) => Math.min(path.floors.length - 1, i + 1))}>{t("viewer.next")} →</button>
            </div>
          )}
        </section>
      )}

      {/* قسم الإرشادات النصية للملاحة */}
      {navigationSteps.length > 0 && (
        <section className="editor-card" style={{ marginTop: "24px" }}>
          <h2>🧭 إرشادات الملاحة خطوة بخطوة</h2>
          <ul className="data-list" style={{ marginTop: "12px" }}>
            {navigationSteps.map((step: NavStep, idx: number) => (
              <li key={idx} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "1.2rem", width: "28px" }}>
                  {step.icon === "turn-left" && "↰"}
                  {step.icon === "turn-right" && "↱"}
                  {step.icon === "straight" && "↑"}
                  {step.icon === "elevator" && "🛗"}
                  {step.icon === "stairs" && "🪜"}
                  {step.icon === "finish" && "🎯"}
                </span>
                <span>
                  <strong>{step.text}</strong>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}