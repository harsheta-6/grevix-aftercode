import re, subprocess
from datetime import datetime, timedelta, timezone, time
import imageio_ffmpeg

UTC = timezone.utc
LOCAL_TZ = timezone(timedelta(hours=5, minutes=30))    
CLOCK_TOLERANCE = timedelta(minutes=10)
MAX_AGE = timedelta(days=30)                            
EARLIEST_PLAUSIBLE = datetime(2015, 1, 1, tzinfo=UTC)  

_batch_offsets = {}   


def read_container_time(path):
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    r = subprocess.run([ffmpeg, "-i", path], capture_output=True,
                       text=True, errors="replace")
    m = re.search(r"creation_time\s*:\s*(\S+)", r.stderr)   
    if not m:
        return None
    try:
        dt = datetime.fromisoformat(m.group(1).replace("Z", "+00:00"))
    except ValueError:
        return None
    return dt.astimezone(UTC) if dt.tzinfo else dt.replace(tzinfo=UTC)


_NAME = re.compile(r"(20\d{2})[-_]?(\d{2})[-_]?(\d{2})[-_ T]?(\d{2})[-_:]?(\d{2})[-_:]?(\d{2})")

def read_filename_time(name):
    m = _NAME.search(name or "")
    if not m:
        return None
    try:
        return datetime(*map(int, m.groups()), tzinfo=LOCAL_TZ).astimezone(UTC)
    except ValueError:
        return None


def _parse_day(s):
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except (TypeError, ValueError):
        return None


def _problems(ts, now, modified, declared):
    p = []
    if ts > now + CLOCK_TOLERANCE:
        p.append("timestamp_in_future")
    if ts < EARLIEST_PLAUSIBLE:
        CONFLICT = {"recorded_after_file_was_written", "conflicts_with_declared_date"}
        p.append("clock_reset_date")
    if modified and ts > modified + CLOCK_TOLERANCE:
        p.append("recorded_after_file_was_written")
    if declared and abs((ts.astimezone(LOCAL_TZ).date() - declared).days) > 1:
        p.append("conflicts_with_declared_date")
    return p

def decide(container=None, fname=None, modified=None, declared=None, batch=None, now=None):
    """Pure logic, so it can be tested without video files."""
    now = now or datetime.now(UTC)
    notes = []
    iso = lambda d: d.isoformat() if d else None


    mod = modified if modified and EARLIEST_PLAUSIBLE <= modified <= now + CLOCK_TOLERANCE else None
    sources = {k: v for k, v in {"container_metadata": container, "filename": fname,
                                 "file_modified": modified}.items() if v}


    latest = min(now, mod) if mod else now

    cands = list(dict.fromkeys(t for t in (container, fname) if t))
    if len(cands) > 1 and max(cands) - min(cands) > CLOCK_TOLERANCE:
        notes.append("camera_sources_disagree")
    claimed = next((c for c in cands if not _problems(c, now, mod, declared)),
                   cands[0] if cands else None)

    problems = _problems(claimed, now, mod, declared) if claimed else ["no_timestamp_found"]
    conflict = "camera_sources_disagree" in notes or any(p in CONFLICT for p in problems)

    def out(status, eff, resolution, reason):
        return {"status": status, "effective": iso(eff), "claimed": iso(claimed),
                "latest_possible": iso(latest), "conflict": conflict,
                "resolution": resolution, "reason": reason, "notes": notes,
                "sources": {k: iso(v) for k, v in sources.items()}}

    if not problems:
        if now - claimed > MAX_AGE and not declared:
            return out("unverified", None, "unknown", "older_than_max_age")
        return out("verified", claimed, "minute", "ok")

    
    if declared:
        tod = claimed.astimezone(LOCAL_TZ).time() if claimed else time(12, 0)
        eff = datetime.combine(declared, tod, LOCAL_TZ).astimezone(UTC)
        if batch and claimed:
            _batch_offsets[batch] = eff - claimed   
        return out("corrected", eff, "day", "user_declared_date")

    if claimed and batch in _batch_offsets:
        adj = claimed + _batch_offsets[batch]
        if not _problems(adj, now, mod, None):
            return out("corrected", adj, "day", "batch_offset")

    return out("unverified", None, "unknown", problems[0])  


def usable_for_timing(ts):
    """Ordering, freshness and cost-of-waiting use only verified or corrected dates."""
    return ts["status"] in ("verified", "corrected")

def assess_timestamp(path, filename, file_modified_ms=None, declared_date=None, batch=None):
    modified = (datetime.fromtimestamp(file_modified_ms / 1000, UTC)
                if file_modified_ms else None)
    return decide(read_container_time(path), read_filename_time(filename),
                  modified, _parse_day(declared_date), batch)


