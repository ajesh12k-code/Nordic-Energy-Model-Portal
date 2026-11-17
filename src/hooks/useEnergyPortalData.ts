import { useEffect, useMemo, useState } from 'react';
import { formatLocalChartLabel } from '../utils/timeFormat';
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
        map.set(ts, {
          timestamp: ts,
          label: formatLocalChartLabel(ts),
          isForecast: false,
        });
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
      if (pt.by_city) {
        row.temp_helsinki = pt.by_city.helsinki;
        row.temp_tampere = pt.by_city.tampere;
        row.temp_lappeenranta = pt.by_city.lappeenranta;
        row.temp_vaasa = pt.by_city.vaasa;
        row.temp_oulu = pt.by_city.oulu;
      }
    });

    datasets['fi_multi_city_wind_speed_100m']?.data.forEach((pt) => {
      const row = ensureRow(pt.timestamp);
      row.windSpeed100m =
        selectedCity === 'national' ? pt.value : pt.by_city?.[selectedCity] ?? pt.value;
      if (pt.by_city) {
        row.wind_helsinki = pt.by_city.helsinki;
        row.wind_tampere = pt.by_city.tampere;
        row.wind_lappeenranta = pt.by_city.lappeenranta;
        row.wind_vaasa = pt.by_city.vaasa;
        row.wind_oulu = pt.by_city.oulu;
      }
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
