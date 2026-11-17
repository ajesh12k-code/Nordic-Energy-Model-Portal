import type { MergedHourlyRecord } from '../types/energy';

export interface CarbonElasticityPoint {
  timestamp: string;
  label: string;
  windSharePct: number;
  carbonIntensity: number;
  fittedIntensity: number;
}

export interface CarbonElasticityResult {
  slopePer10PctWind: number; // Change in gCO2/kWh per +10% wind share
  baselineIntercept: number; // Estimated gCO2/kWh at 0% wind share
  rSquared: number;
  points: CarbonElasticityPoint[];
}

export function runCarbonElasticityModel(
  records: MergedHourlyRecord[]
): CarbonElasticityResult {
  const valid = records.flatMap((r) => {
    if (
      r.consumption === undefined ||
      r.consumption <= 0 ||
      r.wind === undefined ||
      r.carbonIntensity === undefined
    ) {
      return [];
    }
    const windSharePct = Math.round((r.wind / r.consumption) * 1000) / 10;
    return [{ row: r, x: windSharePct, y: r.carbonIntensity }];
  });

  const n = valid.length;
  if (n < 2) {
    return { slopePer10PctWind: 0, baselineIntercept: 0, rSquared: 0, points: [] };
  }

  const meanX = valid.reduce((s, p) => s + p.x, 0) / n;
  const meanY = valid.reduce((s, p) => s + p.y, 0) / n;

  let num = 0;
  let den = 0;
  for (const p of valid) {
    num += (p.x - meanX) * (p.y - meanY);
    den += (p.x - meanX) ** 2;
  }

  const slope = den > 0 ? num / den : 0;
  const intercept = meanY - slope * meanX;

  let ssRes = 0;
  let ssTot = 0;
  for (const p of valid) {
    const yHat = intercept + slope * p.x;
    ssRes += (p.y - yHat) ** 2;
    ssTot += (p.y - meanY) ** 2;
  }

  const points: CarbonElasticityPoint[] = valid
    .map((p) => ({
      timestamp: p.row.timestamp,
      label: p.row.label,
      windSharePct: p.x,
      carbonIntensity: p.y,
      fittedIntensity: Math.max(0, Math.round((intercept + slope * p.x) * 10) / 10),
    }))
    .sort((a, b) => a.windSharePct - b.windSharePct);

  return {
    slopePer10PctWind: Math.round(slope * 10 * 10) / 10,
    baselineIntercept: Math.round(intercept * 10) / 10,
    rSquared: Math.round((ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0) * 1000) / 1000,
    points,
  };
}
