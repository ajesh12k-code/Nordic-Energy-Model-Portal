import { useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ExportCsvButton } from './ExportCsvButton';
import type { MergedHourlyRecord } from '../types/energy';

export function CarbonIntensityTab({ data }: { data: MergedHourlyRecord[] }) {
  const [shiftableMWhPerDay, setShiftableMWhPerDay] = useState<number>(50);
  const [windowHours, setWindowHours] = useState<number>(4);

  const metrics = useMemo(() => {
    const valid = data.filter((r) => r.carbonIntensity !== undefined);
    if (valid.length === 0) {
      return { avgIntensity: 0, minIntensity: 0, maxIntensity: 0, co2SavedKg: 0, reductionPct: 0 };
    }

    const intensities = valid.map((r) => r.carbonIntensity!);
    const avgIntensity = intensities.reduce((a, b) => a + b, 0) / intensities.length;
    const minIntensity = Math.min(...intensities);
    const maxIntensity = Math.max(...intensities);

    const byDay = new Map<string, number[]>();
    valid.forEach((r) => {
      const day = r.timestamp.slice(0, 10);
      byDay.set(day, [...(byDay.get(day) ?? []), r.carbonIntensity!]);
    });

    let worstCaseKg = 0;
    let optimalCaseKg = 0;
    const hourlyLoadMWh = shiftableMWhPerDay / windowHours;

    byDay.forEach((dayValues) => {
      if (dayValues.length < windowHours) return;
      const sorted = [...dayValues].sort((a, b) => a - b);
      const cleanestSlice = sorted.slice(0, windowHours);
      const dirtiestSlice = sorted.slice(-windowHours);

      optimalCaseKg += cleanestSlice.reduce((sum, g) => sum + g * hourlyLoadMWh, 0);
      worstCaseKg += dirtiestSlice.reduce((sum, g) => sum + g * hourlyLoadMWh, 0);
    });

    const co2SavedKg = Math.max(0, Math.round(worstCaseKg - optimalCaseKg));
    const reductionPct =
      worstCaseKg > 0 ? Math.round(((worstCaseKg - optimalCaseKg) / worstCaseKg) * 1000) / 10 : 0;

    return {
      avgIntensity: Math.round(avgIntensity * 10) / 10,
      minIntensity: Math.round(minIntensity * 10) / 10,
      maxIntensity: Math.round(maxIntensity * 10) / 10,
      co2SavedKg,
      reductionPct,
    };
  }, [data, shiftableMWhPerDay, windowHours]);

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">
            Real-Time Grid Carbon Intensity &amp; Demand-Shifting CO₂ Simulator
          </h2>
          <p className="text-sm text-slate-400">
            Tracks Fingrid Dataset #265 (gCO₂/kWh) and simulates carbon abatement from shifting
            flexible industrial, data-center, or EV charging loads to clean wind hours.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-slate-800/70 p-3 rounded-lg border border-slate-700">
          <div>
            <label className="block text-xs text-slate-400">
              Flexible Daily Load: <strong className="text-white">{shiftableMWhPerDay} MWh/d</strong>
            </label>
            <input
              type="range"
              min={10}
              max={500}
              step={10}
              value={shiftableMWhPerDay}
              onChange={(e) => setShiftableMWhPerDay(Number(e.target.value))}
              className="accent-emerald-400"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400">
              Dispatch Window: <strong className="text-white">{windowHours} hrs/day</strong>
            </label>
            <input
              type="range"
              min={1}
              max={8}
              step={1}
              value={windowHours}
              onChange={(e) => setWindowHours(Number(e.target.value))}
              className="accent-emerald-400"
            />
          </div>
          <ExportCsvButton
            rows={data}
            filenamePrefix="fi_carbon_intensity_series"
            columns={[
              { key: 'timestamp', header: 'timestamp_utc' },
              { key: 'carbonIntensity', header: 'emission_factor_gco2_kwh' },
              { key: 'wind', header: 'wind_generation_mw' },
              { key: 'consumption', header: 'total_consumption_mw' },
            ]}
          />
        </div>
      </div>

      {/* Carbon & Abatement Diagnostics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 block">7-Day Mean Carbon Intensity</span>
          <strong className="text-base text-white">{metrics.avgIntensity} gCO₂/kWh</strong>
        </div>
        <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 block">Min / Max Grid Intensity</span>
          <strong className="text-base text-slate-200">
            {metrics.minIntensity} – {metrics.maxIntensity} g
          </strong>
        </div>
        <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 block">7-Day CO₂ Abated (Smart Shift)</span>
          <strong className="text-base text-emerald-400">
            {metrics.co2SavedKg.toLocaleString()} kg CO₂
          </strong>
        </div>
        <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 block">Relative Footprint Reduction</span>
          <strong className="text-base text-emerald-400">-{metrics.reductionPct}%</strong>
        </div>
      </div>

      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} minTickGap={28} />
            <YAxis
              yAxisId="left"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              unit=" g"
              width={60}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              unit=" MW"
              width={75}
            />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
            <Legend />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="carbonIntensity"
              name="Carbon Intensity (gCO₂/kWh)"
              fill="#f43f5e"
              fillOpacity={0.2}
              stroke="#f43f5e"
              strokeWidth={2}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="wind"
              name="Wind Generation (MW)"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
