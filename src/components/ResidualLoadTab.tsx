import {
  Area,
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

export function ResidualLoadTab({ data }: { data: MergedHourlyRecord[] }) {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            National Generation Stack, Hydro Balancing & Cross-Border Trade (7-Day)
          </h2>
          <p className="text-sm text-slate-400">
            Shows how nuclear baseload, variable wind, flexible hydro dispatch, and cross-border
            Nordic/Baltic imports & exports balance Finnish demand every hour.
          </p>
        </div>
        <ExportCsvButton
          rows={data}
          filenamePrefix="fi_generation_hydro_trade_balance"
          columns={[
            { key: 'timestamp', header: 'timestamp_utc' },
            { key: 'consumption', header: 'total_consumption_mw' },
            { key: 'wind', header: 'wind_generation_mw' },
            { key: 'nuclear', header: 'nuclear_generation_mw' },
            { key: 'hydro', header: 'hydro_generation_mw' },
            { key: 'netImport', header: 'net_import_export_mw' },
            { key: 'residualLoad', header: 'residual_load_mw' },
          ]}
        />
      </div>

      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} minTickGap={28} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit=" MW" width={75} />
            <Tooltip content={<ExplainableTooltip context="residual" />} />
            <Legend />
            <ReferenceLine y={0} stroke="#475569" />
            <Area
              type="monotone"
              dataKey="consumption"
              name="Total Consumption (MW)"
              fill="#38bdf8"
              fillOpacity={0.12}
              stroke="#38bdf8"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="residualLoad"
              name="Residual Load (MW)"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="nuclear"
              name="Nuclear Baseload (MW)"
              stroke="#a855f7"
              strokeWidth={1.75}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="wind"
              name="Wind Power (MW)"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="hydro"
              name="Hydro Power (MW)"
              stroke="#06b6d4"
              strokeWidth={1.75}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="netImport"
              name="Net Import (+) / Export (-) (MW)"
              stroke="#f43f5e"
              strokeWidth={1.75}
              strokeDasharray="4 3"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <ModelExplainerCard
        guide={{
          title: 'Generation Mix, Hydro Flexibility & Cross-Border Trade',
          whatItShows:
            'Tracks Finland’s complete physical power balance: total demand versus nuclear, wind, hydro generation, and cross-border electricity trade with Sweden, Estonia, and Norway.',
          howToRead: [
            'Cyan line (Hydro): Ramps up and down rapidly to compensate for wind fluctuations.',
            'Dashed red line (Net Import/Export): Values above 0 MW mean Finland is importing power; values below 0 MW mean Finland is exporting surplus clean electricity to neighbors.',
            'Orange line (Residual Load): Demand left over after wind generation.',
          ],
          realWorldTakeaway:
            'During windy periods, Finland frequently flips from a net electricity importer to a net exporter across the Nordic/Baltic synchronous and HVDC grid.',
        }}
      />
    </section>
  );
}
