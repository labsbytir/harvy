"""Build the static documentation landing site."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("dist/docs"))
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[2]
    output = args.output
    output.mkdir(parents=True, exist_ok=True)
    for source, destination in (
        ("v2/web/docs-site/index.html", "index.html"),
        ("v2/web/docs-site/site.css", "site.css"),
        ("v2/web/docs-site/assets/harvy-github-banner.png", "assets/harvy-github-banner.png"),
        ("v2/web/docs-site/assets/harvy-logo.png", "assets/harvy-logo.png"),
    ):
        target = output / destination
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes((root / source).read_bytes())

    commits = subprocess.run(
        ["git", "log", "--max-count=10", "--date=short", "--format=%H%x1f%s%x1f%as"],
        cwd=root,
        check=True,
        capture_output=True,
        text=True,
    )
    entries = []
    repository = os.environ.get("GITHUB_REPOSITORY", "labsbytir/harvy")
    for line in commits.stdout.splitlines():
        sha, subject, date = line.split("\x1f", 2)
        entries.append({
            "sha": sha,
            "short_sha": sha[:7],
            "subject": subject,
            "date": date,
            "url": f"https://github.com/{repository}/commit/{sha}",
        })
    (output / "changelog.json").write_text(json.dumps(entries, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
