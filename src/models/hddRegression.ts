import type { MergedHourlyRecord } from '../types/energy';

export interface HddForecastPoint {
  timestamp: string;
  label: string;
  temperature?: number;
  actualConsumption?: number;
  predictedConsumption?: number;
  isForecast: boolean;
}

export interface HddModelResult {
  slopeMWPerDegree: number; // Marginal MW increase per 1°C drop below baseTemp
  interceptMW: number;      // Temperature-independent baseload (MW)
  rSquared: number;         // Coefficient of determination (0 to 1)
  rmseMW: number;           // Root Mean Square Error on historical fit (MW)
  series: HddForecastPoint[];
}

/**
 * Fits an Ordinary Least Squares (OLS) linear model:
 *   Load(t) = intercept + slope * max(0, baseTemp - (T(t) + tempShift))
 * using historical hours where both consumption and temperature exist,
 * then projects demand across the +48h Open-Meteo temperature forecast window.
 */
export function runHddLoadModel(
  records: MergedHourlyRecord[],
  baseTempC: number = 17,
  scenarioTempDeltaC: number = 0
): HddModelResult {
  const trainingPairs = records
    .filter((r) => r.consumption !== undefined && r.temperature !== undefined)
    .map((r) => ({
      hdd: Math.max(0, baseTempC - r.temperature!),
      load: r.consumption!,
    }));

  const n = trainingPairs.length;
  if (n < 2) {
    return {
      slopeMWPerDegree: 0,
      interceptMW: 0,
      rSquared: 0,
      rmseMW: 0,
      series: [],
    };
  }

  const meanX = trainingPairs.reduce((s, p) => s + p.hdd, 0) / n;
  const meanY = trainingPairs.reduce((s, p) => s + p.load, 0) / n;

  let num = 0;
  let den = 0;
  for (const p of trainingPairs) {
    num += (p.hdd - meanX) * (p.load - meanY);
    den += (p.hdd - meanX) ** 2;
  }

  const slope = den > 0 ? num / den : 0;
  const intercept = meanY - slope * meanX;

  // Compute R^2 and RMSE on historical training points
  let ssRes = 0;
  let ssTot = 0;
  for (const p of trainingPairs) {
    const yHat = intercept + slope * p.hdd;
    ssRes += (p.load - yHat) ** 2;
    ssTot += (p.load - meanY) ** 2;
  }

  const rSquared = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
  const rmseMW = Math.sqrt(ssRes / n);

  // Build unified series covering historical fit + 48h forecast
  const series: HddForecastPoint[] = records
    .filter((r) => r.temperature !== undefined)
    .map((r) => {
      const effectiveTemp = r.temperature! + scenarioTempDeltaC;
      const hdd = Math.max(0, baseTempC - effectiveTemp);
      const predicted = Math.round((intercept + slope * hdd) * 10) / 10;

      return {
        timestamp: r.timestamp,
        label: r.label,
        temperature: Math.round(effectiveTemp * 10) / 10,
        actualConsumption: r.consumption,
        predictedConsumption: predicted,
        isForecast: r.isForecast,
      };
    });

  return {
    slopeMWPerDegree: Math.round(slope * 10) / 10,
    interceptMW: Math.round(intercept),
    rSquared: Math.round(rSquared * 1000) / 1000,
    rmseMW: Math.round(rmseMW),
    series,
  };
}
