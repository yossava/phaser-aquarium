#!/usr/bin/env python3
"""Run Codex image/asset generation prompts as background jobs.

This project-local wrapper starts `codex exec` jobs for asset generation. Each
job gets a prompt, logs, status file, and final message under
`.codex_asset_jobs/`.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import signal
import subprocess
import sys
import textwrap
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
JOBS_DIR = ROOT / ".codex_asset_jobs"
DEFAULT_OUTPUT_DIR = ROOT / "assets" / "generated"
DEFAULT_MODEL = "gpt-5.5"


def now_iso() -> str:
	return dt.datetime.now(dt.timezone.utc).astimezone().isoformat(timespec="seconds")


def slugify(value: str) -> str:
	result: list[str] = []
	last_dash = False
	for char in value.lower():
		if char.isalnum():
			result.append(char)
			last_dash = False
		elif not last_dash:
			result.append("-")
			last_dash = True
	return "".join(result).strip("-")[:48] or "asset"


def read_status(job_dir: Path) -> dict:
	status_path = job_dir / "status.json"
	if not status_path.exists():
		return {}
	return json.loads(status_path.read_text(encoding="utf-8"))


def write_status(job_dir: Path, status: dict) -> None:
	(job_dir / "status.json").write_text(
		json.dumps(status, indent=2, sort_keys=True) + "\n",
		encoding="utf-8",
	)


def is_running(pid: int) -> bool:
	try:
		os.kill(pid, 0)
	except ProcessLookupError:
		return False
	except PermissionError:
		return True
	return True


def codex_path() -> str:
	found = subprocess.run(
		["/bin/zsh", "-lc", "command -v codex"],
		check=False,
		capture_output=True,
		text=True,
	)
	path = found.stdout.strip()
	if not path:
		raise SystemExit("codex executable was not found on PATH")
	return path


def shell_quote(value: str) -> str:
	return "'" + value.replace("'", "'\\''") + "'"


def build_prompt(args: argparse.Namespace, output_dir: Path) -> str:
	attached = ""
	if args.reference:
		attached = "\nReference images are attached to the Codex command. Match their useful style, layout, scale, and material quality while adapting to this aquarium game."

	return textwrap.dedent(f"""\
		You are generating polished game image assets for this Phaser + Vite mobile aquarium project.

		Task:
		{args.prompt}

		Output directory:
		{output_dir}

		Requirements:
		- Use Codex image generation if available in this environment.
		- Create actual image files in the output directory, preferably PNG or WebP.
		- Prefer transparent backgrounds for fish, helpers, decorations, food, icons, buttons, and UI overlays.
		- Use lowercase snake_case filenames.
		- Also create a short manifest JSON listing every generated asset, dimensions, transparency/background notes, and intended in-game use.
		- Do not replace existing project files outside the output directory unless the prompt explicitly asks for it.
		- If image generation is not available, stop and write a clear failure note to the manifest instead of creating low-quality placeholder art.

		Project visual style:
		Mobile portrait aquarium game, bright readable aquatic silhouettes, playful collectible fish, soft toy-like forms, clean mobile UI, low-clutter tank visuals, transparent sprites where useful, no baked-in text unless requested.
		{attached}
		""")


def start_job(args: argparse.Namespace) -> None:
	JOBS_DIR.mkdir(parents=True, exist_ok=True)
	output_dir = Path(args.output_dir).expanduser()
	if not output_dir.is_absolute():
		output_dir = ROOT / output_dir
	output_dir.mkdir(parents=True, exist_ok=True)

	job_id = f"{dt.datetime.now().strftime('%Y%m%d-%H%M%S')}-{slugify(args.name or args.prompt)}"
	job_dir = JOBS_DIR / job_id
	job_dir.mkdir(parents=True, exist_ok=False)

	prompt_path = job_dir / "prompt.md"
	prompt_path.write_text(build_prompt(args, output_dir), encoding="utf-8")

	last_message_path = job_dir / "last_message.md"
	stdout_path = job_dir / "stdout.log"
	stderr_path = job_dir / "stderr.log"
	exit_code_path = job_dir / "exit_code.txt"
	run_script_path = job_dir / "run.sh"

	command: list[str] = [
		codex_path(),
		"exec",
		"--model",
		args.model,
		"--cd",
		str(ROOT),
		"--sandbox",
		"danger-full-access",
		"--enable",
		"image_generation",
		"--output-last-message",
		str(last_message_path),
	]
	for reference in args.reference:
		command.extend(["--image", str(Path(reference).expanduser())])
	command.append("-")

	status = {
		"created_at": now_iso(),
		"exit_code": None,
		"job_id": job_id,
		"model": args.model,
		"output_dir": str(output_dir),
		"prompt": args.prompt,
		"references": args.reference,
		"state": "starting",
	}
	write_status(job_dir, status)

	run_script_path.write_text(
		"#!/bin/zsh\n"
		"set +e\n"
		f"cd {str(ROOT)!r}\n"
		f"python3 - <<'PY'\n"
		f"import datetime as dt, json, pathlib\n"
		f"p = pathlib.Path({str(job_dir / 'status.json')!r})\n"
		f"s = json.loads(p.read_text())\n"
		f"s['state'] = 'running'\n"
		f"s['started_at'] = dt.datetime.now(dt.timezone.utc).astimezone().isoformat(timespec='seconds')\n"
		f"p.write_text(json.dumps(s, indent=2, sort_keys=True) + '\\n')\n"
		f"PY\n"
		f"{' '.join(shell_quote(part) for part in command)} < {shell_quote(str(prompt_path))} > {shell_quote(str(stdout_path))} 2> {shell_quote(str(stderr_path))}\n"
		"code=$?\n"
		f"printf '%s\\n' \"$code\" > {shell_quote(str(exit_code_path))}\n"
		f"python3 - <<'PY'\n"
		f"import datetime as dt, json, pathlib\n"
		f"p = pathlib.Path({str(job_dir / 'status.json')!r})\n"
		f"s = json.loads(p.read_text())\n"
		f"code = int(pathlib.Path({str(exit_code_path)!r}).read_text().strip())\n"
		f"s['state'] = 'completed' if code == 0 else 'failed'\n"
		f"s['exit_code'] = code\n"
		f"s['finished_at'] = dt.datetime.now(dt.timezone.utc).astimezone().isoformat(timespec='seconds')\n"
		f"p.write_text(json.dumps(s, indent=2, sort_keys=True) + '\\n')\n"
		f"PY\n",
		encoding="utf-8",
	)
	run_script_path.chmod(0o755)

	with (job_dir / "launcher.log").open("ab") as launcher:
		process = subprocess.Popen(
			["/bin/zsh", str(run_script_path)],
			stdin=subprocess.DEVNULL,
			stdout=launcher,
			stderr=launcher,
			start_new_session=True,
		)

	status["pid"] = process.pid
	status["state"] = "running"
	status["started_at"] = now_iso()
	write_status(job_dir, status)
	print(json.dumps({
		"job_id": job_id,
		"pid": process.pid,
		"job_dir": str(job_dir),
		"output_dir": str(output_dir),
	}, indent=2))


def list_jobs(_: argparse.Namespace) -> None:
	if not JOBS_DIR.exists():
		return
	for job_dir in sorted(JOBS_DIR.iterdir(), reverse=True):
		if not job_dir.is_dir():
			continue
		status = read_status(job_dir)
		state = status.get("state", "unknown")
		pid = status.get("pid")
		if state == "running" and pid and not is_running(int(pid)):
			state = "exited"
		print(f"{job_dir.name}\t{state}\t{status.get('output_dir', '')}")


def show_status(args: argparse.Namespace) -> None:
	job_dir = JOBS_DIR / args.job_id
	status = read_status(job_dir)
	if not status:
		raise SystemExit(f"Unknown job: {args.job_id}")
	pid = status.get("pid")
	if status.get("state") == "running" and pid and not is_running(int(pid)):
		status["state"] = "exited"
	print(json.dumps(status, indent=2, sort_keys=True))


def tail(args: argparse.Namespace) -> None:
	job_dir = JOBS_DIR / args.job_id
	log_path = job_dir / args.log
	if not log_path.exists():
		raise SystemExit(f"Missing log: {log_path}")
	with log_path.open("r", encoding="utf-8", errors="replace") as handle:
		if args.follow:
			handle.seek(0, os.SEEK_END)
			while True:
				chunk = handle.read()
				if chunk:
					print(chunk, end="")
				time.sleep(1.0)
		else:
			print(handle.read(), end="")


def stop_job(args: argparse.Namespace) -> None:
	job_dir = JOBS_DIR / args.job_id
	status = read_status(job_dir)
	pid = status.get("pid")
	if not pid:
		raise SystemExit(f"Job has no pid: {args.job_id}")
	os.killpg(int(pid), signal.SIGTERM)
	status["state"] = "stopped"
	status["stopped_at"] = now_iso()
	write_status(job_dir, status)
	print(f"stopped {args.job_id}")


def parse_args() -> argparse.Namespace:
	parser = argparse.ArgumentParser(description=__doc__)
	sub = parser.add_subparsers(dest="command", required=True)

	run = sub.add_parser("run", help="start a Codex asset job in the background")
	run.add_argument("prompt", help="asset generation prompt")
	run.add_argument("--name", help="short job name")
	run.add_argument("--model", default=DEFAULT_MODEL)
	run.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR.relative_to(ROOT)))
	run.add_argument("--reference", action="append", default=[], help="reference image to attach")
	run.set_defaults(func=start_job)

	ls_cmd = sub.add_parser("list", help="list jobs")
	ls_cmd.set_defaults(func=list_jobs)

	status = sub.add_parser("status", help="show job status JSON")
	status.add_argument("job_id")
	status.set_defaults(func=show_status)

	tail_cmd = sub.add_parser("tail", help="print a job log")
	tail_cmd.add_argument("job_id")
	tail_cmd.add_argument("--log", default="stdout.log",
		choices=["stdout.log", "stderr.log", "launcher.log", "last_message.md"])
	tail_cmd.add_argument("-f", "--follow", action="store_true")
	tail_cmd.set_defaults(func=tail)

	stop = sub.add_parser("stop", help="stop a running job")
	stop.add_argument("job_id")
	stop.set_defaults(func=stop_job)

	return parser.parse_args()


def main() -> None:
	args = parse_args()
	args.func(args)


if __name__ == "__main__":
	main()
