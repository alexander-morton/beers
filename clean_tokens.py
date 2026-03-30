#!/usr/bin/env python3
import re

with open('_chat_combined3.txt', 'r', encoding='utf-8') as f:
    raw = f.read()

lines = raw.split('\n')

CONTROL_CHARS = [
    '\u200e', '\u200f',  # LTR / RTL marks
    '\u200b',            # zero-width space
    '\u202a', '\u202c',  # directional embedding / pop
    '\u200d',            # zero-width joiner (non-emoji context)
    '\ufeff',            # BOM
]

msg_re = re.compile(r'^\[([^\]]+)\]\s+(.+?):\s*(.*)')

SYSTEM_CONTENT = [
    re.compile(r'created this group', re.I),
    re.compile(r'changed this group', re.I),
    re.compile(r'joined using (a )?group link', re.I),
    re.compile(r'Messages and calls are end-to-end encrypted', re.I),
    re.compile(r'This message was deleted', re.I),
    re.compile(r'Tap to see all', re.I),
]

def strip_control(s):
    for c in CONTROL_CHARS:
        s = s.replace(c, '')
    return s

def is_system(sender, content):
    if 'ONE MILLION BEERS' in sender:
        return True
    c = strip_control(content).strip()
    if not c:
        return False
    for pat in SYSTEM_CONTENT:
        if pat.search(c):
            return True
    if ' added ' in c or c.startswith('You added'):
        return True
    return False

# Old format: [8/2/2026, 6:01:32 am]  (12h with am/pm)
TS_RE_12H = re.compile(
    r'\[(\d{1,2}/\d{1,2})/2026,\s*(\d{1,2}:\d{2}):\d{2}\s*(am|pm)\]'
)
# New format: [30/03/2026, 04:54:36]  (24h, zero-padded, no am/pm)
TS_RE_24H = re.compile(
    r'\[(\d{2}/\d{2})/2026,\s*(\d{2}):(\d{2}):\d{2}\]'
)

def compact_timestamp(line):
    def fmt_12h(m):
        # strip leading zeros: "08/02" → "8/2"
        day, month = m.group(1).split('/')
        date = f'{int(day)}/{int(month)}'
        return f'{date} {m.group(2)}{m.group(3)}'

    def fmt_24h(m):
        day, month = m.group(1).split('/')
        date = f'{int(day)}/{int(month)}'
        hour, minute = int(m.group(2)), m.group(3)
        suffix = 'am' if hour < 12 else 'pm'
        hour12 = hour % 12 or 12
        return f'{date} {hour12}:{minute}{suffix}'

    line = TS_RE_12H.sub(fmt_12h, line)
    line = TS_RE_24H.sub(fmt_24h, line)
    return line

def clean_line(line):
    line = strip_control(line)
    line = line.replace('\u202f', ' ')  # narrow no-break space → regular space (new WhatsApp format)
    line = re.sub(r'\s*image omitted\s*$', '', line)
    line = re.sub(r'\s*video omitted\s*$', '', line)
    line = re.sub(r'\s*GIF omitted\s*$', '', line)
    line = re.sub(r'<This message was edited>', '', line)
    line = re.sub(r'(\])\s+~ ', r'] ', line)
    return line.rstrip()

cleaned = []
prev_key = None
stats = {'dupes': 0, 'system': 0, 'empty': 0, 'deleted': 0}

for line in lines:
    cl = clean_line(line)
    m = msg_re.match(cl)

    if m:
        timestamp, sender, content = m.group(1), m.group(2), m.group(3)
        content_stripped = content.strip()

        if 'This message was deleted' in content_stripped:
            stats['deleted'] += 1
            prev_key = None
            continue

        if is_system(sender, content_stripped):
            stats['system'] += 1
            prev_key = None
            continue

        key = (sender.strip(), content_stripped)
        if key == prev_key:
            stats['dupes'] += 1
            continue
        prev_key = key

        if not content_stripped:
            stats['empty'] += 1
            continue

        cleaned.append(cl)
    else:
        stripped = cl.strip()
        if stripped:
            cleaned.append(cl)
            prev_key = None
        else:
            stats['empty'] += 1

cleaned = [compact_timestamp(l) for l in cleaned]

with open('_chat_cleaned.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(cleaned) + '\n')

orig_chars = len(raw)
clean_chars = sum(len(l) for l in cleaned) + len(cleaned)

print(f"Original:  {len(lines)} lines, {orig_chars:,} chars")
print(f"Cleaned:   {len(cleaned)} lines, {clean_chars:,} chars")
print(f"Removed:   {len(lines) - len(cleaned)} lines ({100*(len(lines)-len(cleaned))/len(lines):.1f}%)")
print(f"Char savings: {orig_chars - clean_chars:,} chars ({100*(orig_chars-clean_chars)/orig_chars:.1f}%)")
print(f"\nBreakdown:")
print(f"  Duplicates:  {stats['dupes']}")
print(f"  System msgs: {stats['system']}")
print(f"  Deleted msgs:{stats['deleted']}")
print(f"  Empty lines: {stats['empty']}")
