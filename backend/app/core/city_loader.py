"""Cached loaders for synthetic city infrastructure datasets."""

from functools import lru_cache
import json
from pathlib import Path
from typing import Any

from app.core.geo import project

DATA_DIR = Path(__file__).resolve().parents[1] / "data"


@lru_cache(maxsize=None)
def _read_json(filename: str) -> dict[str, Any]:
    """Read and parse a UTF-8 JSON file from app/data once."""
    path = DATA_DIR / filename
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def load_city() -> dict[str, Any]:
    """Return the combined synthetic city network dataset with projected x/y."""
    city_nodes = _read_json("city_nodes.json")
    roads_data = _read_json("roads.json")
    water_data = _read_json("water_network.json")
    facilities_data = _read_json("facilities.json")

    projected_nodes = []
    for node in city_nodes["nodes"]:
        x, y = project(node["lat"], node["lon"])
        projected_nodes.append({**node, "x": x, "y": y})

    raw_ext = city_nodes["external_reference"]
    ext_x, ext_y = project(raw_ext["lat"], raw_ext["lon"])
    external_reference = {**raw_ext, "x": ext_x, "y": ext_y}

    return {
        "meta": city_nodes["_meta"],
        "layers": city_nodes["layers"],
        "external_reference": external_reference,
        "nodes": projected_nodes,
        "roads": roads_data["roads"],
        "water": {
            "sources": water_data["sources"],
            "demand_nodes": water_data["demand_nodes"],
            "pipelines": water_data["pipelines"],
        },
        "facilities": facilities_data["facilities"],
    }


def _extract_metadata(item: dict[str, Any], excluded_keys: set[str]) -> dict[str, Any]:
    """Return remaining item fields as metadata without duplicating core keys."""
    return {k: v for k, v in item.items() if k not in excluded_keys}


def _coords(node_lookup: dict[str, dict[str, Any]], node_id: str) -> dict[str, float]:
    """Resolve projected {x, y} coordinates for a node id."""
    node = node_lookup[node_id]
    return {"x": node["x"], "y": node["y"]}


def build_asset_list() -> list[dict[str, Any]]:
    """Build a unified list of selectable infrastructure assets with projected endpoints."""
    city = load_city()
    node_lookup = {node["id"]: node for node in city["nodes"]}
    core_excluded = {"id", "name", "status"}
    assets: list[dict[str, Any]] = []

    for road in city["roads"]:
        from_id, to_id = road["from"], road["to"]
        assets.append(
            {
                "id": road["id"],
                "name": road["name"],
                "asset_type": "road",
                "layer": "roads",
                "status": road.get("status", "operational"),
                "connects": [from_id, to_id],
                "endpoints": [_coords(node_lookup, from_id), _coords(node_lookup, to_id)],
                "metadata": _extract_metadata(road, core_excluded),
            }
        )

    for pipe in city["water"]["pipelines"]:
        from_id, to_id = pipe["from"], pipe["to"]
        assets.append(
            {
                "id": pipe["id"],
                "name": pipe["name"],
                "asset_type": "water_pipeline",
                "layer": "water",
                "status": pipe.get("status", "operational"),
                "connects": [from_id, to_id],
                "endpoints": [_coords(node_lookup, from_id), _coords(node_lookup, to_id)],
                "metadata": _extract_metadata(pipe, core_excluded),
            }
        )

    for source in city["water"]["sources"]:
        node_id = source["node_id"]
        node = node_lookup[node_id]
        metadata = _extract_metadata(source, core_excluded)
        metadata.setdefault("place", node.get("place"))
        assets.append(
            {
                "id": source["id"],
                "name": source.get("name") or node["name"],
                "asset_type": "water_source",
                "layer": "water",
                "status": source.get("status", "operational"),
                "connects": [node_id],
                "endpoints": [_coords(node_lookup, node_id)],
                "metadata": metadata,
            }
        )

    for demand in city["water"]["demand_nodes"]:
        node_id = demand["node_id"]
        node = node_lookup[node_id]
        metadata = _extract_metadata(demand, core_excluded)
        metadata.setdefault("place", node.get("place"))
        assets.append(
            {
                "id": demand["id"],
                "name": node["name"],
                "asset_type": "demand_node",
                "layer": "water",
                "status": demand.get("status", "operational"),
                "connects": [node_id],
                "endpoints": [_coords(node_lookup, node_id)],
                "metadata": metadata,
            }
        )

    for facility in city["facilities"]:
        node_id = facility["node_id"]
        node = node_lookup[node_id]
        metadata = _extract_metadata(facility, core_excluded)
        metadata.setdefault("place", node.get("place"))
        assets.append(
            {
                "id": facility["id"],
                "name": facility["name"],
                "asset_type": "facility",
                "layer": "facility",
                "status": facility.get("status", "operational"),
                "connects": [node_id],
                "endpoints": [_coords(node_lookup, node_id)],
                "metadata": metadata,
            }
        )

    return assets
