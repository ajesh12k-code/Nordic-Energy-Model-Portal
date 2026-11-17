import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { runHddLoadModel } from '../models/hddRegression';
import { ExplainableTooltip } from './ExplainableTooltip';
import { ExportCsvButton } from './ExportCsvButton';
import type { MergedHourlyRecord } from '../types/energy';

export function HddForecastTab({ data }: { data: MergedHourlyRecord[] }) {
  const [baseTempC, setBaseTempC] = useState<number>(17);
  const [tempDeltaC, setTempDeltaC] = useState<number>(0);

  const model = useMemo(
    () => runHddLoadModel(data, baseTempC, tempDeltaC),
    [data, baseTempC, tempDeltaC]
  );

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">
            48h Heating Degree Day (HDD) Load Regression &amp; Cold-Snap Stress Test
          </h2>
          <p className="text-sm text-slate-400">
            Fits an OLS thermal-sensitivity model on trailing 7-day load &amp; 5-city temperature,
            then forecasts demand across the +48h Open-Meteo horizon.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-slate-800/70 p-3 rounded-lg border border-slate-700">
          <div>
            <label className="block text-xs text-slate-400">
              Heating Base Temp: <strong className="text-white">{baseTempC}°C</strong>
            </label>
            <input
              type="range"
              min={12}
              max={21}
              step={1}
              value={baseTempC}
              onChange={(e) => setBaseTempC(Number(e.target.value))}
              className="accent-emerald-400"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400">
              Weather Shock (ΔT):{' '}
              <strong className={tempDeltaC < 0 ? 'text-sky-400' : 'text-white'}>
                {tempDeltaC > 0 ? `+${tempDeltaC}` : tempDeltaC}°C
              </strong>
            </label>
            <input
              type="range"
              min={-15}
              max={10}
              step={1}
              value={tempDeltaC}
              onChange={(e) => setTempDeltaC(Number(e.target.value))}
              className="accent-sky-400"
            />
          </div>
          <ExportCsvButton
            rows={model.series}
            filenamePrefix={`fi_hdd_forecast_base${baseTempC}_dt${tempDeltaC}`}
            columns={[
              { key: 'timestamp', header: 'timestamp_utc' },
              { key: 'isForecast', header: 'is_forecast' },
              { key: 'temperature', header: 'scenario_temp_c' },
              { key: 'actualConsumption', header: 'observed_load_mw' },
              { key: 'predictedConsumption', header: 'predicted_load_mw' },
            ]}
          />
        </div>
      </div>

      {/* Model Diagnostics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 block">Thermal Sensitivity</span>
          <strong className="text-base text-emerald-400">
            +{model.slopeMWPerDegree} MW / °C drop
          </strong>
        </div>
        <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 block">Temperature-Independent Baseload</span>
          <strong className="text-base text-white">{model.interceptMW.toLocaleString()} MW</strong>
        </div>
        <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 block">Goodness of Fit (R²)</span>
          <strong className="text-base text-white">{model.rSquared.toFixed(3)}</strong>
        </div>
        <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 block">In-Sample Error (RMSE)</span>
          <strong className="text-base text-white">{model.rmseMW.toLocaleString()} MW</strong>
        </div>
      </div>

      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={model.series}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} minTickGap={28} />
            <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 11 }} unit=" MW" width={75} />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              unit="°C"
              width={50}
            />
            <Tooltip content={<ExplainableTooltip context="hdd" />} />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="actualConsumption"
              name="Observed Load (MW)"
              stroke="#38bdf8"
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="predictedConsumption"
              name="HDD Model Fit & +48h Forecast (MW)"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="temperature"
              name="Scenario Temp (°C)"
              stroke="#f43f5e"
              strokeWidth={1.5}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
