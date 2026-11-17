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
import type { MergedHourlyRecord } from '../types/energy';

export function ResidualLoadTab({ data }: { data: MergedHourlyRecord[] }) {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">
          Short-Term Load &amp; Residual Demand Decomposition (7-Day Trailing)
        </h2>
        <p className="text-sm text-slate-400">
          Residual load represents net demand after subtracting variable wind generation,
          highlighting the flexibility required from hydro, thermal, and Nordic interconnectors.
        </p>
      </div>
      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} minTickGap={28} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit=" MW" width={75} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
            <Legend />
            <Area
              type="monotone"
              dataKey="consumption"
              name="Total Consumption (MW)"
              fill="#38bdf8"
              fillOpacity={0.15}
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
              dataKey="wind"
              name="Wind Power (MW)"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="nuclear"
              name="Nuclear Baseload (MW)"
              stroke="#a855f7"
              strokeWidth={1.5}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
