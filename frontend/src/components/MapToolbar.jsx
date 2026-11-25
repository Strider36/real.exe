const MODES = [
  { key: "key", label: "Key sites only" },
  { key: "all", label: "All labels" },
  { key: "off", label: "Off" },
];

export default function MapToolbar({ labelMode, onChangeLabelMode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2 shadow-sm">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
        Map Labels
      </span>
      <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
        {MODES.map((mode) => {
          const active = labelMode === mode.key;
          return (
            <button
              key={mode.key}
              type="button"
              onClick={() => onChangeLabelMode(mode.key)}
              aria-pressed={active}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                active
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {mode.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
