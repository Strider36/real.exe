import { useEffect, useState } from "react";

import AssetInfoPanel from "../components/AssetInfoPanel";
import CityMap from "../components/CityMap";
import InfrastructureLayer from "../components/InfrastructureLayer";
import Legend from "../components/Legend";
import MapToolbar from "../components/MapToolbar";
import { fetchAssets, fetchCity, fetchHealth } from "../services/api";

export default function Dashboard() {
  const [city, setCity] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [healthOk, setHealthOk] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [labelMode, setLabelMode] = useState("key");
  const [activeLayers, setActiveLayers] = useState({
    roads: true,
    water: true,
    sewage: false,
    electricity: false,
  });

  useEffect(() => {
    let active = true;

    Promise.all([fetchCity(), fetchAssets()])
      .then(([cityData, assetsData]) => {
        if (!active) return;
        setCity(cityData);
        setAssets(assetsData.assets || []);
        setError(null);
      })
      .catch(() => {
        if (!active) return;
        setError("Cannot reach backend at http://localhost:8000. Is uvicorn running?");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    fetchHealth()
      .then((res) => {
        if (active) setHealthOk(res?.status === "ok");
      })
      .catch(() => {
        if (active) setHealthOk(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleToggleLayer = (layerName) => {
    setActiveLayers((prev) => {
      const next = { ...prev, [layerName]: !prev[layerName] };
      if (selectedAsset && selectedAsset.layer === layerName && !next[layerName]) {
        setSelectedAsset(null);
      }
      return next;
    });
  };

  const handleResetView = () => {
    setResetSignal((n) => n + 1);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      <header className="bg-slate-900 text-white px-6 py-3.5 shadow-sm">
        <div className="mx-auto max-w-[1440px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight">REALITY.EXE</h1>
            <span
              title={
                healthOk === null
                  ? "Checking backend health"
                  : healthOk
                    ? "Backend /api/health: ok"
                    : "Backend /api/health unreachable"
              }
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-300"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  healthOk === null
                    ? "bg-amber-400"
                    : healthOk
                      ? "bg-emerald-400"
                      : "bg-rose-500"
                }`}
              />
              <span>API</span>
            </span>
          </div>

          <button
            type="button"
            onClick={handleResetView}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Reset view
          </button>
        </div>
        <p className="mx-auto max-w-[1440px] mt-1.5 text-xs text-slate-300">
          Schematic network on real geography. Place names and positions are approximate. Roads, pipelines, capacities, and demand are SYNTHETIC assumptions.
        </p>
      </header>

      <main className="mx-auto w-full max-w-[1440px] flex-1 p-4 lg:p-6">
        {loading ? (
          <div className="flex h-[75vh] items-center justify-center rounded-xl border border-slate-200 bg-white text-sm text-slate-600 shadow-sm">
            Loading synthetic city network...
          </div>
        ) : error ? (
          <div className="flex h-[75vh] items-center justify-center rounded-xl border border-rose-200 bg-rose-50 p-6 text-center shadow-sm">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-rose-800">{error}</p>
              <p className="text-xs text-rose-600">
                Start the API in backend/ and reload this page.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-4 items-start">
            <div className="w-full lg:w-[70%] flex flex-col">
              <MapToolbar
                labelMode={labelMode}
                onChangeLabelMode={setLabelMode}
              />
              <div className="h-[75vh] w-full">
                <CityMap
                  key={resetSignal}
                  city={city}
                  assets={assets}
                  activeLayers={activeLayers}
                  selectedAsset={selectedAsset}
                  onSelectAsset={setSelectedAsset}
                  labelMode={labelMode}
                />
              </div>
            </div>

            <aside className="w-full lg:w-[30%] space-y-4">
              <InfrastructureLayer
                activeLayers={activeLayers}
                onToggle={handleToggleLayer}
              />
              <Legend />
              <AssetInfoPanel selectedAsset={selectedAsset} city={city} />
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
