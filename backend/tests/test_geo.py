"""Tests for geographic projection and Bhilai-Durg node coordinates."""

import json
from pathlib import Path

from app.core.city_loader import build_asset_list, load_city
from app.core.geo import (
    LAT_MAX,
    LAT_MIN,
    LON_MAX,
    LON_MIN,
    project,
    project_bbox_corners,
)

CITY_NODES_PATH = Path(__file__).resolve().parents[1] / "app" / "data" / "city_nodes.json"


def test_bbox_corners_within_canvas_margins() -> None:
    """All four bbox corners project inside [40, 960] x [40, 660]."""
    corners = project_bbox_corners()
    assert len(corners) == 4
    for name, (x, y) in corners.items():
        assert 40.0 <= x <= 960.0, f"{name} x={x} out of [40, 960]"
        assert 40.0 <= y <= 660.0, f"{name} y={y} out of [40, 660]"


def test_projection_axis_directions() -> None:
    """Increasing latitude moves upward (smaller y); increasing longitude moves right."""
    x1, y1 = project(21.19, 81.36)
    x2, y2 = project(21.24, 81.41)
    assert y2 < y1
    assert x2 > x1


def test_raw_city_nodes_have_lat_lon_and_no_xy() -> None:
    """city_nodes.json stores lat/lon only and does not hardcode x or y."""
    raw = json.loads(CITY_NODES_PATH.read_text(encoding="utf-8"))
    for node in raw["nodes"]:
        assert "lat" in node and "lon" in node
        assert "x" not in node and "y" not in node
        assert LAT_MIN <= node["lat"] <= LAT_MAX, f"{node['id']} lat out of bbox"
        assert LON_MIN <= node["lon"] <= LON_MAX, f"{node['id']} lon out of bbox"


def test_external_reference_raipur_projects_east_of_canvas() -> None:
    """Raipur external reference projects beyond the right margin and within vertical bounds."""
    city = load_city()
    ext = city["external_reference"]
    assert ext["id"] == "RAIPUR_REF"
    assert ext["x"] > 960.0
    assert 40.0 <= ext["y"] <= 660.0


def test_loader_and_assets_use_projected_coordinates() -> None:
    """load_city() and build_asset_list() attach projected x/y and real node names."""
    city = load_city()
    node_map = {n["id"]: n for n in city["nodes"]}

    for node in city["nodes"]:
        expected_x, expected_y = project(node["lat"], node["lon"])
        assert node["x"] == expected_x
        assert node["y"] == expected_y

    assets = build_asset_list()
    for asset in assets:
        for idx, node_id in enumerate(asset["connects"]):
            node = node_map[node_id]
            assert asset["endpoints"][idx] == {"x": node["x"], "y": node["y"]}

    by_id = {a["id"]: a for a in assets}
    assert by_id["DEMAND_CIVIC"]["name"] == "Civic Centre Junction"
    assert by_id["SOURCE_WTP"]["name"] == "Water Treatment Plant"
