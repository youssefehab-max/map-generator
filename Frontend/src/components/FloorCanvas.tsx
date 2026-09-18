import { useRef, useState, MouseEvent, WheelEvent, useEffect } from "react";

export interface CanvasNode {
  id: string;
  x: number;
  y: number;
  label?: string;
  variant?: "default" | "start" | "end" | "path" | "entrance" | "elevator" | "stairs";
}

export interface CanvasEdge {
  from: string;
  to: string;
}

interface Props {
  imageUrl: string;
  nodes?: CanvasNode[];
  edges?: CanvasEdge[];
  activeSourceNodeId?: string | null;
  pathPoints?: { x: number; y: number }[];
  onImageClick?: (x: number, y: number) => void;
  onNodeClick?: (id: string) => void;
  onNodeDrag?: (id: string, x: number, y: number) => void;
  onEdgeClick?: (from: string, to: string) => void;
}

export default function FloorCanvas({
  imageUrl,
  nodes = [],
  edges = [],
  activeSourceNodeId,
  pathPoints,
  onImageClick,
  onNodeClick,
  onNodeDrag,
  onEdgeClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  
  const [naturalSize, setNaturalSize] = useState({ w: 1, h: 1 });
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // --- حالات Zoom & Pan ---
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // --- حالة Drag & Drop للنقط ---
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  const handleLoad = () => {
    if (!imgRef.current) return;
    setNaturalSize({
      w: imgRef.current.naturalWidth || 1,
      h: imgRef.current.naturalHeight || 1,
    });
  };

  // حساب الإحداثيات بالنسبة لحجم الصورة الأصلي مع مراعاة الزوم والـ Pan
  const getScaledCoordinates = (e: MouseEvent<HTMLDivElement>) => {
    if (!imgRef.current) return null;
    const rect = imgRef.current.getBoundingClientRect();
    const scaleX = naturalSize.w / rect.width;
    const scaleY = naturalSize.h / rect.height;

    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);
    return { x, y };
  };

  // 1. التعامل مع التكبير والتصغير بالـ Scroll
  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.5), 5));
  };

  // 2. التحكم في بداية السحب (Pan أو Drag Node)
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    // ضغطة بكرة الماوس أو الزر الأيمن أو مفتاح Space للـ Pan
    if (e.button === 1 || e.button === 2 || e.shiftKey) {
      e.preventDefault();
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleNodeMouseDown = (e: MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (e.button === 0 && !e.shiftKey) {
      setDraggedNodeId(nodeId);
    }
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    // حركة الـ Pan
    if (isPanning) {
      setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
      return;
    }

    const coords = getScaledCoordinates(e);
    if (!coords) return;

    // حركة سحب النقطة (Drag Node)
    if (draggedNodeId && onNodeDrag) {
      onNodeDrag(draggedNodeId, coords.x, coords.y);
    } else if (activeSourceNodeId) {
      setMousePos(coords);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggedNodeId(null);
  };

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (isPanning || draggedNodeId) return;
    if (!onImageClick) return;
    
    const coords = getScaledCoordinates(e);
    if (coords) {
      onImageClick(coords.x, coords.y);
    }
  };

  const resetZoomPan = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const polyline = pathPoints?.map((p) => `${p.x},${p.y}`).join(" ");
  const activeNode = nodes.find((n) => n.id === activeSourceNodeId);

  const baseSize = Math.max(naturalSize.w, naturalSize.h);
  const strokeWidth = baseSize / 250;

  return (
    <div
      ref={containerRef}
      className={`floor-canvas ${onImageClick ? "floor-canvas-editable" : ""}`}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
      style={{ overflow: "hidden", position: "relative", cursor: isPanning ? "grabbing" : "default" }}
    >
      {/* أزرار التحكم بالزوم */}
      <div className="canvas-controls" style={{ position: "absolute", top: 10, right: 10, zIndex: 10, display: "flex", gap: "5px" }}>
        <button type="button" className="button button-secondary button-sm" onClick={() => setZoom((z) => Math.min(z * 1.2, 5))}>＋</button>
        <button type="button" className="button button-secondary button-sm" onClick={() => setZoom((z) => Math.max(z * 0.8, 0.5))}>－</button>
        <button type="button" className="button button-secondary button-sm" onClick={resetZoomPan}>إعادة ضبط</button>
      </div>

      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
          transition: isPanning ? "none" : "transform 0.1s ease-out",
          width: "100%",
          height: "100%",
        }}
      >
        <img
          ref={imgRef}
          src={imageUrl}
          onLoad={handleLoad}
          alt="Floor plan"
          draggable={false}
        />

        <svg
          className="floor-canvas-overlay"
          viewBox={`0 0 ${naturalSize.w} ${naturalSize.h}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {/* 1. رسم الوصلات (Edges) مع إمكانية التفاعل والحذف بالضغط */}
          {edges.map((e, index) => {
            const fromNode = nodes.find((n) => n.id === e.from);
            const toNode = nodes.find((n) => n.id === e.to);
            if (!fromNode || !toNode) return null;

            return (
              <line
                key={`edge-${index}`}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke="#3b82f6"
                strokeWidth={strokeWidth}
                strokeOpacity={0.8}
                style={{ cursor: onEdgeClick ? "pointer" : "default" }}
                onClick={(ev) => {
                  ev.stopPropagation();
                  onEdgeClick?.(e.from, e.to);
                }}
              />
            );
          })}

          {/* 2. رسم مسار التنقل (Path Points) */}
          {polyline && (
            <polyline
              points={polyline}
              fill="none"
              stroke="#22c55e"
              strokeWidth={baseSize / 180}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* 3. الخط المؤقت التفاعلي للماوس */}
          {activeNode && mousePos && (
            <line
              x1={activeNode.x}
              y1={activeNode.y}
              x2={mousePos.x}
              y2={mousePos.y}
              stroke="#3b82f6"
              strokeWidth={strokeWidth}
              strokeDasharray={`${strokeWidth * 2},${strokeWidth * 2}`}
            />
          )}

          {/* 4. رسم النقط (Nodes) */}
          {nodes.map((n) => {
            const r = baseSize / 130;
            const isSelected = n.id === activeSourceNodeId;

            // ألوان النقط حسب نوعها
            const fill = isSelected
              ? "#ef4444"
              : n.variant === "entrance"
              ? "#10b981"
              : n.variant === "elevator"
              ? "#8b5cf6"
              : n.variant === "stairs"
              ? "#f59e0b"
              : n.variant === "start"
              ? "#22c55e"
              : n.variant === "end"
              ? "#ef4444"
              : "#64748b";

            return (
              <g
                key={n.id}
                onMouseDown={(ev) => handleNodeMouseDown(ev, n.id)}
                onClick={(ev) => {
                  ev.stopPropagation();
                  onNodeClick?.(n.id);
                }}
                style={{ cursor: "grab" }}
              >
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={isSelected ? r * 1.25 : r}
                  fill={fill}
                  stroke="#fff"
                  strokeWidth={r / 4}
                />

                {n.label && (
                  <text
                    className="canvas-node-label"
                    x={n.x + r * 1.6}
                    y={n.y + r / 2}
                    fontSize={r * 2.2}
                    fill="var(--node-label)"
                    stroke="var(--node-label-outline)"
                    strokeWidth={r / 6}
                    paintOrder="stroke"
                  >
                    {n.label}
                  </text>
                )}

                <title>{n.label || n.id}</title>
              </g>
            );
          })}
        </svg>
      </div>

      {onImageClick && (
        <span className="canvas-hint">
          Shift + Drag للتحريك (Pan) | Scroll للزوم | Drag بالنقط لنقلها
        </span>
      )}
    </div>
  );
}