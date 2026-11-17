import os
import time
from datetime import datetime, timedelta, timezone
from typing import Any
import requests
from .base import BaseProvider


class FingridProvider(BaseProvider):
    """
    Data provider plugin for Fingrid Open Data API (v2).
    Fetches grid telemetry (consumption, wind, nuclear) and standardizes
    sub-hourly intervals (3-min or 15-min) into clean hourly averages.
    """

    provider_name = "Fingrid Open Data"
    license = "CC BY 4.0"
    BASE_URL = "https://data.fingrid.fi/api/datasets/{dataset_id}/data"

    def __init__(self) -> None:
        # Read API key from environment variable (set via WSL export or GitHub Secrets)
        self.api_key = os.environ.get("FINGRID_API_KEY")
        if not self.api_key:
            raise ValueError("Missing FINGRID_API_KEY environment variable.")

    def _get_with_retry(
        self, url: str, headers: dict[str, str], params: dict[str, Any], max_retries: int = 3
    ) -> dict[str, Any]:
        """
        Executes an HTTP GET request and automatically backs off if Fingrid
        returns HTTP 429 (rate limit: max 1 request per 2 seconds).
        """
        for attempt in range(1, max_retries + 1):
            response = requests.get(url, headers=headers, params=params, timeout=30)

            if response.status_code == 429:
                # Honor Retry-After header if provided, otherwise wait 3 seconds
                wait_seconds = int(response.headers.get("Retry-After", 3))
                print(f"  [Rate Limit 429] Waiting {wait_seconds}s before retry ({attempt}/{max_retries})...")
                time.sleep(wait_seconds)
                continue

            # Raise an exception for any other HTTP error (401 Unauthorized, 404, 500, etc.)
            response.raise_for_status()
            return response.json()

        raise RuntimeError(f"Failed to fetch {url} after {max_retries} retries due to rate limiting.")

    def fetch_dataset(self, dataset_config: dict[str, Any], days_back: int = 7) -> dict[str, Any]:
        """
        Queries a single Fingrid dataset ID for the trailing `days_back` days
        and returns a standardized JSON payload ready for the frontend portal.
        """
        dataset_id = dataset_config["source_id"]

        # Define UTC time window: [now - days_back, now]
        end_time = datetime.now(timezone.utc)
        start_time = end_time - timedelta(days=days_back)

        url = self.BASE_URL.format(dataset_id=dataset_id)
        headers = {
            "x-api-key": self.api_key,
            "Accept": "application/json",
        }
        params = {
            "startTime": start_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "endTime": end_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "format": "json",
            # 10,000 rows covers >20 days of 3-minute data (480 rows/day * 7 days = 3,360 rows)
            "pageSize": 10000,
            "sortOrder": "asc",
        }

        payload = self._get_with_retry(url, headers, params)
        raw_records = payload.get("data", [])

        # Group 3-minute / 15-minute readings into hourly UTC buckets
        hourly_series = self.aggregate_to_hourly(
            records=raw_records,
            time_key="startTime",
            value_key="value",
        )

        # Wrap series with standard metadata for catalog.json and React charts
        return self.build_payload(dataset_config, hourly_series)
