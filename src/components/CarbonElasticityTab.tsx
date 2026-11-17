import { useMemo } from 'react';
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { runCarbonElasticityModel } from '../models/carbonElasticity';
import { ExplainableTooltip } from './ExplainableTooltip';
import { ExportCsvButton } from './ExportCsvButton';
import { ModelExplainerCard } from './ModelExplainerCard';
import type { MergedHourlyRecord } from '../types/energy';

/**
 * Displays the empirical relationship between hourly wind power penetration (%)
 * and Finnish grid carbon intensity (gCO2/kWh) with an OLS decarbonization trendline.
 */
export function CarbonElasticityTab({ data }: { data: MergedHourlyRecord[] }) {
  const model = useMemo(() => runCarbonElasticityModel(data), [data]);

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">
            Marginal Carbon Elasticity of Wind (Decarbonization Curve)
          </h2>
          <p className="text-sm text-slate-400">
            Each dot is 1 hour: moving right means higher wind power share (%), and moving down
            means cleaner electricity (fewer grams of CO₂ per kWh).
          </p>
        </div>

        <ExportCsvButton
          rows={model.points}
          filenamePrefix="fi_wind_carbon_elasticity"
          columns={[
            { key: 'timestamp', header: 'timestamp_utc' },
            { key: 'windSharePct', header: 'wind_penetration_pct' },
            { key: 'carbonIntensity', header: 'observed_carbon_gco2_kwh' },
            { key: 'fittedIntensity', header: 'trendline_carbon_gco2_kwh' },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 block">Decarbonization Impact</span>
          <strong className="text-base text-emerald-400">
            {model.slopePer10PctWind} gCO₂/kWh per +10% wind
          </strong>
        </div>
        <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 block">Zero-Wind Baseline Intensity</span>
          <strong className="text-base text-white">{model.baselineIntercept} gCO₂/kWh</strong>
        </div>
        <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 block">Trend Strength (R²)</span>
          <strong className="text-base text-white">{model.rSquared.toFixed(3)}</strong>
        </div>
      </div>

      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={model.points} margin={{ bottom: 18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              type="number"
              dataKey="windSharePct"
              name="Wind Share"
              unit="%"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              label={{
                value: 'Wind Share of Electricity Demand (%) →',
                position: 'insideBottom',
                offset: -10,
                fill: '#94a3b8',
                fontSize: 11,
              }}
            />
            <YAxis
              type="number"
              name="Carbon Intensity"
              unit=" g"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              width={65}
            />
            <Tooltip content={<ExplainableTooltip context="carbon" />} />
            <Legend verticalAlign="top" height={32} />
            <Scatter
              name="Actual Hourly Grid Intensity (gCO₂/kWh)"
              dataKey="carbonIntensity"
              fill="#38bdf8"
            />
            <Line
              type="monotone"
              dataKey="fittedIntensity"
              name="Average Decarbonization Trendline"
              stroke="#10b981"
              strokeWidth={3}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <ModelExplainerCard
        guide={{
          title: 'Wind Penetration vs. Grid Carbon Intensity',
          whatItShows:
            'Plots every hour of the past 7 days by how much of Finland’s electricity came from wind (horizontal axis) versus how carbon-intensive the grid was (vertical axis).',
          howToRead: [
            'Horizontal axis (%): Percentage of national electricity supplied by wind turbines.',
            'Vertical axis (g): Grams of CO₂ emitted per kilowatt-hour of electricity consumed.',
            'Downward green line: Proves that as wind share increases, dirtier power sources are pushed off the grid.',
          ],
          realWorldTakeaway:
            'Even when wind share is near 0%, Finland’s nuclear and hydro fleet keeps baseline intensity low; as wind rises above 25–35%, grid emissions drop toward near-zero.',
        }}
      />
    </section>
  );
}
