import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ExplainableTooltip } from './ExplainableTooltip';
import { ExportCsvButton } from './ExportCsvButton';
import { ModelExplainerCard } from './ModelExplainerCard';
import type { MergedHourlyRecord } from '../types/energy';

/**
 * Compares Finland and Denmark renewable/carbon performance side-by-side and
 * visualizes bilateral interconnector flows with Sweden (SE1, SE3), Norway (NO4), and Estonia (EE).
 */
export function NordicComparisonTab({ data }: { data: MergedHourlyRecord[] }) {
  const [view, setView] = useState<'carbon_wind' | 'interconnectors'>('carbon_wind');

  const enriched = useMemo(() => {
    return data.map((r) => ({
      ...r,
      fiWindSharePct:
        r.consumption && r.wind !== undefined
          ? Math.round((r.wind / r.consumption) * 1000) / 10
          : undefined,
      dkWindSharePct:
        r.dkConsumption && r.dkWind !== undefined
          ? Math.round((r.dkWind / r.dkConsumption) * 1000) / 10
          : undefined,
    }));
  }, [data]);

  const stats = useMemo(() => {
    const validFi = enriched.filter((r) => r.carbonIntensity !== undefined);
    const validDk = enriched.filter((r) => r.dkCarbonIntensity !== undefined);
    const avgFiCo2 =
      validFi.length > 0
        ? Math.round(validFi.reduce((s, r) => s + r.carbonIntensity!, 0) / validFi.length)
        : 0;
    const avgDkCo2 =
      validDk.length > 0
        ? Math.round(validDk.reduce((s, r) => s + r.dkCarbonIntensity!, 0) / validDk.length)
        : 0;

    const latest = enriched[enriched.length - 1];
    const seTotal = Math.round((latest?.flowSE1 ?? 0) + (latest?.flowSE3 ?? 0));

    return { avgFiCo2, avgDkCo2, seTotal };
  }, [enriched]);

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">
            Nordic Cross-Country Comparison (Finland vs. Denmark) &amp; Interconnectors
          </h2>
          <p className="text-sm text-slate-400">
            Contrasts Finland&apos;s nuclear-hydro-wind system against Denmark&apos;s wind-dominant
            grid (Energinet) and tracks bilateral cables to Sweden, Norway, and Estonia.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-slate-800 p-1 border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setView('carbon_wind')}
              className={`px-3 py-1 rounded-md font-medium cursor-pointer ${
                view === 'carbon_wind' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300'
              }`}
            >
              FI vs. DK Carbon &amp; Wind
            </button>
            <button
              type="button"
              onClick={() => setView('interconnectors')}
              className={`px-3 py-1 rounded-md font-medium cursor-pointer ${
                view === 'interconnectors' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300'
              }`}
            >
              SE / NO / EE Interconnectors
            </button>
          </div>

          <ExportCsvButton
            rows={enriched}
            filenamePrefix="nordic_fi_dk_interconnectors"
            columns={[
              { key: 'timestamp', header: 'timestamp_utc' },
              { key: 'carbonIntensity', header: 'fi_carbon_gco2_kwh' },
              { key: 'dkCarbonIntensity', header: 'dk_carbon_gco2_kwh' },
              { key: 'fiWindSharePct', header: 'fi_wind_share_pct' },
              { key: 'dkWindSharePct', header: 'dk_wind_share_pct' },
              { key: 'flowSE1', header: 'fi_se1_flow_mw' },
              { key: 'flowSE3', header: 'fi_se3_flow_mw' },
              { key: 'flowNO4', header: 'fi_no4_flow_mw' },
              { key: 'flowEE', header: 'fi_ee_flow_mw' },
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 block">7-Day Avg Carbon Intensity (Finland)</span>
          <strong className="text-base text-emerald-400">{stats.avgFiCo2} gCO₂/kWh</strong>
        </div>
        <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 block">7-Day Avg Carbon Intensity (Denmark)</span>
          <strong className="text-base text-sky-400">{stats.avgDkCo2} gCO₂/kWh</strong>
        </div>
        <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 block">Latest Sweden (SE1+SE3) Exchange</span>
          <strong className="text-base text-white">
            {stats.seTotal > 0 ? `+${stats.seTotal} MW (Import)` : `${stats.seTotal} MW (Export)`}
          </strong>
        </div>
      </div>

      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {view === 'carbon_wind' ? (
            <ComposedChart data={enriched}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} minTickGap={28} />
              <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 11 }} unit=" g" width={65} />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                unit="%"
                width={55}
              />
              <Tooltip content={<ExplainableTooltip context="carbon" />} />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="carbonIntensity"
                name="Finland Carbon Intensity (gCO₂/kWh)"
                stroke="#10b981"
                strokeWidth={2.2}
                dot={false}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="dkCarbonIntensity"
                name="Denmark Carbon Intensity (gCO₂/kWh)"
                stroke="#38bdf8"
                strokeWidth={2.2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="fiWindSharePct"
                name="Finland Wind Share (%)"
                stroke="#a855f7"
                strokeWidth={1.6}
                strokeDasharray="4 3"
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="dkWindSharePct"
                name="Denmark Wind Share (%)"
                stroke="#f59e0b"
                strokeWidth={1.6}
                strokeDasharray="4 3"
                dot={false}
              />
            </ComposedChart>
          ) : (
            <ComposedChart data={enriched}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} minTickGap={28} />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                unit=" MW"
                width={75}
              />
              <Tooltip content={<ExplainableTooltip context="residual" />} />
              <Legend />
              <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="flowSE1"
                name="Sweden North (SE1) (MW)"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="flowSE3"
                name="Sweden Central (SE3 HVDC) (MW)"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="flowEE"
                name="Estonia (EstLink HVDC) (MW)"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="flowNO4"
                name="Norway North (NO4) (MW)"
                stroke="#a855f7"
                strokeWidth={1.8}
                dot={false}
              />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>

      <ModelExplainerCard
        guide={{
          title: 'Nordic Synchronous & HVDC Market Integration',
          whatItShows:
            'Compares Finland and Denmark’s hourly carbon intensity and wind penetration, and breaks down Finland’s physical power exchanges with Sweden (SE1, SE3), Norway (NO4), and Estonia (EE).',
          howToRead: [
            'FI vs. DK Carbon & Wind: Notice how Denmark frequently achieves >60–100% wind share during North Sea storms, while Finland maintains low baseline carbon intensity even during calm winds thanks to nuclear and hydro.',
            'SE / NO / EE Interconnectors: Positive values (+) mean power flows into Finland; negative values (−) mean Finland is exporting power to neighbors.',
          ],
          realWorldTakeaway:
            'Strong cross-border interconnectors allow Nordic hydro reservoirs in Sweden and Norway to act as a regional battery for wind-heavy grids in Denmark and Finland.',
        }}
      />
    </section>
  );
}
