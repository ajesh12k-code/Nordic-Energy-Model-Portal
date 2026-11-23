import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatLocalChartLabel } from '../utils/timeFormat';
import type { CatalogManifest, DatasetPayload, MergedHourlyRecord } from '../types/energy';

const RAW_BASE = 'https://raw.githubusercontent.com/ajesh12k-code/Nordic-Energy-Model-Portal/main/public';

export function useEnergyPortalData(selectedCity: string) {
  const [catalog, setCatalog] = useState<CatalogManifest | null>(null);
  const [datasets, setDatasets] = useState<Record<string, DatasetPayload>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPortalData = useCallback(async (manual = false) => {
    try {
      manual ? setRefreshing(true) : setLoading(true);
      setError(null);
      const t = Date.now();
      let prefix = '.';
      try {
        const probe = await fetch(`${RAW_BASE}/data/catalog.json?t=${t}`, { cache: 'no-store' });
        if (probe.ok) prefix = RAW_BASE;
      } catch { prefix = '.'; }

      const catRes = await fetch(`${prefix}/data/catalog.json?t=${t}`, { cache: 'no-store' });
      if (!catRes.ok) throw new Error(`Catalog error (${catRes.status})`);
      const manifest: CatalogManifest = await catRes.json();
      setCatalog(manifest);

      const entries = await Promise.all(
        manifest.datasets.map(async (m) => {
          const p = m.file_path ?? `data/${m.slug}.json`;
          let r = await fetch(`${prefix}/${p}?t=${t}`, { cache: 'no-store' });
          if (!r.ok && prefix !== '.') r = await fetch(`./${p}?t=${t}`, { cache: 'no-store' });
          if (!r.ok) throw new Error(`Failed ${p}`);
          return [m.slug, (await r.json()) as DatasetPayload] as const;
        })
      );
      setDatasets(Object.fromEntries(entries));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void loadPortalData(false); }, [loadPortalData]);
  const refreshData = useCallback(() => loadPortalData(true), [loadPortalData]);

  const mergedSeries: MergedHourlyRecord[] = useMemo(() => {
    const map = new Map<string, MergedHourlyRecord>();
    const chpD = new Map<string, number>();
    const chpI = new Map<string, number>();
    const row = (ts: string) => {
      if (!map.has(ts)) map.set(ts, { timestamp: ts, label: formatLocalChartLabel(ts), isForecast: false });
      return map.get(ts)!;
    };

    datasets['fi_electricity_consumption']?.data.forEach((p) => { row(p.timestamp).consumption = p.value; });
    datasets['fi_total_production']?.data.forEach((p) => { row(p.timestamp).totalProduction = p.value; });
    datasets['fi_wind_production']?.data.forEach((p) => { row(p.timestamp).wind = p.value; });
    datasets['fi_nuclear_production']?.data.forEach((p) => { row(p.timestamp).nuclear = p.value; });
    datasets['fi_hydro_production']?.data.forEach((p) => { row(p.timestamp).hydro = p.value; });
    datasets['fi_chp_district_heating']?.data.forEach((p) => { chpD.set(p.timestamp, p.value); row(p.timestamp); });
    datasets['fi_chp_industrial']?.data.forEach((p) => { chpI.set(p.timestamp, p.value); row(p.timestamp); });
    datasets['fi_net_import_export']?.data.forEach((p) => { row(p.timestamp).netImport = p.value; });
    datasets['fi_emission_factor']?.data.forEach((p) => { row(p.timestamp).carbonIntensity = p.value; });
    datasets['fi_spot_price_eur']?.data.forEach((p) => { row(p.timestamp).fiSpotPriceEur = p.value; });
    datasets['dk1_spot_price_eur']?.data.forEach((p) => { row(p.timestamp).dk1SpotPriceEur = p.value; });
    datasets['fi_flow_se1']?.data.forEach((p) => { row(p.timestamp).flowSE1 = p.value; });
    datasets['fi_flow_se3']?.data.forEach((p) => { row(p.timestamp).flowSE3 = p.value; });
    datasets['fi_flow_no4']?.data.forEach((p) => { row(p.timestamp).flowNO4 = p.value; });
    datasets['fi_flow_ee']?.data.forEach((p) => { row(p.timestamp).flowEE = p.value; });
    datasets['dk_electricity_consumption']?.data.forEach((p) => { row(p.timestamp).dkConsumption = p.value; });
    datasets['dk_wind_production']?.data.forEach((p) => { row(p.timestamp).dkWind = p.value; });
    datasets['dk_solar_production']?.data.forEach((p) => { row(p.timestamp).dkSolar = p.value; });
    datasets['dk_emission_factor']?.data.forEach((p) => { row(p.timestamp).dkCarbonIntensity = p.value; });

    datasets['fi_multi_city_temperature_2m']?.data.forEach((p) => {
      const r = row(p.timestamp);
      r.temperature = selectedCity === 'national' ? p.value : p.by_city?.[selectedCity] ?? p.value;
      if (p.by_city) Object.assign(r, { temp_helsinki: p.by_city.helsinki, temp_tampere: p.by_city.tampere, temp_lappeenranta: p.by_city.lappeenranta, temp_vaasa: p.by_city.vaasa, temp_oulu: p.by_city.oulu });
    });
    datasets['fi_multi_city_wind_speed_100m']?.data.forEach((p) => {
      const r = row(p.timestamp);
      r.windSpeed100m = selectedCity === 'national' ? p.value : p.by_city?.[selectedCity] ?? p.value;
      if (p.by_city) Object.assign(r, { wind_helsinki: p.by_city.helsinki, wind_tampere: p.by_city.tampere, wind_lappeenranta: p.by_city.lappeenranta, wind_vaasa: p.by_city.vaasa, wind_oulu: p.by_city.oulu });
    });

    return Array.from(map.values()).sort((a, b) => a.timestamp.localeCompare(b.timestamp)).map((r) => {
      const d = chpD.get(r.timestamp), i = chpI.get(r.timestamp);
      const chpTotal = d !== undefined || i !== undefined ? Math.round(((d ?? 0) + (i ?? 0)) * 10) / 10 : undefined;
      const otherGeneration = r.totalProduction !== undefined ? Math.max(0, Math.round((r.totalProduction - ((r.wind ?? 0) + (r.nuclear ?? 0) + (r.hydro ?? 0) + (chpTotal ?? 0))) * 10) / 10) : undefined;
      return {
        ...r,
        ...(chpTotal !== undefined ? { chpTotal } : {}),
        ...(otherGeneration !== undefined ? { otherGeneration } : {}),
        residualLoad: r.consumption !== undefined && r.wind !== undefined ? Math.round((r.consumption - r.wind) * 100) / 100 : undefined,
        isForecast: r.consumption === undefined && r.dkConsumption === undefined && (r.temperature !== undefined || r.fiSpotPriceEur !== undefined),
      };
    });
  }, [datasets, selectedCity]);

  const historicalSeries = useMemo(() => mergedSeries.filter((r) => r.consumption !== undefined), [mergedSeries]);
  const cities = datasets['fi_multi_city_temperature_2m']?.metadata.locations ?? [];
  return { catalog, loading, refreshing, refreshData, error, mergedSeries, historicalSeries, cities };
}
