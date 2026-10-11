from datetime import datetime, timedelta, timezone, date
from timestamps import decide, UTC

NOW = datetime(2026, 10, 11, 9, 0, tzinfo=UTC)
h = lambda x: timedelta(hours=x)
reset = datetime(2000, 1, 1, 0, 0, tzinfo=UTC)

def run(name, status, reason=None, effective_none=None, **kw):
    r = decide(now=NOW, **kw)
    ok = r["status"] == status and (reason is None or r["reason"] == reason)
    if effective_none is not None:
        ok = ok and ((r["effective"] is None) == effective_none)
    print("PASS" if ok else "FAIL", name, "->", r["status"], r["reason"], r["effective"], r["latest_possible"])

run("normal clip, 1h old", "verified", container=NOW - h(1))
run("metadata 4.5h ahead, filename correct", "verified", container=NOW + h(4.5), fname=NOW - h(1))
run("3h ahead, no anchor: no invented date", "unverified", "timestamp_in_future",
    effective_none=True, container=NOW + h(3))
run("reset clock, only file time: stays unverified", "unverified", "clock_reset_date",
    effective_none=True, container=reset, modified=NOW - h(2))
run("reset clock, engineer enters date", "corrected", "user_declared_date",
    container=reset, declared=date(2026, 10, 10), batch="b1")
run("same camera, no date entered", "corrected", "batch_offset",
    container=reset + timedelta(minutes=20), batch="b1")
run("camera date conflicts with entered date", "corrected", "user_declared_date",
    container=NOW - h(1), declared=date(2026, 10, 6))
run("40-day-old clip", "unverified", "older_than_max_age", effective_none=True,
    container=NOW - timedelta(days=40))
run("no timestamp at all", "unverified", "no_timestamp_found", effective_none=True)
run("bogus file time ignored, good clip stays verified", "verified",
    container=NOW - h(1), modified=reset)

r = decide(now=NOW, container=NOW - h(1), declared=date(2026, 10, 6))
print("PASS" if r["conflict"] else "FAIL", "conflict flag set on declared-date mismatch")