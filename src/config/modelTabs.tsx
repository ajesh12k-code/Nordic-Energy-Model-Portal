import type { ReactNode } from 'react';
import {
  Activity,
  BatteryCharging,
  Clock,
  CloudSun,
  Database,
  Gauge,
  Globe,
  Grid,
  Leaf,
  ScatterChart,
  TrendingUp,
  Wind,
} from 'lucide-react';
import { ResidualLoadTab } from '../components/ResidualLoadTab';
import { WeatherForecastTab } from '../components/WeatherForecastTab';
import { HddForecastTab } from '../components/HddForecastTab';
import { WindForecastTab } from '../components/WindForecastTab';
import { CarbonElasticityTab } from '../components/CarbonElasticityTab';
import { DiurnalProfileTab } from '../components/DiurnalProfileTab';
import { RampRateStressTab } from '../components/RampRateStressTab';
import { SpatialCorrelationTab } from '../components/SpatialCorrelationTab';
import { CarbonIntensityTab } from '../components/CarbonIntensityTab';
import { StorageSandboxTab } from '../components/StorageSandboxTab';
import { NordicComparisonTab } from '../components/NordicComparisonTab';
import { DataCatalogTab } from '../components/DataCatalogTab';
import type { CatalogManifest, CityLocation, MergedHourlyRecord } from '../types/energy';

export type ModelTabId =
  | 'residual'
  | 'weather'
  | 'hdd'
  | 'wind_forecast'
  | 'carbon_elasticity'
  | 'diurnal'
  | 'ramp_stress'
  | 'spatial'
  | 'carbon'
  | 'storage'
  | 'nordic'
  | 'catalog';

export interface TabRenderContext {
  mergedSeries: MergedHourlyRecord[];
  historicalSeries: MergedHourlyRecord[];
  cities: CityLocation[];
  selectedCity: string;
  onSelectCity: (city: string) => void;
  catalog: CatalogManifest | null;
}

export interface ModelTabConfig {
  id: ModelTabId;
  label: string;
  icon: ReactNode;
  render: (ctx: TabRenderContext) => ReactNode;
}

export const MODEL_TABS: ModelTabConfig[] = [
  {
    id: 'residual',
    label: '1. Residual Load',
    icon: <Activity className="w-4 h-4" />,
    render: (ctx) => <ResidualLoadTab data={ctx.historicalSeries} />,
  },
  {
    id: 'weather',
    label: '2. Multi-City Weather',
    icon: <CloudSun className="w-4 h-4" />,
    render: (ctx) => (
      <WeatherForecastTab
        data={ctx.mergedSeries}
        cities={ctx.cities}
        selectedCity={ctx.selectedCity}
        onSelectCity={ctx.onSelectCity}
      />
    ),
  },
  {
    id: 'hdd',
    label: '3. 48h HDD Forecast',
    icon: <TrendingUp className="w-4 h-4" />,
    render: (ctx) => <HddForecastTab data={ctx.mergedSeries} />,
  },
  {
    id: 'wind_forecast',
    label: '4. Wind & Net Forecast',
    icon: <Wind className="w-4 h-4" />,
    render: (ctx) => <WindForecastTab data={ctx.mergedSeries} />,
  },
  {
    id: 'carbon_elasticity',
    label: '5. Carbon Elasticity',
    icon: <ScatterChart className="w-4 h-4" />,
    render: (ctx) => <CarbonElasticityTab data={ctx.historicalSeries} />,
  },
  {
    id: 'diurnal',
    label: '6. 24h Behavioral Rhythm',
    icon: <Clock className="w-4 h-4" />,
    render: (ctx) => <DiurnalProfileTab data={ctx.historicalSeries} />,
  },
  {
    id: 'ramp_stress',
    label: '7. Grid Ramp Stress',
    icon: <Gauge className="w-4 h-4" />,
    render: (ctx) => <RampRateStressTab data={ctx.historicalSeries} />,
  },
  {
    id: 'spatial',
    label: '8. Spatial Smoothing',
    icon: <Grid className="w-4 h-4" />,
    render: (ctx) => <SpatialCorrelationTab data={ctx.mergedSeries} />,
  },
  {
    id: 'carbon',
    label: '9. Carbon & CO₂ Shift',
    icon: <Leaf className="w-4 h-4" />,
    render: (ctx) => <CarbonIntensityTab data={ctx.historicalSeries} />,
  },
  {
    id: 'storage',
    label: '10. BESS Peak-Shaving',
    icon: <BatteryCharging className="w-4 h-4" />,
    render: (ctx) => <StorageSandboxTab data={ctx.historicalSeries} />,
  },
  {
    id: 'nordic',
    label: '11. Nordic Grid & Flows',
    icon: <Globe className="w-4 h-4" />,
    render: (ctx) => <NordicComparisonTab data={ctx.historicalSeries} />,
  },
  {
    id: 'catalog',
    label: '12. Data Catalog',
    icon: <Database className="w-4 h-4" />,
    render: (ctx) => <DataCatalogTab datasets={ctx.catalog?.datasets ?? []} />,
  },
];
