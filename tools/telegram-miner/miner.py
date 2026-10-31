"""Telegram miner: messages, threaded replies, reactions, bios, cross-channel links.

Rate-limit strategy (so we don't get banned):
  * Telethon's flood_sleep_threshold set high -> it auto-sleeps on FloodWait <= 60s.
  * Hard catch for FloodWaitError > threshold -> sleep the exact requested seconds, then resume.
  * A floor request_delay between heavyweight lookups (user bios).
  * channel_pause_seconds sleep between channels.
  * Conservative max_messages_per_channel default.
  * Idempotent UPSERTs + a per-channel watermark so a crash resumes, never re-scrapes blindly.

Usage:
  python miner.py                 # mine everything in channels.txt
  python miner.py climagic        # mine just one
"""
from __future__ import annotations

import asyncio
import json
import sys
import time
from datetime import datetime, timezone

from telethon import TelegramClient
from telethon.errors import (
    FloodWaitError,
    ChannelPrivateError,
    ChatAdminRequiredError,
    UsernameNotOccupiedError,
    UsernameInvalidError,
)
from telethon.tl.functions.messages import GetRepliesRequest
from telethon.tl.functions.users import GetFullUserRequest
from telethon.tl.types import (
    MessageReactions,
    ReactionCount,
    PeerChannel,
    PeerUser,
)

import db
from config import Config


def iso(dt) -> str | None:
    return dt.isoformat() if dt else None


def ts() -> str:
    return datetime.now(timezone.utc).strftime("%H:%M:%S")


def log(msg: str) -> None:
    print(f"[{ts()}] {msg}", flush=True)


class Miner:
    def __init__(self, cfg: Config, client: TelegramClient, con):
        self.cfg = cfg
        self.client = client
        self.con = con
        self._user_cache: dict[int, dict] = {}
        self._full_user_fetched: set[int] = set()

    # ---- flood-safe wrapper -------------------------------------------------
    async def call(self, coro):
        """Run a Telethon call, sleeping through FloodWait and retrying once."""
        try:
            return await coro
        except FloodWaitError as e:
            wait = e.seconds + 1
            if wait > self.cfg.flood_sleep_threshold:
                log(f"  ! FloodWait {wait}s requested -> sleeping then retrying")
            await asyncio.sleep(wait)
            return await coro

    # ---- user / bio resolution ---------------------------------------------
    async def resolve_user(self, user_id: int | None) -> None:
        """Cache + persist basic user info; optionally fetch full profile (bio)."""
        if user_id is None or user_id in self._user_cache:
            return
        try:
            user = await self.call(self.client.get_entity(PeerUser(user_id)))
        except Exception:
            self._user_cache[user_id] = {}
            return

        rec = {
            "user_id": user_id,
            "username": getattr(user, "username", None),
            "first_name": getattr(user, "first_name", None),
            "last_name": getattr(user, "last_name", None),
            "phone": getattr(user, "phone", None),
            "is_bot": int(bool(getattr(user, "bot", False))),
            "is_scam": int(bool(getattr(user, "scam", False))),
            "is_fake": int(bool(getattr(user, "fake", False))),
            "bio": None,
            "mutual_contacts": "[]",
        }

        # Full profile -> the "about"/bio. Only worth doing once per user.
        if self.cfg.fetch_bios and user_id not in self._full_user_fetched:
            try:
                full = await self.call(self.client(GetFullUserRequest(user_id)))
                full_user = full.full_user
                rec["bio"] = getattr(full_user, "about", None)
                mutual = getattr(full_user, "mutual_contacts", None) or []
                rec["mutual_contacts"] = json.dumps(
                    [m.user_id for m in mutual if hasattr(m, "user_id")]
                )
            except (ChatAdminRequiredError, ValueError):
                pass
            except Exception:
                pass
            self._full_user_fetched.add(user_id)
            # Floor delay between full-profile lookups.
            await asyncio.sleep(self.cfg.request_delay_seconds)

        self._user_cache[user_id] = rec
        db.upsert_user(self.con, **rec)

    # ---- reactions ----------------------------------------------------------
    async def store_reactions(self, message, channel_id: int) -> None:
        if not self.cfg.fetch_reactions:
            return
        reactions: MessageReactions | None = getattr(message, "reactions", None)
        if not reactions or not getattr(reactions, "reactions", None):
            return
        for rc in reactions.reactions:
            if not isinstance(rc, ReactionCount):
                continue
            reaction = rc.reaction
            # Reaction can be ReactionEmoji(emoticon) or ReactionCustomEmoji(document_id)
            label = getattr(reaction, "emoticon", None) or getattr(
                reaction, "document_id", None
            )
            if label is None:
                label = str(reaction)
            reactors = []
            for recent in getattr(rc, "recent_reactions", None) or []:
                peer = getattr(recent, "peer", None)
                rid = getattr(peer, "user_id", None)
                if rid:
                    reactors.append(rid)
            db.upsert_reaction(
                self.con, channel_id, message.id, str(label), rc.count,
                json.dumps(reactors),
            )

    # ---- threads ------------------------------------------------------------
    async def store_thread_replies(self, channel, root_msg_id: int, channel_id: int):
        """Fetch threaded replies under a root message (for groups w/ reply threads).

        Telegram exposes this via GetRepliesRequest. Best-effort; skip on errors.
        """
        try:
            replies = await self.call(
                GetRepliesRequest(
                    peer=channel, msg_id=root_msg_id, offset_id=0, offset_date=None,
                    add_offset=0, limit=100, max_id=0, hash=0,
                )
            )
        except Exception:
            return
        for m in getattr(replies, "messages", None) or []:
            if m is None or not getattr(m, "id", None):
                continue
            sender = None
            if getattr(m, "from_id", None) is not None:
                sender = _peer_id(m.from_id)
            db.upsert_message(
                self.con,
                channel_id=channel_id,
                message_id=m.id,
                date=iso(m.date),
                sender_id=sender,
                reply_to_msg_id=getattr(m, "reply_to_msg_id", None),
                thread_id=root_msg_id,
                text=getattr(m, "message", None),
                has_media=int(bool(getattr(m, "media", None))),
                media_type=type(getattr(m, "media", None)).__name__ if getattr(m, "media", None) else None,
                is_forward=int(bool(getattr(m, "fwd_from", None))),
                forward_from_id=None,
                forward_from_name=None,
                forward_date=None,
                edit_date=iso(getattr(m, "edit_date", None)),
                group_id=str(getattr(m, "grouped_id", "")) or None,
            )

    # ---- one channel --------------------------------------------------------
    async def mine_channel(self, ref: str) -> None:
        log(f"Channel: {ref}")
        try:
            entity = await self.call(self.client.get_entity(ref))
        except (
            ChannelPrivateError, UsernameNotOccupiedError,
            UsernameInvalidError, ValueError,
        ) as e:
            log(f"  ! cannot access {ref}: {type(e).__name__}")
            self.con.execute(
                "INSERT OR REPLACE INTO channels (channel_id, username, error) "
                "VALUES (?, ?, ?)",
                (abs(hash(ref)) % (10**12), ref, type(e).__name__),
            )
            self.con.commit()
            return

        channel_id = entity.id
        db.upsert_channel(
            self.con,
            channel_id=channel_id,
            username=getattr(entity, "username", None),
            title=getattr(entity, "title", None),
            description=getattr(entity, "about", None) or getattr(entity, "description", None),
            is_megagroup=int(bool(getattr(entity, "megagroup", False))),
            is_broadcast=int(bool(getattr(entity, "broadcast", False))),
            participants=getattr(entity, "participants_count", None),
        )
        self.con.commit()

        # Resume watermark
        row = self.con.execute(
            "SELECT mined_to_id FROM channels WHERE channel_id=?", (channel_id,)
        ).fetchone()
        watermark = row[0] if row and row[0] else 0

        count = 0
        max_id = watermark or 0  # mine only newer than what we already have
        try:
            async for m in self.client.iter_messages(
                entity, limit=self.cfg.max_messages_per_channel, reverse=True,
                min_id=watermark,
            ):
                sender = _peer_id(getattr(m, "from_id", None))
                fwd = getattr(m, "fwd_from", None)
                fwd_from_id = _peer_id(getattr(fwd, "from_id", None)) if fwd else None
                fwd_name = None
                if fwd:
                    fwd_name = getattr(fwd, "from_name", None) or _channel_post_author(fwd)

                db.upsert_message(
                    self.con,
                    channel_id=channel_id,
                    message_id=m.id,
                    date=iso(m.date),
                    sender_id=sender,
                    reply_to_msg_id=getattr(m, "reply_to_msg_id", None),
                    thread_id=getattr(m, "reply_to_msg_id", None) or m.id,
                    text=getattr(m, "message", None),
                    has_media=int(bool(getattr(m, "media", None))),
                    media_type=type(getattr(m, "media", None)).__name__ if getattr(m, "media", None) else None,
                    is_forward=int(bool(fwd)),
                    forward_from_id=fwd_from_id,
                    forward_from_name=fwd_name,
                    forward_date=iso(getattr(fwd, "date", None)) if fwd else None,
                    edit_date=iso(getattr(m, "edit_date", None)),
                    group_id=str(getattr(m, "grouped_id", "")) or None,
                )

                # user -> channel edge (the linking requirement)
                if sender:
                    db.bump_user_channel(self.con, sender, channel_id, m.id, iso(m.date))

                # cross-channel edge from forwards
                if fwd_from_id and fwd_from_id != channel_id:
                    db.add_channel_link(self.con, fwd_from_id, channel_id, "forward")

                # resolve sender bio (cached; rate-limited inside)
                if sender:
                    await self.resolve_user(sender)

                await self.store_reactions(m, channel_id)

                count += 1
                max_id = max(max_id, m.id)
                if count % 100 == 0:
                    self.con.commit()
                    log(f"  ...{count} msgs")

                if self.cfg.channel_pause_seconds:
                    await asyncio.sleep(0.05)  # gentle per-msg pacing

        except FloodWaitError as e:
            log(f"  ! FloodWait {e.seconds}s mid-channel -> sleeping")
            await asyncio.sleep(e.seconds + 1)
        finally:
            db.set_watermark(self.con, channel_id, max_id)
            self.con.commit()
            log(f"  done: {count} messages (watermark={max_id})")


def _peer_id(peer) -> int | None:
    """Extract a numeric id from a Peer* object or return None."""
    if peer is None:
        return None
    for attr in ("user_id", "channel_id", "chat_id"):
        v = getattr(peer, attr, None)
        if isinstance(v, int):
            return v
    return None


def _channel_post_author(fwd) -> str | None:
    # forwarded_from_name / channel_post / via_bot_id fallbacks
    return getattr(fwd, "channel_post", None) and None or getattr(fwd, "post_author", None)


def load_channels(path) -> list[str]:
    from pathlib import Path

    p = Path(path)
    if not p.exists():
        raise SystemExit(f"channels file not found: {p}")
    out = []
    for line in p.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            out.append(line.lstrip("@"))
    return out


async def main() -> None:
    cfg = Config.load()
    only = sys.argv[1:] or None
    channels = load_channels(cfg.channels_file)
    if only:
        channels = [c for c in channels if c in only] or channels

    con = db.connect(cfg.db_path)
    client = TelegramClient(
        "/opt/tgminer/session",
        cfg.api_id,
        cfg.api_hash,
        flood_sleep_threshold=cfg.flood_sleep_threshold,
    )
    await client.start(phone=cfg.phone)
    me = await client.get_me()
    log(f"Logged in as {me.first_name} (id={me.id})")

    miner = Miner(cfg, client, con)
    log(f"Mining {len(channels)} channels; max {cfg.max_messages_per_channel} msgs each")

    for ref in channels:
        try:
            await miner.mine_channel(ref)
        except FloodWaitError as e:
            log(f"  !! FloodWait {e.seconds}s on {ref}; sleeping")
            await asyncio.sleep(e.seconds + 1)
        except Exception as e:  # keep going across channels
            log(f"  !! error on {ref}: {type(e).__name__}: {e}")
        # cross-channel: shared-author edges built after first pass
        if cfg.channel_pause_seconds:
            await asyncio.sleep(cfg.channel_pause_seconds)

    build_shared_author_links(con)
    con.commit()
    con.close()
    await client.disconnect()
    log("All channels processed.")


def build_shared_author_links(con) -> None:
    """If a user posts in two channels, that's a soft link between those channels."""
    con.execute(
        """
        INSERT OR IGNORE INTO channel_links (from_channel, to_channel, evidence, weight)
        SELECT a.channel_id, b.channel_id, 'shared_author', COUNT(*)
        FROM user_channel a
        JOIN user_channel b
          ON a.user_id = b.user_id AND a.channel_id < b.channel_id
        GROUP BY a.channel_id, b.channel_id
        """
    )


if __name__ == "__main__":
    start = time.time()
    asyncio.run(main())
    log(f"Elapsed {time.time() - start:.1f}s")
