import { useState, type ReactNode } from 'react';
import {
  Activity,
  BatteryCharging,
  CloudSun,
  Database,
  Leaf,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { useEnergyPortalData } from './hooks/useEnergyPortalData';
import { KpiStrip } from './components/KpiStrip';
import { ResidualLoadTab } from './components/ResidualLoadTab';
import { WeatherForecastTab } from './components/WeatherForecastTab';
import { HddForecastTab } from './components/HddForecastTab';
import { CarbonIntensityTab } from './components/CarbonIntensityTab';
import { StorageSandboxTab } from './components/StorageSandboxTab';
import { DataCatalogTab } from './components/DataCatalogTab';

type ModelTab = 'residual' | 'weather' | 'hdd' | 'carbon' | 'storage' | 'catalog';

export default function App() {
  const [activeTab, setActiveTab] = useState<ModelTab>('residual');
  const [selectedCity, setSelectedCity] = useState<string>('national');

  const { catalog, loading, error, mergedSeries, historicalSeries, cities } =
    useEnergyPortalData(selectedCity);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin mr-3 text-emerald-400" />
        <span>Loading live Nordic energy &amp; weather catalog...</span>
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Nordic Energy Informatics &amp; Grid Modeling Portal
            </h1>
            <p className="text-xs text-slate-400">
              Automated hourly telemetry via Fingrid Open Data &amp; Open-Meteo (5 Finnish Cities)
            </p>
          </div>
          <div className="text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
            Last Sync (UTC):{' '}
            <span className="text-emerald-400 font-mono">{catalog?.generated_at_utc}</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <KpiStrip
          latestRow={historicalSeries[historicalSeries.length - 1]}
          datasetCount={catalog?.dataset_count ?? 0}
        />

        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
          <TabButton
            active={activeTab === 'residual'}
            onClick={() => setActiveTab('residual')}
            icon={<Activity className="w-4 h-4" />}
            label="1. Residual Load"
          />
          <TabButton
            active={activeTab === 'weather'}
            onClick={() => setActiveTab('weather')}
            icon={<CloudSun className="w-4 h-4" />}
            label="2. Multi-City Weather"
          />
          <TabButton
            active={activeTab === 'hdd'}
            onClick={() => setActiveTab('hdd')}
            icon={<TrendingUp className="w-4 h-4" />}
            label="3. 48h HDD Forecast"
          />
          <TabButton
            active={activeTab === 'carbon'}
            onClick={() => setActiveTab('carbon')}
            icon={<Leaf className="w-4 h-4" />}
            label="4. Carbon & CO₂ Shift"
          />
          <TabButton
            active={activeTab === 'storage'}
            onClick={() => setActiveTab('storage')}
            icon={<BatteryCharging className="w-4 h-4" />}
            label="5. BESS Peak-Shaving"
          />
          <TabButton
            active={activeTab === 'catalog'}
            onClick={() => setActiveTab('catalog')}
            icon={<Database className="w-4 h-4" />}
            label="6. Data Catalog"
          />
        </div>

        {activeTab === 'residual' && <ResidualLoadTab data={historicalSeries} />}
        {activeTab === 'weather' && (
          <WeatherForecastTab
            data={mergedSeries}
            cities={cities}
            selectedCity={selectedCity}
            onSelectCity={setSelectedCity}
          />
        )}
        {activeTab === 'hdd' && <HddForecastTab data={mergedSeries} />}
        {activeTab === 'carbon' && <CarbonIntensityTab data={historicalSeries} />}
        {activeTab === 'storage' && <StorageSandboxTab data={historicalSeries} />}
        {activeTab === 'catalog' && <DataCatalogTab datasets={catalog?.datasets ?? []} />}
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
        active
          ? 'bg-emerald-500 text-slate-950'
          : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
