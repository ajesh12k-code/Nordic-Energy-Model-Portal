import { useMemo } from 'react';
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
import { runDiurnalBehavioralModel } from '../models/diurnalProfile';
import { ExplainableTooltip } from './ExplainableTooltip';
import { ExportCsvButton } from './ExportCsvButton';
import { ModelExplainerCard } from './ModelExplainerCard';
import type { MergedHourlyRecord } from '../types/energy';

export function DiurnalProfileTab({ data }: { data: MergedHourlyRecord[] }) {
  const model = useMemo(() => runDiurnalBehavioralModel(data), [data]);

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">
            24-Hour Weekday vs. Weekend Behavioral Load & Carbon Rhythm
          </h2>
          <p className="text-sm text-slate-400">
            Aggregates hourly demand by local clock hour to contrast Monday–Friday commercial and
            industrial activity against weekend residential routines.
          </p>
        </div>

        <ExportCsvButton
          rows={model.profile}
          filenamePrefix="fi_24h_diurnal_behavioral_profile"
          columns={[
            { key: 'hourLabel', header: 'local_hour' },
            { key: 'weekdayLoadMW', header: 'avg_weekday_load_mw' },
            { key: 'weekendLoadMW', header: 'avg_weekend_load_mw' },
            { key: 'avgCarbonIntensity', header: 'avg_carbon_intensity_gco2_kwh' },
          ]}
        />
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 block">Typical Daily Peak Hour</span>
          <strong className="text-base text-amber-400">{model.peakHourLabel} (Local)</strong>
        </div>
        <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 block">Cleanest Average Hour</span>
          <strong className="text-base text-emerald-400">{model.cleanestHourLabel} (Local)</strong>
        </div>
        <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 block">Weekday vs. Weekend Lift</span>
          <strong className="text-base text-white">
            {model.weekdayWeekendDeltaMW > 0 ? `+${model.weekdayWeekendDeltaMW}` : model.weekdayWeekendDeltaMW} MW
          </strong>
        </div>
      </div>

      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={model.profile}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="hourLabel" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 11 }} unit=" MW" width={75} />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              unit=" g"
              width={60}
            />
            <Tooltip content={<ExplainableTooltip context="residual" />} />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="weekdayLoadMW"
              name="Weekday Avg Load (MW)"
              stroke="#38bdf8"
              strokeWidth={2.5}
              dot={false}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="weekendLoadMW"
              name="Weekend Avg Load (MW)"
              stroke="#a855f7"
              strokeWidth={2.5}
              strokeDasharray="5 3"
              dot={false}
            />
            <Bar
              yAxisId="right"
              dataKey="avgCarbonIntensity"
              name="Avg Carbon Intensity (gCO₂/kWh)"
              fill="#10b981"
              fillOpacity={0.28}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <ModelExplainerCard
        guide={{
          title: 'Daily Human & Industrial Electricity Rhythms',
          whatItShows:
            'Compresses 7 days of data into a single 24-hour clock (in your local timezone) to compare workweek vs. weekend consumption alongside hourly carbon intensity.',
          howToRead: [
            'Solid blue line: Average Monday–Friday demand—notice the sharp morning climb between 06:00 and 09:00 as offices, schools, and factories start up.',
            'Dashed purple line: Weekend demand—starts later in the morning and sits lower overall due to reduced commercial load.',
            'Green bars: Average carbon intensity by hour—overnight hours typically offer the lowest emissions.',
          ],
          realWorldTakeaway:
            'Understanding behavioral demand curves helps energy communities and utilities design time-of-use tariffs and automated EV/heat-pump schedules that shift household consumption out of evening peaks.',
        }}
      />
    </section>
  );
}
