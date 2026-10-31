"""Configuration loader for the Telegram miner.

Credentials are NEVER hardcoded. They are read from the environment or from a
config file that lives OUTSIDE the repository (on the VPS: /opt/tgminer/config.env).
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path


def _load_dotenv(path: Path) -> None:
    """Tiny .env reader so we don't need python-dotenv as a dependency."""
    if not path.exists():
        return
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        # Do not clobber variables already set in the real environment.
        os.environ.setdefault(key, value)


@dataclass
class Config:
    api_id: int
    api_hash: str
    phone: str
    # Per-run limits / rate control
    max_messages_per_channel: int = 2000
    channel_pause_seconds: float = 3.0       # pause between channels
    flood_sleep_threshold: int = 60          # let Telethon auto-sleep <= this many seconds
    request_delay_seconds: float = 0.35      # floor delay between heavy calls (user lookups)
    fetch_bios: bool = True
    fetch_reactions: bool = True
    # Paths
    workdir: Path = field(default_factory=lambda: Path("/opt/tgminer"))
    channels_file: Path = field(
        default_factory=lambda: Path("/opt/tgminer/channels.txt")
    )
    db_path: Path = field(default_factory=lambda: Path("/opt/tgminer/miner.sqlite3"))

    @classmethod
    def load(cls, env_file: str | os.PathLike = "/opt/tgminer/config.env") -> "Config":
        _load_dotenv(Path(env_file))
        api_id = os.environ.get("TG_API_ID")
        api_hash = os.environ.get("TG_API_HASH")
        phone = os.environ.get("TG_PHONE")
        missing = [
            name
            for name, val in (
                ("TG_API_ID", api_id),
                ("TG_API_HASH", api_hash),
                ("TG_PHONE", phone),
            )
            if not val
        ]
        if missing:
            raise SystemExit(
                "Missing required credentials: "
                + ", ".join(missing)
                + f". Set them in {env_file} or the environment."
            )
        cfg = cls(api_id=int(api_id), api_hash=api_hash, phone=phone)
        # Optional overrides
        cfg.max_messages_per_channel = int(
            os.environ.get("MAX_MESSAGES_PER_CHANNEL", cfg.max_messages_per_channel)
        )
        cfg.channel_pause_seconds = float(
            os.environ.get("CHANNEL_PAUSE_SECONDS", cfg.channel_pause_seconds)
        )
        cfg.fetch_bios = os.environ.get("FETCH_BIOS", "1") not in ("0", "false", "no")
        cfg.fetch_reactions = os.environ.get("FETCH_REACTIONS", "1") not in (
            "0",
            "false",
            "no",
        )
        cf = os.environ.get("CHANNELS_FILE")
        if cf:
            cfg.channels_file = Path(cf)
        db = os.environ.get("DB_PATH")
        if db:
            cfg.db_path = Path(db)
        return cfg
