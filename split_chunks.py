#!/usr/bin/env python3
import os
import re

MAX_CHUNK = 300

with open('_chat_cleaned.txt', 'r') as fh:
    lines = fh.readlines()

# Frozen chunks — hardcoded line ranges (0-indexed start, end).
# These are already parsed into .jsonl files — DO NOT rewrite their .txt files.
original_chunks = [
    ("chunk_1.txt",   0,    217,  "Jan 7  - Jan 23"),
    ("chunk_2.txt",   217,  471,  "Jan 24 - Jan 30"),
    ("chunk_3.txt",   471,  756,  "Jan 31 - Feb 8"),
    ("chunk_4.txt",   756,  985,  "Feb 9  - Feb 14"),
    ("chunk_5.txt",   985,  1245, "Feb 15 - Feb 20"),
    ("chunk_6.txt",   1245, 1424, "Feb 21 - Feb 26"),
    ("chunk_7.txt",   1424, 1676, "Feb 27 - Mar 5"),
    ("chunk_8.txt",   1676, 1891, "Mar 6  - Mar 8"),
    ("chunk_9.txt",   1891, 2132, "Mar 9  - Mar 14"),
    ("chunk_10.txt",  2132, 2457, "Mar 15 - Mar 20"),
    ("chunk_11.txt",  2457, 2654, "Mar 21 - Mar 23"),
    ("chunk_12.txt",  2654, 2988, "Mar 24 - Mar 30"),
    ("chunk_13.txt",  2988, 3288, "Mar 30 - Apr 3"),
    ("chunk_14.txt",  3288, 3588, "Apr 3  - Apr 5"),
    ("chunk_15.txt",  3588, 3717, "Apr 5  - Apr 6"),
    ("chunk_16.txt",  3717, 4017, "Apr 6  - Apr 10"),
    ("chunk_17.txt",  4017, 4317, "Apr 10 - Apr 12"),
    ("chunk_18.txt",  4317, 4404, "Apr 12 - Apr 13"),
    ("chunk_19.txt",  4404, 4704, "Apr 13 - Apr 18"),
    ("chunk_20.txt",  4704, 5004, "Apr 18 - Apr 20"),
    ("chunk_21.txt",  5004, 5063, "Apr 20"),
    ("chunk_22.txt",  5063, 5363, "Apr 20 - Apr 24"),
    ("chunk_23.txt",  5363, 5663, "Apr 24 - Apr 26"),
    ("chunk_24.txt",  5663, 5813, "Apr 26 - Apr 27"),
    ("chunk_25.txt",  5813, 6113, "Apr 27 - May 1"),
    ("chunk_26.txt",  6113, 6413, "May 1 - May 2"),
    ("chunk_27.txt",  6413, 6699, "May 2 - May 4"),
    ("chunk_28.txt",  6699, 6999, "May 4 - May 8"),
    ("chunk_29.txt",  6999, 7299, "May 8 - May 10"),
    ("chunk_30.txt",  7299, 7469, "May 10 - May 11"),
]

# Derive auto-split start from the table above — never hardcode separately
auto_start = original_chunks[-1][2]

DATE_RE = re.compile(r'^(\d{1,2}/\d{1,2})\s')

def get_date(line):
    m = DATE_RE.match(line)
    return m.group(1) if m else None

# Auto-split new content into max MAX_CHUNK lines each
new_chunks = []
start = auto_start
chunk_num = len(original_chunks) + 1
while start < len(lines):
    end = min(start + MAX_CHUNK, len(lines))
    chunk_lines = lines[start:end]
    dates = [get_date(l) for l in chunk_lines if get_date(l)]
    first_date = dates[0] if dates else "?"
    last_date  = dates[-1] if dates else "?"
    desc = first_date if first_date == last_date else f"{first_date} - {last_date}"
    new_chunks.append((f"chunk_{chunk_num}.txt", start, end, desc))
    chunk_num += 1
    start = end

os.makedirs('chunks', exist_ok=True)

# Remove only auto-split .txt files (chunk_13+) — never touch the originals
for fname in os.listdir('chunks'):
    if not (fname.startswith('chunk_') and fname.endswith('.txt')):
        continue
    num = fname[len('chunk_'):-len('.txt')]
    if num.isdigit() and int(num) > len(original_chunks):
        os.remove(f'chunks/{fname}')

# Write only the new auto-split chunks
for name, start, end, desc in new_chunks:
    with open(f'chunks/{name}', 'w') as fh:
        fh.writelines(lines[start:end])
    print(f"{name}: lines {start+1}-{end} ({end-start} lines) — {desc}")

# Print summary of original chunks too (read-only, not rewritten)
print("\nOriginal chunks (not rewritten):")
for name, start, end, desc in original_chunks:
    print(f"  {name}: lines {start+1}-{end} ({end-start} lines) — {desc}")

print(f"\nTotal: {len(original_chunks) + len(new_chunks)} chunks from {len(lines)} lines")
