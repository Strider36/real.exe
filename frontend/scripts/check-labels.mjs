import assert from "node:assert/strict";
import { buildLabelItems, placeLabels } from "../src/utils/labelLayout.js";

function boxesOverlap(a, b) {
  return !(
    a.right <= b.left ||
    a.left >= b.right ||
    a.bottom <= b.top ||
    a.top >= b.bottom
  );
}

// 1. NODE_08 has both source (SOURCE_WTP) and facility (FAC_05): must produce 1 label = "Water Treatment Plant"
{
  const nodes = [
    { id: "NODE_08", name: "Water Treatment Plant", kind: "source", x: 160, y: 290 },
  ];
  const assets = [
    {
      id: "SOURCE_WTP",
      name: "Water Treatment Plant",
      asset_type: "water_source",
      connects: ["NODE_08"],
    },
    {
      id: "FAC_05",
      name: "Water Treatment Plant",
      asset_type: "facility",
      connects: ["NODE_08"],
    },
  ];

  const items = buildLabelItems(assets, nodes);
  const node8Labels = items.filter((item) => item.nodeId === "NODE_08");
  assert.equal(node8Labels.length, 1, "NODE_08 should have exactly one label");
  assert.equal(node8Labels[0].text, "Water Treatment Plant");
}

// 2. Two close junctions (< 20 world units): hide at least one, and never return two overlapping visible boxes
{
  const nodes = [
    { id: "J1", name: "Bridge West Approach", kind: "intersection", x: 300, y: 300 },
    { id: "J2", name: "Bridge East Approach", kind: "intersection", x: 312, y: 304 },
  ];
  const items = buildLabelItems([], nodes);
  const placed = placeLabels(items, 1);
  const visible = placed.filter((item) => item.visible);

  assert.ok(visible.length < 2, "At least one close junction label must be hidden");

  for (let i = 0; i < visible.length; i++) {
    for (let j = i + 1; j < visible.length; j++) {
      assert.equal(
        boxesOverlap(visible[i].box, visible[j].box),
        false,
        "Visible labels must never overlap"
      );
    }
  }
}

// 3. Selected id is always visible even when tightly packed
{
  const nodes = [
    { id: "J1", name: "Alpha Junction Long Name", kind: "intersection", x: 400, y: 400 },
    { id: "J2", name: "Beta Junction Long Name", kind: "intersection", x: 402, y: 401 },
  ];
  const items = buildLabelItems([], nodes);
  const placed = placeLabels(items, 1, "J2");
  const selected = placed.find((item) => item.id === "J2");
  assert.ok(selected && selected.visible, "Selected id must always be visible");
}

console.log("label checks passed");
