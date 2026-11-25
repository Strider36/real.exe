import { useEffect, useMemo, useRef, useState } from "react";

import {
  buildLabelItems,
  KEY_SITE_KINDS,
  placeLabels,
} from "../utils/labelLayout";

const ROAD_WIDTH = {
  arterial: 3,
  collector: 2,
  local: 1.2,
};

const STATUS_COLOR = {
  operational: "#16a34a",
  warning: "#f97316",
  disrupted: "#dc2626",
};

const JUNCTION_RADIUS = 4.5;
const FACILITY_RADIUS = 9;
const DEMAND_RADIUS = 7;

function getStatusColor(status) {
  return STATUS_COLOR[status] || STATUS_COLOR.operational;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clientToSvgPoint(svg, clientX, clientY) {
  if (!svg) return { x: clientX, y: clientY };
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: clientX, y: clientY };
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  return pt.matrixTransform(ctm.inverse());
}

function leaderSegment(x1, y1, r1, x2, y2, r2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;
  return {
    x1: x1 + ux * r1,
    y1: y1 + uy * r1,
    x2: x2 - ux * r2,
    y2: y2 - uy * r2,
  };
}

export default function CityMap({
  city,
  assets,
  activeLayers,
  selectedAsset,
  onSelectAsset,
  labelMode = "key",
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
  const zoom = transform.scale;
  const nodes = useMemo(() => city?.nodes || [], [city]);

  const toSvgPoint = (clientX, clientY) =>
    clientToSvgPoint(svgRef.current, clientX, clientY);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;

    const handleWheel = (event) => {
      event.preventDefault();
      const cursor = clientToSvgPoint(svg, event.clientX, event.clientY);
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

    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      svg.removeEventListener("wheel", handleWheel);
    };
  }, []);

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

  const selectedId = selectedAsset?.id || null;

  const placedLabels = useMemo(() => {
    const items = buildLabelItems(assets, nodes);
    return placeLabels(items, zoom, selectedId);
  }, [assets, nodes, zoom, selectedId]);

  const visibleLabels = useMemo(() => {
    const isSelectedLabel = (label) =>
      Boolean(
        selectedId &&
          (label.id === selectedId ||
            label.nodeId === selectedId ||
            label.assetIds?.includes(selectedId))
      );

    let filtered;
    if (labelMode === "off") {
      filtered = placedLabels.filter((label) => isSelectedLabel(label));
    } else if (labelMode === "key") {
      filtered = placedLabels.filter(
        (label) =>
          isSelectedLabel(label) ||
          (label.visible && KEY_SITE_KINDS.has(label.kind))
      );
    } else {
      filtered = placedLabels.filter((label) => label.visible || isSelectedLabel(label));
    }

    return [...filtered].sort((a, b) => (a.isSelected ? 1 : 0) - (b.isSelected ? 1 : 0));
  }, [placedLabels, labelMode, selectedId]);

  const extraSelectedLabel = useMemo(() => {
    if (!selectedAsset) return null;
    const alreadyCovered = visibleLabels.some(
      (label) =>
        label.id === selectedAsset.id ||
        label.assetIds?.includes(selectedAsset.id)
    );
    if (alreadyCovered) return null;

    const endpoints = selectedAsset.endpoints || [];
    if (endpoints.length === 2) {
      const mx = (endpoints[0].x + endpoints[1].x) / 2;
      const my = (endpoints[0].y + endpoints[1].y) / 2;
      return {
        id: `${selectedAsset.id}-selected-label`,
        text: selectedAsset.name,
        x: mx,
        y: my - 10 / zoom,
        anchor: "middle",
        fontSize: 11 / zoom,
      };
    }
    return null;
  }, [selectedAsset, visibleLabels, zoom]);

  const roadsActive = Boolean(activeLayers.roads);
  const waterActive = Boolean(activeLayers.water);
  const waterOnlyMode = waterActive && !roadsActive;

  const roads = (assets || []).filter((a) => a.asset_type === "road");
  const pipelines = waterActive
    ? (assets || []).filter((a) => a.asset_type === "water_pipeline")
    : [];
  const sources = waterActive
    ? (assets || []).filter((a) => a.asset_type === "water_source")
    : [];
  const demandNodes = waterActive
    ? (assets || []).filter((a) => a.asset_type === "demand_node")
    : [];
  const facilities = (assets || []).filter((a) => a.asset_type === "facility");

  const connectedNodeIds = new Set(selectedAsset?.connects || []);
  const sourceNodeIds = new Set(sources.map((s) => s.connects[0]));

  const getOpacity = (asset, defaultOpacity = 1) => {
    if (!selectedAsset) return defaultOpacity;
    return selectedAsset.id === asset.id ? 1 : Math.min(defaultOpacity, 0.3);
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-slate-200 bg-[#f8fafc] shadow-sm select-none">
      <svg
        ref={svgRef}
        viewBox="0 0 1000 700"
        className="h-full w-full cursor-grab active:cursor-grabbing"
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
          {/* Roads (rendered under pipelines) */}
          {(roadsActive || waterOnlyMode) && (
            <g className={waterOnlyMode ? "pointer-events-none" : undefined}>
              {roads.map((road) => {
                const [p1, p2] = road.endpoints;
                const isSelected = selectedAsset?.id === road.id;
                const width = ROAD_WIDTH[road.metadata?.road_class] || 2;
                const baseStroke =
                  road.status !== "operational"
                    ? getStatusColor(road.status)
                    : "#6b7280";
                const roadOpacity = waterOnlyMode
                  ? 0.2
                  : getOpacity(road, 0.45);

                return (
                  <g
                    key={road.id}
                    opacity={roadOpacity}
                    className={waterOnlyMode ? undefined : "cursor-pointer"}
                    onClick={
                      waterOnlyMode ? undefined : (e) => handleAssetClick(e, road)
                    }
                  >
                    {isSelected && (
                      <>
                        <line
                          x1={p1.x}
                          y1={p1.y}
                          x2={p2.x}
                          y2={p2.y}
                          stroke="#facc15"
                          strokeWidth={width + 6}
                          strokeLinecap="round"
                        />
                        <line
                          x1={p1.x}
                          y1={p1.y}
                          x2={p2.x}
                          y2={p2.y}
                          stroke={getStatusColor(road.status)}
                          strokeWidth={width + 2.5}
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
                    {!waterOnlyMode && (
                      <line
                        x1={p1.x}
                        y1={p1.y}
                        x2={p2.x}
                        y2={p2.y}
                        stroke="transparent"
                        strokeWidth={12}
                      />
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* Water pipelines (rendered after roads so they sit on top) */}
          <g>
            {pipelines.map((pipe) => {
              const [p1, p2] = pipe.endpoints;
              const isSelected = selectedAsset?.id === pipe.id;
              const isDashed = Number(pipe.metadata?.capacity_ml_day) < 2.0;
              const baseStroke =
                pipe.status !== "operational"
                  ? getStatusColor(pipe.status)
                  : "#2563eb";

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
                        x1={p1.x}
                        y1={p1.y}
                        x2={p2.x}
                        y2={p2.y}
                        stroke="#facc15"
                        strokeWidth={8.5}
                        strokeLinecap="round"
                      />
                      <line
                        x1={p1.x}
                        y1={p1.y}
                        x2={p2.x}
                        y2={p2.y}
                        stroke={getStatusColor(pipe.status)}
                        strokeWidth={4.8}
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
                    strokeWidth={2.2}
                    strokeDasharray={isDashed ? "6 4" : undefined}
                    strokeLinecap="round"
                  />
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke="transparent"
                    strokeWidth={12}
                  />
                </g>
              );
            })}
          </g>

          {/* Connection rings & base junction dots */}
          <g>
            {nodes.map((node) => {
              const isConnected = connectedNodeIds.has(node.id);
              const isSourceCenter = node.kind === "source" && sourceNodeIds.has(node.id);
              const isSubstationOrOutfall =
                node.kind === "substation" || node.kind === "outfall";

              return (
                <g key={node.id}>
                  {isConnected && (
                    <>
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={15}
                        fill="none"
                        stroke="#0f172a"
                        strokeWidth={5}
                      />
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={15}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth={3}
                      />
                    </>
                  )}

                  {!isSourceCenter && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={JUNCTION_RADIUS}
                      fill="#94a3b8"
                      stroke="#475569"
                      strokeWidth={1.2}
                      opacity={isSubstationOrOutfall ? 0 : 1}
                    />
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

                  {node.kind === "source" && !waterActive && (
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
                </g>
              );
            })}
          </g>

          {/* Water sources (square with visible junction dot at centre) */}
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
                      x={x - 14}
                      y={y - 14}
                      width={28}
                      height={28}
                      rx={4}
                      fill="none"
                      stroke="#facc15"
                      strokeWidth={4}
                    />
                  )}
                  <rect
                    x={x - 10}
                    y={y - 10}
                    width={20}
                    height={20}
                    rx={3}
                    fill="#2563eb"
                    stroke={statusOutline}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r={JUNCTION_RADIUS}
                    fill="#475569"
                    stroke="#ffffff"
                    strokeWidth={1.5}
                  />
                </g>
              );
            })}
          </g>

          {/* Demand nodes at node + (14, 14) with edge-to-edge leader */}
          <g>
            {demandNodes.map((demand) => {
              const { x, y } = demand.endpoints[0];
              const cx = x + 14;
              const cy = y + 14;
              const seg = leaderSegment(
                x,
                y,
                JUNCTION_RADIUS,
                cx,
                cy,
                DEMAND_RADIUS
              );
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
                    x1={seg.x1}
                    y1={seg.y1}
                    x2={seg.x2}
                    y2={seg.y2}
                    stroke="#60a5fa"
                    strokeWidth={1.4}
                  />
                  {isSelected && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={DEMAND_RADIUS + 4}
                      fill="none"
                      stroke="#facc15"
                      strokeWidth={4}
                    />
                  )}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={DEMAND_RADIUS}
                    fill="#3b82f6"
                    stroke={statusOutline}
                    strokeWidth={isSelected ? 2.2 : 1.5}
                  />
                </g>
              );
            })}
          </g>

          {/* Facilities at node + (14, -14) with edge-to-edge leader (always visible) */}
          <g>
            {facilities.map((facility) => {
              const { x, y } = facility.endpoints[0];
              const cx = x + 14;
              const cy = y - 14;
              const seg = leaderSegment(
                x,
                y,
                JUNCTION_RADIUS,
                cx,
                cy,
                FACILITY_RADIUS
              );
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
                    x1={seg.x1}
                    y1={seg.y1}
                    x2={seg.x2}
                    y2={seg.y2}
                    stroke="#94a3b8"
                    strokeWidth={1.4}
                  />
                  {isSelected && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={FACILITY_RADIUS + 4}
                      fill="none"
                      stroke="#facc15"
                      strokeWidth={4}
                    />
                  )}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={FACILITY_RADIUS}
                    fill="#ffffff"
                    stroke={statusOutline}
                    strokeWidth={isSelected ? 2.4 : 1.7}
                  />
                  <path
                    d={`M ${cx - 3.5} ${cy} H ${cx + 3.5} M ${cx} ${cy - 3.5} V ${cy + 3.5}`}
                    stroke="#dc2626"
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                </g>
              );
            })}
          </g>

          {/* Decluttered labels with white halo */}
          <g className="pointer-events-none">
            {visibleLabels.map((label) => (
              <text
                key={label.id}
                x={label.x}
                y={label.y}
                textAnchor={label.anchor}
                fontSize={label.fontSize}
                fontWeight={label.isSelected ? "700" : "600"}
                fill={label.isSelected ? "#0f172a" : "#1e293b"}
                stroke="#ffffff"
                strokeWidth={3 / zoom}
                paintOrder="stroke"
                strokeLinejoin="round"
              >
                {label.text}
              </text>
            ))}

            {extraSelectedLabel && (
              <text
                key={extraSelectedLabel.id}
                x={extraSelectedLabel.x}
                y={extraSelectedLabel.y}
                textAnchor={extraSelectedLabel.anchor}
                fontSize={extraSelectedLabel.fontSize}
                fontWeight="700"
                fill="#0f172a"
                stroke="#ffffff"
                strokeWidth={3 / zoom}
                paintOrder="stroke"
                strokeLinejoin="round"
              >
                {extraSelectedLabel.text}
              </text>
            )}
          </g>
        </g>

        {/* Raipur off-map callout at clamped right edge */}
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
                    y={arrowY + 15}
                    textAnchor="end"
                    fontSize={11}
                    fontWeight="600"
                    fill="#475569"
                    stroke="#ffffff"
                    strokeWidth={3}
                    paintOrder="stroke"
                    strokeLinejoin="round"
                  >
                    <tspan x={arrowTipX} dy={0}>
                      Raipur
                    </tspan>
                    <tspan x={arrowTipX} dy={13}>
                      about 27 km ENE, straight line
                    </tspan>
                    <tspan x={arrowTipX} dy={13}>
                      outside network
                    </tspan>
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
