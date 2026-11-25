const LAYER_ITEMS = [
  { key: "roads", label: "Roads", enabled: true },
  { key: "water", label: "Water", enabled: true },
  { key: "sewage", label: "Sewage", enabled: false },
  { key: "electricity", label: "Electricity", enabled: false },
];

export default function InfrastructureLayer({ activeLayers, onToggle }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
          Infrastructure Layers
        </h2>
        <span className="text-xs text-slate-500">Facilities always visible</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {LAYER_ITEMS.map((layer) => {
          const isActive = Boolean(activeLayers[layer.key]);
          if (!layer.enabled) {
            return (
              <button
                key={layer.key}
                type="button"
                disabled
                title="Data arrives in a later stage"
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-400 cursor-not-allowed"
              >
                <span>{layer.label}</span>
                <span className="text-[11px] uppercase tracking-wide">Soon</span>
              </button>
            );
          }

          return (
            <button
              key={layer.key}
              type="button"
              onClick={() => onToggle(layer.key)}
              aria-pressed={isActive}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                isActive
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span>{layer.label}</span>
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isActive ? "bg-emerald-400" : "bg-slate-300"
                }`}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
