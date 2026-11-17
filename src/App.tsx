import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useEnergyPortalData } from './hooks/useEnergyPortalData';
import { formatLocalDateTimeWithTz } from './utils/timeFormat';
import { KpiStrip } from './components/KpiStrip';
import { MODEL_TABS, type ModelTabId } from './config/modelTabs';

export default function App() {
  const [activeTab, setActiveTab] = useState<ModelTabId>('residual');
  const [selectedCity, setSelectedCity] = useState<string>('national');

  const { catalog, loading, error, mergedSeries, historicalSeries, cities } =
    useEnergyPortalData(selectedCity);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin mr-3 text-emerald-400" />
        <span>Loading live Nordic energy & weather catalog...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-rose-300 flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-rose-800 rounded-xl p-6 max-w-lg">
          <h2 className="text-lg font-semibold mb-2">Pipeline Data Error</h2>
          <p className="text-sm text-slate-300">{error}</p>
        </div>
      </div>
    );
  }

  const currentTab = MODEL_TABS.find((t) => t.id === activeTab) ?? MODEL_TABS[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Nordic Energy Informatics & Grid Modeling Portal
            </h1>
            <p className="text-xs text-slate-400">
              Automated hourly telemetry via Fingrid Open Data & Open-Meteo (5 Finnish Cities)
            </p>
          </div>
          <div className="text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
            Last Sync:{' '}
            <span className="text-emerald-400 font-mono">
              {formatLocalDateTimeWithTz(catalog?.generated_at_utc)}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <KpiStrip
          latestRow={historicalSeries[historicalSeries.length - 1]}
          datasetCount={catalog?.dataset_count ?? 0}
        />

        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
          {MODEL_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {currentTab.render({
          mergedSeries,
          historicalSeries,
          cities,
          selectedCity,
          onSelectCity: setSelectedCity,
          catalog,
        })}
      </main>
    </div>
  );
}
