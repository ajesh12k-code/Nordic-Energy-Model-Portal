/**
 * Plain-English definitions and everyday analogies for energy and meteorological
 * units displayed across the Nordic Energy Informatics & Grid Modeling Portal.
 */
export interface UnitDefinition {
  unit: string;
  name: string;
  analogy: string;
}

export const UNIT_GLOSSARY: UnitDefinition[] = [
  {
    unit: 'MW (Megawatt)',
    name: 'Instantaneous Power',
    analogy:
      'Rate of electricity flowing right now. 1 MW powers roughly 500–700 Finnish homes simultaneously.',
  },
  {
    unit: 'MWh (Megawatt-hour)',
    name: 'Energy Volume',
    analogy:
      'Total electricity produced or stored over time (1 MW sustained for 1 hour = 1 MWh, enough to drive an EV ~5,000 km).',
  },
  {
    unit: 'gCO₂/kWh',
    name: 'Carbon Intensity',
    analogy:
      'Grams of CO₂ emitted per kilowatt-hour used. Under 50 g is ultra-clean (Nordic hydro/nuclear/wind); fossil coal is ~800+ g.',
  },
  {
    unit: 'm/s (at 100m)',
    name: 'Hub-Height Wind Speed',
    analogy:
      'Wind speed at wind-turbine rotor height. Turbines cut in around 3 m/s (~11 km/h) and reach rated output near 12–14 m/s.',
  },
  {
    unit: '°C & HDD',
    name: 'Heating Sensitivity',
    analogy:
      'Heating Degree Days measure how far outdoor air drops below 17°C—the threshold where electric heaters and heat pumps activate.',
  },
];
