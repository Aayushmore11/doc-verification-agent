import json
import os
from datetime import datetime

LOG_FILE = os.path.join("logs", "change_log.json")


def _ensure_log_file():
    os.makedirs("logs", exist_ok=True)
    if not os.path.exists(LOG_FILE):
        with open(LOG_FILE, "w") as f:
            json.dump([], f)


def log_change(change_type: str, description: str, metadata: dict = None):
    """
    Appends a structured change/event log entry.

    change_type: short category, e.g. "file_modified", "bug_fix",
                 "endpoint_added", "test_run", "feature_added"
    description: human-readable summary of what happened
    metadata: any extra structured data (file names, function names,
              before/after values, etc.) - stays flexible, dict of anything
    """
    _ensure_log_file()

    entry = {
        "timestamp": datetime.now().isoformat(),
        "type": change_type,
        "description": description,
        "metadata": metadata or {}
    }

    with open(LOG_FILE, "r") as f:
        logs = json.load(f)

    logs.append(entry)

    with open(LOG_FILE, "w") as f:
        json.dump(logs, f, indent=2)

    return entry