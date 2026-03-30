#!/usr/bin/env python3
import os

with open('_chat_cleaned.txt', 'r') as f:
    lines = f.readlines()

chunks = [
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
    ("chunk_12.txt",  2654, len(lines), "Mar 24 - Mar 30"),
]

os.makedirs('chunks', exist_ok=True)
for name, start, end, desc in chunks:
    chunk = lines[start:end]
    path = f'chunks/{name}'
    with open(path, 'w') as f:
        f.writelines(chunk)
    print(f"{name}: lines {start+1}-{end} ({end-start} lines) — {desc}")
