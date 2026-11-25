"""FastAPI application entrypoint for REALITY.EXE."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.city import router as city_router

app = FastAPI(title="REALITY.EXE API", version="0.0.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(city_router)


@app.get("/api/health")
def health_check() -> dict[str, object]:
    """Return service health status."""
    return {
        "status": "ok",
        "project": "REALITY.EXE",
        "is_synthetic": True,
    }
