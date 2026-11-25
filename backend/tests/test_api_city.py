"""API endpoint tests for Stage 1 city and asset routes."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_endpoint() -> None:
    """GET /api/health returns service status and synthetic flag."""
    response = client.get("/api/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["project"] == "REALITY.EXE"
    assert payload["is_synthetic"] is True


def test_get_city_payload() -> None:
    """GET /api/city returns 200, is_synthetic=True, and expected entity counts."""
    response = client.get("/api/city")
    assert response.status_code == 200
    data = response.json()

    assert data["is_synthetic"] is True
    assert len(data["nodes"]) == 15
    assert len(data["roads"]) == 23
    assert len(data["water"]["pipelines"]) == 8
    assert len(data["water"]["demand_nodes"]) == 7
    assert len(data["water"]["sources"]) == 2
    assert len(data["facilities"]) == 5


def test_get_assets_payload_and_shapes() -> None:
    """GET /api/assets returns 45 normalized assets with valid endpoints and connects."""
    response = client.get("/api/assets")
    assert response.status_code == 200
    data = response.json()

    assert data["is_synthetic"] is True
    assert data["count"] == 45
    assert len(data["assets"]) == 45

    required_keys = {
        "id",
        "name",
        "asset_type",
        "layer",
        "status",
        "connects",
        "endpoints",
        "metadata",
    }

    by_id = {}
    for asset in data["assets"]:
        assert required_keys.issubset(asset.keys())
        by_id[asset["id"]] = asset
        if asset["asset_type"] in {"road", "water_pipeline"}:
            assert len(asset["endpoints"]) == 2
            assert len(asset["connects"]) == 2
        else:
            assert len(asset["endpoints"]) == 1
            assert len(asset["connects"]) == 1

    assert by_id["ROAD_01"]["connects"] == ["NODE_01", "NODE_02"]


def test_cors_allows_loopback_ip_origin() -> None:
    """GET /api/health with Origin http://127.0.0.1:5173 returns CORS allow header."""
    response = client.get("/api/health", headers={"Origin": "http://127.0.0.1:5173"})
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://127.0.0.1:5173"


def test_cors_rejects_unlisted_origin() -> None:
    """GET /api/health with an unlisted Origin omits access-control-allow-origin."""
    response = client.get("/api/health", headers={"Origin": "http://evil.example.com"})
    assert response.status_code == 200
    assert "access-control-allow-origin" not in response.headers
