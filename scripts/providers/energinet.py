"""
Keyless Energinet Energi Data Service provider for Denmark (DK1 + DK2) and
Nordic Day-Ahead Elspotprices (FI, DK1, DK2 in EUR/MWh).
"""
from collections import defaultdict
from datetime import datetime, timedelta, timezone
import requests


class EnerginetProvider:
    BASE_URL = "https://api.energidataservice.dk/dataset"

    def fetch_dataset(self, ds_config: dict, days_back: int = 7) -> dict:
        source_id = ds_config["source_id"]
        now_utc = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
        start_utc = now_utc - timedelta(days=days_back)
        # Include +36h ahead for Day-Ahead Elspotprices (published daily ~13:00 CET)
        end_utc = now_utc + timedelta(hours=36)

        start_str = start_utc.strftime("%Y-%m-%dT%H:%M")
        end_str = end_utc.strftime("%Y-%m-%dT%H:%M")

        if source_id == "dk_co2_intensity":
            points = self._fetch_co2(start_str, now_utc.strftime("%Y-%m-%dT%H:%M"))
        elif source_id.startswith("spot_price_"):
            area = source_id.replace("spot_price_", "").upper()
            points = self._fetch_spot_price(area, start_str, end_str)
        else:
            points = self._fetch_realtime_power(source_id, start_str, now_utc.strftime("%Y-%m-%dT%H:%M"))

        return {
            "metadata": {
                "slug": ds_config["slug"],
                "title": ds_config["title"],
                "provider": "energinet",
                "source_id": str(source_id),
                "unit": ds_config["unit"],
                "category": ds_config["category"],
                "description": ds_config["description"],
                "license": "Energinet / Nord Pool Open Data (CC BY 4.0)",
                "resolution": "1h",
                "updated_at_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "record_count": len(points),
                "file_path": f"data/{ds_config['slug']}.json",
            },
            "data": points,
        }

    def _fetch_spot_price(self, price_area: str, start_str: str, end_str: str) -> list[dict]:
        """Fetches hourly Day-Ahead spot prices (EUR/MWh) for FI, DK1, or DK2."""
        url = f"{self.BASE_URL}/Elspotprices"
        params = {
            "start": start_str,
            "end": end_str,
            "filter": f'{{"PriceArea":["{price_area}"]}}',
            "limit": 1000,
            "sort": "HourUTC asc",
        }
        resp = requests.get(url, params=params, timeout=30)
        resp.raise_for_status()
        records = resp.json().get("records", [])

        points = []
        for row in records:
            hour_utc = row.get("HourUTC")
            eur = row.get("SpotPriceEUR")
            if not hour_utc or eur is None:
                continue
            points.append({
                "timestamp": f"{hour_utc[:19]}Z",
                "value": round(float(eur), 2),
                "samples": 1,
            })
        return points

    def _fetch_realtime_power(self, metric_key: str, start_str: str, end_str: str) -> list[dict]:
        """Aggregates 5-minute DK1 + DK2 power readings (MW) into hourly national totals."""
        url = f"{self.BASE_URL}/ElectricityProdex5MinRealtime"
        params = {
            "start": start_str,
            "end": end_str,
            "limit": 10000,
            "sort": "Minutes5UTC asc",
        }
        resp = requests.get(url, params=params, timeout=30)
        resp.raise_for_status()
        records = resp.json().get("records", [])

        area_buckets: dict[tuple[str, str], list[float]] = defaultdict(list)

        for row in records:
            m5 = row.get("Minutes5UTC")
            area = row.get("PriceArea")
            if not m5 or area not in ("DK1", "DK2"):
                continue
            ts = f"{m5[:13]}:00:00Z"

            wind_mw = float(row.get("OffshoreWindPower") or 0.0) + float(
                row.get("OnshoreWindPower") or 0.0
            )
            solar_mw = float(row.get("SolarPower") or 0.0)
            thermal_mw = float(row.get("ProductionGe100MW") or 0.0) + float(
                row.get("ProductionLt100MW") or 0.0
            )
            total_gen_mw = wind_mw + solar_mw + thermal_mw

            net_import_mw = (
                float(row.get("ExchangeGermany") or 0.0)
                + float(row.get("ExchangeNetherlands") or 0.0)
                + float(row.get("ExchangeGreatBritain") or 0.0)
                + float(row.get("ExchangeNorway") or 0.0)
                + float(row.get("ExchangeSweden") or 0.0)
                + float(row.get("BornholmSE4") or 0.0)
            )

            if metric_key == "dk_consumption":
                val = max(0.0, total_gen_mw + net_import_mw)
            elif metric_key == "dk_wind":
                val = wind_mw
            elif metric_key == "dk_solar":
                val = solar_mw
            else:
                val = 0.0

            area_buckets[(ts, area)].append(val)

        hourly_national: dict[str, float] = defaultdict(float)
        hourly_samples: dict[str, int] = defaultdict(int)

        for (ts, _area), vals in area_buckets.items():
            if vals:
                hourly_national[ts] += sum(vals) / len(vals)
                hourly_samples[ts] += len(vals)

        return [
            {
                "timestamp": ts,
                "value": round(hourly_national[ts], 2),
                "samples": hourly_samples[ts],
            }
            for ts in sorted(hourly_national.keys())
        ]

    def _fetch_co2(self, start_str: str, end_str: str) -> list[dict]:
        """Averages 5-minute DK1 & DK2 CO2 intensity (gCO2/kWh) into national hourly values."""
        url = f"{self.BASE_URL}/CO2Emis"
        params = {
            "start": start_str,
            "end": end_str,
            "limit": 10000,
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
