import type { MergedHourlyRecord } from '../types/energy';

interface KpiStripProps {
  latestRow?: MergedHourlyRecord;
  datasetCount: number;
}

export function KpiStrip({ latestRow, datasetCount }: KpiStripProps) {
  const windShare =
    latestRow?.consumption && latestRow?.wind
      ? `${((latestRow.wind / latestRow.consumption) * 100).toFixed(1)}% of demand`
      : 'Fingrid Dataset #181';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        title="Latest Finland Load"
        value={latestRow?.consumption ? `${latestRow.consumption.toLocaleString()} MW` : '—'}
        subtitle="Fingrid Dataset #124"
      />
      <KpiCard
        title="Wind Generation"
        value={latestRow?.wind ? `${latestRow.wind.toLocaleString()} MW` : '—'}
        subtitle={windShare}
      />
      <KpiCard
        title="Residual Net Load"
        value={latestRow?.residualLoad ? `${latestRow.residualLoad.toLocaleString()} MW` : '—'}
        subtitle="Consumption minus Wind"
      />
      <KpiCard
        title="Active Datasets"
        value={`${datasetCount} Series`}
        subtitle="Auto-updated hourly via GitHub Actions"
      />
    </div>
  );
}

function KpiCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="text-xs text-slate-400">{title}</div>
      <div className="text-2xl font-bold text-white mt-1">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{subtitle}</div>
    </div>
  );
}
