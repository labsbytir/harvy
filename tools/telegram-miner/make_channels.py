#!/usr/bin/env python3
"""Generate channels.txt from the tgdataset preview JSON (or any channel list).

Usage:
  python make_channels.py preview.json channels.txt
The preview is keyed by channel_id -> {'username': ...}. Channels without a
public username are skipped (Telethon needs a joinable ref). Also merges any
extra handles you drop into channels_extra.txt.
"""
import json
import sys
from pathlib import Path


def main() -> None:
    src = sys.argv[1] if len(sys.argv) > 1 else "/opt/tgminer/data/preview.json"
    dst = sys.argv[2] if len(sys.argv) > 2 else "/opt/tgminer/channels.txt"
    data = json.load(open(src))

    handles: list[str] = []
    for cid, info in data.items():
        if isinstance(info, dict):
            u = info.get("username")
        else:
            u = None
        if u and isinstance(u, str) and u.strip():
            handles.append(u.strip().lstrip("@"))

    # Preserve order, dedupe.
    seen, ordered = set(), []
    for h in handles:
        hl = h.lower()
        if hl not in seen:
            seen.add(hl)
            ordered.append(h)

    # Merge any manual extras.
    extra = Path(dst).with_name("channels_extra.txt")
    if extra.exists():
        for line in extra.read_text().splitlines():
            line = line.strip().lstrip("@")
            if line and not line.startswith("#") and line.lower() not in seen:
                seen.add(line.lower())
                ordered.append(line)

    Path(dst).write_text("\n".join(ordered) + "\n")
    print(f"Wrote {len(ordered)} channels -> {dst}")


if __name__ == "__main__":
    main()
