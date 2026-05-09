#!/usr/bin/env python3
"""Small interval watcher for the 90 real-reference fish generation queue.

This is intentionally a local "cron-like" loop rather than a system cron entry:
it keeps all state and logs inside the project, can restart the queue if it is
not running, and exits once the 90-fish manifest is complete.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import signal
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "generated" / "fish-90-real-ref"
QUEUE_SCRIPT = ROOT / "tools" / "run_fish_90_real_ref_queue.py"
MONITOR_PID = OUT / "monitor.pid"
QUEUE_PID = OUT / "queue.pid"
MONITOR_LOG = OUT / "monitor.log"
QUEUE_LOG = OUT / "queue.log"
QUEUE_ERR = OUT / "queue.err.log"
MANIFEST = OUT / "manifest.json"
PROGRESS = OUT / "progress.md"

STOP = False


def now() -> str:
    return dt.datetime.now(dt.timezone.utc).astimezone().isoformat(timespec="seconds")


def is_pid_running(pid: int) -> bool:
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


def read_pid(path: Path) -> int | None:
    try:
        value = path.read_text(encoding="utf-8").strip()
    except FileNotFoundError:
        return None
    try:
        return int(value)
    except ValueError:
        return None


def write_pid(path: Path, pid: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"{pid}\n", encoding="utf-8")


def log(event: str, **fields: object) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    payload = {"at": now(), "event": event, **fields}
    with MONITOR_LOG.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(payload, sort_keys=True) + "\n")
    print(json.dumps(payload, sort_keys=True), flush=True)


def manifest_count() -> int:
    try:
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return 0
    assets = manifest.get("assets", [])
    return len(assets) if isinstance(assets, list) else 0


def count_files() -> dict[str, int]:
    counts: dict[str, int] = {}
    for rarity in ("common", "rare", "super_rare"):
        counts[f"final_{rarity}"] = len(list((OUT / "final" / rarity).glob("*.png")))
        counts[f"source_{rarity}"] = len(list((OUT / "source" / rarity).glob("*_source_keyed.png")))
        counts[f"qa_{rarity}"] = len(list((OUT / "qa" / rarity).glob("*.json")))
    counts["manifest"] = manifest_count()
    return counts


def latest_progress_line() -> str | None:
    try:
        lines = [line.strip() for line in PROGRESS.read_text(encoding="utf-8").splitlines() if line.strip()]
    except FileNotFoundError:
        return None
    return lines[-1] if lines else None


def queue_running() -> bool:
    pid = read_pid(QUEUE_PID)
    if pid and is_pid_running(pid):
        return True
    if pid:
        QUEUE_PID.unlink(missing_ok=True)
    return False


def start_queue() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    queue_out = QUEUE_LOG.open("ab")
    queue_err = QUEUE_ERR.open("ab")
    process = subprocess.Popen(
        [sys.executable, str(QUEUE_SCRIPT)],
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=queue_out,
        stderr=queue_err,
        start_new_session=True,
    )
    write_pid(QUEUE_PID, process.pid)
    log("queue_started", pid=process.pid)
    return process.pid


def handle_stop(_signum: int, _frame: object) -> None:
    global STOP
    STOP = True
    log("monitor_stop_requested")


def acquire_monitor_lock(force: bool) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    existing = read_pid(MONITOR_PID)
    if existing and is_pid_running(existing) and not force:
        raise SystemExit(f"monitor already running with pid {existing}")
    write_pid(MONITOR_PID, os.getpid())


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--interval", type=int, default=180, help="seconds between checks")
    parser.add_argument("--once", action="store_true", help="run one check and exit")
    parser.add_argument("--force", action="store_true", help="replace a stale/running monitor pid file")
    args = parser.parse_args()

    if args.interval < 30:
        raise SystemExit("--interval must be at least 30 seconds")

    signal.signal(signal.SIGTERM, handle_stop)
    signal.signal(signal.SIGINT, handle_stop)
    acquire_monitor_lock(args.force)
    log("monitor_started", pid=os.getpid(), interval_seconds=args.interval)

    try:
        while not STOP:
            counts = count_files()
            complete = counts["manifest"] >= 90
            running = queue_running()
            log(
                "check",
                complete=complete,
                queue_running=running,
                queue_pid=read_pid(QUEUE_PID),
                latest_progress=latest_progress_line(),
                **counts,
            )
            if complete:
                log("monitor_completed", manifest_count=counts["manifest"])
                return 0
            if not running:
                start_queue()
            if args.once:
                return 0
            time.sleep(args.interval)
        return 0
    finally:
        current = read_pid(MONITOR_PID)
        if current == os.getpid():
            MONITOR_PID.unlink(missing_ok=True)
        log("monitor_exited")


if __name__ == "__main__":
    raise SystemExit(main())
