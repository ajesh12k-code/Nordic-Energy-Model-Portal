import { useMemo, useState } from 'react';
import { runWindPowerCurveModel } from '../models/windPowerCurve';
import { WindForecastCharts } from './WindForecastCharts';
import { ExportCsvButton } from './ExportCsvButton';
import { ModelExplainerCard } from './ModelExplainerCard';
import type { MergedHourlyRecord } from '../types/energy';

export function WindForecastTab({ data }: { data: MergedHourlyRecord[] }) {
  const [viewMode, setViewMode] = useState<'timeline' | 'curve'>('timeline');
  const model = useMemo(() => runWindPowerCurveModel(data), [data]);

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">
            Empirical Wind Power Curve & +48h Net-Load Forecast
          </h2>
          <p className="text-sm text-slate-400">
            Fits a non-linear turbine fleet curve on Vaasa & Oulu 100m wind corridors, then
            projects +48h wind generation and future residual net load.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-slate-800 p-1 border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1 rounded-md font-medium cursor-pointer ${
                viewMode === 'timeline' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300'
              }`}
            >
              +48h Net-Load Forecast
            </button>
            <button
              type="button"
              onClick={() => setViewMode('curve')}
              className={`px-3 py-1 rounded-md font-medium cursor-pointer ${
                viewMode === 'curve' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300'
              }`}
            >
              Power Curve (MW vs m/s)
            </button>
          </div>

          <ExportCsvButton
            rows={model.timeline}
            filenamePrefix="fi_wind_and_residual_48h_forecast"
            columns={[
              { key: 'timestamp', header: 'timestamp_utc' },
              { key: 'isForecast', header: 'is_forecast' },
              { key: 'corridorWindMs', header: 'corridor_wind_100m_ms' },
              { key: 'actualWindMW', header: 'observed_wind_mw' },
              { key: 'predictedWindMW', header: 'predicted_wind_mw' },
              { key: 'actualResidualMW', header: 'observed_residual_load_mw' },
              { key: 'predictedResidualMW', header: 'predicted_residual_load_mw' },
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 block">Wind Curve Fit (R²)</span>
          <strong className="text-base text-emerald-400">{model.rSquared.toFixed(3)}</strong>
        </div>
        <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 block">Wind RMSE</span>
          <strong className="text-base text-white">{model.rmseMW.toLocaleString()} MW</strong>
        </div>
        <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 block">Effective Fleet Cap</span>
          <strong className="text-base text-white">~{model.estimatedFleetCapacityMW.toLocaleString()} MW</strong>
        </div>
      </div>

      <WindForecastCharts
        viewMode={viewMode}
        timeline={model.timeline}
        scatterPoints={model.scatterPoints}
      />

      <ModelExplainerCard
        guide={{
          title: 'Wind Fleet Power Curve & +48h Net-Load Outlook',
          whatItShows:
            'Maps coastal 100m wind speeds (Vaasa & Oulu) into wind megawatts and subtracts them from forecasted electricity demand to project net grid load 48 hours ahead.',
          howToRead: [
            'Timeline view: Solid lines show actual history; dashed lines project wind output and remaining residual load 48 hours ahead.',
            'Power Curve view: Blue dots are observed hours; the green S-curve shows turbine cut-in (~3 m/s) and cubic ramp-up.',
          ],
          realWorldTakeaway:
            'Projecting residual load 48 hours ahead lets Nordic hydro and interconnectors schedule balancing reserves early.',
        }}
      />
    </section>
  );
}
