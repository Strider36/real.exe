import { useRef, useState } from "react";

const ROAD_WIDTH = {
  arterial: 6,
  collector: 4,
  local: 2,
};

const STATUS_COLOR = {
  operational: "#16a34a",
  warning: "#f97316",
  disrupted: "#dc2626",
};

function getStatusColor(status) {
  return STATUS_COLOR[status] || STATUS_COLOR.operational;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function offsetSegment(p1, p2, offsetPx) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  return {
    x1: p1.x + nx * offsetPx,
    y1: p1.y + ny * offsetPx,
    x2: p2.x + nx * offsetPx,
    y2: p2.y + ny * offsetPx,
  };
}

export default function CityMap({
  city,
  assets,
  activeLayers,
  selectedAsset,
  onSelectAsset,
}) {
  const svgRef = useRef(null);
  const dragRef = useRef({
    active: false,
    moved: false,
    startClientX: 0,
    startClientY: 0,
    startTx: 0,
    startTy: 0,
  });

  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });

  const toSvgPoint = (clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return { x: clientX, y: clientY };
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: clientX, y: clientY };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    return pt.matrixTransform(ctm.inverse());
  };

  const handleWheel = (event) => {
    event.preventDefault();
    const cursor = toSvgPoint(event.clientX, event.clientY);
    const zoomFactor = event.deltaY < 0 ? 1.15 : 1 / 1.15;

    setTransform((prev) => {
      const nextScale = clamp(prev.scale * zoomFactor, 0.5, 4);
      const worldX = (cursor.x - prev.x) / prev.scale;
      const worldY = (cursor.y - prev.y) / prev.scale;
      return {
        scale: nextScale,
        x: cursor.x - worldX * nextScale,
        y: cursor.y - worldY * nextScale,
      };
    });
  };

  const handlePointerDown = (event) => {
    if (event.button !== 0) return;
    dragRef.current = {
      active: true,
      moved: false,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startTx: transform.x,
      startTy: transform.y,
    };
  };

  const handlePointerMove = (event) => {
    if (!dragRef.current.active) return;
    const dxPx = event.clientX - dragRef.current.startClientX;
    const dyPx = event.clientY - dragRef.current.startClientY;

    if (Math.hypot(dxPx, dyPx) > 3) {
      dragRef.current.moved = true;
    }

    const startSvg = toSvgPoint(
      dragRef.current.startClientX,
      dragRef.current.startClientY
    );
    const currSvg = toSvgPoint(event.clientX, event.clientY);

    setTransform((prev) => ({
      ...prev,
      x: dragRef.current.startTx + (currSvg.x - startSvg.x),
      y: dragRef.current.startTy + (currSvg.y - startSvg.y),
    }));
  };

  const handlePointerUp = () => {
    dragRef.current.active = false;
  };

  const handleBackgroundClick = () => {
    if (dragRef.current.moved) return;
    onSelectAsset(null);
  };

  const handleAssetClick = (event, asset) => {
    event.stopPropagation();
    if (dragRef.current.moved) return;
    onSelectAsset(asset);
  };

  const isVisible = (asset) => {
    if (asset.layer === "facility") return true;
    return Boolean(activeLayers[asset.layer]);
  };

  const visibleAssets = (assets || []).filter(isVisible);
  const roads = visibleAssets.filter((a) => a.asset_type === "road");
  const pipelines = visibleAssets.filter((a) => a.asset_type === "water_pipeline");
  const sources = visibleAssets.filter((a) => a.asset_type === "water_source");
  const demandNodes = visibleAssets.filter((a) => a.asset_type === "demand_node");
  const facilities = visibleAssets.filter((a) => a.asset_type === "facility");

  const connectedNodeIds = new Set(selectedAsset?.connects || []);
  const nodes = city?.nodes || [];

  const getOpacity = (asset) => {
    if (!selectedAsset) return 1;
    return selectedAsset.id === asset.id ? 1 : 0.3;
  };

  const pointAssetNodes = new Set([
    ...sources.map((a) => a.connects[0]),
    ...facilities.map((a) => a.connects[0]),
  ]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-slate-200 bg-[#f8fafc] shadow-sm select-none">
      <svg
        ref={svgRef}
        viewBox="0 0 1000 700"
        className="h-full w-full cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onClick={handleBackgroundClick}
      >
        <rect
          x="-2000"
          y="-2000"
          width="5000"
          height="5000"
          fill="#f8fafc"
        />

        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.scale})`}>
          {/* Roads */}
          <g>
            {roads.map((road) => {
              const [p1, p2] = road.endpoints;
              const isSelected = selectedAsset?.id === road.id;
              const width = ROAD_WIDTH[road.metadata?.road_class] || 3;
              const baseStroke =
                road.status !== "operational" ? getStatusColor(road.status) : "#6b7280";

              return (
                <g
                  key={road.id}
                  opacity={getOpacity(road)}
                  className="cursor-pointer"
                  onClick={(e) => handleAssetClick(e, road)}
                >
                  {isSelected && (
                    <>
                      <line
                        x1={p1.x}
                        y1={p1.y}
                        x2={p2.x}
                        y2={p2.y}
                        stroke="#facc15"
                        strokeWidth={width + 8}
                        strokeLinecap="round"
                      />
                      <line
                        x1={p1.x}
                        y1={p1.y}
                        x2={p2.x}
                        y2={p2.y}
                        stroke={getStatusColor(road.status)}
                        strokeWidth={width + 3}
                        strokeLinecap="round"
                      />
                    </>
                  )}
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={baseStroke}
                    strokeWidth={width}
                    strokeLinecap="round"
                  />
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke="transparent"
                    strokeWidth={Math.max(14, width + 8)}
                  />
                </g>
              );
            })}
          </g>

          {/* Water pipelines */}
          <g>
            {pipelines.map((pipe) => {
              const [p1, p2] = pipe.endpoints;
              const seg = offsetSegment(p1, p2, 4);
              const isSelected = selectedAsset?.id === pipe.id;
              const isDashed = Number(pipe.metadata?.capacity_ml_day) < 2.0;
              const baseStroke =
                pipe.status !== "operational" ? getStatusColor(pipe.status) : "#2563eb";

              return (
                <g
                  key={pipe.id}
                  opacity={getOpacity(pipe)}
                  className="cursor-pointer"
                  onClick={(e) => handleAssetClick(e, pipe)}
                >
                  {isSelected && (
                    <>
                      <line
                        x1={seg.x1}
                        y1={seg.y1}
                        x2={seg.x2}
                        y2={seg.y2}
                        stroke="#facc15"
                        strokeWidth={10}
                        strokeLinecap="round"
                      />
                      <line
                        x1={seg.x1}
                        y1={seg.y1}
                        x2={seg.x2}
                        y2={seg.y2}
                        stroke={getStatusColor(pipe.status)}
                        strokeWidth={6}
                        strokeLinecap="round"
                      />
                    </>
                  )}
                  <line
                    x1={seg.x1}
                    y1={seg.y1}
                    x2={seg.x2}
                    y2={seg.y2}
                    stroke={baseStroke}
                    strokeWidth={3}
                    strokeDasharray={isDashed ? "8 5" : undefined}
                    strokeLinecap="round"
                  />
                  <line
                    x1={seg.x1}
                    y1={seg.y1}
                    x2={seg.x2}
                    y2={seg.y2}
                    stroke="transparent"
                    strokeWidth={14}
                  />
                </g>
              );
            })}
          </g>

          {/* City nodes & labels */}
          <g>
            {nodes.map((node) => {
              const isConnected = connectedNodeIds.has(node.id);
              return (
                <g key={node.id}>
                  {isConnected && (
                    <>
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={16}
                        fill="none"
                        stroke="#0f172a"
                        strokeWidth={5}
                      />
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={16}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth={3}
                      />
                    </>
                  )}

                  {node.kind === "substation" && (
                    <polygon
                      points={`${node.x},${node.y - 10} ${node.x + 10},${node.y} ${node.x},${node.y + 10} ${node.x - 10},${node.y}`}
                      fill="#eab308"
                      stroke="#713f12"
                      strokeWidth={1.5}
                    />
                  )}

                  {node.kind === "outfall" && (
                    <polygon
                      points={`${node.x},${node.y - 10} ${node.x + 10},${node.y + 8} ${node.x - 10},${node.y + 8}`}
                      fill="#92400e"
                      stroke="#451a03"
                      strokeWidth={1.5}
                    />
                  )}

                  {node.kind === "source" && (
                    <rect
                      x={node.x - 9}
                      y={node.y - 9}
                      width={18}
                      height={18}
                      rx={2}
                      fill="#93c5fd"
                      stroke="#1e40af"
                      strokeWidth={1.5}
                    />
                  )}

                  {node.kind === "intersection" && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={5.5}
                      fill="#94a3b8"
                      stroke="#475569"
                      strokeWidth={1.2}
                    />
                  )}

                  <text
                    x={node.x}
                    y={node.y + 20}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight="500"
                    fill="#334155"
                    className="pointer-events-none"
                  >
                    {node.name}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Water sources */}
          <g>
            {sources.map((source) => {
              const { x, y } = source.endpoints[0];
              const isSelected = selectedAsset?.id === source.id;
              const statusOutline =
                source.status !== "operational" || isSelected
                  ? getStatusColor(source.status)
                  : "#1e3a8a";

              return (
                <g
                  key={source.id}
                  opacity={getOpacity(source)}
                  className="cursor-pointer"
                  onClick={(e) => handleAssetClick(e, source)}
                >
                  {isSelected && (
                    <rect
                      x={x - 15}
                      y={y - 15}
                      width={30}
                      height={30}
                      rx={4}
                      fill="none"
                      stroke="#facc15"
                      strokeWidth={4}
                    />
                  )}
                  <rect
                    x={x - 11}
                    y={y - 11}
                    width={22}
                    height={22}
                    rx={3}
                    fill="#2563eb"
                    stroke={statusOutline}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                  />
                </g>
              );
            })}
          </g>

          {/* Demand nodes */}
          <g>
            {demandNodes.map((demand) => {
              const { x, y } = demand.endpoints[0];
              const nodeId = demand.connects[0];
              const offset = pointAssetNodes.has(nodeId) ? { dx: 18, dy: -12 } : { dx: 0, dy: -14 };
              const cx = x + offset.dx;
              const cy = y + offset.dy;
              const isSelected = selectedAsset?.id === demand.id;
              const statusOutline =
                demand.status !== "operational" || isSelected
                  ? getStatusColor(demand.status)
                  : "#1d4ed8";

              return (
                <g
                  key={demand.id}
                  opacity={getOpacity(demand)}
                  className="cursor-pointer"
                  onClick={(e) => handleAssetClick(e, demand)}
                >
                  <line
                    x1={x}
                    y1={y}
                    x2={cx}
                    y2={cy}
                    stroke="#93c5fd"
                    strokeWidth={1.2}
                  />
                  {isSelected && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={12}
                      fill="none"
                      stroke="#facc15"
                      strokeWidth={4}
                    />
                  )}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={8}
                    fill="#3b82f6"
                    stroke={statusOutline}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                  />
                  <text
                    x={cx + 11}
                    y={cy + 3}
                    fontSize={10}
                    fontWeight="600"
                    fill="#1e40af"
                    className="pointer-events-none"
                  >
                    {demand.metadata?.demand_ml_day} ML/d
                  </text>
                </g>
              );
            })}
          </g>

          {/* Facilities (always visible) */}
          <g>
            {facilities.map((facility) => {
              const { x, y } = facility.endpoints[0];
              const cx = x - 18;
              const cy = y - 14;
              const isSelected = selectedAsset?.id === facility.id;
              const statusOutline =
                facility.status !== "operational" || isSelected
                  ? getStatusColor(facility.status)
                  : "#0f172a";

              return (
                <g
                  key={facility.id}
                  opacity={getOpacity(facility)}
                  className="cursor-pointer"
                  onClick={(e) => handleAssetClick(e, facility)}
                >
                  <line
                    x1={x}
                    y1={y}
                    x2={cx}
                    y2={cy}
                    stroke="#cbd5e1"
                    strokeWidth={1.2}
                  />
                  {isSelected && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={14}
                      fill="none"
                      stroke="#facc15"
                      strokeWidth={4}
                    />
                  )}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={10}
                    fill="#ffffff"
                    stroke={statusOutline}
                    strokeWidth={isSelected ? 2.5 : 1.8}
                  />
                  <path
                    d={`M ${cx - 4} ${cy} H ${cx + 4} M ${cx} ${cy - 4} V ${cy + 4}`}
                    stroke="#dc2626"
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                  <text
                    x={cx - 12}
                    y={cy - 12}
                    textAnchor="middle"
                    fontSize={9.5}
                    fontWeight="600"
                    fill="#0f172a"
                    className="pointer-events-none"
                  >
                    {facility.name}
                  </text>
                </g>
              );
            })}
          </g>
        </g>

        {city?.external_reference && (
          <g className="pointer-events-none" aria-hidden="true">
            {(() => {
              const ext = city.external_reference;
              const arrowTipX = Math.min(ext.x ?? 985, 985);
              const arrowY = clamp(ext.y ?? 350, 60, 640);
              const lineStartX = arrowTipX - 48;
              return (
                <>
                  <line
                    x1={lineStartX}
                    y1={arrowY}
                    x2={arrowTipX - 8}
                    y2={arrowY}
                    stroke="#64748b"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                  />
                  <polygon
                    points={`${arrowTipX},${arrowY} ${arrowTipX - 10},${arrowY - 5} ${arrowTipX - 10},${arrowY + 5}`}
                    fill="#64748b"
                  />
                  <text
                    x={arrowTipX}
                    y={arrowY - 12}
                    textAnchor="end"
                    fontSize={11}
                    fontWeight="600"
                    fill="#475569"
                  >
                    Raipur (about 27 km ENE, straight line, outside network)
                  </text>
                </>
              );
            })()}
          </g>
        )}
      </svg>

      <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-white/90 px-2.5 py-1 text-[11px] font-mono text-slate-600 shadow-sm border border-slate-200">
        Zoom: {Math.round(transform.scale * 100)}% | Drag to pan, scroll to zoom
      </div>
    </div>
  );
}
