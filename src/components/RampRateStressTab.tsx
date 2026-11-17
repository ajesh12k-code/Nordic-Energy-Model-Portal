import { useMemo } from 'react';
import {
  Bar,
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
import { runRampRateStressModel } from '../models/rampRateStress';
import { ExplainableTooltip } from './ExplainableTooltip';
import { ExportCsvButton } from './ExportCsvButton';
import { ModelExplainerCard } from './ModelExplainerCard';
import type { MergedHourlyRecord } from '../types/energy';

export function RampRateStressTab({ data }: { data: MergedHourlyRecord[] }) {
  const model = useMemo(() => runRampRateStressModel(data), [data]);

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">
            Grid Ramp-Rate & Flexibility Stress Analyzer (MW/h)
          </h2>
          <p className="text-sm text-slate-400">
            Measures hour-over-hour and 3-hour net-load swings (ΔResidual Load) to quantify the
            fast-ramping hydro and interconnector reserves needed to keep frequency at 50 Hz.
          </p>
        </div>

        <ExportCsvButton
          rows={model.series}
          filenamePrefix="fi_grid_ramp_rate_stress"
          columns={[
            { key: 'timestamp', header: 'timestamp_utc' },
            { key: 'loadRampMW', header: 'consumption_ramp_1h_mw' },
            { key: 'windRampMW', header: 'wind_ramp_1h_mw' },
            { key: 'residualRamp1hMW', header: 'residual_load_ramp_1h_mw' },
            { key: 'residualRamp3hMW', header: 'residual_load_ramp_3h_mw' },
          ]}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 block">Max 1h Upward Net Ramp</span>
          <strong className="text-base text-amber-400">
            +{model.maxUpwardRamp1hMW.toLocaleString()} MW/h
          </strong>
        </div>
        <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 block">Max 1h Downward Net Ramp</span>
          <strong className="text-base text-sky-400">
            {model.maxDownwardRamp1hMW.toLocaleString()} MW/h
          </strong>
        </div>
        <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 block">Max 3h Cumulative Surge</span>
          <strong className="text-base text-rose-400">
            +{model.maxUpwardRamp3hMW.toLocaleString()} MW / 3h
          </strong>
        </div>
        <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 block">Steepest 1h Stress Event</span>
          <strong className="text-base text-white">{model.steepestEventLabel}</strong>
        </div>
      </div>

      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={model.series}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} minTickGap={28} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit=" MW" width={75} />
            <Tooltip content={<ExplainableTooltip context="residual" />} />
            <Legend />
            <ReferenceLine y={0} stroke="#475569" />
            <Bar
              dataKey="residualRamp1hMW"
              name="1-Hour Residual Ramp (MW/h)"
              fill="#f59e0b"
              fillOpacity={0.75}
            />
            <Line
              type="monotone"
              dataKey="residualRamp3hMW"
              name="3-Hour Cumulative Net Swing (MW)"
              stroke="#f43f5e"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="windRampMW"
              name="1-Hour Wind Change (MW/h)"
              stroke="#10b981"
              strokeWidth={1.5}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <ModelExplainerCard
        guide={{
          title: 'Grid Ramping Speed & Flexibility Stress',
          whatItShows:
            'Tracks how sharply net electricity demand jumps or drops from one hour to the next (MW/h) and across 3-hour windows.',
          howToRead: [
            'Orange bars above zero: Hours where controllable generators had to ramp UP quickly (e.g., morning demand rising while wind drops).',
            'Orange bars below zero: Hours where generators had to ramp DOWN rapidly (e.g., sudden wind gusts arriving at night).',
            'Red line: Sustained 3-hour cumulative swing testing multi-hour hydro and battery endurance.',
          ],
          realWorldTakeaway:
            'In high-wind grids, ramping speed (MW/h) often creates tighter operational bottlenecks than peak capacity (MW), driving demand for fast-responding batteries and Nordic hydro flexibility.',
        }}
      />
    </section>
  );
}
