import { useEffect, useMemo, useState } from 'react';
import type {
  CatalogManifest,
  DatasetPayload,
  MergedHourlyRecord,
} from '../types/energy';

export function useEnergyPortalData(selectedCity: string) {
  const [catalog, setCatalog] = useState<CatalogManifest | null>(null);
  const [datasets, setDatasets] = useState<Record<string, DatasetPayload>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPortalData() {
      try {
        setLoading(true);
        const catRes = await fetch('./data/catalog.json');
        if (!catRes.ok) throw new Error(`Failed to load catalog.json (${catRes.status})`);
        const manifest: CatalogManifest = await catRes.json();
        setCatalog(manifest);

        const entries = await Promise.all(
          manifest.datasets.map(async (meta) => {
            const res = await fetch(`./${meta.file_path}`);
            if (!res.ok) throw new Error(`Failed to load ${meta.file_path}`);
            const payload: DatasetPayload = await res.json();
            return [meta.slug, payload] as const;
          })
        );

        setDatasets(Object.fromEntries(entries));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown data loading error');
      } finally {
        setLoading(false);
      }
    }

    loadPortalData();
  }, []);

  const mergedSeries: MergedHourlyRecord[] = useMemo(() => {
    const map = new Map<string, MergedHourlyRecord>();

    const ensureRow = (ts: string): MergedHourlyRecord => {
      if (!map.has(ts)) {
        const d = new Date(ts);
        const label = d.toLocaleString('en-GB', {
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'UTC',
        });
        map.set(ts, { timestamp: ts, label, isForecast: false });
      }
      return map.get(ts)!;
    };

    datasets['fi_electricity_consumption']?.data.forEach((pt) => {
      ensureRow(pt.timestamp).consumption = pt.value;
    });
    datasets['fi_wind_production']?.data.forEach((pt) => {
      ensureRow(pt.timestamp).wind = pt.value;
    });
    datasets['fi_nuclear_production']?.data.forEach((pt) => {
      ensureRow(pt.timestamp).nuclear = pt.value;
    });
    datasets['fi_emission_factor']?.data.forEach((pt) => {
      ensureRow(pt.timestamp).carbonIntensity = pt.value;
    });

    datasets['fi_multi_city_temperature_2m']?.data.forEach((pt) => {
      const row = ensureRow(pt.timestamp);
      row.temperature =
        selectedCity === 'national' ? pt.value : pt.by_city?.[selectedCity] ?? pt.value;
    });

    datasets['fi_multi_city_wind_speed_100m']?.data.forEach((pt) => {
      const row = ensureRow(pt.timestamp);
      row.windSpeed100m =
        selectedCity === 'national' ? pt.value : pt.by_city?.[selectedCity] ?? pt.value;
    });

    return Array.from(map.values())
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      .map((row) => ({
        ...row,
        residualLoad:
          row.consumption !== undefined && row.wind !== undefined
            ? Math.round((row.consumption - row.wind) * 100) / 100
            : undefined,
        isForecast: row.consumption === undefined && row.temperature !== undefined,
      }));
  }, [datasets, selectedCity]);

  const historicalSeries = useMemo(
    () => mergedSeries.filter((r) => r.consumption !== undefined),
    [mergedSeries]
  );

  const cities = datasets['fi_multi_city_temperature_2m']?.metadata.locations ?? [];

  return {
    catalog,
    loading,
    error,
    mergedSeries,
    historicalSeries,
    cities,
  };
}
