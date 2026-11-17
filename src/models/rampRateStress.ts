import type { MergedHourlyRecord } from '../types/energy';

export interface RampRatePoint {
  timestamp: string;
  label: string;
  loadRampMW: number;
  windRampMW: number;
  residualRamp1hMW: number;
  residualRamp3hMW: number;
}

export interface RampStressResult {
  maxUpwardRamp1hMW: number;
  maxDownwardRamp1hMW: number;
  maxUpwardRamp3hMW: number;
  steepestEventLabel: string;
  series: RampRatePoint[];
}

export function runRampRateStressModel(records: MergedHourlyRecord[]): RampStressResult {
  const valid = records.filter(
    (r) =>
      r.consumption !== undefined &&
      r.wind !== undefined &&
      r.residualLoad !== undefined
  );

  if (valid.length < 4) {
    return {
      maxUpwardRamp1hMW: 0,
      maxDownwardRamp1hMW: 0,
      maxUpwardRamp3hMW: 0,
      steepestEventLabel: '—',
      series: [],
    };
  }

  const series: RampRatePoint[] = [];
  let maxUp1h = 0;
  let maxDown1h = 0;
  let maxUp3h = 0;
  let steepestEventLabel = valid[1].label;

  for (let i = 1; i < valid.length; i++) {
    const curr = valid[i];
    const prev = valid[i - 1];

    const loadRampMW = Math.round((curr.consumption! - prev.consumption!) * 10) / 10;
    const windRampMW = Math.round((curr.wind! - prev.wind!) * 10) / 10;
    const residualRamp1hMW = Math.round((curr.residualLoad! - prev.residualLoad!) * 10) / 10;

    const prev3 = i >= 3 ? valid[i - 3] : valid[0];
    const residualRamp3hMW = Math.round((curr.residualLoad! - prev3.residualLoad!) * 10) / 10;

    if (residualRamp1hMW > maxUp1h) {
      maxUp1h = residualRamp1hMW;
      steepestEventLabel = curr.label;
    }
    if (residualRamp1hMW < maxDown1h) {
      maxDown1h = residualRamp1hMW;
    }
    if (residualRamp3hMW > maxUp3h) {
      maxUp3h = residualRamp3hMW;
    }

    series.push({
      timestamp: curr.timestamp,
      label: curr.label,
      loadRampMW,
      windRampMW,
      residualRamp1hMW,
      residualRamp3hMW,
    });
  }

  return {
    maxUpwardRamp1hMW: Math.round(maxUp1h),
    maxDownwardRamp1hMW: Math.round(maxDown1h),
    maxUpwardRamp3hMW: Math.round(maxUp3h),
    steepestEventLabel,
    series,
  };
}
