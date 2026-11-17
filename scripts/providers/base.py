from abc import ABC, abstractmethod
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any


class BaseProvider(ABC):
    """Abstract base class that all energy data source plugins must implement."""

    provider_name: str = "unknown"
    license: str = "Unknown"

    @abstractmethod
    def fetch_dataset(self, dataset_config: dict[str, Any], days_back: int = 7) -> dict[str, Any]:
        """Fetch raw data and return a standardized dataset payload."""
        raise NotImplementedError

    @staticmethod
    def aggregate_to_hourly(
        records: list[dict[str, Any]],
        time_key: str,
        value_key: str,
    ) -> list[dict[str, Any]]:
        """Standardizes sub-hourly or hourly records into clean hourly UTC buckets."""
        hourly_buckets = defaultdict(list)

        for row in records:
            raw_ts = row.get(time_key)
            val = row.get(value_key)
            if raw_ts and val is not None:
                hour_key = str(raw_ts)[:13] + ":00:00Z"
                hourly_buckets[hour_key].append(float(val))

        series = []
        for ts in sorted(hourly_buckets.keys()):
            vals = hourly_buckets[ts]
            series.append(
                {
                    "timestamp": ts,
                    "value": round(sum(vals) / len(vals), 2),
                    "samples": len(vals),
                }
            )
        return series

    def build_payload(
        self,
        dataset_config: dict[str, Any],
        hourly_series: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Wraps time-series data in a uniform contract for the frontend portal."""
        return {
            "metadata": {
                "slug": dataset_config["slug"],
                "title": dataset_config["title"],
                "provider": self.provider_name,
                "source_id": str(dataset_config["source_id"]),
                "unit": dataset_config["unit"],
                "category": dataset_config.get("category", "general"),
                "description": dataset_config.get("description", ""),
                "license": self.license,
                "resolution": "1h",
                "updated_at_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "record_count": len(hourly_series),
            },
            "data": hourly_series,
        }
