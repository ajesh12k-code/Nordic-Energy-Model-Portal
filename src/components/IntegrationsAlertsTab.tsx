import { useMemo, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import type { CatalogManifest, MergedHourlyRecord } from '../types/energy';

/**
 * Provides automated threshold alert rules, live JSON webhook payloads,
 * Python/cURL API consumption snippets, and white-label deployment presets
 * for DSOs, ESCOs, industrial procurement teams, and academic researchers.
 */
export function IntegrationsAlertsTab({
  data,
  catalog,
}: {
  data: MergedHourlyRecord[];
  catalog: CatalogManifest | null;
}) {
  const [maxPriceThreshold, setMaxPriceThreshold] = useState<number>(25);
  const [maxCo2Threshold, setMaxCo2Threshold] = useState<number>(20);
  const [orgName, setOrgName] = useState<string>('Lappeenranta Municipal Energy / DSO');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const latest = data[data.length - 1];

  const alertEvaluation = useMemo(() => {
    const currentPrice = latest?.fiSpotPriceEur ?? 32.5;
    const currentCo2 = latest?.carbonIntensity ?? 18.0;
    const priceTriggered = currentPrice <= maxPriceThreshold;
    const co2Triggered = currentCo2 <= maxCo2Threshold;

    const webhookPayload = {
      event: priceTriggered || co2Triggered ? 'GRID_FLEXIBILITY_TRIGGERED' : 'GRID_STATUS_HEARTBEAT',
      organization: orgName,
      timestamp_utc: latest?.timestamp ?? new Date().toISOString(),
      telemetry: {
        fi_consumption_mw: latest?.consumption ?? null,
        fi_wind_mw: latest?.wind ?? null,
        fi_spot_price_eur_mwh: currentPrice,
        fi_carbon_intensity_gco2_kwh: currentCo2,
        dk_carbon_intensity_gco2_kwh: latest?.dkCarbonIntensity ?? null,
      },
      rules_evaluated: {
        spot_price_below_threshold: { threshold_eur: maxPriceThreshold, triggered: priceTriggered },
        carbon_below_threshold: { threshold_gco2: maxCo2Threshold, triggered: co2Triggered },
      },
    };

    return {
      currentPrice,
      currentCo2,
      priceTriggered,
      co2Triggered,
      jsonString: JSON.stringify(webhookPayload, null, 2),
    };
  }, [latest, maxPriceThreshold, maxCo2Threshold, orgName]);

  const pythonSnippet = `import requests

BASE_URL = "https://ajesh12k-code.github.io/Nordic-Energy-Model-Portal/data"
catalog = requests.get(f"{BASE_URL}/catalog.json", timeout=15).json()
spot_fi = requests.get(f"{BASE_URL}/fi_spot_price_eur.json", timeout=15).json()["data"]

print(f"Loaded {catalog['dataset_count']} Nordic datasets; latest FI spot: {spot_fi[-1]}")`;

  const copyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
      <div>
        <h2 className="text-lg font-semibold">
          Automated Webhook Alerts, Open JSON API &amp; White-Label Configuration
        </h2>
        <p className="text-sm text-slate-400">
          Configure automated procurement triggers for industrial PLC/SCADA systems, inspect
          standardized JSON endpoints for research, or customize white-label DSO metadata.
        </p>
      </div>

      {/* Rule Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-xs">
        <label className="space-y-1">
          <span className="text-slate-400 block">White-Label Organization / Utility Name</span>
          <input
            type="text"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-slate-100"
          />
        </label>

        <label className="space-y-1">
          <span className="text-slate-400 flex justify-between">
            <span>Trigger Load When FI Spot Price ≤</span>
            <strong className="text-sky-400">€{maxPriceThreshold} / MWh</strong>
          </span>
          <input
            type="range"
            min={0}
            max={120}
            step={5}
            value={maxPriceThreshold}
            onChange={(e) => setMaxPriceThreshold(Number(e.target.value))}
            className="w-full accent-sky-500 cursor-pointer"
          />
        </label>

        <label className="space-y-1">
          <span className="text-slate-400 flex justify-between">
            <span>Trigger Clean Dispatch When CO₂ ≤</span>
            <strong className="text-emerald-400">{maxCo2Threshold} gCO₂/kWh</strong>
          </span>
          <input
            type="range"
            min={5}
            max={100}
            step={5}
            value={maxCo2Threshold}
            onChange={(e) => setMaxCo2Threshold(Number(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
        </label>
      </div>

      {/* Live Rule Status Badges */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span
          className={`px-3 py-1.5 rounded-lg border font-medium ${
            alertEvaluation.priceTriggered
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
              : 'bg-slate-800/70 border-slate-700 text-slate-300'
          }`}
        >
          Spot Rule (€{alertEvaluation.currentPrice} vs ≤ €{maxPriceThreshold}):{' '}
          {alertEvaluation.priceTriggered ? 'TRIGGERED' : 'STANDBY'}
        </span>

        <span
          className={`px-3 py-1.5 rounded-lg border font-medium ${
            alertEvaluation.co2Triggered
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
              : 'bg-slate-800/70 border-slate-700 text-slate-300'
          }`}
        >
          Carbon Rule ({alertEvaluation.currentCo2}g vs ≤ {maxCo2Threshold}g):{' '}
          {alertEvaluation.co2Triggered ? 'TRIGGERED' : 'STANDBY'}
        </span>

        <span className="text-slate-400">
          Active Catalog Endpoints: <strong className="text-white">{catalog?.dataset_count ?? 21}</strong>
        </span>
      </div>

      {/* Side-by-Side JSON Webhook Payload & Python Research Client */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200">
              Live Outbound Webhook Event Payload (JSON)
            </span>
            <button
              type="button"
              onClick={() => copyText('webhook', alertEvaluation.jsonString)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
            >
              {copiedKey === 'webhook' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedKey === 'webhook' ? 'Copied' : 'Copy JSON'}
            </button>
          </div>
          <pre className="overflow-x-auto text-[11px] text-emerald-300 font-mono leading-relaxed">
            {alertEvaluation.jsonString}
          </pre>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200">
              Zero-Key Python Research &amp; ETL Client
            </span>
            <button
              type="button"
              onClick={() => copyText('python', pythonSnippet)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
            >
              {copiedKey === 'python' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedKey === 'python' ? 'Copied' : 'Copy Python'}
            </button>
          </div>
          <pre className="overflow-x-auto text-[11px] text-sky-300 font-mono leading-relaxed">
            {pythonSnippet}
          </pre>
        </div>
      </div>
    </section>
  );
}
