import type { MergedHourlyRecord } from '../types/energy';

export interface DiurnalHourPoint {
  hour: number;
  hourLabel: string;
  weekdayLoadMW?: number;
  weekendLoadMW?: number;
  avgCarbonIntensity?: number;
}

export interface DiurnalProfileResult {
  peakHourLabel: string;
  cleanestHourLabel: string;
  weekdayWeekendDeltaMW: number;
  profile: DiurnalHourPoint[];
}

export function runDiurnalBehavioralModel(
  records: MergedHourlyRecord[]
): DiurnalProfileResult {
  const buckets = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    weekdayLoads: [] as number[],
    weekendLoads: [] as number[],
    carbonValues: [] as number[],
  }));

  for (const r of records) {
    if (r.consumption === undefined) continue;
    const localDate = new Date(r.timestamp);
    if (Number.isNaN(localDate.getTime())) continue;

    const hour = localDate.getHours();
    const dayOfWeek = localDate.getDay(); // 0 = Sun, 6 = Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (isWeekend) {
      buckets[hour].weekendLoads.push(r.consumption);
    } else {
      buckets[hour].weekdayLoads.push(r.consumption);
    }

    if (r.carbonIntensity !== undefined) {
      buckets[hour].carbonValues.push(r.carbonIntensity);
    }
  }

  const avg = (arr: number[]) =>
    arr.length > 0 ? Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10 : undefined;

  const profile: DiurnalHourPoint[] = buckets.map((b) => {
    const wd = avg(b.weekdayLoads);
    const we = avg(b.weekendLoads);
    const ci = avg(b.carbonValues);

    return {
      hour: b.hour,
      hourLabel: `${String(b.hour).padStart(2, '0')}:00`,
      ...(wd !== undefined ? { weekdayLoadMW: wd } : {}),
      ...(we !== undefined ? { weekendLoadMW: we } : {}),
      ...(ci !== undefined ? { avgCarbonIntensity: ci } : {}),
    };
  });

  // Identify peak demand hour & cleanest carbon hour
  let peakHour = profile[0];
  let cleanestHour = profile[0];
  let wdSum = 0;
  let wdCount = 0;
  let weSum = 0;
  let weCount = 0;

  for (const pt of profile) {
    const refLoad = pt.weekdayLoadMW ?? pt.weekendLoadMW ?? 0;
    const peakRef = peakHour?.weekdayLoadMW ?? peakHour?.weekendLoadMW ?? 0;
    if (refLoad > peakRef) peakHour = pt;

    if (
      pt.avgCarbonIntensity !== undefined &&
      (cleanestHour?.avgCarbonIntensity === undefined ||
        pt.avgCarbonIntensity < cleanestHour.avgCarbonIntensity)
    ) {
      cleanestHour = pt;
    }

    if (pt.weekdayLoadMW !== undefined) {
      wdSum += pt.weekdayLoadMW;
      wdCount++;
    }
    if (pt.weekendLoadMW !== undefined) {
      weSum += pt.weekendLoadMW;
      weCount++;
    }
  }

  const weekdayWeekendDeltaMW =
    wdCount > 0 && weCount > 0 ? Math.round(wdSum / wdCount - weSum / weCount) : 0;

  return {
    peakHourLabel: peakHour?.hourLabel ?? '—',
    cleanestHourLabel: cleanestHour?.hourLabel ?? '—',
    weekdayWeekendDeltaMW,
    profile,
  };
}
