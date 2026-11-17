import type { DatasetMetadata } from '../types/energy';

export function DataCatalogTab({ datasets }: { datasets: DatasetMetadata[] }) {
  return (
    <section className="grid md:grid-cols-2 gap-4">
      {datasets.map((ds) => (
        <div
          key={ds.slug}
          className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-3"
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-emerald-400">
                {ds.category}
              </span>
              <span className="text-xs text-slate-400 font-mono">{ds.license}</span>
            </div>
            <h3 className="font-semibold text-base text-white pt-1">{ds.title}</h3>
            <p className="text-xs text-slate-400">{ds.description}</p>
          </div>
          <div className="text-xs text-slate-300 border-t border-slate-800 pt-3 flex justify-between">
            <span>Provider: {ds.provider}</span>
            <span>
              {ds.record_count} pts ({ds.unit})
            </span>
          </div>
        </div>
      ))}
    </section>
  );
}
