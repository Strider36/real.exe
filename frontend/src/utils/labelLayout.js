export const PRIORITY_ORDER = [
  "water_source",
  "facility",
  "substation",
  "outfall",
  "demand_node",
  "junction",
];

const PRIORITY_RANK = Object.fromEntries(
  PRIORITY_ORDER.map((kind, index) => [kind, index])
);

const BASE_FONT_SIZE = {
  water_source: 13,
  facility: 13,
  substation: 12,
  outfall: 12,
  demand_node: 10,
  junction: 10,
};

const MARKER_RADIUS = {
  water_source: 10,
  facility: 9,
  substation: 10,
  outfall: 10,
  demand_node: 7,
  junction: 5,
};

export const KEY_SITE_KINDS = new Set([
  "water_source",
  "facility",
  "substation",
  "outfall",
]);

function boxesOverlap(a, b) {
  return !(
    a.right <= b.left ||
    a.left >= b.right ||
    a.bottom <= b.top ||
    a.top >= b.bottom
  );
}

function getMarkerPosition(node, kind) {
  if (kind === "facility") {
    return { x: node.x + 14, y: node.y - 14 };
  }
  if (kind === "demand_node") {
    return { x: node.x + 14, y: node.y + 14 };
  }
  return { x: node.x, y: node.y };
}

function buildCandidates(mx, my, radius, width, height) {
  const offset = radius + 4;
  return [
    {
      anchor: "middle",
      x: mx,
      y: my - offset - height * 0.15,
      box: {
        left: mx - width / 2,
        right: mx + width / 2,
        bottom: my - offset,
        top: my - offset - height,
      },
    },
    {
      anchor: "start",
      x: mx + offset,
      y: my + height * 0.35,
      box: {
        left: mx + offset,
        right: mx + offset + width,
        top: my - height / 2,
        bottom: my + height / 2,
      },
    },
    {
      anchor: "middle",
      x: mx,
      y: my + offset + height * 0.85,
      box: {
        left: mx - width / 2,
        right: mx + width / 2,
        top: my + offset,
        bottom: my + offset + height,
      },
    },
    {
      anchor: "end",
      x: mx - offset,
      y: my + height * 0.35,
      box: {
        right: mx - offset,
        left: mx - offset - width,
        top: my - height / 2,
        bottom: my + height / 2,
      },
    },
  ];
}

/**
 * Build at most one label item per city node using strict priority:
 * source > facility > substation > outfall > demand_node > junction.
 */
export function buildLabelItems(assets, nodes) {
  const byNode = new Map();
  for (const node of nodes || []) {
    byNode.set(node.id, { node, attached: [] });
  }

  for (const asset of assets || []) {
    if (!asset?.connects || asset.connects.length !== 1) continue;
    const nodeId = asset.connects[0];
    const entry = byNode.get(nodeId);
    if (entry) {
      entry.attached.push(asset);
    }
  }

  const items = [];
  for (const { node, attached } of byNode.values()) {
    const sourceAsset = attached.find((a) => a.asset_type === "water_source");
    const facilityAsset = attached.find((a) => a.asset_type === "facility");
    const demandAsset = attached.find((a) => a.asset_type === "demand_node");

    let kind = "junction";
    let id = node.id;
    let text = node.name;

    if (sourceAsset || node.kind === "source") {
      kind = "water_source";
      id = sourceAsset ? sourceAsset.id : node.id;
      text = sourceAsset ? sourceAsset.name : node.name;
    } else if (facilityAsset) {
      kind = "facility";
      id = facilityAsset.id;
      text = facilityAsset.name;
    } else if (node.kind === "substation") {
      kind = "substation";
      id = node.id;
      text = node.name;
    } else if (node.kind === "outfall") {
      kind = "outfall";
      id = node.id;
      text = node.name;
    } else if (demandAsset) {
      kind = "demand_node";
      id = demandAsset.id;
      const val = demandAsset.metadata?.demand_ml_day;
      text = val !== undefined ? `${val} ML/d` : demandAsset.name;
    }

    const pos = getMarkerPosition(node, kind);
    const markerBoxes = [
      {
        left: node.x - 6,
        right: node.x + 6,
        top: node.y - 6,
        bottom: node.y + 6,
      },
    ];

    if (facilityAsset) {
      markerBoxes.push({
        left: node.x + 14 - 9,
        right: node.x + 14 + 9,
        top: node.y - 14 - 9,
        bottom: node.y - 14 + 9,
      });
    }
    if (demandAsset) {
      markerBoxes.push({
        left: node.x + 14 - 7,
        right: node.x + 14 + 7,
        top: node.y + 14 - 7,
        bottom: node.y + 14 + 7,
      });
    }

    items.push({
      id,
      nodeId: node.id,
      assetIds: attached.map((a) => a.id),
      kind,
      text,
      x: pos.x,
      y: pos.y,
      radius: MARKER_RADIUS[kind] ?? 6,
      markerBoxes,
    });
  }

  items.sort(
    (a, b) => (PRIORITY_RANK[a.kind] ?? 99) - (PRIORITY_RANK[b.kind] ?? 99)
  );

  return items;
}

/**
 * Greedily place labels in priority order without overlapping placed labels or markers.
 * Always keeps the selectedId's label visible, even if it overlaps.
 */
export function placeLabels(items, zoom = 1, selectedId = null) {
  const safeZoom = Math.max(0.5, Number(zoom) || 1);
  const allMarkerBoxes = [];
  for (const item of items || []) {
    if (Array.isArray(item.markerBoxes)) {
      allMarkerBoxes.push(...item.markerBoxes);
    } else {
      const r = item.radius ?? MARKER_RADIUS[item.kind] ?? 6;
      allMarkerBoxes.push({
        left: item.x - r,
        right: item.x + r,
        top: item.y - r,
        bottom: item.y + r,
      });
    }
  }

  const isSelectedItem = (item) =>
    Boolean(
      selectedId &&
        (item.id === selectedId ||
          item.nodeId === selectedId ||
          item.assetIds?.includes(selectedId))
    );

  const ordered = [...(items || [])].sort((a, b) => {
    const aSel = isSelectedItem(a) ? 0 : 1;
    const bSel = isSelectedItem(b) ? 0 : 1;
    if (aSel !== bSel) return aSel - bSel;
    return (PRIORITY_RANK[a.kind] ?? 99) - (PRIORITY_RANK[b.kind] ?? 99);
  });

  const placedLabelBoxes = [];
  const placedJunctionPoints = [];
  const resultsById = new Map();

  for (const item of ordered) {
    const baseSize = BASE_FONT_SIZE[item.kind] ?? 10;
    const fontSize = baseSize / safeZoom;
    const width = (item.text?.length || 0) * fontSize * 0.55;
    const height = fontSize * 1.2;
    const radius = item.radius ?? MARKER_RADIUS[item.kind] ?? 6;
    const candidates = buildCandidates(item.x, item.y, radius, width, height);
    const selected = isSelectedItem(item);

    const tooCloseToJunction =
      !selected &&
      item.kind === "junction" &&
      placedJunctionPoints.some(
        (pt) => Math.hypot(item.x - pt.x, item.y - pt.y) < 20
      );

    let chosen = null;
    if (!tooCloseToJunction) {
      for (const candidate of candidates) {
        const overlapsLabel = placedLabelBoxes.some((b) =>
          boxesOverlap(candidate.box, b)
        );
        const overlapsMarker = allMarkerBoxes.some((b) =>
          boxesOverlap(candidate.box, b)
        );
        if (!overlapsLabel && !overlapsMarker) {
          chosen = candidate;
          break;
        }
      }
    }

    if (chosen) {
      placedLabelBoxes.push(chosen.box);
      if (item.kind === "junction") {
        placedJunctionPoints.push({ x: item.x, y: item.y });
      }
      resultsById.set(item.id, {
        id: item.id,
        nodeId: item.nodeId,
        assetIds: item.assetIds,
        kind: item.kind,
        text: item.text,
        x: chosen.x,
        y: chosen.y,
        anchor: chosen.anchor,
        fontSize,
        box: chosen.box,
        visible: true,
        isSelected: selected,
      });
    } else if (selected) {
      const fallback = candidates[0];
      placedLabelBoxes.push(fallback.box);
      if (item.kind === "junction") {
        placedJunctionPoints.push({ x: item.x, y: item.y });
      }
      resultsById.set(item.id, {
        id: item.id,
        nodeId: item.nodeId,
        assetIds: item.assetIds,
        kind: item.kind,
        text: item.text,
        x: fallback.x,
        y: fallback.y,
        anchor: fallback.anchor,
        fontSize,
        box: fallback.box,
        visible: true,
        isSelected: true,
      });
    } else {
      const fallback = candidates[0];
      resultsById.set(item.id, {
        id: item.id,
        nodeId: item.nodeId,
        assetIds: item.assetIds,
        kind: item.kind,
        text: item.text,
        x: fallback.x,
        y: fallback.y,
        anchor: fallback.anchor,
        fontSize,
        box: fallback.box,
        visible: false,
        isSelected: false,
      });
    }
  }

  return (items || []).map((item) => resultsById.get(item.id));
}
