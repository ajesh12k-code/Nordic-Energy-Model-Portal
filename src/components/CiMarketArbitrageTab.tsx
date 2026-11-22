import { useMemo, useState } from 'react';
import {
  Area,
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
import { ExplainableTooltip } from './ExplainableTooltip';
import { ExportCsvButton } from './ExportCsvButton';
import { ModelExplainerCard } from './ModelExplainerCard';
import {
  optimizeCiFlexibleBatch,
  simulateBessSpotArbitrage,
} from '../utils/spotArbitrageEngine';
import type { MergedHourlyRecord } from '../types/energy';

/**
 * Decision-support tab for C&I facility managers, BESS developers, and energy traders:
 * combines Nord Pool FI vs. DK1 spot prices, BESS arbitrage dispatch, and C&I batch shifting.
 */
export function CiMarketArbitrageTab({ data }: { data: MergedHourlyRecord[] }) {
  const [bessPowerMw, setBessPowerMw] = useState<number>(10);
  const [bessCapacityMwh, setBessCapacityMwh] = useState<number>(20);
  const [ciBatchMw, setCiBatchMw] = useState<number>(5);
  const [ciDurationH, setCiDurationH] = useState<number>(6);

  const arb = useMemo(
    () => simulateBessSpotArbitrage(data, bessPowerMw, bessCapacityMwh),
    [data, bessPowerMw, bessCapacityMwh]
  );

  const ciOpt = useMemo(
    () => optimizeCiFlexibleBatch(data, ciBatchMw, ciDurationH),
    [data, ciBatchMw, ciDurationH]
  );

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">
            C&amp;I Spot Cost Optimizer &amp; BESS Day-Ahead Arbitrage (FI vs. DK1)
          </h2>
          <p className="text-sm text-slate-400">
            Models Nord Pool Day-Ahead spot prices (EUR/MWh), automated BESS price-spread
            arbitrage, and industrial Scope 2 load-shifting savings.
          </p>
        </div>
        <ExportCsvButton
          rows={arb.points}
          filenamePrefix="nordic_spot_bess_arbitrage"
          columns={[
            { key: 'timestamp', header: 'timestamp_utc' },
            { key: 'fiSpotPriceEur', header: 'fi_spot_eur_mwh' },
            { key: 'dk1SpotPriceEur', header: 'dk1_spot_eur_mwh' },
            { key: 'bessActionMw', header: 'bess_dispatch_mw' },
            { key: 'bessSocMwh', header: 'bess_soc_mwh' },
            { key: 'hourlyCashflowEur', header: 'hourly_cashflow_eur' },
            { key: 'cumulativeProfitEur', header: 'cumulative_profit_eur' },
          ]}
        />
      </div>

      {/* Interactive Controls: BESS Sizing + C&I Flexible Batch */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-xs">
        <label className="space-y-1">
          <span className="text-slate-400 flex justify-between">
            <span>BESS Power Rating</span>
            <strong className="text-emerald-400">{bessPowerMw} MW</strong>
          </span>
          <input
            type="range"
            min={2}
            max={50}
            step={2}
            value={bessPowerMw}
            onChange={(e) => setBessPowerMw(Number(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
        </label>

        <label className="space-y-1">
          <span className="text-slate-400 flex justify-between">
            <span>BESS Energy Capacity</span>
            <strong className="text-emerald-400">{bessCapacityMwh} MWh</strong>
          </span>
          <input
            type="range"
            min={4}
            max={120}
            step={4}
            value={bessCapacityMwh}
            onChange={(e) => setBessCapacityMwh(Number(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
        </label>

        <label className="space-y-1">
          <span className="text-slate-400 flex justify-between">
            <span>C&amp;I Shiftable Load</span>
            <strong className="text-sky-400">{ciBatchMw} MW</strong>
          </span>
          <input
            type="range"
            min={1}
            max={30}
            step={1}
            value={ciBatchMw}
            onChange={(e) => setCiBatchMw(Number(e.target.value))}
            className="w-full accent-sky-500 cursor-pointer"
          />
        </label>

        <label className="space-y-1">
          <span className="text-slate-400 flex justify-between">
            <span>Batch Run Duration</span>
            <strong className="text-sky-400">{ciDurationH} hrs</strong>
          </span>
          <input
            type="range"
            min={2}
            max={14}
            step={1}
            value={ciDurationH}
            onChange={(e) => setCiDurationH(Number(e.target.value))}
            className="w-full accent-sky-500 cursor-pointer"
          />
        </label>
      </div>

      {/* Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 block">7-Day BESS Spot Arbitrage Net</span>
          <strong className="text-base text-emerald-400">
            €{arb.totalProfitEur.toLocaleString('en-US')} ({arb.cycles} cycles)
          </strong>
        </div>
        <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 block">Capture Price Spread (P72 − P28)</span>
          <strong className="text-base text-white">€{arb.avgSpreadEur} / MWh</strong>
        </div>
        <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 block">C&amp;I Batch Shift Cost Savings</span>
          <strong className="text-base text-sky-400">
            €{ciOpt.costSavingsEur.toLocaleString('en-US')} (−{ciOpt.costSavingsPct}%)
          </strong>
        </div>
        <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 block">Scope 2 Emissions Avoided</span>
          <strong className="text-base text-amber-300">
            {ciOpt.co2AvoidedKg.toLocaleString('en-US')} kg CO₂
          </strong>
        </div>
      </div>

      {ciOpt.bestWindowLabels.length > 0 && (
        <div className="bg-sky-950/30 border border-sky-800/50 rounded-lg px-3.5 py-2.5 text-xs text-sky-200">
          <strong>Optimal C&amp;I Dispatch Windows:</strong>{' '}
          {ciOpt.bestWindowLabels.join(' • ')} (reduces batch cost from €
          {ciOpt.baselineCostEur.toLocaleString('en-US')} to €
          {ciOpt.optimizedCostEur.toLocaleString('en-US')})
        </div>
      )}

      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={arb.points}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} minTickGap={28} />
            <YAxis
              yAxisId="price"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              unit=" €"
              width={65}
            />
            <YAxis
              yAxisId="soc"
              orientation="right"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              unit=" MWh"
              width={68}
            />
            <Tooltip content={<ExplainableTooltip context="storage" />} />
            <Legend />
            <ReferenceLine yAxisId="price" y={0} stroke="#64748b" strokeDasharray="3 3" />
            <Area
              yAxisId="soc"
              type="monotone"
              dataKey="bessSocMwh"
              name="Battery State of Charge (MWh)"
              fill="#10b981"
              fillOpacity={0.14}
              stroke="#10b981"
              strokeWidth={1.8}
            />
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="fiSpotPriceEur"
              name="Finland Spot Price (EUR/MWh)"
              stroke="#38bdf8"
              strokeWidth={2.2}
              dot={false}
            />
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="dk1SpotPriceEur"
              name="Denmark West Spot Price (EUR/MWh)"
              stroke="#f59e0b"
              strokeWidth={1.8}
              strokeDasharray="4 3"
              dot={false}
            />
            <Bar
              yAxisId="price"
              dataKey="hourlyCashflowEur"
              name="Hourly Arbitrage Cashflow (EUR)"
              fill="#a855f7"
              opacity={0.55}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <ModelExplainerCard
        guide={{
          title: 'Day-Ahead Wholesale Arbitrage & Industrial Demand Flexibility',
          whatItShows:
            'Aligns official Nord Pool Day-Ahead hourly spot prices (FI & DK1) with automated BESS charge/discharge dispatch and C&I batch scheduling.',
          howToRead: [
            'Sky blue line (Finland Spot Price) vs. Amber dashed line (Denmark DK1): Reveals Nordic price coupling and wind-driven negative or near-zero price hours.',
            'Green shaded area (Battery State of Charge): Charges during bottom-quartile wind hours and discharges into evening price peaks.',
          ],
          realWorldTakeaway:
            'Industrial facilities and utility batteries capture immediate financial returns by automating dispatch around Nord Pool Day-Ahead clearing prices published each afternoon.',
        }}
      />
    </section>
  );
}
