"""
Keyless Energinet Energi Data Service provider for Denmark (DK1 + DK2).
Fetches hourly Danish consumption, wind, solar, and CO2 emission intensity
and normalizes records to the portal's standard hourly schema.
"""
from datetime import datetime, timedelta, timezone
from collections import defaultdict
import requests


class EnerginetProvider:
    BASE_URL = "https://api.energidataservice.dk/dataset"

    def fetch_dataset(self, ds_config: dict, days_back: int = 7) -> dict:
        source_id = ds_config["source_id"]
        now_utc = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
        start_utc = now_utc - timedelta(days=days_back)

        start_str = start_utc.strftime("%Y-%m-%dT%H:%M")
        end_str = now_utc.strftime("%Y-%m-%dT%H:%M")

        if source_id == "dk_co2_intensity":
            points = self._fetch_co2(start_str, end_str)
        else:
            points = self._fetch_power_metric(source_id, start_str, end_str)

        return {
            "metadata": {
                "slug": ds_config["slug"],
                "title": ds_config["title"],
                "provider": "energinet",
                "source_id": str(source_id),
                "unit": ds_config["unit"],
                "category": ds_config["category"],
                "description": ds_config["description"],
                "license": "Energinet Open Data (CC BY 4.0)",
                "resolution": "1h",
                "updated_at_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "record_count": len(points),
                "file_path": f"data/{ds_config['slug']}.json",
            },
            "data": points,
        }

    def _fetch_power_metric(self, metric_key: str, start_str: str, end_str: str) -> list[dict]:
        """Aggregates DK1 + DK2 hourly settlement data into national Denmark totals (MWh/h)."""
        url = f"{self.BASE_URL}/ProductionConsumptionSettlement"
        params = {
            "start": start_str,
            "end": end_str,
            "limit": 2000,
            "sort": "HourUTC asc",
        }
        resp = requests.get(url, params=params, timeout=30)
        resp.raise_for_status()
        records = resp.json().get("records", [])

        hourly_sums: dict[str, float] = defaultdict(float)
        hourly_counts: dict[str, int] = defaultdict(int)

        for row in records:
            hour_utc = row.get("HourUTC")
            if not hour_utc:
                continue
            ts = f"{hour_utc[:19]}Z"

            if metric_key == "dk_consumption":
                val = float(row.get("GrossConsumptionMWh") or 0.0)
            elif metric_key == "dk_wind":
                val = float(row.get("OffshoreWindLt100MW_MWh") or 0.0) + float(
                    row.get("OffshoreWindGe100MW_MWh") or 0.0
                ) + float(row.get("OnshoreWindLt50kW_MWh") or 0.0) + float(
                    row.get("OnshoreWindGe50kW_MWh") or 0.0
                )
            elif metric_key == "dk_solar":
                val = float(row.get("SolarPowerLt10kW_MWh") or 0.0) + float(
                    row.get("SolarPowerGe10Lt40kW_MWh") or 0.0
                ) + float(row.get("SolarPowerGe40kW_MWh") or 0.0)
            else:
                val = 0.0

            hourly_sums[ts] += val
            hourly_counts[ts] += 1

        return [
            {
                "timestamp": ts,
                "value": round(hourly_sums[ts], 2),
                "samples": hourly_counts[ts],
            }
            for ts in sorted(hourly_sums.keys())
        ]

    def _fetch_co2(self, start_str: str, end_str: str) -> list[dict]:
        """Averages 5-minute DK1 & DK2 CO2 intensity (gCO2/kWh) into national hourly values."""
        url = f"{self.BASE_URL}/CO2Emis"
        params = {
            "start": start_str,
            "end": end_str,
            "limit": 5000,
            "sort": "Minutes5UTC asc",
        }
        resp = requests.get(url, params=params, timeout=30)
        resp.raise_for_status()
        records = resp.json().get("records", [])

        hourly_vals: dict[str, list[float]] = defaultdict(list)
        for row in records:
            m5 = row.get("Minutes5UTC")
            co2 = row.get("CO2Emission")
            if not m5 or co2 is None:
                continue
            ts = f"{m5[:13]}:00:00Z"
            hourly_vals[ts].append(float(co2))

        return [
            {
                "timestamp": ts,
                "value": round(sum(vals) / len(vals), 2),
                "samples": len(vals),
            }
            for ts, vals in sorted(hourly_vals.items())
            if vals
        ]
