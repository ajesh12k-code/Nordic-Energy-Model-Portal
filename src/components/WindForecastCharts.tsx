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
import { ExplainableTooltip } from './ExplainableTooltip';
import type { WindCurveScatterPoint, WindForecastTimelinePoint } from '../models/windPowerCurve';

interface WindForecastChartsProps {
  viewMode: 'timeline' | 'curve';
  timeline: WindForecastTimelinePoint[];
  scatterPoints: WindCurveScatterPoint[];
}

export function WindForecastCharts({
  viewMode,
  timeline,
  scatterPoints,
}: WindForecastChartsProps) {
  return (
    <div className="h-96 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {viewMode === 'timeline' ? (
          <ComposedChart data={timeline}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} minTickGap={28} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit=" MW" width={75} />
            <Tooltip content={<ExplainableTooltip context="residual" />} />
            <Legend />
            <Line type="monotone" dataKey="actualWindMW" name="Observed Wind (MW)" stroke="#10b981" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="predictedWindMW" name="Model Wind +48h (MW)" stroke="#34d399" strokeWidth={2} strokeDasharray="5 3" dot={false} />
            <Line type="monotone" dataKey="actualResidualMW" name="Observed Residual (MW)" stroke="#f59e0b" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="predictedResidualMW" name="Projected Residual +48h (MW)" stroke="#fb923c" strokeWidth={2} strokeDasharray="5 3" dot={false} />
          </ComposedChart>
        ) : (
          <ComposedChart data={scatterPoints}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis type="number" dataKey="windSpeedMs" name="Wind Speed" unit=" m/s" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis type="number" name="Wind Power" unit=" MW" tick={{ fill: '#94a3b8', fontSize: 11 }} width={75} />
            <Tooltip content={<ExplainableTooltip context="residual" />} />
            <Legend />
            <Scatter name="Observed Hourly Output (MW)" dataKey="actualWindMW" fill="#38bdf8" />
            <Line type="monotone" dataKey="fittedWindMW" name="Fitted Fleet Power Curve (MW)" stroke="#10b981" strokeWidth={3} dot={false} />
          </ComposedChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
