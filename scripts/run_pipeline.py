"""
Modular ingestion runner that iterates over scripts/datasets_config.json,
dispatches to provider plugins (Fingrid, Energinet, Open-Meteo), and writes
standardized JSON payloads + catalog.json into public/data/.
"""
import json
from datetime import datetime, timezone
from pathlib import Path

from providers.fingrid import FingridProvider
from providers.open_meteo import OpenMeteoProvider
from providers.energinet import EnerginetProvider

ROOT_DIR = Path(__file__).resolve().parent.parent
CONFIG_PATH = ROOT_DIR / "scripts" / "datasets_config.json"
OUTPUT_DIR = ROOT_DIR / "public" / "data"


def main() -> None:
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        config = json.load(f)

    days_back = int(config.get("days_back", 7))
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # FingridProvider reads FINGRID_API_KEY directly from environment variables
    providers = {
        "fingrid": FingridProvider(),
        "open_meteo": OpenMeteoProvider(),
        "energinet": EnerginetProvider(),
    }

    catalog_entries = []

    for ds in config.get("datasets", []):
        provider_name = ds["provider"]
        provider = providers.get(provider_name)
        if not provider:
            raise ValueError(f"Unsupported provider: {provider_name}")

        print(f"Fetching [{ds['slug']}] via {provider_name}...")
        payload = provider.fetch_dataset(ds, days_back=days_back)

        out_file = OUTPUT_DIR / f"{ds['slug']}.json"
        with open(out_file, "w", encoding="utf-8") as out_f:
            json.dump(payload, out_f, indent=2)

        catalog_entries.append(payload["metadata"])

    catalog = {
        "generated_at_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "dataset_count": len(catalog_entries),
        "datasets": catalog_entries,
    }

    with open(OUTPUT_DIR / "catalog.json", "w", encoding="utf-8") as cat_f:
        json.dump(catalog, cat_f, indent=2)

    print(f"Successfully generated {len(catalog_entries)} datasets in {OUTPUT_DIR}.")


if __name__ == "__main__":
    main()
