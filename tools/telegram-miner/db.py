"""SQLite persistence layer for the Telegram miner.

Design goals:
  * Idempotent / resumable (UPSERT on natural keys).
  * Preserve provenance (channel, message id, timestamps).
  * Explicit cross-channel link table built from forwards and shared authors.
"""
from __future__ import annotations

import sqlite3
from pathlib import Path

SCHEMA = """
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;

CREATE TABLE IF NOT EXISTS channels (
    channel_id      INTEGER PRIMARY KEY,
    username        TEXT,
    title           TEXT,
    description     TEXT,
    is_megagroup    INTEGER,
    is_broadcast    INTEGER,
    participants    INTEGER,
    first_seen_at   TEXT DEFAULT (datetime('now')),
    mined_to_id     INTEGER DEFAULT 0,     -- resume watermark: highest msg id already mined
    error           TEXT
);

CREATE TABLE IF NOT EXISTS messages (
    channel_id      INTEGER NOT NULL,
    message_id      INTEGER NOT NULL,
    date            TEXT,
    sender_id       INTEGER,               -- author (channel id for broadcasts, user id in groups)
    reply_to_msg_id INTEGER,               -- threaded reply parent
    thread_id       INTEGER,               -- replies/reply_to_msg_id resolved thread root
    text            TEXT,
    has_media       INTEGER,
    media_type      INTEGER,
    is_forward      INTEGER,
    forward_from_id INTEGER,               -- original channel/user the content came from
    forward_from_name TEXT,
    forward_date    TEXT,
    edit_date       TEXT,
    group_id        TEXT,                  -- grouped/albums
    PRIMARY KEY (channel_id, message_id)
);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_fwd    ON messages(forward_from_id);

CREATE TABLE IF NOT EXISTS reactions (
    channel_id   INTEGER NOT NULL,
    message_id   INTEGER NOT NULL,
    reaction     TEXT NOT NULL,            -- emoji or custom reaction
    count        INTEGER,
    -- reactor ids are only present for recent/admin-visible reactions; may be empty.
    reactors     TEXT,                     -- JSON array of user ids
    PRIMARY KEY (channel_id, message_id, reaction)
);

-- Users encountered as senders / reactors / bios. This is where user_id + bio live.
CREATE TABLE IF NOT EXISTS users (
    user_id      INTEGER PRIMARY KEY,
    username     TEXT,
    first_name   TEXT,
    last_name    TEXT,
    phone        TEXT,
    bio          TEXT,                     -- "about" text
    is_bot       INTEGER,
    is_scam      INTEGER,
    is_fake      INTEGER,
    mutual_contacts TEXT,                  -- JSON array
    updated_at   TEXT DEFAULT (datetime('now'))
);

-- The user's core requirement: link a user to the channels they appear in.
CREATE TABLE IF NOT EXISTS user_channel (
    user_id      INTEGER NOT NULL,
    channel_id   INTEGER NOT NULL,
    first_msg_id INTEGER,
    msg_count    INTEGER,
    last_seen    TEXT,
    PRIMARY KEY (user_id, channel_id)
);

-- Direct channel->channel edges derived from forwarded_from_id.
CREATE TABLE IF NOT EXISTS channel_links (
    from_channel INTEGER NOT NULL,
    to_channel   INTEGER NOT NULL,
    evidence     TEXT,                     -- 'forward' | 'shared_author'
    weight       INTEGER DEFAULT 1,
    PRIMARY KEY (from_channel, to_channel, evidence)
);
"""


def connect(db_path: Path | str) -> sqlite3.Connection:
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(str(db_path))
    con.executescript(SCHEMA)
    return con


def upsert_channel(con: sqlite3.Connection, **kw) -> None:
    con.execute(
        """
        INSERT INTO channels (channel_id, username, title, description,
                              is_megagroup, is_broadcast, participants)
        VALUES (:channel_id,:username,:title,:description,
                :is_megagroup,:is_broadcast,:participants)
        ON CONFLICT(channel_id) DO UPDATE SET
            username=COALESCE(excluded.username, channels.username),
            title=COALESCE(excluded.title, channels.title),
            description=COALESCE(excluded.description, channels.description),
            is_megagroup=COALESCE(excluded.is_megagroup, channels.is_megagroup),
            is_broadcast=COALESCE(excluded.is_broadcast, channels.is_broadcast),
            participants=COALESCE(excluded.participants, channels.participants)
        """,
        kw,
    )


def set_watermark(con: sqlite3.Connection, channel_id: int, mined_to_id: int) -> None:
    con.execute(
        "UPDATE channels SET mined_to_id=? WHERE channel_id=?", (mined_to_id, channel_id)
    )


def upsert_message(con: sqlite3.Connection, **kw) -> None:
    con.execute(
        """
        INSERT INTO messages (channel_id, message_id, date, sender_id, reply_to_msg_id,
                              thread_id, text, has_media, media_type, is_forward,
                              forward_from_id, forward_from_name, forward_date,
                              edit_date, group_id)
        VALUES (:channel_id,:message_id,:date,:sender_id,:reply_to_msg_id,
                :thread_id,:text,:has_media,:media_type,:is_forward,
                :forward_from_id,:forward_from_name,:forward_date,
                :edit_date,:group_id)
        ON CONFLICT(channel_id, message_id) DO UPDATE SET
            text=excluded.text, reply_to_msg_id=excluded.reply_to_msg_id,
            thread_id=excluded.thread_id, forward_from_id=excluded.forward_from_id
        """,
        kw,
    )


def upsert_reaction(con, channel_id, message_id, reaction, count, reactors_json):
    con.execute(
        """
        INSERT INTO reactions (channel_id, message_id, reaction, count, reactors)
        VALUES (?,?,?,?,?)
        ON CONFLICT(channel_id, message_id, reaction) DO UPDATE SET
            count=excluded.count, reactors=excluded.reactors
        """,
        (channel_id, message_id, reaction, count, reactors_json),
    )


def upsert_user(con, **kw):
    con.execute(
        """
        INSERT INTO users (user_id, username, first_name, last_name, phone, bio,
                           is_bot, is_scam, is_fake, mutual_contacts, updated_at)
        VALUES (:user_id,:username,:first_name,:last_name,:phone,:bio,
                :is_bot,:is_scam,:is_fake,:mutual_contacts, datetime('now'))
        ON CONFLICT(user_id) DO UPDATE SET
            username=COALESCE(excluded.username, users.username),
            first_name=COALESCE(excluded.first_name, users.first_name),
            last_name=COALESCE(excluded.last_name, users.last_name),
            bio=COALESCE(excluded.bio, users.bio),
            is_bot=COALESCE(excluded.is_bot, users.is_bot),
            updated_at=datetime('now')
        """,
        kw,
    )


def bump_user_channel(con, user_id, channel_id, msg_id, date):
    """Increment the user<->channel edge, tracking first/last appearance."""
    con.execute(
        """
        INSERT INTO user_channel (user_id, channel_id, first_msg_id, msg_count, last_seen)
        VALUES (?, ?, ?, 1, ?)
        ON CONFLICT(user_id, channel_id) DO UPDATE SET
            msg_count = msg_count + 1,
            first_msg_id = MIN(first_msg_id, excluded.first_msg_id),
            last_seen = excluded.last_seen
        """,
        (user_id, channel_id, msg_id, date),
    )


def add_channel_link(con, from_channel, to_channel, evidence, weight=1):
    if from_channel is None or to_channel is None or from_channel == to_channel:
        return
    con.execute(
        """
        INSERT INTO channel_links (from_channel, to_channel, evidence, weight)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(from_channel, to_channel, evidence) DO UPDATE SET
            weight = channel_links.weight + excluded.weight
        """,
        (from_channel, to_channel, evidence, weight),
    )
