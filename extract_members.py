#!/usr/bin/env python3
"""
Extract unique member list from a WhatsApp group chat export.

Since the exporter was added after group creation, many members won't have
an explicit "added" event. We extract from two sources:
  1. Message senders — catches everyone who ever posted, including members
     present at creation with no "added" event.
  2. "X added Y" system messages — catches lurkers who were added but never
     posted.
"""

import re
from pathlib import Path

CHAT_FILE = Path(__file__).parent / "_chat (1).txt"
OUT_FILE = Path(__file__).parent / "members.txt"

GROUP_NAME = "🍺 ONE MILLION BEERS 🍻"

ZWCHARS = re.compile(r"[\u200e\u200f\u200b\u200c\u200d\u202a\u202c\u2068\u2069\ufeff]")

# [date, time] sender: ...
# Leading zero-width marks are common on WhatsApp export lines.
MSG_RE = re.compile(
    r"^\u200e?\[(\d{1,2}/\d{1,2}/\d{4},\s*\d{1,2}:\d{2}:\d{2}\s*[ap]m)\]\s+"
    r"(.+?):\s"
)

PHONE_RE = re.compile(
    r"^[+\u202a\u202c\u200e\s]*[\d\s()\-\u2011\u2010.]{7,}$"
)


def strip_zw(s: str) -> str:
    return ZWCHARS.sub("", s)


def clean_name(raw: str) -> str:
    name = strip_zw(raw).strip()
    if name.startswith("~ "):
        name = name[2:]
    elif name.startswith("~"):
        name = name[1:]
    name = re.sub(r"\s{2,}", " ", name).strip()
    return name


def is_phone(raw: str) -> bool:
    return bool(PHONE_RE.match(strip_zw(raw).strip()))


def parse_added_names(body):  # -> list[str]
    """Pull every name out of 'X added Y, Z, and W' / 'You added ...'."""
    body = strip_zw(body).strip()
    m = re.search(r"\badded\s+(.+?)(?:\.\s*Tap to see all\.?)?$", body)
    if not m:
        return []

    rest = m.group(1)
    rest = re.sub(r",?\s+and\s+\d+\s+others?\.?", "", rest)
    rest = re.sub(r"\s+and\s+", ", ", rest)
    return [n.strip() for n in rest.split(",") if n.strip()]


def parse_adder(body):  # -> str | None
    body = strip_zw(body).strip()
    m = re.match(r"^(.+?)\s+added\s+", body)
    if m:
        name = m.group(1).strip()
        if name.lower() != "you":
            return name
    return None


def collect_raw(text):
    """Return (named_members, phone_members, hidden_count)."""
    named = set()
    phones = set()
    hidden = 0

    system_actions = {
        "created this group",
        "changed this group",
        "turned on disappearing",
        "turned off disappearing",
        "changed the group description",
        "changed the subject",
        "This message was deleted",
        "Messages and calls are end-to-end encrypted",
        "security code changed",
    }

    def add_member(raw):
        c = clean_name(raw)
        if not c or c.lower() == "you" or c == clean_name(GROUP_NAME):
            return
        if is_phone(raw):
            phones.add(strip_zw(raw).strip())
        else:
            named.add(c)

    for line in text.splitlines():
        m = MSG_RE.match(line)
        if not m:
            continue

        sender_raw = m.group(2)
        body = line[m.end():]

        # WhatsApp marks system messages with a leading U+200E before the body.
        # Regular user messages don't have it. This distinguishes
        # "Max: Who added this bloke ^" (chat) from "Max: ‎You added Max" (system).
        body_starts_with_zw = bool(body) and body[0] in "\u200e\u200f"
        body_clean = strip_zw(body).strip()

        is_system_added = body_starts_with_zw and "added" in body_clean

        if clean_name(sender_raw) != clean_name(GROUP_NAME):
            add_member(sender_raw)

        if is_system_added:
            for name in parse_added_names(body_clean):
                add_member(name)
            adder = parse_adder(body_clean)
            if adder:
                add_member(adder)

        if "created this group" in body_clean:
            cm = re.match(r"^(.+?)\s+created this group", body_clean)
            if cm:
                add_member(cm.group(1))

        hm = re.search(r"and (\d+) others", body_clean)
        if hm and is_system_added:
            hidden += int(hm.group(1))

    return named, phones, hidden


def main():
    text = CHAT_FILE.read_text(encoding="utf-8")
    named, phones, hidden = collect_raw(text)

    sorted_named = sorted(named, key=str.lower)
    sorted_phones = sorted(phones)

    print(f"Named members ({len(sorted_named)}):")
    print("=" * 40)
    for i, name in enumerate(sorted_named, 1):
        print(f"  {i:3}. {name}")

    print(f"\nUnsaved contacts ({len(sorted_phones)}):")
    print("=" * 40)
    for i, p in enumerate(sorted_phones, 1):
        print(f"  {i:3}. {p}")

    print(f"\nHidden behind 'N others. Tap to see all.': {hidden}")
    total = len(named) + len(phones) + hidden
    overlap = total - 249
    print(f"\n--- Summary ---")
    print(f"  Named members:    {len(named)}")
    print(f"  Unsaved contacts: {len(phones)}")
    print(f"  Hidden others:    {hidden}")
    print(f"  Raw total:        {total}")
    if overlap > 0:
        print(f"  Overlap (dupes):  ~{overlap}  (phone numbers that match named members)")
    print(f"  WhatsApp says:    249")

    with open(OUT_FILE, "w", encoding="utf-8") as f:
        for name in sorted_named:
            f.write(name + "\n")
        f.write("\n# Unsaved contacts (phone numbers)\n")
        for p in sorted_phones:
            f.write(p + "\n")
    print(f"\nSaved to {OUT_FILE}")


if __name__ == "__main__":
    main()
