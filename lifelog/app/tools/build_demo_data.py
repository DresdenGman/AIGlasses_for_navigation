#!/usr/bin/env python3
"""Build the app's trimmed demo-data bundle from the web showcase-data.

Source of truth: lifelog/web/showcase-data (same fictional showcase set the
website uses). Output: lifelog/app/src/data/demo.json + photos copied into
lifelog/app/public/photos/. Re-run after showcase-data changes.
"""
import json, shutil
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
WEB = APP.parent / "web"
SD = WEB / "showcase-data"
HERO = SD / "hero-2026-04-18"

def load(p): return json.loads(Path(p).read_text())

def hm(ts_local):  # "2026-04-18T07:00:00-07:00" -> "07:00"
    return ts_local[11:16]

PLACE_FALLBACK = {"HOME": "Home", "TRAM": "Tram", "SHOP": "Shop", "HWARE": "Hardware store",
                  "BAKE": "Bakery", "LIB": "Library", "CAFE": "Café", "PARK": "Park"}

hero_photos = sorted((WEB / "public/showcase/photos/hero").glob("*-720.jpg"))
assert len(hero_photos) == 14, hero_photos

# ---------- segments / timeline ----------
def segments(locale):
    seg = load(HERO / f"locales/{locale}/segments.json")
    places = load(HERO / f"locales/{locale}/places.json")
    out = []
    for i, s in enumerate(seg):
        out.append({
            "id": s["id"], "startMs": s["start_ms"], "endMs": s["end_ms"],
            "start": hm_from_ms(s["start_ms"]), "end": hm_from_ms(s["end_ms"]),
            "title": s["title"], "summary": s["summary"],
            "place": places.get(s["place_id"], ""), "certainty": s["certainty"],
            "photo": f"photos/{hero_photos[i].name}",
        })
    return out

from datetime import datetime, timezone, timedelta
PT = timezone(timedelta(hours=-7))
def hm_from_ms(ms):
    return datetime.fromtimestamp(ms / 1000, PT).strftime("%H:%M")

segs_en = segments("en"); segs_zh = segments("zh-CN")
segments_out = []
for e, z in zip(segs_en, segs_zh):
    segments_out.append({**{k: e[k] for k in ("id", "startMs", "endMs", "start", "end", "certainty", "photo")},
                         "title": {"en": e["title"], "zh": z["title"]},
                         "summary": {"en": e["summary"], "zh": z["summary"]},
                         "place": {"en": e["place"], "zh": z["place"]}})

def seg_index_for(ms):
    for i, s in enumerate(segments_out):
        if s["startMs"] <= ms <= s["endMs"]:
            return i
    return None

# ---------- summary ----------
def summary(locale):
    s = load(HERO / f"locales/{locale}/summary.json")
    def items(key):
        return [{"text": i["text"], "certainty": i.get("certainty", "confident")} for i in s.get(key, [])]
    return {"headline": s["headline"]["text"], "places": items("places"),
            "activities": items("activities"), "people": items("people"),
            "quotes": items("quotes"), "uncertain": items("uncertain")}

# ---------- answers ----------
def answers(locale):
    raw = load(SD / f"answers/{locale}.json")["answers"]
    out = []
    for a in raw:
        ev = []
        for e in a.get("evidence", [])[:3]:
            ev.append({"label": e["label"], "time": hm(e["ts_local"]),
                       "certainty": e.get("certainty", "confident"), "seg": seg_index_for(e["ts"])})
        certs = {e["certainty"] for e in a.get("evidence", [])}
        out.append({"id": a["id"], "q": a["question"], "a": a["answer"],
                    "status": a["status"], "uncertain": "uncertain" in certs, "evidence": ev})
    return out

# ---------- objects ----------
OBJ_PHOTO = {
    "KEYS": "photos/pov-desk-keys-under-papers.jpg",
    "RGLASS": "photos/year-13-sunlit-wellness-tabletop-still-life.jpg",
    "UMB": "photos/pov-tram-window.jpg",
    "TAPE": "photos/pov-repair-cafe-workbench.jpg",
    "GLUE": "photos/hero-08-cafe-parts-bin-720.jpg",
    "TOOLB": "photos/hero-08-cafe-parts-bin-720.jpg",
    "LAMP": "photos/hero-05-cafe-lamp-diagnosis-720.jpg",
    "WALLET": "photos/year-14-sunlit-entryway-with-everyday-essentials.jpg",
}
def sight(s):
    if not s: return None
    return {"day": s["day"], "time": hm(s["ts_local"]), "place": PLACE_FALLBACK.get(s["place"], s["place"]),
            "score": s["score"], "certainty": s["certainty"],
            "bbox": s.get("bbox"), "frame": s.get("frame_label")}

obj_loc_en = load(SD / "locales/en/objects.json"); obj_loc_zh = load(SD / "locales/zh-CN/objects.json")
objects_out = []
for o in load(SD / "objects.json"):
    k = o["key"]
    objects_out.append({
        "key": k, "name": {"en": obj_loc_en[k]["display_name"], "zh": obj_loc_zh[k]["display_name"]},
        "note": {"en": obj_loc_en[k]["note"], "zh": obj_loc_zh[k]["note"]},
        "aliases": o.get("aliases", []), "status": o["status"], "photo": OBJ_PHOTO[k],
        "last": sight(o.get("last_confident")), "newerUncertain": sight(o.get("newer_uncertain")),
        "sightings": [sight(s) for s in o.get("sightings", [])[:4]],
    })

# ---------- guide feed (detections + captions) ----------
caps = load(HERO / "locales/en/captions.json")
if isinstance(caps, dict): caps = caps.get("captions", [])
frames = load(HERO / "frames.json")
frame_ts = {f["id"]: f["ts_ms"] for f in frames}
guide_feed = []
for c in (caps if isinstance(caps, list) else [])[:14]:
    fid = c.get("frame_id") or c.get("id", "").replace("cap_", "frm_")
    ts = frame_ts.get(fid)
    guide_feed.append({"time": hm_from_ms(ts) if ts else "", "text": c.get("text") or c.get("caption") or "",
                         "certainty": c.get("certainty", "confident"), "score": c.get("score")})

demo = {
    "day": "2026-04-18", "today": load(SD / "meta.json")["today"],
    "segments": segments_out,
    "summary": {"en": summary("en"), "zh": summary("zh-CN")},
    "answers": {"en": answers("en"), "zh": answers("zh-CN")},
    "objects": objects_out,
    "guideFeed": [g for g in guide_feed if g["text"]],
    "backups": [{ "started": b["started_local"][:16].replace("T", " "), "state": b["state"],
                  "target": b["target_type"], "files": b["files"], "bytes": b["bytes"]}
                 for b in load(SD / "backup_runs.json")][-8:][::-1],
    "egress": [{"ts": e["ts_local"][:16].replace("T", " "), "purpose": e["purpose"], "host": e["host"],
                "bytes": e["bytes_out"], "items": e["items"]} for e in load(SD / "egress_log.json")][-10:][::-1],
    "purges": [{"ts": p["ts_local"][:16].replace("T", " "), "trigger": p["trigger"],
                "days": p.get("days") or [], "frames": p["frames"], "bytes": p["bytes"]}
               for p in load(SD / "purge_log.json")][-5:][::-1],
    "settings": load(SD / "settings.json"),
    "year": load(SD / "year/stats.json"),
    "framesTotal": len(frames),
}

(APP / "src/data/demo.json").write_text(json.dumps(demo, ensure_ascii=False, indent=1))
dst = APP / "public/photos"; dst.mkdir(parents=True, exist_ok=True)
copies = [WEB / "public/showcase/photos/hero" / p.name for p in hero_photos] + [
    WEB / "public/showcase/photos/pov-desk-keys-under-papers.jpg",
    WEB / "public/showcase/photos/pov-repair-cafe-workbench.jpg",
    WEB / "public/showcase/photos/pov-tram-window.jpg",
    WEB / "public/showcase/photos/year-13-sunlit-wellness-tabletop-still-life.jpg",
    WEB / "public/showcase/photos/year-14-sunlit-entryway-with-everyday-essentials.jpg",
]
for c in copies: shutil.copy2(c, dst / c.name)
print("demo.json bytes:", (APP / "src/data/demo.json").stat().st_size)
print("answers en/zh:", len(demo["answers"]["en"]), len(demo["answers"]["zh"]), "| guide feed:", len(demo["guideFeed"]))
print("photos copied:", len(list(dst.iterdir())))
