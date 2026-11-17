# Nordic Energy Informatics & Grid Modeling Portal

[![Live Portal](https://img.shields.io/badge/Live_Demo-GitHub_Pages-10b981?style=for-the-badge)](https://ajesh12k-code.github.io/Nordic-Energy-Model-Portal/)
[![Data Pipeline](https://img.shields.io/github/actions/workflow/status/ajesh12k-code/Nordic-Energy-Model-Portal/fetch-energy-data.yml?label=Hourly%20Data%20Sync&style=for-the-badge)](https://github.com/ajesh12k-code/Nordic-Energy-Model-Portal/actions)

An automated, zero-backend **Energy Informatics & Grid Modeling Portal** that ingests live hourly telemetry from **Fingrid Open Data** and multi-city meteorological forecasts from **Open-Meteo**, runs in-browser energy system models, and deploys continuously to GitHub Pages.

Available at: https://ajesh12k-code.github.io/Nordic-Energy-Model-Portal/
---

## System Architecture

To eliminate client-side API key exposure, CORS bottlenecks, and runtime backend hosting costs, the platform decouples **scheduled data engineering** from **interactive client-side modeling**:

```text
┌───────────────────────────┐      ┌──────────────────────────────────┐
│  Fingrid Open Data API    │      │  Open-Meteo Batch Weather API    │
│  (Datasets 124, 181,      │      │  (Helsinki, Tampere, Vaasa,      │
│   188, 265 — CC BY 4.0)   │      │   Lappeenranta, Oulu — +48h)     │
└─────────────┬─────────────┘      └────────────────┬─────────────────┘
              │                                     │
              └──────────────────┬──────────────────┘
                                 ▼
              ┌─────────────────────────────────────┐
              │  GitHub Actions Hourly Cron (:15)   │
              │  Python Plugin Pipeline             │
              │  (scripts/run_pipeline.py)          │
              └──────────────────┬──────────────────┘
                                 ▼
              ┌─────────────────────────────────────┐
              │  Static JSON Data Lake & Manifest   │
              │  public/data/catalog.json + *.json  │
              └──────────────────┬──────────────────┘
                                 ▼
              ┌─────────────────────────────────────┐
              │  React + TypeScript + Vite Portal   │
              │  • Residual Load Decomposition      │
              │  • 48h HDD OLS Demand Forecaster    │
              │  • Carbon Intensity & CO2 Abatement │
              │  • BESS Peak-Shaving Dispatch Sim   │
              └─────────────────────────────────────┘
Implemented Energy System ModelsShort-Term Load & Residual Demand DecompositionAligns national consumption (MWh/h), wind generation (MWh/h), and nuclear baseload (MWh/h) across a rolling 7-day window.Computes Residual Net Load ($L_{\text{res}}(t) = L_{\text{total}}(t) - P_{\text{wind}}(t)$) to isolate flexibility requirements met by Nordic hydro, thermal dispatch, and cross-border interconnectors.48-Hour Heating Degree Day (HDD) OLS Load ForecasterFits an Ordinary Least Squares linear model in TypeScript ($L(t) = \beta_0 + \beta_1 \cdot \max(0, T_{\text{base}} - T(t))$) on historical demand and 5-city ambient temperature.Reports live goodness-of-fit ($R^2$), in-sample $\text{RMSE}$ ($\text{MW}$), and thermal sensitivity ($\text{MW}/^\circ\text{C}$), projecting demand 48 hours ahead with interactive thermal threshold ($T_{\text{base}}$) and cold-snap shock ($\Delta T$) stress testing.Real-Time Grid Carbon Intensity & Demand-Shifting $\text{CO}_2$ SimulatorTracks Finland's real-time consumption emission factor ($\text{gCO}_2/\text{kWh}$, accounting for cross-border net imports) alongside wind generation.Quantifies $\text{CO}_2$ abatement ($\text{kg CO}_2$) achieved by scheduling flexible industrial, data-center, or EV fleet loads during daily minimum-intensity hours versus peak-intensity hours.Utility-Scale BESS Peak-Shaving Dispatch SandboxSimulates State-of-Charge (SoC) constrained charging and discharging of a grid-scale Battery Energy Storage System ($\text{MWh}$ capacity / $\text{MW}$ inverter rating) against residual load peaks.Modular Data Pipeline DesignAdding new data sources requires zero frontend code changes:scripts/providers/base.py: Defines the BaseProvider abstract contract, sub-hourly to hourly UTC bucket aggregation, and unified JSON schema.scripts/providers/fingrid.py & open_meteo.py: Self-contained API plugins with rate-limit backoff and multi-coordinate batching.scripts/datasets_config.json: Declarative registry of active series. Running python scripts/run_pipeline.py automatically regenerates public/data/catalog.json, which the React portal auto-discovers at runtime.Local Development (Ubuntu / WSL)Bash# 1. Clone repository
git clone [https://github.com/ajesh12k-code/Nordic-Energy-Model-Portal.git](https://github.com/ajesh12k-code/Nordic-Energy-Model-Portal.git)
cd Nordic-Energy-Model-Portal

# 2. Refresh local datasets via Python pipeline (optional; latest snapshots are committed)
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export FINGRID_API_KEY="your_fingrid_primary_key"
python scripts/run_pipeline.py

# 3. Start the interactive frontend
npm install
npm run dev
Data Attribution & LicensesElectricity Grid Telemetry: Fingrid Open Data — Licensed under CC BY 4.0.Meteorological Observations & Forecasts: Open-Meteo API — Licensed under CC BY 4.0.
