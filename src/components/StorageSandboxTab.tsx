import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ExplainableTooltip } from './ExplainableTooltip';
import { ExportCsvButton } from './ExportCsvButton';
import type { MergedHourlyRecord } from '../types/energy';

export function StorageSandboxTab({ data }: { data: MergedHourlyRecord[] }) {
  const [batteryMWh, setBatteryMWh] = useState<number>(800);
  const [batteryMW, setBatteryMW] = useState<number>(250);

  const simulation = useMemo(() => {
    if (data.length === 0) return { series: [], peakReductionMW: 0 };

    const validResiduals = data
      .map((r) => r.residualLoad)
      .filter((v): v is number => v !== undefined);
    const meanResidual =
      validResiduals.reduce((acc, v) => acc + v, 0) / (validResiduals.length || 1);

    let socMWh = batteryMWh * 0.5;
    let maxOriginal = 0;
    let maxShaved = 0;

    const series = data.map((row) => {
      const load = row.residualLoad ?? row.consumption ?? 0;
      maxOriginal = Math.max(maxOriginal, load);
      let dispatchMW = 0;

      if (load > meanResidual * 1.03 && socMWh > 0) {
        dispatchMW = Math.min(batteryMW, load - meanResidual * 1.03, socMWh);
        socMWh -= dispatchMW;
      } else if (load < meanResidual * 0.97 && socMWh < batteryMWh) {
        const chargeMW = Math.min(batteryMW, meanResidual * 0.97 - load, batteryMWh - socMWh);
        dispatchMW = -chargeMW;
        socMWh += chargeMW;
      }

      const netGridLoad = Math.round((load - dispatchMW) * 10) / 10;
      maxShaved = Math.max(maxShaved, netGridLoad);

      return {
        timestamp: row.timestamp,
        label: row.label,
        originalResidual: load,
        shavedResidual: netGridLoad,
        socMWh: Math.round(socMWh * 10) / 10,
      };
    });

    return {
      series,
      peakReductionMW: Math.max(0, Math.round(maxOriginal - maxShaved)),
    };
  }, [data, batteryMWh, batteryMW]);

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">
            Utility-Scale BESS Peak-Shaving Dispatch Simulator
          </h2>
          <p className="text-sm text-slate-400">
            Simulate grid-scale battery dispatch against live Finnish residual demand.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 bg-slate-800/70 p-3 rounded-lg border border-slate-700">
          <div>
            <label className="block text-xs text-slate-400">
              Energy Capacity: <strong className="text-white">{batteryMWh} MWh</strong>
            </label>
            <input
              type="range"
              min={100}
              max={3000}
              step={100}
              value={batteryMWh}
              onChange={(e) => setBatteryMWh(Number(e.target.value))}
              className="accent-emerald-400"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400">
              Inverter Power: <strong className="text-white">{batteryMW} MW</strong>
            </label>
            <input
              type="range"
              min={50}
              max={1000}
              step={50}
              value={batteryMW}
              onChange={(e) => setBatteryMW(Number(e.target.value))}
              className="accent-emerald-400"
            />
          </div>
          <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1.5 rounded-md">
            Peak Shaved: <strong>{simulation.peakReductionMW} MW</strong>
          </span>
          <ExportCsvButton
            rows={simulation.series}
            filenamePrefix={`fi_bess_dispatch_${batteryMWh}mwh_${batteryMW}mw`}
            columns={[
              { key: 'timestamp', header: 'timestamp_utc' },
              { key: 'originalResidual', header: 'unmitigated_residual_mw' },
              { key: 'shavedResidual', header: 'post_bess_residual_mw' },
              { key: 'socMWh', header: 'battery_soc_mwh' },
            ]}
          />
        </div>
      </div>

      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={simulation.series}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} minTickGap={28} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit=" MW" width={75} />
            <Tooltip content={<ExplainableTooltip context="storage" />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="originalResidual"
              name="Unmitigated Residual Load (MW)"
              stroke="#94a3b8"
              strokeDasharray="4 4"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="shavedResidual"
              name="Post-BESS Net Residual Load (MW)"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
