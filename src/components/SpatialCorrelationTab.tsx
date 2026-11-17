import { useMemo, useState } from 'react';
import {
  CITY_KEYS,
  CITY_LABELS,
  runSpatialCorrelationModel,
} from '../models/spatialCorrelation';
import { ExportCsvButton } from './ExportCsvButton';
import { ModelExplainerCard } from './ModelExplainerCard';
import type { MergedHourlyRecord } from '../types/energy';

function getCellTone(r: number): string {
  if (r >= 0.95) return 'bg-emerald-500/30 text-emerald-200 border-emerald-500/40';
  if (r >= 0.75) return 'bg-sky-500/25 text-sky-200 border-sky-500/30';
  if (r >= 0.5) return 'bg-amber-500/20 text-amber-200 border-amber-500/30';
  return 'bg-purple-500/20 text-purple-200 border-purple-500/30';
}

export function SpatialCorrelationTab({ data }: { data: MergedHourlyRecord[] }) {
  const [metric, setMetric] = useState<'wind' | 'temperature'>('wind');
  const model = useMemo(() => runSpatialCorrelationModel(data, metric), [data, metric]);

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">
            Spatial Weather Smoothing &amp; 5-City Correlation Matrix (r)
          </h2>
          <p className="text-sm text-slate-400">
            Quantifies geographic decorrelation across Helsinki, Tampere, Lappeenranta, Vaasa,
            and Oulu to demonstrate how spatial dispersion smooths national renewable volatility.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-slate-800 p-1 border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setMetric('wind')}
              className={`px-3 py-1 rounded-md font-medium cursor-pointer ${
                metric === 'wind' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300'
              }`}
            >
              100m Wind Correlation
            </button>
            <button
              type="button"
              onClick={() => setMetric('temperature')}
              className={`px-3 py-1 rounded-md font-medium cursor-pointer ${
                metric === 'temperature' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300'
              }`}
            >
              2m Temperature Correlation
            </button>
          </div>

          <ExportCsvButton
            rows={model.matrix}
            filenamePrefix={`fi_spatial_correlation_${metric}`}
            columns={[
              { key: 'city', header: 'city' },
              { key: 'helsinki', header: 'helsinki_r' },
              { key: 'tampere', header: 'tampere_r' },
              { key: 'lappeenranta', header: 'lappeenranta_r' },
              { key: 'vaasa', header: 'vaasa_r' },
              { key: 'oulu', header: 'oulu_r' },
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 block">Most Decorrelated City Pair</span>
          <strong className="text-base text-amber-400">{model.lowestPairLabel}</strong>
        </div>
        <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 block">Lowest Pairwise Correlation (r)</span>
          <strong className="text-base text-white">{model.lowestCorrelation.toFixed(2)}</strong>
        </div>
        <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 block">5-City Portfolio Volatility Reduction</span>
          <strong className="text-base text-emerald-400">-{model.volatilityReductionPct}%</strong>
        </div>
      </div>

      {/* 5x5 Heatmap Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="p-2.5 text-left text-slate-400 border-b border-slate-800">City</th>
              {CITY_KEYS.map((k) => (
                <th key={k} className="p-2.5 text-center text-slate-300 border-b border-slate-800">
                  {CITY_LABELS[k]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {model.matrix.map((row) => (
              <tr key={row.city} className="border-b border-slate-800/60">
                <td className="p-2.5 font-semibold text-slate-200">{row.city}</td>
                {CITY_KEYS.map((colKey) => {
                  const val = row[colKey];
                  return (
                    <td key={colKey} className="p-1.5 text-center">
                      <span
                        className={`inline-block w-full py-2 rounded-md font-mono font-semibold border ${getCellTone(
                          val
                        )}`}
                      >
                        {val.toFixed(2)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ModelExplainerCard
        guide={{
          title: 'Geographic Diversification & Weather Smoothing',
          whatItShows:
            'Measures how closely wind speeds or temperatures move together (Pearson correlation r from -1.0 to +1.0) between every pair of Finnish cities.',
          howToRead: [
            '1.00 diagonal: Each city compared with itself.',
            'Lower numbers (e.g., 0.35–0.65 between coastal Vaasa and inland Lappeenranta): Wind patterns differ across regions—when wind slows down in one city, it often stays brisk in another.',
            'Volatility Reduction %: Shows how much smoother combined 5-city output is compared to relying on a single location.',
          ],
          realWorldTakeaway:
            'Siting wind farms across geographically separated regions acts like a natural battery, reducing simultaneous national wind lulls and lowering grid balancing costs.',
        }}
      />
    </section>
  );
}
