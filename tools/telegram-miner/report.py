#!/usr/bin/env python3
"""Report queries over the mined SQLite DB.

Usage:
  python report.py summary
  python report.py user CHANNEL_ID        # users active in a channel (with bios)
  python report.py user_channels USER_ID  # which channels a user appears in
  python report.py links CHANNEL_ID       # cross-channel links from/to a channel
  python report.py reactions CHANNEL_ID
  python report.py export DIR             # dump CSVs for analysis
"""
import csv
import sqlite3
import sys
from pathlib import Path

DB = Path("/opt/tgminer/miner.sqlite3")


def rows(con, sql, args=()):
    cur = con.execute(sql, args)
    cols = [d[0] for d in cur.description]
    return cols, cur.fetchall()


def ptable(cols, data):
    if not data:
        print("(no rows)")
        return
    widths = [max(len(str(c)), *(len(str(r[i])) for r in data)) for i, c in enumerate(cols)]
    print("  ".join(str(c).ljust(widths[i]) for i, c in enumerate(cols)))
    print("  ".join("-" * w for w in widths))
    for r in data:
        print("  ".join(str("" if v is None else v).ljust(widths[i]) for i, v in enumerate(r)))


def main():
    con = sqlite3.connect(str(DB))
    cmd = sys.argv[1] if len(sys.argv) > 1 else "summary"
    arg = sys.argv[2] if len(sys.argv) > 2 else None

    if cmd == "summary":
        for label, sql in [
            ("channels", "SELECT COUNT(*) FROM channels"),
            ("messages", "SELECT COUNT(*) FROM messages"),
            ("users", "SELECT COUNT(*) FROM users"),
            ("users_with_bio", "SELECT COUNT(*) FROM users WHERE bio IS NOT NULL"),
            ("user_channel_edges", "SELECT COUNT(*) FROM user_channel"),
            ("reactions", "SELECT COUNT(*) FROM reactions"),
            ("channel_links", "SELECT COUNT(*) FROM channel_links"),
        ]:
            print(f"{label:22} {con.execute(sql).fetchone()[0]}")

    elif cmd == "user":
        c, d = rows(con, """
            SELECT u.user_id, u.username, u.first_name, u.last_name, u.bio,
                   uc.msg_count
            FROM user_channel uc JOIN users u ON u.user_id = uc.user_id
            WHERE uc.channel_id=? ORDER BY uc.msg_count DESC LIMIT 50
        """, (int(arg),))
        ptable(c, d)

    elif cmd == "user_channels":
        c, d = rows(con, """
            SELECT ch.username, ch.title, uc.msg_count, uc.first_seen, uc.last_seen
            FROM user_channel uc LEFT JOIN channels ch ON ch.channel_id=uc.channel_id
            WHERE uc.user_id=? ORDER BY uc.msg_count DESC
        """, (int(arg),))
        ptable(c, d)

    elif cmd == "links":
        c, d = rows(con, """
            SELECT l.from_channel, cf.username, l.to_channel, ct.username,
                   l.evidence, l.weight
            FROM channel_links l
            LEFT JOIN channels cf ON cf.channel_id=l.from_channel
            LEFT JOIN channels ct ON ct.channel_id=l.to_channel
            WHERE l.from_channel=? OR l.to_channel=?
            ORDER BY l.weight DESC LIMIT 50
        """, (int(arg), int(arg)))
        ptable(c, d)

    elif cmd == "reactions":
        c, d = rows(con, """
            SELECT message_id, reaction, count, reactors
            FROM reactions WHERE channel_id=? ORDER BY count DESC LIMIT 50
        """, (int(arg),))
        ptable(c, d)

    elif cmd == "export":
        out = Path(arg or "/opt/tgminer/export")
        out.mkdir(parents=True, exist_ok=True)
        for t in ("channels", "messages", "users", "user_channel", "reactions", "channel_links"):
            cur = con.execute(f"SELECT * FROM {t}")
            cols = [d[0] for d in cur.description]
            with open(out / f"{t}.csv", "w", newline="") as f:
                w = csv.writer(f)
                w.writerow(cols)
                w.writerows(cur)
            print(f"exported {t}.csv")

    else:
        print(__doc__)


if __name__ == "__main__":
    main()
