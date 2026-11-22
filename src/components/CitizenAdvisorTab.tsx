import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ExplainableTooltip } from './ExplainableTooltip';
import { ModelExplainerCard } from './ModelExplainerCard';
import type { MergedHourlyRecord } from '../types/energy';

/**
 * Plain-English behavioral demand-response advisor for households, housing
 * cooperatives (taloyhtiöt), and Positive Energy District (PED) communities.
 */
export function CitizenAdvisorTab({ data }: { data: MergedHourlyRecord[] }) {
  const [householdCount, setHouseholdCount] = useState<number>(50);
  const [shiftKwhPerHome, setShiftKwhPerHome] = useState<number>(8);

  const advisor = useMemo(() => {
    const recent24 = data.slice(-24);
    const latest = recent24[recent24.length - 1];
    const co2 = latest?.carbonIntensity ?? 25;
    const spot = latest?.fiSpotPriceEur ?? 35;
    const windShare =
      latest?.consumption && latest?.wind !== undefined
        ? Math.round((latest.wind / latest.consumption) * 100)
        : 25;

    let signal: 'GREEN' | 'AMBER' | 'RED' = 'AMBER';
    let headline = 'Moderate Grid Load — Normal Usage Recommended';
    let actionText =
      'Wind and hydro are balanced. Run standard appliances normally; schedule EV charging for overnight wind hours.';

    if (co2 <= 25 && spot <= 40) {
      signal = 'GREEN';
      headline = 'Ultra-Clean Wind Surplus — Ideal Time for EVs, Sauna & Heat Pumps!';
      actionText = `Wind is supplying ${windShare}% of Finland's power at ${co2} gCO₂/kWh (€${spot}/MWh). Shift high-draw loads here.`;
    } else if (co2 >= 55 || spot >= 85) {
      signal = 'RED';
      headline = 'Peak Grid Stress — Delay EV Charging & Heavy Appliances by 2–4 Hours';
      actionText = `High residual demand has pushed emissions to ${co2} gCO₂/kWh (€${spot}/MWh). Shifting flexible usage relieves regional transformers.`;
    }

    // Community aggregate impact over 30 days
    const prices = recent24.map((r) => r.fiSpotPriceEur ?? 45);
    const minP = prices.length ? Math.min(...prices) : 15;
    const maxP = prices.length ? Math.max(...prices) : 75;
    const spreadEurPerKwh = Math.max(0.02, (maxP - minP) / 1000);

    const monthlyKwhShifted = householdCount * shiftKwhPerHome * 30;
    const monthlySavingsEur = Math.round(monthlyKwhShifted * spreadEurPerKwh);
    const monthlyCo2SavedKg = Math.round((monthlyKwhShifted * 35) / 1000);

    const chartRows = recent24.map((r) => ({
      label: r.label,
      timestamp: r.timestamp,
      isForecast: r.isForecast,
      carbonIntensity: r.carbonIntensity ?? 25,
      fiSpotPriceEur: r.fiSpotPriceEur ?? 35,
    }));

    return {
      signal,
      headline,
      actionText,
      co2,
      spot,
      windShare,
      monthlyKwhShifted,
      monthlySavingsEur,
      monthlyCo2SavedKg,
      chartRows,
    };
  }, [data, householdCount, shiftKwhPerHome]);

  const bannerStyles =
    advisor.signal === 'GREEN'
      ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-200'
      : advisor.signal === 'RED'
        ? 'bg-rose-950/50 border-rose-500/50 text-rose-200'
        : 'bg-amber-950/40 border-amber-500/50 text-amber-200';

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
      <div>
        <h2 className="text-lg font-semibold">
          Energy Citizen &amp; Housing Cooperative (Taloyhtiö) Action Advisor
        </h2>
        <p className="text-sm text-slate-400">
          Translates real-time Nordic grid telemetry into plain-English behavioral guidance and
          Positive Energy District (PED) community savings.
        </p>
      </div>

      {/* Live Traffic-Light Behavioral Signal */}
      <div className={`border rounded-xl p-4 space-y-1.5 ${bannerStyles}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider">
            Live Citizen Grid Signal: {advisor.signal}
          </span>
          <span className="text-xs font-mono">
            {advisor.co2} gCO₂/kWh • €{advisor.spot}/MWh • {advisor.windShare}% Wind
          </span>
        </div>
        <h3 className="text-base font-semibold text-white">{advisor.headline}</h3>
        <p className="text-xs leading-relaxed">{advisor.actionText}</p>
      </div>

      {/* Community / Taloyhtio Simulator Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-xs">
        <label className="space-y-1">
          <span className="text-slate-400 flex justify-between">
            <span>Community Size (Households in Taloyhtiö / PED)</span>
            <strong className="text-emerald-400">{householdCount} homes</strong>
          </span>
          <input
            type="range"
            min={5}
            max={500}
            step={5}
            value={householdCount}
            onChange={(e) => setHouseholdCount(Number(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
        </label>

        <label className="space-y-1">
          <span className="text-slate-400 flex justify-between">
            <span>Daily Flexible Load Shifted per Home (EV / Water Heater)</span>
            <strong className="text-sky-400">{shiftKwhPerHome} kWh/day</strong>
          </span>
          <input
            type="range"
            min={2}
            max={25}
            step={1}
            value={shiftKwhPerHome}
            onChange={(e) => setShiftKwhPerHome(Number(e.target.value))}
            className="w-full accent-sky-500 cursor-pointer"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 block">Monthly Community Flexible Energy</span>
          <strong className="text-base text-white">
            {advisor.monthlyKwhShifted.toLocaleString('en-US')} kWh / mo
          </strong>
        </div>
        <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 block">Estimated Monthly Community Bill Savings</span>
          <strong className="text-base text-emerald-400">
            €{advisor.monthlySavingsEur.toLocaleString('en-US')} / mo
          </strong>
        </div>
        <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 block">Monthly Community CO₂ Reduction</span>
          <strong className="text-base text-sky-400">
            {advisor.monthlyCo2SavedKg.toLocaleString('en-US')} kg CO₂ / mo
          </strong>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={advisor.chartRows}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} minTickGap={24} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit=" g" width={60} />
            <Tooltip content={<ExplainableTooltip context="carbon" />} />
            <Bar
              dataKey="carbonIntensity"
              name="Hourly Carbon Intensity (gCO₂/kWh)"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ModelExplainerCard
        guide={{
          title: 'Empowering Active Energy Citizenship & Local Communities',
          whatItShows:
            'Converts complex transmission telemetry into simple traffic-light guidance and quantifies collective financial and carbon benefits when neighbors coordinate flexible loads.',
          howToRead: [
            'Shorter green bars indicate hours with high wind/nuclear share and low carbon intensity—the best hours for EV charging, dishwashers, and hot-water boilers.',
          ],
          realWorldTakeaway:
            'When 50–200 households in a housing cooperative coordinate EV and heat-pump schedules around wind surplus hours, they act as a distributed virtual battery without installing hardware.',
        }}
      />
    </section>
  );
}
