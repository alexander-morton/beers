#!/usr/bin/env python3
"""
Append new WhatsApp chat messages to the combined chat file.

Usage:
    python3 append_chat.py <new_export.txt> [combined_file]

The new export overlaps with the combined file. This script strips timestamps
(which differ between exports due to timezone/format differences) and matches
on message content to find the precise join point.

After appending, writes last_append.json recording where new content starts
in the combined file — used by phase 2 (cleaning/chunking/extraction).
"""

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

COMBINED_FILE = Path(__file__).parent / "_chat_combined3.txt"
LAST_APPEND_FILE = Path(__file__).parent / "last_append.json"

# Matches timestamps like: [06/01/2026, 21:51:57] or ‎[6/1/2026, 10:51:57 am]
TIMESTAMP_RE = re.compile(r"^\u200e?\[[\d/]+,\s*[\d:]+(?:\s*[aApP][mM])?\]\s*")


def strip_timestamp(line: str) -> str:
    stripped = TIMESTAMP_RE.sub("", line).strip()
    # Normalize Unicode spaces (WhatsApp changed from regular space to narrow no-break space U+202F)
    return stripped.replace("\u202f", " ")


def load_lines(path: Path) -> list[str]:
    return path.read_text(encoding="utf-8").splitlines()


def find_append_start(combined_lines: list[str], new_lines: list[str], lookback: int = 100) -> int:
    """
    Returns the index in new_lines from which to start appending (i.e. first truly new line).
    Strategy:
      1. Walk backwards through the tail of combined_lines to find an anchor line in new_lines.
      2. From that anchor, walk forward in both to confirm overlap and find the divergence point.
    """
    new_content = [strip_timestamp(l) for l in new_lines]

    tail_start = max(0, len(combined_lines) - lookback)

    for i in range(len(combined_lines) - 1, tail_start - 1, -1):
        content = strip_timestamp(combined_lines[i])
        if not content:
            continue

        # Find the last occurrence of this content in new_lines
        for j in range(len(new_content) - 1, -1, -1):
            if new_content[j] != content:
                continue

            # Found anchor at combined[i] == new[j]. Walk forward to find divergence.
            ci, ni = i + 1, j + 1
            while ci < len(combined_lines) and ni < len(new_lines):
                if strip_timestamp(combined_lines[ci]) == strip_timestamp(new_lines[ni]):
                    ci += 1
                    ni += 1
                else:
                    break

            # ni is now the first line in new_lines that isn't in combined
            return ni

    return 0  # no overlap found — append everything


def main():
    if len(sys.argv) < 2:
        print(f"Usage: python3 {sys.argv[0]} <new_export.txt> [combined_file]")
        sys.exit(1)

    new_file = Path(sys.argv[1])
    combined_file = Path(sys.argv[2]) if len(sys.argv) > 2 else COMBINED_FILE

    if not new_file.exists():
        print(f"Error: {new_file} not found")
        sys.exit(1)
    if not combined_file.exists():
        print(f"Error: {combined_file} not found")
        sys.exit(1)

    combined_lines = load_lines(combined_file)
    new_lines = load_lines(new_file)

    start_idx = find_append_start(combined_lines, new_lines)
    to_append = new_lines[start_idx:]

    if not to_append:
        print("Nothing new to append — combined file is already up to date.")
        return

    # Line number in the combined file where new content will start (1-indexed)
    new_content_start_line = len(combined_lines) + 1

    print(f"Appending {len(to_append)} new lines (starting at line {start_idx + 1} of {new_file.name})")
    print(f"First new line: {to_append[0][:120]}")

    with combined_file.open("a", encoding="utf-8") as f:
        f.write("\n")
        f.write("\n".join(to_append))
        f.write("\n")

    total_lines = len(combined_lines) + len(to_append)
    print(f"Done. {combined_file.name} now has {total_lines} lines.")

    # Record where new content starts for phase 2 (cleaning/chunking/extraction)
    append_record = {
        "appended_at": datetime.now(timezone.utc).isoformat(),
        "source_file": str(new_file),
        "combined_file": str(combined_file),
        "new_content_starts_at_line": new_content_start_line,  # 1-indexed line in combined file
        "lines_appended": len(to_append),
        "total_lines": total_lines,
        "first_new_line": to_append[0],
        "last_new_line": to_append[-1],
    }
    LAST_APPEND_FILE.write_text(json.dumps(append_record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {LAST_APPEND_FILE.name} — new content starts at line {new_content_start_line} of {combined_file.name}")


if __name__ == "__main__":
    main()
