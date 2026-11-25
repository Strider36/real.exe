const STATUS_BADGE = {
  operational: "bg-emerald-100 text-emerald-800 border-emerald-200",
  warning: "bg-orange-100 text-orange-800 border-orange-200",
  disrupted: "bg-red-100 text-red-800 border-red-200",
};

function formatKey(key) {
  return key.replace(/_/g, " ");
}

export default function AssetInfoPanel({ selectedAsset, city }) {
  if (!selectedAsset) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between min-h-[260px]">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700 mb-2">
            Asset Information
          </h2>
          <p className="text-sm text-slate-500 mt-4">Select an asset on the map.</p>
        </div>
        <p className="text-xs text-slate-400 border-t border-slate-100 pt-3 mt-4">
          Synthetic MVP data. Values are assumptions, not measurements.
        </p>
      </section>
    );
  }

  const nodeMap = new Map((city?.nodes || []).map((n) => [n.id, n]));
  const pipelines = city?.water?.pipelines || [];
  const metadataEntries = Object.entries(selectedAsset.metadata || {});

  const renderConnections = () => {
    if (
      selectedAsset.asset_type === "road" ||
      selectedAsset.asset_type === "water_pipeline"
    ) {
      const [fromId, toId] = selectedAsset.connects || [];
      const fromName = nodeMap.get(fromId)?.name || fromId;
      const toName = nodeMap.get(toId)?.name || toId;
      return (
        <ul className="space-y-1 text-xs text-slate-700">
          <li>
            <span className="font-medium text-slate-500">From:</span> {fromName} ({fromId})
          </li>
          <li>
            <span className="font-medium text-slate-500">To:</span> {toName} ({toId})
          </li>
        </ul>
      );
    }

    const nodeId = selectedAsset.connects?.[0];
    const nodeName = nodeMap.get(nodeId)?.name || nodeId;

    if (selectedAsset.asset_type === "demand_node") {
      const feedingPipelines = pipelines.filter((pipe) => pipe.to === nodeId);
      return (
        <div className="space-y-1.5 text-xs text-slate-700">
          <div>
            <span className="font-medium text-slate-500">Node:</span> {nodeName} ({nodeId})
          </div>
          <div className="font-medium text-slate-500">Fed by pipelines:</div>
          {feedingPipelines.length > 0 ? (
            <ul className="list-disc pl-4 space-y-1">
              {feedingPipelines.map((pipe) => (
                <li key={pipe.id}>
                  {pipe.name} ({pipe.id}, {pipe.capacity_ml_day} ML/day)
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-400">No incoming pipelines.</p>
          )}
        </div>
      );
    }

    if (selectedAsset.asset_type === "water_source") {
      const outgoingPipelines = pipelines.filter((pipe) => pipe.from === nodeId);
      return (
        <div className="space-y-1.5 text-xs text-slate-700">
          <div>
            <span className="font-medium text-slate-500">Node:</span> {nodeName} ({nodeId})
          </div>
          <div className="font-medium text-slate-500">Outgoing pipelines:</div>
          {outgoingPipelines.length > 0 ? (
            <ul className="list-disc pl-4 space-y-1">
              {outgoingPipelines.map((pipe) => (
                <li key={pipe.id}>
                  {pipe.name} ({pipe.id}, {pipe.capacity_ml_day} ML/day)
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-400">No outgoing pipelines.</p>
          )}
        </div>
      );
    }

    return (
      <div className="text-xs text-slate-700">
        <span className="font-medium text-slate-500">Located at:</span> {nodeName} ({nodeId})
      </div>
    );
  };

  const badgeClass =
    STATUS_BADGE[selectedAsset.status] ||
    "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-mono text-slate-500">{selectedAsset.id}</div>
          <h2 className="text-base font-semibold text-slate-900 leading-snug">
            {selectedAsset.name}
          </h2>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${badgeClass}`}
        >
          {selectedAsset.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2.5 text-xs">
        <div>
          <span className="text-slate-500 block">Type</span>
          <span className="font-medium text-slate-800">
            {formatKey(selectedAsset.asset_type)}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">Layer</span>
          <span className="font-medium text-slate-800 capitalize">
            {selectedAsset.layer}
          </span>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
          Connections
        </h3>
        {renderConnections()}
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
          Metadata
        </h3>
        {metadataEntries.length > 0 ? (
          <dl className="divide-y divide-slate-100 text-xs">
            {metadataEntries.map(([key, value]) => (
              <div key={key} className="flex items-center justify-between py-1 gap-3">
                <dt className="text-slate-500 capitalize">{formatKey(key)}</dt>
                <dd className="font-mono text-slate-800 text-right">{String(value)}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-xs text-slate-400">No additional metadata.</p>
        )}
      </div>

      <p className="text-xs text-slate-400 border-t border-slate-100 pt-3">
        Synthetic MVP data. Values are assumptions, not measurements.
      </p>
    </section>
  );
}
