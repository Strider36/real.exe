"""Data integrity tests for synthetic Stage 0 city network datasets."""

import json
from pathlib import Path
import pytest

DATA_DIR = Path(__file__).resolve().parent.parent / "app" / "data"
DATA_FILES = [
    "city_nodes.json",
    "roads.json",
    "water_network.json",
    "facilities.json",
]


def load_json(filename: str) -> dict:
    """Read a UTF-8 JSON file (without BOM) from the data directory."""
    path = DATA_DIR / filename
    raw = path.read_bytes()
    assert not raw.startswith(b"\xef\xbb\xbf"), f"{filename} must not have a UTF-8 BOM"
    return json.loads(raw.decode("utf-8"))


@pytest.mark.parametrize("filename", DATA_FILES)
def test_file_parses_and_has_meta(filename: str) -> None:
    """Every data file parses as JSON and declares _meta.data_status."""
    data = load_json(filename)
    assert "_meta" in data and isinstance(data["_meta"], dict)
    data_status = data["_meta"].get("data_status", "")
    assert data_status.startswith("SYNTHETIC MVP ASSUMPTION")


def test_entity_counts() -> None:
    """Verify exact Stage 0 synthetic entity counts."""
    nodes = load_json("city_nodes.json")["nodes"]
    roads = load_json("roads.json")["roads"]
    water = load_json("water_network.json")
    facilities = load_json("facilities.json")["facilities"]

    assert len(nodes) == 15
    assert len(roads) == 23
    assert len(water["pipelines"]) == 8
    assert len(water["demand_nodes"]) == 7
    assert len(water["sources"]) == 2
    assert len(facilities) == 5


def test_unique_ids_within_each_file() -> None:
    """All IDs must be unique within each JSON file."""
    node_ids = [item["id"] for item in load_json("city_nodes.json")["nodes"]]
    assert len(node_ids) == len(set(node_ids))

    road_ids = [item["id"] for item in load_json("roads.json")["roads"]]
    assert len(road_ids) == len(set(road_ids))

    water = load_json("water_network.json")
    water_ids = (
        [item["id"] for item in water["sources"]]
        + [item["id"] for item in water["demand_nodes"]]
        + [item["id"] for item in water["pipelines"]]
    )
    assert len(water_ids) == len(set(water_ids))

    facility_ids = [item["id"] for item in load_json("facilities.json")["facilities"]]
    assert len(facility_ids) == len(set(facility_ids))


def test_foreign_key_node_references() -> None:
    """Every node reference across roads, water network, and facilities must exist."""
    valid_nodes = {item["id"] for item in load_json("city_nodes.json")["nodes"]}

    for road in load_json("roads.json")["roads"]:
        assert road["from"] in valid_nodes, f"{road['id']} unknown from={road['from']}"
        assert road["to"] in valid_nodes, f"{road['id']} unknown to={road['to']}"

    water = load_json("water_network.json")
    for pipe in water["pipelines"]:
        assert pipe["from"] in valid_nodes, f"{pipe['id']} unknown from={pipe['from']}"
        assert pipe["to"] in valid_nodes, f"{pipe['id']} unknown to={pipe['to']}"

    for demand in water["demand_nodes"]:
        assert demand["node_id"] in valid_nodes, (
            f"{demand['id']} unknown node_id={demand['node_id']}"
        )

    for source in water["sources"]:
        assert source["node_id"] in valid_nodes, (
            f"{source['id']} unknown node_id={source['node_id']}"
        )

    for facility in load_json("facilities.json")["facilities"]:
        assert facility["node_id"] in valid_nodes, (
            f"{facility['id']} unknown node_id={facility['node_id']}"
        )


def test_water_demand_vs_capacity() -> None:
    """Total demand (12.1) and total source capacity (12.0) are numeric and within 1%."""
    water = load_json("water_network.json")

    capacities = [s["capacity_ml_day"] for s in water["sources"]]
    demands = [d["demand_ml_day"] for d in water["demand_nodes"]]

    for val in capacities + demands:
        assert isinstance(val, (int, float)) and not isinstance(val, bool)

    total_capacity = sum(capacities)
    total_demand = sum(demands)

    assert total_capacity == pytest.approx(12.0)
    assert total_demand == pytest.approx(12.1)
    assert abs(total_demand - total_capacity) / total_capacity <= 0.01


def test_road_parameters_valid() -> None:
    """Every road has positive free_flow_min/capacity_vph and base_volume_vph < capacity_vph."""
    for road in load_json("roads.json")["roads"]:
        assert road["free_flow_min"] > 0, f"{road['id']} invalid free_flow_min"
        assert road["capacity_vph"] > 0, f"{road['id']} invalid capacity_vph"
        assert road["base_volume_vph"] >= 0, f"{road['id']} invalid base_volume_vph"
        assert road["base_volume_vph"] < road["capacity_vph"], (
            f"{road['id']} base_volume_vph must be < capacity_vph"
        )
