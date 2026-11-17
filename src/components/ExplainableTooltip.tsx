import { getClientTimezoneInfo } from '../utils/timeFormat';
import {
  buildTooltipTakeaway,
  inferMetricUnit,
  METRIC_META,
} from '../utils/tooltipMetadata';

interface TooltipEntry {
  dataKey?: string | number;
  name?: string;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
}

interface ExplainableTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  context?: 'residual' | 'weather' | 'hdd' | 'wind_forecast' | 'carbon' | 'storage';
}

/**
 * Custom Recharts tooltip that resolves true timestamps on scatter plots,
 * appends physical units, and provides plain-English takeaways.
 */
export function ExplainableTooltip({
  active,
  payload,
  label,
  context = 'residual',
}: ExplainableTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const row = payload[0]?.payload ?? {};
  const isForecast = Boolean(row.isForecast);
  const { shortName } = getClientTimezoneInfo();

  // Prefer the point's formatted timestamp string so scatter X-values aren't shown as clock times
  const headerTime =
    typeof row.label === 'string' && row.label.length > 0
      ? row.label
      : label !== undefined
        ? String(label)
        : '';

  const summary = buildTooltipTakeaway(context, row);

  return (
    <div className="bg-slate-950/95 border border-slate-700 rounded-xl p-3.5 shadow-xl max-w-xs text-xs space-y-2.5 backdrop-blur">
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
        <span className="font-semibold text-slate-100">
          {headerTime} ({shortName})
        </span>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-medium ${
            isForecast
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
          }`}
        >
          {isForecast ? '48h Forecast' : 'Measured Data'}
        </span>
      </div>

      <div className="space-y-2">
        {payload.map((entry, idx) => {
          const key = String(entry.dataKey ?? '');
          const meta = METRIC_META[key];
          const unit = inferMetricUnit(key, entry.name);
          const numVal = typeof entry.value === 'number' ? entry.value : Number(entry.value);
          const formattedNum = Number.isFinite(numVal)
            ? numVal.toLocaleString('en-US', { maximumFractionDigits: 1 })
            : String(entry.value ?? '—');

          return (
            <div key={`${key}-${idx}`} className="space-y-0.5">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-slate-200 font-medium">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  {meta?.label ?? entry.name}
                </span>
                <span className="font-mono font-semibold text-white whitespace-nowrap">
                  {formattedNum} {unit}
                </span>
              </div>
              {meta?.hint && (
                <p className="text-[11px] text-slate-400 pl-4 leading-snug">{meta.hint}</p>
              )}
            </div>
          );
        })}
      </div>

      {summary && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-[11px] text-emerald-300 leading-snug">
          💡 {summary}
        </div>
      )}
    </div>
  );
}
