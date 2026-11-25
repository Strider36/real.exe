"""API routes serving synthetic city and infrastructure asset data."""

from typing import Any
from fastapi import APIRouter

from app.core.city_loader import build_asset_list, load_city

router = APIRouter(prefix="/api", tags=["city"])


@router.get("/city")
def get_city() -> dict[str, Any]:
    """Return the full synthetic city network."""
    return {"is_synthetic": True, **load_city()}


@router.get("/assets")
def get_assets() -> dict[str, Any]:
    """Return all infrastructure assets with coordinates and metadata."""
    assets = build_asset_list()
    return {
        "is_synthetic": True,
        "count": len(assets),
        "assets": assets,
    }
