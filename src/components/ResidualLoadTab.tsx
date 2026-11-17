import { useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
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

const SERIES_CONFIG = [
  { key: 'consumption', label: 'Total Consumption', color: '#38bdf8', dashed: false },
  { key: 'residualLoad', label: 'Residual Load', color: '#f59e0b', dashed: false },
  { key: 'wind', label: 'Wind Power', color: '#10b981', dashed: false },
  { key: 'nuclear', label: 'Nuclear Baseload', color: '#a855f7', dashed: false },
  { key: 'hydro', label: 'Hydro Power', color: '#f8fafc', dashed: false },
  { key: 'chpTotal', label: 'CHP (District + Ind.)', color: '#ec4899', dashed: false },
  { key: 'otherGeneration', label: 'Solar & Reserves', color: '#94a3b8', dashed: false },
  { key: 'netImport', label: 'Net Import (+) / Export (-)', color: '#f43f5e', dashed: true },
] as const;

/**
 * Plots Finland's complete physical power balance: total consumption vs.
 * nuclear, wind, hydro, CHP cogeneration, solar/reserves, and cross-border trade.
 */
export function ResidualLoadTab({ data }: { data: MergedHourlyRecord[] }) {
  const [visible, setVisible] = useState<Record<string, boolean>>({
    consumption: true,
    residualLoad: true,
    wind: true,
    nuclear: true,
    hydro: true,
    chpTotal: true,
    otherGeneration: true,
    netImport: true,
  });

  const toggle = (key: string) =>
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            Complete Finnish Generation Stack, CHP & Cross-Border Balance (7-Day)
          </h2>
          <p className="text-sm text-slate-400">
            Accounts for 100% of physical supply: Nuclear + Wind + Hydro + District/Industrial
            CHP + Solar/Reserves + Net Cross-Border Trade = Total Consumption.
          </p>
        </div>
        <ExportCsvButton
          rows={data}
          filenamePrefix="fi_complete_generation_trade_balance"
          columns={[
            { key: 'timestamp', header: 'timestamp_utc' },
            { key: 'consumption', header: 'total_consumption_mw' },
            { key: 'totalProduction', header: 'total_domestic_production_mw' },
            { key: 'wind', header: 'wind_generation_mw' },
            { key: 'nuclear', header: 'nuclear_generation_mw' },
            { key: 'hydro', header: 'hydro_generation_mw' },
            { key: 'chpTotal', header: 'chp_cogeneration_mw' },
            { key: 'otherGeneration', header: 'solar_and_reserves_mw' },
            { key: 'netImport', header: 'net_import_export_mw' },
            { key: 'residualLoad', header: 'residual_load_mw' },
          ]}
        />
      </div>

      {/* Interactive Distinct-Color Legend */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-950/60 border border-slate-800 rounded-lg px-3.5 py-2">
        {SERIES_CONFIG.map((s) => {
          const active = visible[s.key];
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => toggle(s.key)}
              className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs border transition cursor-pointer ${
                active
                  ? 'bg-slate-900 border-slate-700 text-slate-100'
                  : 'bg-slate-950/40 border-slate-800/60 text-slate-500'
              }`}
            >
              <span
                className="w-4 inline-block"
                style={{
                  borderTop: `2.5px ${s.dashed ? 'dashed' : 'solid'} ${
                    active ? s.color : '#475569'
                  }`,
                }}
              />
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>

      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} minTickGap={28} />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              unit=" MW"
              width={80}
            />
            <Tooltip content={<ExplainableTooltip context="residual" />} />
            <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />

            {visible.consumption && (
              <Area
                type="monotone"
                dataKey="consumption"
                name="Total Consumption (MW)"
                fill="#38bdf8"
                fillOpacity={0.12}
                stroke="#38bdf8"
                strokeWidth={2}
              />
            )}
            {visible.residualLoad && (
              <Line
                type="monotone"
                dataKey="residualLoad"
                name="Residual Load (MW)"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
              />
            )}
            {visible.wind && (
              <Line
                type="monotone"
                dataKey="wind"
                name="Wind Power (MW)"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
            )}
            {visible.nuclear && (
              <Line
                type="monotone"
                dataKey="nuclear"
                name="Nuclear Baseload (MW)"
                stroke="#a855f7"
                strokeWidth={1.8}
                dot={false}
              />
            )}
            {visible.hydro && (
              <Line
                type="monotone"
                dataKey="hydro"
                name="Hydro Power (MW)"
                stroke="#f8fafc"
                strokeWidth={1.8}
                dot={false}
              />
            )}
            {visible.chpTotal && (
              <Line
                type="monotone"
                dataKey="chpTotal"
                name="CHP Cogeneration (MW)"
                stroke="#ec4899"
                strokeWidth={1.8}
                dot={false}
              />
            )}
            {visible.otherGeneration && (
              <Line
                type="monotone"
                dataKey="otherGeneration"
                name="Solar & Reserves (MW)"
                stroke="#94a3b8"
                strokeWidth={1.5}
                dot={false}
              />
            )}
            {visible.netImport && (
              <Line
                type="monotone"
                dataKey="netImport"
                name="Net Import (+) / Export (-) (MW)"
                stroke="#f43f5e"
                strokeWidth={1.8}
                strokeDasharray="5 4"
                dot={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <ModelExplainerCard
        guide={{
          title: 'Closed Physical Power Balance (Generation + Trade = Demand)',
          whatItShows:
            'Includes District Heating & Industrial Combined Heat and Power (CHP)—the ~2,000 MW winter backbone of Finnish cities and factories—so every megawatt of demand and export is accounted for.',
          howToRead: [
            'Pink line (CHP Cogeneration): Electricity co-produced by municipal district heating and pulp/paper mills.',
            'White line (Hydro) & Green line (Wind): Domestic renewable generation.',
            'Dashed red line (Net Import/Export): Negative values confirm Finland is exporting surplus power to Sweden, Estonia, or Norway.',
          ],
          realWorldTakeaway:
            'Because Finland cogenerates ~2 GW of electricity alongside city district heating in autumn and winter, high wind periods frequently push total domestic production above national demand, turning Finland into a net power exporter.',
        }}
      />
    </section>
  );
}
