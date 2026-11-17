import type { MergedHourlyRecord } from '../types/energy';

export const CITY_KEYS = ['helsinki', 'tampere', 'lappeenranta', 'vaasa', 'oulu'] as const;
export type CityKey = (typeof CITY_KEYS)[number];

export const CITY_LABELS: Record<CityKey, string> = {
  helsinki: 'Helsinki',
  tampere: 'Tampere',
  lappeenranta: 'Lappeenranta',
  vaasa: 'Vaasa',
  oulu: 'Oulu',
};

export interface CorrelationMatrixRow {
  city: string;
  helsinki: number;
  tampere: number;
  lappeenranta: number;
  vaasa: number;
  oulu: number;
}

export interface SpatialSmoothingResult {
  lowestPairLabel: string;
  lowestCorrelation: number;
  volatilityReductionPct: number;
  matrix: CorrelationMatrixRow[];
}

function pearsonR(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;

  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const den = Math.sqrt(denX * denY);
  return den > 0 ? Math.round((num / den) * 100) / 100 : 0;
}

function stdDev(vals: number[]): number {
  if (vals.length < 2) return 0;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length;
  return Math.sqrt(variance);
}

export function runSpatialCorrelationModel(
  records: MergedHourlyRecord[],
  metric: 'wind' | 'temperature'
): SpatialSmoothingResult {
  const prefix = metric === 'wind' ? 'wind_' : 'temp_';

  const validRows = records.filter((r) =>
    CITY_KEYS.every((k) => typeof r[`${prefix}${k}`] === 'number')
  );

  const seriesByCity: Record<CityKey, number[]> = {
    helsinki: validRows.map((r) => r[`${prefix}helsinki`] as number),
    tampere: validRows.map((r) => r[`${prefix}tampere`] as number),
    lappeenranta: validRows.map((r) => r[`${prefix}lappeenranta`] as number),
    vaasa: validRows.map((r) => r[`${prefix}vaasa`] as number),
    oulu: validRows.map((r) => r[`${prefix}oulu`] as number),
  };

  let lowestCorrelation = 1;
  let lowestPairLabel = '—';

  const matrix: CorrelationMatrixRow[] = CITY_KEYS.map((rowKey) => {
    const rowValues: Record<string, number> = {};
    for (const colKey of CITY_KEYS) {
      const rVal = rowKey === colKey ? 1 : pearsonR(seriesByCity[rowKey], seriesByCity[colKey]);
      rowValues[colKey] = rVal;

      if (rowKey !== colKey && rVal < lowestCorrelation) {
        lowestCorrelation = rVal;
        lowestPairLabel = `${CITY_LABELS[rowKey]} ↔ ${CITY_LABELS[colKey]}`;
      }
    }

    return {
      city: CITY_LABELS[rowKey],
      helsinki: rowValues.helsinki,
      tampere: rowValues.tampere,
      lappeenranta: rowValues.lappeenranta,
      vaasa: rowValues.vaasa,
      oulu: rowValues.oulu,
    };
  });

  // Compare average single-city stdDev vs. 5-city diversified portfolio stdDev
  const singleCityVols = CITY_KEYS.map((k) => stdDev(seriesByCity[k]));
  const avgSingleVol = singleCityVols.reduce((a, b) => a + b, 0) / CITY_KEYS.length;

  const portfolioSeries = validRows.map(
    (_, idx) => CITY_KEYS.reduce((s, k) => s + seriesByCity[k][idx], 0) / CITY_KEYS.length
  );
  const portfolioVol = stdDev(portfolioSeries);

  const volatilityReductionPct =
    avgSingleVol > 0
      ? Math.max(0, Math.round(((avgSingleVol - portfolioVol) / avgSingleVol) * 1000) / 10)
      : 0;

  return {
    lowestPairLabel,
    lowestCorrelation,
    volatilityReductionPct,
    matrix,
  };
}
