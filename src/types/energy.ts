export interface CityLocation {
  key: string;
  name: string;
  lat: number;
  lon: number;
}

export interface DatasetMetadata {
  slug: string;
  title: string;
  provider: string;
  source_id: string;
  unit: string;
  category: 'demand' | 'generation' | 'weather' | 'emissions' | string;
  description: string;
  license: string;
  resolution: string;
  updated_at_utc: string;
  record_count: number;
  file_path: string;
  locations?: CityLocation[];
}

export interface CatalogManifest {
  generated_at_utc: string;
  dataset_count: number;
  datasets: DatasetMetadata[];
}

export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
  samples: number;
  by_city?: Record<string, number>;
}

export interface DatasetPayload {
  metadata: DatasetMetadata;
  data: TimeSeriesPoint[];
}

export interface MergedHourlyRecord {
  timestamp: string;
  label: string;
  consumption?: number;
  wind?: number;
  nuclear?: number;
  residualLoad?: number;
  carbonIntensity?: number; // gCO2/kWh
  temperature?: number;
  windSpeed100m?: number;
  temp_helsinki?: number;
  temp_tampere?: number;
  temp_lappeenranta?: number;
  temp_vaasa?: number;
  temp_oulu?: number;
  wind_helsinki?: number;
  wind_tampere?: number;
  wind_lappeenranta?: number;
  wind_vaasa?: number;
  wind_oulu?: number;
  isForecast: boolean;
}
