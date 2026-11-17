from typing import Any
import requests
from .base import BaseProvider


class OpenMeteoProvider(BaseProvider):
    provider_name = "Open-Meteo Weather API"
    license = "CC BY 4.0"
    BASE_URL = "https://api.open-meteo.com/v1/forecast"

    def fetch_dataset(self, dataset_config: dict[str, Any], days_back: int = 7) -> dict[str, Any]:
        variable = dataset_config["source_id"]
        locations: list[dict[str, Any]] = dataset_config["locations"]

        lats = ",".join(str(loc["lat"]) for loc in locations)
        lons = ",".join(str(loc["lon"]) for loc in locations)

        params = {
            "latitude": lats,
            "longitude": lons,
            "hourly": variable,
            "past_days": days_back,
            "forecast_days": dataset_config.get("forecast_days", 2),
            "wind_speed_unit": "ms",
            "timezone": "UTC",
        }

        response = requests.get(self.BASE_URL, params=params, timeout=30)
        response.raise_for_status()
        raw_json = response.json()

        # Open-Meteo returns a dict for 1 location, or a list of dicts for multiple locations
        location_blocks = raw_json if isinstance(raw_json, list) else [raw_json]

        # Map timestamp -> { city_slug: value }
        by_timestamp: dict[str, dict[str, float]] = {}

        for loc_meta, block in zip(locations, location_blocks):
            city_key = loc_meta["key"]
            hourly = block.get("hourly", {})
            times = hourly.get("time", [])
            values = hourly.get(variable, [])

            for t, v in zip(times, values):
                if v is None:
                    continue
                ts = f"{t}:00Z"
                by_timestamp.setdefault(ts, {})[city_key] = round(float(v), 2)

        hourly_series = []
        for ts in sorted(by_timestamp.keys()):
            city_vals = by_timestamp[ts]
            mean_val = round(sum(city_vals.values()) / len(city_vals), 2)
            hourly_series.append(
                {
                    "timestamp": ts,
                    "value": mean_val,
                    "samples": len(city_vals),
                    "by_city": city_vals,
                }
            )

        payload = self.build_payload(dataset_config, hourly_series)
        payload["metadata"]["locations"] = locations
        return payload
