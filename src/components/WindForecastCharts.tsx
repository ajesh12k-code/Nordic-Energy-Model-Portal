import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ExplainableTooltip } from './ExplainableTooltip';
import type { WindCurveScatterPoint, WindForecastTimelinePoint } from '../models/windPowerCurve';

interface WindForecastChartsProps {
  viewMode: 'timeline' | 'curve';
  timeline: WindForecastTimelinePoint[];
  scatterPoints: WindCurveScatterPoint[];
}

const TIMELINE_SERIES = [
  {
    key: 'actualWindMW',
    label: 'Observed Wind (Actual)',
    color: '#10b981',
    dashed: false,
  },
  {
    key: 'predictedWindMW',
    label: 'Modeled Wind & +48h Forecast',
    color: '#38bdf8',
    dashed: true,
  },
  {
    key: 'actualResidualMW',
    label: 'Observed Residual Load (Actual)',
    color: '#f59e0b',
    dashed: false,
  },
  {
    key: 'predictedResidualMW',
    label: 'Projected Residual Load (+48h)',
    color: '#f43f5e',
    dashed: true,
  },
] as const;

export function WindForecastCharts({
  viewMode,
  timeline,
  scatterPoints,
}: WindForecastChartsProps) {
  const [visible, setVisible] = useState<Record<string, boolean>>({
    actualWindMW: true,
    predictedWindMW: true,
    actualResidualMW: true,
    predictedResidualMW: true,
  });

  const forecastStartLabel = useMemo(
    () => timeline.find((pt) => pt.isForecast)?.label,
    [timeline]
  );

  const toggleSeries = (key: string) =>
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }));

  if (viewMode === 'curve') {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 bg-slate-950/60 border border-slate-800 rounded-lg px-3.5 py-2">
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
            Observed Hourly Output (MW)
          </span>
          <span className="flex items-center gap-2">
            <span className="w-5 h-0.5 bg-emerald-400 inline-block" />
            Fitted Fleet Power Curve (MW)
          </span>
        </div>

        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={scatterPoints}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                type="number"
                dataKey="windSpeedMs"
                name="Wind Speed"
                unit=" m/s"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
              />
              <YAxis
                type="number"
                name="Wind Power"
                unit=" MW"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                width={75}
              />
              <Tooltip content={<ExplainableTooltip context="wind_forecast" />} />
              <Scatter name="Observed Hourly Output (MW)" dataKey="actualWindMW" fill="#38bdf8" />
              <Line
                type="monotone"
                dataKey="fittedWindMW"
                name="Fitted Fleet Power Curve (MW)"
                stroke="#10b981"
                strokeWidth={3}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Interactive Custom Legend with Distinct Solid/Dashed Line Swatches */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/60 border border-slate-800 rounded-lg px-3.5 py-2">
        <div className="flex flex-wrap items-center gap-2">
          {TIMELINE_SERIES.map((s) => {
            const active = visible[s.key];
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => toggleSeries(s.key)}
                className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs border transition cursor-pointer ${
                  active
                    ? 'bg-slate-900 border-slate-700 text-slate-100'
                    : 'bg-slate-950/40 border-slate-800/60 text-slate-500'
                }`}
              >
                <span
                  className="w-5 inline-block"
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
        <span className="text-[11px] text-slate-400">Click any legend item to show/hide</span>
      </div>

      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={timeline}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} minTickGap={28} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit=" MW" width={75} />
            <Tooltip content={<ExplainableTooltip context="wind_forecast" />} />

            {forecastStartLabel && (
              <ReferenceLine
                x={forecastStartLabel}
                stroke="#94a3b8"
                strokeDasharray="4 4"
                label={{
                  value: 'Forecast (+48h) →',
                  position: 'insideTopRight',
                  fill: '#cbd5e1',
                  fontSize: 11,
                }}
              />
            )}

            {visible.actualWindMW && (
              <Line
                type="monotone"
                dataKey="actualWindMW"
                name="Observed Wind (MW)"
                stroke="#10b981"
                strokeWidth={2.2}
                dot={false}
              />
            )}
            {visible.predictedWindMW && (
              <Line
                type="monotone"
                dataKey="predictedWindMW"
                name="Model Wind & +48h Forecast (MW)"
                stroke="#38bdf8"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
              />
            )}
            {visible.actualResidualMW && (
              <Line
                type="monotone"
                dataKey="actualResidualMW"
                name="Observed Residual Load (MW)"
                stroke="#f59e0b"
                strokeWidth={2.2}
                dot={false}
              />
            )}
            {visible.predictedResidualMW && (
              <Line
                type="monotone"
                dataKey="predictedResidualMW"
                name="Projected Residual Load +48h (MW)"
                stroke="#f43f5e"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
