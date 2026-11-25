const LEGEND_ITEMS = [
  { label: "Roads", color: "#6b7280", kind: "line" },
  { label: "Water", color: "#2563eb", kind: "line" },
  { label: "Sewage", color: "#92400e", kind: "swatch" },
  { label: "Electricity", color: "#eab308", kind: "swatch" },
  { label: "Operational", color: "#16a34a", kind: "dot" },
  { label: "Warning", color: "#f97316", kind: "dot" },
  { label: "Disrupted", color: "#dc2626", kind: "dot" },
];

export default function Legend() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700 mb-3">
        Legend
      </h2>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-700">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            {item.kind === "line" ? (
              <span
                className="inline-block h-1 w-4 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
            ) : item.kind === "dot" ? (
              <span
                className="inline-block h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
            ) : (
              <span
                className="inline-block h-3 w-3 rounded-sm shrink-0"
                style={{ backgroundColor: item.color }}
              />
            )}
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
