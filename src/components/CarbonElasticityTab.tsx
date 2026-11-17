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
            Maps hourly wind penetration share (% of demand) against real-time grid carbon
            intensity (gCO₂/kWh) to quantify structural displacement of fossil & import power.
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

      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 block">Decarbonization Slope</span>
          <strong className="text-base text-emerald-400">
            {model.slopePer10PctWind} gCO₂/kWh per +10% wind
          </strong>
        </div>
        <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 block">Zero-Wind Baseline Intensity</span>
          <strong className="text-base text-white">{model.baselineIntercept} gCO₂/kWh</strong>
        </div>
        <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 block">Correlation Fit (R²)</span>
          <strong className="text-base text-white">{model.rSquared.toFixed(3)}</strong>
        </div>
      </div>

      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={model.points}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              type="number"
              dataKey="windSharePct"
              name="Wind Share"
              unit="%"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
            />
            <YAxis
              type="number"
              name="Carbon Intensity"
              unit=" g"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              width={65}
            />
            <Tooltip content={<ExplainableTooltip context="carbon" />} />
            <Legend />
            <Scatter
              name="Hourly Observation (gCO₂/kWh)"
              dataKey="carbonIntensity"
              fill="#38bdf8"
            />
            <Line
              type="monotone"
              dataKey="fittedIntensity"
              name="OLS Decarbonization Trendline"
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
            'Blue dots: Individual hours—notice how dots cluster lower on the chart as you move right toward higher wind shares.',
            'Green trendline: The average rate at which wind power pushes higher-emission peaking plants and imports off the grid.',
          ],
          realWorldTakeaway:
            'Even when wind share is near 0%, Finland’s nuclear and hydro fleet keeps baseline intensity low; as wind rises above 25–35%, grid emissions drop toward near-zero.',
        }}
      />
    </section>
  );
}
