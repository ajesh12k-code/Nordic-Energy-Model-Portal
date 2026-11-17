import {
  Bar,
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

export function WeatherForecastTab({
  data,
  cities,
  selectedCity,
  onSelectCity,
}: WeatherForecastTabProps) {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            Weather-Driven Heating Load & Hub-Height Wind (+48h Forecast)
          </h2>
          <p className="text-sm text-slate-400">
            Compare regional temperatures and 100m wind speeds across Finnish demand and wind
            corridors against national grid load.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="city-select" className="text-xs text-slate-400">
            Region:
          </label>
          <select
            id="city-select"
            value={selectedCity}
            onChange={(e) => onSelectCity(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-sm rounded-lg px-3 py-1.5 text-white"
          >
            <option value="national">Finland 5-City Mean</option>
            {cities.map((c) => (
              <option key={c.key} value={c.key}>
                {c.name}
              </option>
            ))}
          </select>
          <ExportCsvButton
            rows={data}
            filenamePrefix={`fi_weather_load_${selectedCity}`}
            columns={[
              { key: 'timestamp', header: 'timestamp_utc' },
              { key: 'isForecast', header: 'is_forecast' },
              { key: 'temperature', header: `temperature_2m_c_${selectedCity}` },
              { key: 'windSpeed100m', header: `wind_speed_100m_ms_${selectedCity}` },
              { key: 'consumption', header: 'national_consumption_mw' },
            ]}
          />
        </div>
      </div>

      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} minTickGap={28} />
            <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 11 }} unit="°C" width={55} />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              unit=" MW"
              width={75}
            />
            <Tooltip content={<ExplainableTooltip context="weather" />} />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="temperature"
              name="2m Temperature (°C)"
              stroke="#f43f5e"
              strokeWidth={2}
              dot={false}
            />
            <Bar
              yAxisId="left"
              dataKey="windSpeed100m"
              name="100m Wind Speed (m/s)"
              fill="#34d399"
              fillOpacity={0.35}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="consumption"
              name="National Consumption (MW)"
              stroke="#38bdf8"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <ModelExplainerCard
        guide={{
          title: 'Regional Weather & Energy Coupling',
          whatItShows:
            'Overlays local outdoor temperature and 100-meter wind speeds across 5 Finnish cities against national electricity usage, extending 48 hours into the future.',
          howToRead: [
            'Red line: Outdoor temperature (°C)—watch how blue electricity demand climbs whenever red dips.',
            'Green bars: Wind speed at 100m turbine height (m/s), especially critical in coastal Vaasa and Oulu.',
            'Rightmost 48 hours: Weather forecast window where blue historical load ends.',
          ],
          realWorldTakeaway:
            'Because electric heating and heat pumps are widespread in Finland, cold snaps in major cities (Helsinki, Tampere) drive predictable surges in national power demand.',
        }}
      />
    </section>
  );
}
