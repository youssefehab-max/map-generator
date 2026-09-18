import { useMemo, useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, generateId } from "../lib/api";
import FloorCanvas, { CanvasNode } from "../components/FloorCanvas";
import { useLanguage } from "../lib/i18n";
import { generateNavigationSteps, NavStep } from "../lib/navigationUtils";

export type NodeType = "normal" | "entrance" | "elevator" | "stairs";

interface FloorDraft { id: string; file: File; previewUrl: string; }
export interface NodeDraft { _id: string; name: string; x: number; y: number; floorId: string; type?: NodeType; }
interface EdgeDraft { from: string; to: string; weight: number; }

const DRAFT_KEY = "building_creator_draft_v1";

function findShortestPath(startId: string, endId: string, edges: EdgeDraft[], nodes: NodeDraft[]) {
  const adj = new Map<string, string[]>();
  edges.forEach((e) => {
    if (!adj.has(e.from)) adj.set(e.from, []);
    adj.get(e.from)!.push(e.to);
  });

  const queue: string[][] = [[startId]];
  const visited = new Set<string>([startId]);

  while (queue.length > 0) {
    const path = queue.shift()!;
    const curr = path[path.length - 1];

    if (curr === endId) return path;

    const neighbors = adj.get(curr) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([...path, neighbor]);
      }
    }
  }
  return null;
}

export default function CreateBuilding() {
  const { t, lang } = useLanguage(); 
  const navigate = useNavigate(); 
  const isLoggedIn = !!localStorage.getItem("token");

  const [name, setName] = useState(""); 
  const [floors, setFloors] = useState<FloorDraft[]>([]); 
  const [nodes, setNodes] = useState<NodeDraft[]>([]); 
  const [edges, setEdges] = useState<EdgeDraft[]>([]); 
  const [selectedFloorId, setSelectedFloorId] = useState(""); 

  const [history, setHistory] = useState<{ nodes: NodeDraft[]; edges: EdgeDraft[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [pendingClick, setPendingClick] = useState<{ x: number; y: number } | null>(null); 
  const [pendingName, setPendingName] = useState(""); 
  const [pendingType, setPendingType] = useState<NodeType>("normal");
  
  const [activeSourceNodeId, setActiveSourceNodeId] = useState<string | null>(null);
  const [edgeWeight, setEdgeWeight] = useState(1); 
  const [bidirectional, setBidirectional] = useState(true); 

  const [editingNode, setEditingNode] = useState<NodeDraft | null>(null);

  const [crossFloorFrom, setCrossFloorFrom] = useState("");
  const [crossFloorTo, setCrossFloorTo] = useState("");

  const [simStartNode, setSimStartNode] = useState("");
  const [simEndNode, setSimEndNode] = useState("");
  const [simulatedPathIds, setSimulatedPathIds] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false); 
  const [error, setError] = useState("");

  const pushHistory = (newNodes: NodeDraft[], newEdges: EdgeDraft[]) => {
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push({ nodes: newNodes, edges: newEdges });
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setNodes(prev.nodes);
      setEdges(prev.edges);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setNodes(next.nodes);
      setEdges(next.edges);
      setHistoryIndex(historyIndex + 1);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.name) setName(data.name);
        if (data.nodes) setNodes(data.nodes);
        if (data.edges) setEdges(data.edges);
      } catch (e) {
        console.error("Failed to load draft", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ name, nodes, edges }));
  }, [name, nodes, edges]);

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setName("");
    setNodes([]);
    setEdges([]);
    setHistory([]);
    setHistoryIndex(-1);
    setSimulatedPathIds([]);
  };

  const selectedFloor = floors.find((f) => f.id === selectedFloorId) || null; 
  const nodesOnFloor = useMemo(() => nodes.filter((n) => n.floorId === selectedFloorId), [nodes, selectedFloorId]); 
  const floorNumber = selectedFloor ? floors.findIndex((f) => f.id === selectedFloor.id) + 1 : 0;
  
  const nodeLabel = (n: NodeDraft) => `${lang === "ar" ? "الطابق" : "Floor"} ${floors.findIndex((f) => f.id === n.floorId) + 1} · ${n.name || t("creator.unnamed")}`;

  const simulatedPathPoints = useMemo(() => {
    if (!simulatedPathIds.length || !selectedFloorId) return undefined;
    const pointsOnThisFloor = simulatedPathIds
      .map((id) => nodes.find((n) => n._id === id))
      .filter((n): n is NodeDraft => !!n && n.floorId === selectedFloorId);

    return pointsOnThisFloor.map((n) => ({ x: n.x, y: n.y }));
  }, [simulatedPathIds, nodes, selectedFloorId]);

  // توليد إرشادات الملاحة أثناء محاكاة المسار
  const simNavSteps = useMemo(() => {
    if (!simulatedPathIds.length) return [];
    const pathNodes = simulatedPathIds
      .map((id) => nodes.find((n) => n._id === id))
      .filter((n): n is NodeDraft => !!n);
    return generateNavigationSteps(pathNodes);
  }, [simulatedPathIds, nodes]);

  if (!isLoggedIn) return (
    <div className="page narrow">
      <div className="auth-card inline-card">
        <span className="eyebrow">{t("creator.eyebrow")}</span>
        <h1>{t("creator.loginTitle")}</h1>
        <p className="muted">{t("creator.loginText")}</p>
        <Link to="/login" className="button button-primary">{t("nav.login")}</Link>
        <span className="inline-link">{t("creator.or")} <Link to="/register">{t("creator.createAccount")}</Link></span>
      </div>
    </div>
  );

  const addFloor = (fileList: FileList | null) => { 
    if (!fileList?.length) return; 
    const file = fileList[0]; 
    const newFloor = { id: `floor_${floors.length + 1}`, file, previewUrl: URL.createObjectURL(file) }; 
    const next = [...floors, newFloor]; 
    setFloors(next); 
    if (!selectedFloorId) setSelectedFloorId(newFloor.id); 
  };

  const removeFloor = (id: string) => { 
    setFloors(floors.filter((f) => f.id !== id)); 
    const nextNodes = nodes.filter((n) => n.floorId !== id);
    const nextEdges = edges.filter((e) => { 
      const fromNode = nodes.find((n) => n._id === e.from); 
      const toNode = nodes.find((n) => n._id === e.to); 
      return fromNode?.floorId !== id && toNode?.floorId !== id; 
    });
    setNodes(nextNodes);
    setEdges(nextEdges);
    pushHistory(nextNodes, nextEdges);
    if (selectedFloorId === id) setSelectedFloorId(floors.find((f) => f.id !== id)?.id ?? ""); 
  };

  const confirmAddNode = () => { 
    if (!pendingClick || !selectedFloorId) return; 
    const defaultName = pendingName.trim() || `Node ${nodes.length + 1}`;
    const newNode: NodeDraft = { 
      _id: generateId(), 
      name: defaultName, 
      x: pendingClick.x, 
      y: pendingClick.y, 
      floorId: selectedFloorId,
      type: pendingType
    };

    const nextNodes = [...nodes, newNode];
    setNodes(nextNodes); 
    pushHistory(nextNodes, edges);

    setPendingClick(null); 
    setPendingName(""); 
    setPendingType("normal");
  };

  const removeNode = (id: string) => { 
    const nextNodes = nodes.filter((n) => n._id !== id);
    const nextEdges = edges.filter((e) => e.from !== id && e.to !== id);
    setNodes(nextNodes); 
    setEdges(nextEdges); 
    pushHistory(nextNodes, nextEdges);
    if (activeSourceNodeId === id) setActiveSourceNodeId(null);
  };

  const handleConnectNodes = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const edgeExists = edges.some(e => e.from === fromId && e.to === toId);
    if (edgeExists) return;

    const next = [{ from: fromId, to: toId, weight: edgeWeight }]; 
    if (bidirectional) next.push({ from: toId, to: fromId, weight: edgeWeight }); 

    const nextEdges = [...edges, ...next];
    setEdges(nextEdges); 
    pushHistory(nodes, nextEdges);
  };

  const handleNodeClick = (nodeId: string) => {
    if (pendingClick) setPendingClick(null);

    if (!activeSourceNodeId) {
      setActiveSourceNodeId(nodeId);
    } else if (activeSourceNodeId === nodeId) {
      setActiveSourceNodeId(null);
    } else {
      handleConnectNodes(activeSourceNodeId, nodeId);
      setActiveSourceNodeId(null);
    }
  };

  const handleSaveEditNode = () => {
    if (!editingNode) return;
    const nextNodes = nodes.map((n) => (n._id === editingNode._id ? editingNode : n));
    setNodes(nextNodes);
    pushHistory(nextNodes, edges);
    setEditingNode(null);
  };

  const handleRunSimulation = () => {
    if (!simStartNode || !simEndNode) return;
    const path = findShortestPath(simStartNode, simEndNode, edges, nodes);
    if (path) {
      setSimulatedPathIds(path);
    } else {
      alert(lang === "ar" ? "لا يوجد مسار واصل بين هاتين النقطتين!" : "No path found between these nodes!");
      setSimulatedPathIds([]);
    }
  };

  const canSubmit = !!name.trim() && floors.length > 0 && nodes.length >= 2 && edges.length > 0;

  const submit = async () => { 
    setError(""); 
    if (!canSubmit) { setError(t("creator.validation")); return; } 
    setSubmitting(true); 
    try { 
      const form = new FormData(); 
      form.append("name", name.trim()); 
      form.append("floorsData", JSON.stringify(floors.map((f) => ({ id: f.id })))); 
      form.append("nodesData", JSON.stringify(nodes.map((n) => ({ 
        _id: n._id, 
        name: n.name || undefined, 
        x: n.x, 
        y: n.y, 
        floorId: n.floorId, 
        type: n.type,
        adjacencyList: edges.filter((e) => e.from === n._id).map((e) => ({ node: e.to, weight: e.weight })) 
      })))); 
      floors.forEach((f) => form.append("images", f.file)); 
      const building = await api.createBuilding(form); 
      localStorage.removeItem(DRAFT_KEY);
      navigate(`/view/${building._id}`); 
    } catch (err: any) { 
      setError(err.message); 
    } finally { 
      setSubmitting(false); 
    } 
  };

  const canvasNodes: CanvasNode[] = nodesOnFloor.map((n) => ({ 
    id: n._id, 
    x: n.x, 
    y: n.y, 
    label: n.name || undefined,
    variant: simulatedPathIds.includes(n._id)
      ? "path"
      : n._id === activeSourceNodeId
      ? "start"
      : (n.type as any) || "default"
  })); 

  if (pendingClick) canvasNodes.push({ id: "__pending", x: pendingClick.x, y: pendingClick.y, variant: "start" });

  return (
    <div className={`page creator-page ${lang === "ar" ? "rtl-content" : ""}`}>
      <div className="page-title-row">
        <div>
          <span className="eyebrow">{t("creator.eyebrow")}</span>
          <h1>{t("creator.title")}</h1>
          <p className="muted">{t("creator.subtitle")}</p>
        </div>

        <div className="button-row">
          <button className="button button-secondary" onClick={undo} disabled={historyIndex <= 0}>
            ↩ تراجع (Undo)
          </button>
          <button className="button button-secondary" onClick={redo} disabled={historyIndex >= history.length - 1}>
            ↪ إعادة (Redo)
          </button>
          <button className="button button-secondary danger" onClick={clearDraft}>
            مسح المسودة
          </button>
        </div>
      </div>

      <div className="creator-layout">
        <main>
          <section className="editor-card">
            <div className="editor-heading">
              <span className="step-number">1</span>
              <div><h2>{t("creator.details")}</h2><p>{t("creator.detailsText")}</p></div>
            </div>
            <label>{t("creator.buildingName")}<input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("creator.buildingPlaceholder")} /></label>
          </section>

          <section className="editor-card">
            <div className="editor-heading">
              <span className="step-number">2</span>
              <div><h2>{t("creator.floors")}</h2><p>{t("creator.floorsText")}</p></div>
            </div>
            <label className="upload-zone">
              <input type="file" accept="image/*" onChange={(e) => addFloor(e.target.files)} />
              <span className="upload-icon">＋</span>
              <strong>{t("creator.upload")}</strong>
              <small>{t("creator.fileHint")}</small>
            </label>
            {floors.length > 0 && (
              <div className="floor-tabs">
                {floors.map((f, i) => (
                  <button type="button" key={f.id} className={f.id === selectedFloorId ? "tab active" : "tab"} onClick={() => setSelectedFloorId(f.id)}>
                    <span>{lang === "ar" ? "الطابق" : "Floor"} {i + 1}</span>
                    <span className="tab-remove" onClick={(e) => { e.stopPropagation(); removeFloor(f.id); }} aria-label={`${t("creator.removeFloor")} ${i + 1}`}>×</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {selectedFloor && (
            <section className="editor-card">
              <div className="editor-heading">
                <span className="step-number">3</span>
                <div>
                  <h2>{t("creator.points")}</h2>
                  <p>
                    {activeSourceNodeId 
                      ? (lang === "ar" ? "اضغط على نقطة أخرى لتوصيلها" : "Click another node to connect") 
                      : t("creator.pointsText")}
                  </p>
                </div>
              </div>

              <FloorCanvas 
                imageUrl={selectedFloor.previewUrl} 
                nodes={canvasNodes} 
                edges={edges}
                activeSourceNodeId={activeSourceNodeId}
                pathPoints={simulatedPathPoints}
                onNodeClick={handleNodeClick}
                onNodeDrag={(id, x, y) => {
                  setNodes((prev) =>
                    prev.map((n) => (n._id === id ? { ...n, x, y } : n))
                  );
                }}
                onEdgeClick={(from, to) => {
                  const nextEdges = edges.filter(
                    (e) => !(e.from === from && e.to === to) && !(e.from === to && e.to === from)
                  );
                  setEdges(nextEdges);
                  pushHistory(nodes, nextEdges);
                }}
                onImageClick={(x, y) => { 
                  if (activeSourceNodeId) {
                    setActiveSourceNodeId(null); 
                  } else {
                    setPendingClick({ x, y }); 
                    setPendingName(`Node ${nodes.length + 1}`); 
                  }
                }} 
              />

              {pendingClick && (
                <div className="pending-node panel-subtle">
                  <div className="edge-grid">
                    <label>
                      اسم النقطة:
                      <input 
                        autoFocus 
                        value={pendingName} 
                        onChange={(e) => setPendingName(e.target.value)} 
                        onKeyDown={(e) => e.key === "Enter" && confirmAddNode()} 
                      />
                    </label>
                    <label>
                      نوع النقطة:
                      <select value={pendingType} onChange={(e) => setPendingType(e.target.value as NodeType)}>
                        <option value="normal">عادية (Normal)</option>
                        <option value="entrance">مدخل / مخرج (Entrance)</option>
                        <option value="elevator">مصعد (Elevator)</option>
                        <option value="stairs">سلم (Stairs)</option>
                      </select>
                    </label>
                  </div>
                  <div className="button-row" style={{ marginTop: '10px' }}>
                    <button className="button button-primary" onClick={confirmAddNode}>{t("creator.addPoint")}</button>
                    <button className="button button-secondary" onClick={() => setPendingClick(null)}>{t("creator.cancel")}</button>
                  </div>
                </div>
              )}

              {editingNode && (
                <div className="pending-node panel-subtle" style={{ marginTop: '15px' }}>
                  <h3>تعديل بيانات النقطة</h3>
                  <div className="edge-grid">
                    <label>
                      الاسم:
                      <input value={editingNode.name} onChange={(e) => setEditingNode({ ...editingNode, name: e.target.value })} />
                    </label>
                    <label>
                      النوع:
                      <select value={editingNode.type || "normal"} onChange={(e) => setEditingNode({ ...editingNode, type: e.target.value as NodeType })}>
                        <option value="normal">عادية (Normal)</option>
                        <option value="entrance">مدخل / مخرج (Entrance)</option>
                        <option value="elevator">مصعد (Elevator)</option>
                        <option value="stairs">سلم (Stairs)</option>
                      </select>
                    </label>
                  </div>
                  <div className="button-row" style={{ marginTop: '10px' }}>
                    <button className="button button-primary" onClick={handleSaveEditNode}>حفظ التعديل</button>
                    <button className="button button-secondary" onClick={() => setEditingNode(null)}>إلغاء</button>
                  </div>
                </div>
              )}
            </section>
          )}

          {floors.length > 1 && (
            <section className="editor-card">
              <div className="editor-heading">
                <span className="step-number">4</span>
                <div>
                  <h2>التوصيل بين الطوابق (Multi-Floor Connection)</h2>
                  <p>ربط السلالام والمصاعد بين الأدوار المختلفة</p>
                </div>
              </div>
              <div className="edge-grid">
                <label>
                  من نقطة:
                  <select value={crossFloorFrom} onChange={(e) => setCrossFloorFrom(e.target.value)}>
                    <option value="">اختر نقطة</option>
                    {nodes.map((n) => <option key={n._id} value={n._id}>{nodeLabel(n)}</option>)}
                  </select>
                </label>
                <label>
                  إلى نقطة:
                  <select value={crossFloorTo} onChange={(e) => setCrossFloorTo(e.target.value)}>
                    <option value="">اختر نقطة في طابق آخر</option>
                    {nodes.map((n) => <option key={n._id} value={n._id}>{nodeLabel(n)}</option>)}
                  </select>
                </label>
                <button 
                  className="button button-primary" 
                  disabled={!crossFloorFrom || !crossFloorTo || crossFloorFrom === crossFloorTo}
                  onClick={() => {
                    handleConnectNodes(crossFloorFrom, crossFloorTo);
                    setCrossFloorFrom("");
                    setCrossFloorTo("");
                  }}
                >
                  إضافة وصلة بين الطوابق
                </button>
              </div>
            </section>
          )}

          {nodes.length >= 2 && edges.length > 0 && (
            <section className="editor-card">
              <div className="editor-heading">
                <span className="step-number">5</span>
                <div>
                  <h2>محاكي واختبار المسارات (Path Simulator)</h2>
                  <p>اختبار أسرع مسار على الخريطة قبل النشر للتأكد من اكتمال التوصيلات</p>
                </div>
              </div>
              <div className="edge-grid">
                <label>
                  بداية المسار:
                  <select value={simStartNode} onChange={(e) => setSimStartNode(e.target.value)}>
                    <option value="">اختر نقطة البداية</option>
                    {nodes.map((n) => <option key={n._id} value={n._id}>{nodeLabel(n)}</option>)}
                  </select>
                </label>
                <label>
                  نهاية المسار:
                  <select value={simEndNode} onChange={(e) => setSimEndNode(e.target.value)}>
                    <option value="">اختر النقطة المستهدفة</option>
                    {nodes.map((n) => <option key={n._id} value={n._id}>{nodeLabel(n)}</option>)}
                  </select>
                </label>
                <div className="button-row">
                  <button className="button button-primary" onClick={handleRunSimulation} disabled={!simStartNode || !simEndNode}>
                    اختبار المسار 🚀
                  </button>
                  {simulatedPathIds.length > 0 && (
                    <button className="button button-secondary" onClick={() => setSimulatedPathIds([])}>
                      إخفاء المسار
                    </button>
                  )}
                </div>
              </div>

              {/* عرض الإرشادات النصية داخل المحاكي */}
              {simNavSteps.length > 0 && (
                <div style={{ marginTop: "16px" }}>
                  <h4>🧭 إرشادات التجربة المباشرة:</h4>
                  <ul className="data-list" style={{ marginTop: "8px" }}>
{simNavSteps.map((step: NavStep, idx: number) => (                     <li key={idx} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span>
                          {step.icon === "turn-left" && "↰"}
                          {step.icon === "turn-right" && "↱"}
                          {step.icon === "straight" && "↑"}
                          {step.icon === "elevator" && "🛗"}
                          {step.icon === "stairs" && "🪜"}
                          {step.icon === "finish" && "🎯"}
                        </span>
                        <small>{step.text}</small>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}
        </main>

        <aside className="publish-sidebar">
          <div className="publish-card">
            <span className="eyebrow">{t("creator.publish")}</span>
            <h2>{t("creator.readyTitle")}</h2>
            <p>{t("creator.publishText")}</p>
            <button className="button button-primary button-block" onClick={submit} disabled={submitting || !canSubmit}>
              {submitting ? t("creator.publishing") : t("creator.publishAction")}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}