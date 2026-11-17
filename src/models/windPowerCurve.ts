import { runHddLoadModel } from './hddRegression';
import type { MergedHourlyRecord } from '../types/energy';

export interface WindCurveScatterPoint {
  label: string;
  windSpeedMs: number;
  actualWindMW: number;
  fittedWindMW: number;
}

export interface WindForecastTimelinePoint {
  timestamp: string;
  label: string;
  corridorWindMs: number;
  actualWindMW?: number;
  predictedWindMW: number;
  actualResidualMW?: number;
  predictedResidualMW: number;
  isForecast: boolean;
}

export interface WindPowerModelResult {
  rSquared: number;
  rmseMW: number;
  estimatedFleetCapacityMW: number;
  scatterPoints: WindCurveScatterPoint[];
  timeline: WindForecastTimelinePoint[];
}

function getCorridorWindSpeed(r: MergedHourlyRecord): number | undefined {
  if (r.wind_vaasa !== undefined && r.wind_oulu !== undefined && r.windSpeed100m !== undefined) {
    return Math.round((0.45 * r.wind_vaasa + 0.35 * r.wind_oulu + 0.2 * r.windSpeed100m) * 100) / 100;
  }
  return r.windSpeed100m;
}

export function runWindPowerCurveModel(records: MergedHourlyRecord[]): WindPowerModelResult {
  const hddModel = runHddLoadModel(records, 17, 0);
  const predictedLoadByTs = new Map(
    hddModel.series
      .filter((pt) => pt.predictedConsumption !== undefined)
      .map((pt) => [pt.timestamp, pt.predictedConsumption!])
  );

  const training = records.flatMap((r) => {
    const v = getCorridorWindSpeed(r);
    return v !== undefined && r.wind !== undefined ? [{ row: r, v, p: r.wind }] : [];
  });

  if (training.length < 5) {
    return { rSquared: 0, rmseMW: 0, estimatedFleetCapacityMW: 0, scatterPoints: [], timeline: [] };
  }

  const maxObserved = Math.max(...training.map((t) => t.p));
  const caps = [Math.max(maxObserved * 1.1, 5000), Math.max(maxObserved * 1.25, 6800), 8200];
  let best = { cap: 6800, mid: 9.5, k: 0.45, sse: Number.POSITIVE_INFINITY };

  for (const cap of caps) {
    for (const mid of [7.5, 9.0, 10.5]) {
      for (const k of [0.35, 0.5, 0.65]) {
        const sse = training.reduce(
          (acc, t) => acc + (t.p - cap / (1 + Math.exp(-k * (t.v - mid)))) ** 2,
          0
        );
        if (sse < best.sse) best = { cap, mid, k, sse };
      }
    }
  }

  const predictWind = (v: number) =>
    v < 2.5 ? 0 : Math.round((best.cap / (1 + Math.exp(-best.k * (v - best.mid)))) * 10) / 10;

  const meanP = training.reduce((s, t) => s + t.p, 0) / training.length;
  const ssTot = training.reduce((s, t) => s + (t.p - meanP) ** 2, 0);

  const timeline: WindForecastTimelinePoint[] = records.flatMap((r) => {
    const v = getCorridorWindSpeed(r);
    if (v === undefined) return [];
    const predWind = predictWind(v);
    const predLoad = predictedLoadByTs.get(r.timestamp) ?? r.consumption ?? 0;

    return [
      {
        timestamp: r.timestamp,
        label: r.label,
        corridorWindMs: v,
        predictedWindMW: predWind,
        predictedResidualMW: Math.max(0, Math.round((predLoad - predWind) * 10) / 10),
        isForecast: r.isForecast,
        ...(r.wind !== undefined ? { actualWindMW: r.wind } : {}),
        ...(r.residualLoad !== undefined ? { actualResidualMW: r.residualLoad } : {}),
      },
    ];
  });

  return {
    rSquared: Math.round((ssTot > 0 ? Math.max(0, 1 - best.sse / ssTot) : 0) * 1000) / 1000,
    rmseMW: Math.round(Math.sqrt(best.sse / training.length)),
    estimatedFleetCapacityMW: Math.round(best.cap),
    scatterPoints: training
      .map((t) => ({
        label: t.row.label,
        windSpeedMs: t.v,
        actualWindMW: t.p,
        fittedWindMW: predictWind(t.v),
      }))
      .sort((a, b) => a.windSpeedMs - b.windSpeedMs),
    timeline,
  };
}
