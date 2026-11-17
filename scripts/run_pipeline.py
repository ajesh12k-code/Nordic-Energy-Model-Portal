import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from providers.base import BaseProvider
from providers.fingrid import FingridProvider
from providers.open_meteo import OpenMeteoProvider

# Paths relative to the repository root
CONFIG_PATH = Path("scripts/datasets_config.json")
OUTPUT_DIR = Path("public/data")


def get_provider_registry() -> dict[str, BaseProvider]:
    """
    Maps provider keys used in datasets_config.json to their Python plugin classes.
    To add a new data source in the future (e.g., ENTSO-E), create a new provider
    class inheriting from BaseProvider and register its key here.
    """
    return {
        "fingrid": FingridProvider(),
        "open_meteo": OpenMeteoProvider(),
    }


def main() -> None:
    # 1. Load dataset definitions and global lookback window
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    days_back = config.get("days_back", 7)
    datasets = config.get("datasets", [])

    # 2. Initialize all registered data source plugins
    providers = get_provider_registry()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    catalog_entries: list[dict[str, Any]] = []

    # 3. Iterate through each configured dataset, fetch data, and write individual JSON files
    for idx, ds in enumerate(datasets):
        provider_key = ds["provider"]
        provider = providers.get(provider_key)

        if not provider:
            print(f"[WARN] Unknown provider '{provider_key}' for {ds['slug']}, skipping.")
            continue

        print(f"Fetching [{ds['slug']}] via {provider.provider_name}...")
        payload = provider.fetch_dataset(ds, days_back=days_back)

        # Save dataset JSON directly to public/data/ so the frontend can fetch it statically
        out_file = OUTPUT_DIR / f"{ds['slug']}.json"
        out_file.write_text(json.dumps(payload, indent=2), encoding="utf-8")

        # Record dataset metadata for the master catalog manifest
        catalog_entries.append(
            {
                **payload["metadata"],
                "file_path": f"data/{ds['slug']}.json",
            }
        )
        print(f"  -> Saved {payload['metadata']['record_count']} hourly points to {out_file}")

        # Respect Fingrid's 1-request-per-2-seconds rate limit between calls
        if idx < len(datasets) - 1:
            time.sleep(2.5)

    # 4. Generate master catalog.json so the React portal auto-discovers all datasets
    catalog = {
        "generated_at_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "dataset_count": len(catalog_entries),
        "datasets": catalog_entries,
    }
    catalog_path = OUTPUT_DIR / "catalog.json"
    catalog_path.write_text(json.dumps(catalog, indent=2), encoding="utf-8")
    print(f"Updated master catalog at {catalog_path}")


if __name__ == "__main__":
    main()
