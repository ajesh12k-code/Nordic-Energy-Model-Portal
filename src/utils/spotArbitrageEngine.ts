import type { MergedHourlyRecord } from '../types/energy';

export interface ArbitragePoint {
  timestamp: string;
  label: string;
  isForecast: boolean;
  fiSpotPriceEur: number;
  dk1SpotPriceEur?: number;
  carbonIntensity: number;
  residualLoad: number;
  bessActionMw: number; // + = discharge (sell), - = charge (buy)
  bessSocMwh: number;
  hourlyCashflowEur: number;
  cumulativeProfitEur: number;
}

export interface CiShiftResult {
  baselineCostEur: number;
  optimizedCostEur: number;
  costSavingsEur: number;
  costSavingsPct: number;
  baselineCo2Kg: number;
  optimizedCo2Kg: number;
  co2AvoidedKg: number;
  bestWindowLabels: string[];
}

/**
 * Simulates BESS spot-price arbitrage across historical + day-ahead hours
 * using quantile price thresholds (charge in bottom 25%, discharge in top 25%).
 */
export function simulateBessSpotArbitrage(
  series: MergedHourlyRecord[],
  powerMw: number,
  capacityMwh: number,
  efficiency = 0.88
): {
  points: ArbitragePoint[];
  totalProfitEur: number;
  cycles: number;
  avgSpreadEur: number;
} {
  const valid = series.filter(
    (r) => r.fiSpotPriceEur !== undefined || r.residualLoad !== undefined
  );
  if (valid.length === 0) {
    return { points: [], totalProfitEur: 0, cycles: 0, avgSpreadEur: 0 };
  }

  // Fallback price proxy from residual load if spot price JSON is still syncing
  const prices = valid.map((r) =>
    r.fiSpotPriceEur !== undefined
      ? r.fiSpotPriceEur
      : Math.max(2, Math.round(((r.residualLoad ?? 6500) - 3500) * 0.018 * 10) / 10)
  );

  const sorted = [...prices].sort((a, b) => a - b);
  const chargeThreshold = sorted[Math.floor(sorted.length * 0.28)] ?? 25;
  const dischargeThreshold = sorted[Math.floor(sorted.length * 0.72)] ?? 65;

  let soc = capacityMwh * 0.5;
  let cumulative = 0;
  let totalDischargedMwh = 0;
  const etaOneWay = Math.sqrt(efficiency);

  const points: ArbitragePoint[] = valid.map((row, idx) => {
    const price = prices[idx];
    let actionMw = 0;
    let cashflow = 0;

    if (price <= chargeThreshold && soc < capacityMwh) {
      const maxCharge = Math.min(powerMw, (capacityMwh - soc) / etaOneWay);
      actionMw = -Math.round(maxCharge * 100) / 100;
      soc += maxCharge * etaOneWay;
      cashflow = -maxCharge * price;
    } else if (price >= dischargeThreshold && soc > 0) {
      const maxDischarge = Math.min(powerMw, soc * etaOneWay);
      actionMw = Math.round(maxDischarge * 100) / 100;
      soc -= maxDischarge / etaOneWay;
      totalDischargedMwh += maxDischarge;
      cashflow = maxDischarge * price;
    }

    cumulative += cashflow;

    return {
      timestamp: row.timestamp,
      label: row.label,
      isForecast: row.isForecast,
      fiSpotPriceEur: Math.round(price * 100) / 100,
      ...(row.dk1SpotPriceEur !== undefined ? { dk1SpotPriceEur: row.dk1SpotPriceEur } : {}),
      carbonIntensity: row.carbonIntensity ?? 25,
      residualLoad: row.residualLoad ?? 0,
      bessActionMw: actionMw,
      bessSocMwh: Math.round(soc * 100) / 100,
      hourlyCashflowEur: Math.round(cashflow * 100) / 100,
      cumulativeProfitEur: Math.round(cumulative * 100) / 100,
    };
  });

  return {
    points,
    totalProfitEur: Math.round(cumulative),
    cycles: capacityMwh > 0 ? Math.round((totalDischargedMwh / capacityMwh) * 10) / 10 : 0,
    avgSpreadEur: Math.round((dischargeThreshold - chargeThreshold) * 10) / 10,
  };
}

/**
 * Computes C&I industrial batch load-shifting savings (EUR & Scope 2 kg CO2)
 * over the upcoming 24-48h window by moving flexible MW to cheapest clean hours.
 */
export function optimizeCiFlexibleBatch(
  series: MergedHourlyRecord[],
  batchLoadMw: number,
  durationHours: number
): CiShiftResult {
  const windowSlice = series.slice(-36);
  const k = Math.min(durationHours, windowSlice.length);
  if (k === 0) {
    return {
      baselineCostEur: 0,
      optimizedCostEur: 0,
      costSavingsEur: 0,
      costSavingsPct: 0,
      baselineCo2Kg: 0,
      optimizedCo2Kg: 0,
      co2AvoidedKg: 0,
      bestWindowLabels: [],
    };
  }

  const enriched = windowSlice.map((r) => ({
    label: r.label,
    price:
      r.fiSpotPriceEur !== undefined
        ? r.fiSpotPriceEur
        : Math.max(5, ((r.residualLoad ?? 6500) - 3500) * 0.018),
    co2: r.carbonIntensity ?? 25,
  }));

  // Baseline: running continuously during peak daytime hours (highest prices in slice)
  const byExpensive = [...enriched].sort((a, b) => b.price - a.price).slice(0, k);
  // Optimized: shifting batch to lowest spot-price hours
  const byCheapest = [...enriched].sort((a, b) => a.price - b.price).slice(0, k);

  const baselineCost = byExpensive.reduce((s, r) => s + r.price * batchLoadMw, 0);
  const optimizedCost = byCheapest.reduce((s, r) => s + r.price * batchLoadMw, 0);

  // 1 MWh = 1,000 kWh -> gCO2/kWh * MWh = kg CO2
  const baselineCo2 = byExpensive.reduce((s, r) => s + r.co2 * batchLoadMw, 0);
  const optimizedCo2 = byCheapest.reduce((s, r) => s + r.co2 * batchLoadMw, 0);

  const savings = Math.max(0, baselineCost - optimizedCost);

  return {
    baselineCostEur: Math.round(baselineCost),
    optimizedCostEur: Math.round(optimizedCost),
    costSavingsEur: Math.round(savings),
    costSavingsPct: baselineCost > 0 ? Math.round((savings / baselineCost) * 1000) / 10 : 0,
    baselineCo2Kg: Math.round(baselineCo2),
    optimizedCo2Kg: Math.round(optimizedCo2),
    co2AvoidedKg: Math.round(Math.max(0, baselineCo2 - optimizedCo2)),
    bestWindowLabels: byCheapest.slice(0, 4).map((r) => r.label),
  };
}
