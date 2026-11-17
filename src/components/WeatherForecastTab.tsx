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
import { ExplainableTooltip } from './ExplainableTooltip';
import { ExportCsvButton } from './ExportCsvButton';
import { ModelExplainerCard } from './ModelExplainerCard';
import type { CityLocation, MergedHourlyRecord } from '../types/energy';

interface WeatherForecastTabProps {
  data: MergedHourlyRecord[];
  cities: CityLocation[];
  selectedCity: string;
  onSelectCity: (cityKey: string) => void;
}

const CITY_STYLES: Record<string, { label: string; color: string; role: string }> = {
  helsinki: { label: 'Helsinki (South)', color: '#f43f5e', role: 'Urban Load Hub' },
  tampere: { label: 'Tampere (Inland)', color: '#fb923c', role: 'Industrial Center' },
  lappeenranta: { label: 'Lappeenranta (SE)', color: '#eab308', role: 'Saimaa Corridor' },
  vaasa: { label: 'Vaasa (West Coast)', color: '#10b981', role: 'Wind Cluster' },
  oulu: { label: 'Oulu (North)', color: '#a855f7', role: 'Arctic Heating & Wind' },
};

export function WeatherForecastTab({ data }: WeatherForecastTabProps) {
  const [metric, setMetric] = useState<'temperature' | 'wind'>('temperature');
  const [visibleCities, setVisibleCities] = useState<Record<string, boolean>>({
    helsinki: true,
    tampere: true,
    lappeenranta: true,
    vaasa: true,
    oulu: true,
  });

  const toggleCity = (key: string) => {
    setVisibleCities((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Compute regional spread diagnostics from the latest observed hour
  const regionalStats = useMemo(() => {
    const latest = [...data].reverse().find((r) => r.temp_helsinki !== undefined);
    if (!latest) return null;

    const northSouthTempDiff =
      latest.temp_helsinki !== undefined && latest.temp_oulu !== undefined
        ? Math.round((latest.temp_helsinki - latest.temp_oulu) * 10) / 10
        : null;

    const coastalWindAdvantage =
      latest.wind_vaasa !== undefined && latest.wind_lappeenranta !== undefined
        ? Math.round((latest.wind_vaasa - latest.wind_lappeenranta) * 10) / 10
        : null;

    return {
      helsinkiTemp: latest.temp_helsinki,
      ouluTemp: latest.temp_oulu,
      northSouthTempDiff,
      vaasaWind: latest.wind_vaasa,
      coastalWindAdvantage,
    };
  }, [data]);

  const prefix = metric === 'temperature' ? 'temp_' : 'wind_';
  const unit = metric === 'temperature' ? '°C' : ' m/s';

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">
            Regional Weather Comparison Across 5 Finnish Cities (+48h Forecast)
          </h2>
          <p className="text-sm text-slate-400">
            Compare regional temperature gradients and coastal vs. inland wind speeds side by
            side against national electricity demand.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Toggle */}
          <div className="inline-flex rounded-lg bg-slate-800 p-1 border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setMetric('temperature')}
              className={`px-3 py-1 rounded-md font-medium transition cursor-pointer ${
                metric === 'temperature'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              2m Temperature (°C)
            </button>
            <button
              type="button"
              onClick={() => setMetric('wind')}
              className={`px-3 py-1 rounded-md font-medium transition cursor-pointer ${
                metric === 'wind'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              100m Wind Speed (m/s)
            </button>
          </div>

          <ExportCsvButton
            rows={data}
            filenamePrefix="fi_5cities_regional_weather"
            columns={[
              { key: 'timestamp', header: 'timestamp_utc' },
              { key: 'isForecast', header: 'is_forecast' },
              { key: 'consumption', header: 'national_consumption_mw' },
              { key: 'temp_helsinki', header: 'temp_2m_c_helsinki' },
              { key: 'temp_tampere', header: 'temp_2m_c_tampere' },
              { key: 'temp_lappeenranta', header: 'temp_2m_c_lappeenranta' },
              { key: 'temp_vaasa', header: 'temp_2m_c_vaasa' },
              { key: 'temp_oulu', header: 'temp_2m_c_oulu' },
              { key: 'wind_helsinki', header: 'wind_100m_ms_helsinki' },
              { key: 'wind_tampere', header: 'wind_100m_ms_tampere' },
              { key: 'wind_lappeenranta', header: 'wind_100m_ms_lappeenranta' },
              { key: 'wind_vaasa', header: 'wind_100m_ms_vaasa' },
              { key: 'wind_oulu', header: 'wind_100m_ms_oulu' },
            ]}
          />
        </div>
      </div>

      {/* City Toggle Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-400 mr-1">Toggle Cities:</span>
        {Object.entries(CITY_STYLES).map(([key, cfg]) => {
          const active = visibleCities[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleCity(key)}
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs border transition cursor-pointer ${
                active
                  ? 'bg-slate-800 border-slate-600 text-white'
                  : 'bg-slate-950/50 border-slate-800 text-slate-500'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: active ? cfg.color : '#475569' }}
              />
              <span>{cfg.label}</span>
            </button>
          );
        })}
      </div>

      {/* Regional Spread Summary Strip */}
      {regionalStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
            <span className="text-slate-400 block">South vs. North Temp (Latest)</span>
            <strong className="text-sm text-white">
              Helsinki {regionalStats.helsinkiTemp}°C / Oulu {regionalStats.ouluTemp}°C
            </strong>
          </div>
          <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
            <span className="text-slate-400 block">North–South Thermal Spread</span>
            <strong className="text-sm text-amber-400">
              {regionalStats.northSouthTempDiff !== null
                ? `${regionalStats.northSouthTempDiff > 0 ? '+' : ''}${regionalStats.northSouthTempDiff}°C`
                : '—'}
            </strong>
          </div>
          <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
            <span className="text-slate-400 block">West Coast Wind (Vaasa 100m)</span>
            <strong className="text-sm text-emerald-400">
              {regionalStats.vaasaWind !== undefined ? `${regionalStats.vaasaWind} m/s` : '—'}
            </strong>
          </div>
          <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
            <span className="text-slate-400 block">Coastal vs. Inland Wind Delta</span>
            <strong className="text-sm text-emerald-400">
              {regionalStats.coastalWindAdvantage !== null
                ? `${regionalStats.coastalWindAdvantage > 0 ? '+' : ''}${regionalStats.coastalWindAdvantage} m/s`
                : '—'}
            </strong>
          </div>
        </div>
      )}

      {/* Multi-City Chart */}
      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} minTickGap={28} />
            <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 11 }} unit={unit} width={60} />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              unit=" MW"
              width={75}
            />
            <Tooltip content={<ExplainableTooltip context="weather" />} />
            <Legend />

            {Object.entries(CITY_STYLES).map(([key, cfg]) =>
              visibleCities[key] ? (
                <Line
                  key={key}
                  yAxisId="left"
                  type="monotone"
                  dataKey={`${prefix}${key}`}
                  name={`${cfg.label} (${unit.trim()})`}
                  stroke={cfg.color}
                  strokeWidth={2}
                  dot={false}
                />
              ) : null
            )}

            <Line
              yAxisId="right"
              type="monotone"
              dataKey="consumption"
              name="National Consumption (MW)"
              stroke="#38bdf8"
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <ModelExplainerCard
        guide={{
          title: 'Regional Weather Differences Across Finland',
          whatItShows:
            'Plots all 5 Finnish cities separately so you can compare how southern urban centers (Helsinki), inland hubs (Tampere, Lappeenranta), west-coast wind corridors (Vaasa), and northern Finland (Oulu) experience different temperatures and wind speeds simultaneously.',
          howToRead: [
            'Colored solid lines: Individual cities—click any city pill above the chart to turn lines on or off.',
            'Metric toggle: Switch between 2m Temperature (°C) to see Arctic cold fronts move south, or 100m Wind Speed (m/s) to see why wind turbines cluster along the Vaasa–Oulu west coast.',
            'Dashed blue line: National electricity consumption (MW) on the right axis.',
          ],
          realWorldTakeaway:
            'Geographic spread matters: northern cold waves push up heating demand in Oulu hours before reaching Helsinki, while wind diversity across coastal and inland regions smooths national renewable output.',
        }}
      />
    </section>
  );
}
