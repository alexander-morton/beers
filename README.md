# One Million Beers — Weekly Update Guide

## Overview

The pipeline takes a WhatsApp group chat export, cleans it, parses beer claims into structured JSONL data, and publishes a leaderboard at [1millionbeers.lol](https://1millionbeers.lol).

---

## Weekly Steps

### 1. Export the WhatsApp chat

In the WhatsApp group: **Settings → More → Export chat → Without media**

Save the exported `.txt` file somewhere accessible (e.g. `~/Downloads/WhatsApp Chat.txt`).

---

### 2. Append new messages to the combined file

```bash
python3 append_chat.py "~/Downloads/WhatsApp Chat.txt"
```

This smartly finds the overlap between the new export and `_chat_combined3.txt`, appends only genuinely new messages, and writes `last_append.json` recording where the new content starts.

**Output:** `_chat_combined3.txt` updated, `last_append.json` written.

---

### 3. Clean the combined file

```bash
python3 clean_tokens.py
```

Strips Unicode control characters, removes system messages, deleted messages, duplicates, and normalises timestamps into a compact format.

**Output:** `_chat_cleaned.txt`

---

### 4. Split into chunks

```bash
python3 split_chunks.py
```

Chunks 1–12 are hardcoded (historical). The script **only writes new auto-split chunks (13+)** — it never touches the original `.txt` files, which keeps them in sync with their already-parsed `.jsonl` counterparts. Everything from line 2988 onwards is auto-split into chunks of max 300 lines, numbered sequentially.

The auto-split start point is derived directly from the last entry in the hardcoded table, so they can never drift out of sync.

**Output:** `chunks/chunk_13.txt`, `chunk_14.txt`, … (new chunks only)

> **When you get new chunks:** note which chunk numbers are new — the script prints them at the top. You'll parse only those in the next step.

---

### 5. Parse new chunks with sub-agents

Run one Claude sub-agent per new chunk **sequentially** (not in parallel — later chunks depend on the last beer number from the previous one).

For each new chunk, give the agent:
- The chunk `.txt` file contents
- The last few JSONL lines from the previous chunk (for beer number + session context)
- The parsing rules (see **Parsing Rules** section below)
- Output path: `chunks/chunk_N.jsonl`

**Key things agents must handle:**
- Typos in beer numbers (e.g. `4083` → `5083`, `4241` → `5241`) — correct using sequential context
- Counting errors / `-100 beers` events — trace the correction announcements in chat
- Conflicts (two people claim the same number) — first poster wins, note conflict
- Self-corrections (someone posts `**5083` correcting their own typo) — use corrected number
- Duplicate posts — skip
- Non-integer claims (e.g. `6123.5`) — skip
- Count resets announced by Alex Morton or Ben Furby — these are ground truth, correct all subsequent entries accordingly
- Multi-line messages (venue on next line) — combine into one entry

After parsing all new chunks, **add them to the hardcoded table in `split_chunks.py`** so they're frozen for next week. Copy the auto-split line ranges from the script output and add entries to `original_chunks`. Then update the description in the Chunk housekeeping section below.

---

### 6. Rebuild beers.jsonl and beers.json

```bash
python3 build_beers.py
```

> **Note:** `build_beers.py` doesn't exist yet — run the block below manually, or create the script.

**Manual version:**

```bash
python3 << 'EOF'
import json
from pathlib import Path

chunks_dir = Path('chunks')
beers_jsonl = Path('beers.jsonl')
beers_json  = Path('frontend/src/data/beers.json')

def to_iso(date_str):
    d, m = date_str.split('/')
    return f"2026-{int(m):02d}-{int(d):02d}"

all_entries = []
for i in range(1, 100):  # increase upper bound as chunks grow
    f = chunks_dir / f'chunk_{i}.jsonl'
    if not f.exists():
        break
    for line in f.read_text().splitlines():
        if not line.strip():
            continue
        e = json.loads(line)
        e['isoDate'] = to_iso(e['date'])
        all_entries.append(e)

print(f"{len(all_entries)} entries, max beer: {max(b for e in all_entries for b in e['beers'] if isinstance(b, int))}")

with open(beers_jsonl, 'w') as f:
    for e in all_entries:
        out = {k: v for k, v in e.items() if k != 'isoDate'}
        f.write(json.dumps(out, ensure_ascii=False) + '\n')

with open(beers_json, 'w') as f:
    json.dump(all_entries, f, ensure_ascii=False, separators=(',', ':'))

print("Done.")
EOF
```

---

### 7. Update the hardcoded date in App.jsx

Open `frontend/src/App.jsx` and update **two** occurrences of the date:

```js
const LAST_UPDATED = 'YYYY-MM-DD'   // line 6  — shown in header & used by filterByPeriod
const now = new Date("YYYY-MM-DD")  // line ~22 — projection calculation
```

Replace with today's date in `YYYY-MM-DD` format.

---

### 8. Build and deploy

```bash
cd frontend
npm run build
```

Vercel auto-deploys on push to the connected Git branch. Just commit and push:

```bash
git add beers.jsonl frontend/src/data/beers.json frontend/src/App.jsx chunks/
git commit -m "weekly update: beers to NNNN (week of DD Mon)"
git push
```

---

## Chunk housekeeping

- **Parsed chunks are frozen.** Currently 1–18 are in the hardcoded table. Their `.txt` files are never rewritten by `split_chunks.py`. Once you've parsed a chunk's `.jsonl`, add it to the hardcoded table so the auto-split starts from the next one.
- **Auto-split start** is always taken from the `end` value of the last hardcoded chunk (currently line `4404`). If you ever add a new hardcoded entry to the table, the auto-split will automatically follow from there — no separate variable to update.
- **If the cleaned file shifts** (e.g. `clean_tokens.py` is changed in a way that affects old data), verify that line 4404 of `_chat_cleaned.txt` still falls within `13/4` content before running the script. Run `sed -n '4404p' _chat_cleaned.txt` to check.

---

## Parsing Rules (for agent prompts)

### Output format
```json
{"date":"D/M","time":"H:MMam/pm","person":"Name","beers":[N,...],"city":"City or null","location":"Venue or null","location_confidence":"high/medium/low","session":N,"notes":"explanation or null"}
```

### Session numbering
One session per calendar day, incrementing globally across all chunks. Check the last JSONL entry of the previous chunk for the current session number.

### Beer numbers
- Sequential — each claim continues from the last valid number
- Trust the first poster for a given number; log conflicts in `notes`
- Correct obvious typos using sequential context (e.g. if count is at 5080, `4083` → `5083`)
- Non-integer claims (e.g. `6123.5`) → skip entirely
- Ranges like `5029-5031` = beers [5029, 5030, 5031]
- Slash notation like `4987/88` = beers [4987, 4988]

### Count corrections
When Alex Morton or Ben Furby announces a corrected count (e.g. `"We lost 100 beers, count is 5356"`), that count is ground truth. Work backwards to figure out which entries had wrong numbers and correct them with `+N` or `-N` offset. Note the correction in each affected entry's `notes` field.

### Location fields
- `city` = city-level (infer from venue if obvious, e.g. "Bromley" → London)
- `location` = specific venue/bar name
- `location_confidence`: `"high"` if stated explicitly, `"medium"` if inferred, `"low"` if guessed

### Skip entirely
- Pure chit-chat with no beer number
- System messages (added/removed members etc.)
- Deleted messages

### Admin entries (beers: [])
- Count check announcements
- "We lost N beers" corrections
- Duplicate posts (note as duplicate)
- Conflict losers (note the conflict)

---

## File map

```
beers/
├── _chat_combined3.txt     — master combined WhatsApp export (never delete)
├── _chat_cleaned.txt       — cleaned version (regenerated each week)
├── last_append.json        — metadata from last append_chat.py run
├── beers.jsonl             — all entries concatenated (regenerated from chunks)
│
├── chunks/
│   ├── chunk_1.txt         — raw cleaned text, Jan 7–23
│   ├── chunk_1.jsonl       — parsed JSONL for same date range
│   ├── ...
│   └── chunk_N.jsonl       — latest chunk
│
├── append_chat.py          — step 2: append new export
├── clean_tokens.py         — step 3: clean combined file
├── split_chunks.py         — step 4: split into chunks
│
└── frontend/
    ├── src/
    │   ├── App.jsx         — main leaderboard (update LAST_UPDATED + now dates)
    │   ├── data/
    │   │   └── beers.json  — deployed data (regenerated from beers.jsonl)
    │   └── components/
    │       ├── WorldMap.jsx
    │       └── VelocityChart.jsx
    └── dist/               — production build output
```

---

## Troubleshooting

**append_chat.py finds no overlap / appends everything:**
The new export might use a different timestamp format. Check the `TIMESTAMP_RE` regex in `append_chat.py` and add a new pattern if needed.

**Cleaned file line count drops unexpectedly:**
Check if `clean_tokens.py` is stripping too aggressively. The `SYSTEM_CONTENT` patterns at the top are the likely culprit.

**Chunk boundary cuts mid-session:**
The 300-line auto-split doesn't know about session boundaries. If a chunk cuts awkwardly, add a new entry to the hardcoded table in `split_chunks.py` to pin the boundary at a cleaner point — the auto-split will automatically start from the new table's last `end` value.

**Agent assigns wrong beer numbers:**
Always give the agent the last 5–10 JSONL lines from the previous chunk so it knows the exact beer number to continue from. Count errors compound — if the first entry is wrong, everything after it will be too.

**Build fails after data update:**
Usually a malformed JSON line in a chunk `.jsonl` — run `python3 -c "import json; [json.loads(l) for l in open('chunks/chunk_N.jsonl') if l.strip()]"` to find it.
