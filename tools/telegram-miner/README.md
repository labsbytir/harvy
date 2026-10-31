# Telegram Miner

A rate-limit-aware Telethon scraper that mines **messages, threaded replies,
reactions, user bios, and cross-channel links** for a configured channel list.

Built for the VPS at `/opt/tgminer`, driven by the channel list derived from
[tgdataset](https://github.com/systemslab-sapienza/tgdataset).

## What it captures

| Data | Table | Notes |
|------|-------|-------|
| Channels | `channels` | username, title, description, subscribers, resume watermark |
| Messages | `messages` | `channel_id`, `message_id`, `sender_id`, text, media, forwards, `reply_to_msg_id` (thread parent), edit date |
| Threaded replies | `messages.thread_id` | resolved thread root; `GetRepliesRequest` fetches reply bodies |
| Reactions | `reactions` | emoji + **count**; `reactors` JSON only populated where Telegram exposes reactor ids (see limits below) |
| Users + bios | `users` | `user_id`, username, names, **`bio` (about)** |
| User → channel | `user_channel` | **the linking table**: which users appear in which channels, with counts + first/last seen |
| Channel → channel | `channel_links` | `forward` edges (from `forwarded_from_id`) and `shared_author` edges |

## Honest API limits (not workarounds)

* **Reaction reactor identities are admin-only for channels.** The Telegram API
  returns reaction *aggregates* (emoji + count) to everyone, but the list of
  user_ids who reacted is only returned to channel admins. `reactors` is filled
  only when Telegram hands it over (e.g. recent reactions / your own admin
  view). It is never fabricated.
* **Channel broadcast posts have `sender_id` = the channel**, not a person.
  Real individual `sender_id`s come from **linked discussion groups** (megagroups).
  Mine those too to populate `users` and `user_channel` meaningfully.
* **Bios (`about`)** require a `GetFullUser` per user; rate-limited internally.

## Rate limiting (avoiding bans)

* `flood_sleep_threshold=60` → Telethon auto-sleeps through FloodWait ≤ 60s.
* FloodWait > 60s is caught, slept exactly as requested, then the call retries.
* `request_delay_seconds` floor between bio lookups; `channel_pause_seconds`
  between channels; conservative per-message pacing.
* Idempotent UPSERTs + per-channel `mined_to_id` watermark → **resumable**;
  a restart never blindly re-scrapes.

## Credentials

Never in the repo. Set them in `/opt/tgminer/config.env` on the VPS:

```
TG_API_ID=...
TG_API_HASH=...
TG_PHONE=+...
MAX_MESSAGES_PER_CHANNEL=2000
```

## Files

* `config.py` – env/config loading
* `db.py` – SQLite schema + upserts
* `miner.py` – the scraper (Telethon client)
* `make_channels.py` – build `channels.txt` from the dataset preview
* `report.py` – query/export the mined DB

## Run

```bash
/opt/tgminer/venv/bin/python /opt/tgminer/miner.py          # all channels
/opt/tgminer/venv/bin/python /opt/tgminer/miner.py climagic # one channel
/opt/tgminer/venv/bin/python /opt/tgminer/report.py summary
/opt/tgminer/venv/bin/python /opt/tgminer/report.py user <channel_id>
/opt/tgminer/venv/bin/python /opt/tgminer/report.py user_channels <user_id>
/opt/tgminer/venv/bin/python /opt/tgminer/report.py export /opt/tgminer/export
```
