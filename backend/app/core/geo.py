"""Equirectangular geographic projection for the Bhilai-Durg schematic canvas."""

import math

LAT_MIN = 21.16
LAT_MAX = 21.29
LON_MIN = 81.33
LON_MAX = 81.44

CANVAS_W = 1000
CANVAS_H = 700
MARGIN = 40

_REF_LAT_DEG = 21.22
_LON_SCALE = math.cos(math.radians(_REF_LAT_DEG))
_AVAIL_W = CANVAS_W - 2 * MARGIN
_AVAIL_H = CANVAS_H - 2 * MARGIN
_BBOX_LON_SPAN = (LON_MAX - LON_MIN) * _LON_SCALE
_BBOX_LAT_SPAN = LAT_MAX - LAT_MIN
_SCALE = min(_AVAIL_W / _BBOX_LON_SPAN, _AVAIL_H / _BBOX_LAT_SPAN)
_USED_W = _BBOX_LON_SPAN * _SCALE
_USED_H = _BBOX_LAT_SPAN * _SCALE
_OFFSET_X = MARGIN + (_AVAIL_W - _USED_W) / 2.0
_OFFSET_Y = MARGIN + (_AVAIL_H - _USED_H) / 2.0


def project(lat: float, lon: float) -> tuple[float, float]:
    """Project WGS84 (lat, lon) onto the 1000x700 SVG canvas in pixels.

    Uses an equirectangular projection with longitude scaled by cos(21.22 deg).
    The network bounding box [LAT_MIN..LAT_MAX, LON_MIN..LON_MAX] is fitted inside
    [MARGIN, CANVAS_W - MARGIN] x [MARGIN, CANVAS_H - MARGIN] while preserving
    aspect ratio:
        dx = (lon - LON_MIN) * cos(21.22 deg)
        dy = (LAT_MAX - lat)
        scale = min((CANVAS_W - 2 * MARGIN) / ((LON_MAX - LON_MIN) * cos(21.22 deg)),
                    (CANVAS_H - 2 * MARGIN) / (LAT_MAX - LAT_MIN))
        x = round(offset_x + dx * scale, 1)
        y = round(offset_y + dy * scale, 1)
    """
    x = _OFFSET_X + (lon - LON_MIN) * _LON_SCALE * _SCALE
    y = _OFFSET_Y + (LAT_MAX - lat) * _SCALE
    return round(x, 1), round(y, 1)


def project_bbox_corners() -> dict[str, tuple[float, float]]:
    """Return projected (x, y) coordinates for all four bounding-box corners."""
    return {
        "north_west": project(LAT_MAX, LON_MIN),
        "north_east": project(LAT_MAX, LON_MAX),
        "south_west": project(LAT_MIN, LON_MIN),
        "south_east": project(LAT_MIN, LON_MAX),
    }
