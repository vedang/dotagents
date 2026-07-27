#!/usr/bin/env python3
"""Create a local, privacy-sensitive inventory of Pi sessions active in a date window."""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import stat
import sys
import tempfile
from collections import Counter
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Iterable
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

DEFAULT_ROOT = "~/.pi/agent/sessions"
# [ref:private_session_analysis] Generated records contain local session metadata.
DEFAULT_OUTPUT_ROOT = Path(__file__).resolve().parent.parent / "session_analysis"
SNIPPET_LIMIT = 280

# Run standalone bearer matching before credential-label matching. Credential labels
# redact their whole line because preserving a trailing multiword value can leak secrets.
BEARER_TOKEN = re.compile(r"(?i)\bbearer\s+[A-Za-z0-9._~+/=-]+")
KNOWN_SECRET = re.compile(r"\b(?:sk|ghp|github_pat|xox[baprs])[-_A-Za-z0-9]{12,}\b")
SECRET_KEY_VALUE = re.compile(
    r"(?im)(?P<prefix>[\"']?(?:api[_-]?key|token|password|secret|authorization)[\"']?\s*[:=]\s*)"
    r"[^\r\n]*"
)
FAILURE_TEXT = re.compile(
    r"(?i)(\bfailed\b|\bfailure\b|\berror\b|timed?\s*out|timeout|"
    r"protocol[_ ]?error|needs_attention|\bpaused\b|\baborted\b|"
    r"max(?:imum)?[^\n]{0,30}exceeded|rate.?limit|quota|context.?overflow|"
    r"permission denied|not found|no such file|command not found|"
    r"exit(?:ed)? (?:code|status) [1-9]|status[\"']?\s*:\s*[\"']?(?:failed|error))"
)
UUID_GROUPS = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)
GENERATED_BATCH = re.compile(r"^batch-\d+\.json$")


def alias_options(session_id: str) -> list[str]:
    """Return increasingly specific, human-readable aliases for a session ID."""
    if UUID_GROUPS.fullmatch(session_id):
        groups = session_id.split("-")
        return ["-".join(groups[:index]) for index in range(1, len(groups) + 1)]
    if len(session_id) <= 8:
        return [session_id]
    return [session_id[:index] for index in range(8, len(session_id) + 1)]


def unique_session_aliases(session_ids: Iterable[str]) -> dict[str, str]:
    """Make aliases unique by extending every alias involved in a collision."""
    options_by_id: dict[str, list[str]] = {}
    levels: dict[str, int] = {}
    for session_id in session_ids:
        if session_id in options_by_id:
            raise ValueError(f"duplicate session ID: {session_id}")
        options_by_id[session_id] = alias_options(session_id)
        levels[session_id] = 0

    while True:
        alias_to_ids: dict[str, list[str]] = {}
        for session_id, options in options_by_id.items():
            alias_to_ids.setdefault(options[levels[session_id]], []).append(session_id)
        collisions = [ids for ids in alias_to_ids.values() if len(ids) > 1]
        if not collisions:
            return {session_id: options[levels[session_id]] for session_id, options in options_by_id.items()}

        advanced = False
        for ids in collisions:
            for session_id in ids:
                next_level = levels[session_id] + 1
                if next_level < len(options_by_id[session_id]):
                    levels[session_id] = next_level
                    advanced = True
        if not advanced:
            raise ValueError("unable to create unique session aliases")


def parse_time(value: Any, timezone: ZoneInfo) -> datetime | None:
    """Parse Pi's ISO timestamps (or epoch milliseconds) into analysis timezone."""
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return datetime.fromtimestamp(value / 1000, tz=timezone)
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone)
    return parsed.astimezone(timezone)


def sanitized_snippet(text: str, limit: int = SNIPPET_LIMIT) -> str:
    """Redact credential-shaped values before collapsing candidate text."""
    redacted = BEARER_TOKEN.sub("[REDACTED]", text)
    redacted = KNOWN_SECRET.sub("[REDACTED]", redacted)
    redacted = SECRET_KEY_VALUE.sub(r"\g<prefix>[REDACTED]", redacted)
    clean = " ".join(redacted.split())
    return clean[:limit] + ("…" if len(clean) > limit else "")


def read_jsonl(path: Path) -> Iterable[tuple[int, dict[str, Any]]]:
    """Yield records without failing an entire analysis for malformed source data."""
    try:
        with path.open("r", encoding="utf-8", errors="replace") as handle:
            for line_number, line in enumerate(handle, 1):
                try:
                    value = json.loads(line)
                except json.JSONDecodeError:
                    yield line_number, {"_parse_error": True}
                    continue
                if isinstance(value, dict):
                    yield line_number, value
    except OSError:
        yield 0, {"_read_error": True}


def message_text(message: dict[str, Any]) -> str:
    content = message.get("content", "")
    if isinstance(content, str):
        return content
    if not isinstance(content, list):
        return ""
    return "\n".join(
        block.get("text", "")
        for block in content
        if isinstance(block, dict) and block.get("type") == "text" and isinstance(block.get("text"), str)
    )


def tool_calls(message: dict[str, Any]) -> list[dict[str, Any]]:
    content = message.get("content")
    if not isinstance(content, list):
        return []
    return [block for block in content if isinstance(block, dict) and block.get("type") == "toolCall"]


def top_level_files(root: Path) -> list[Path]:
    if not root.is_dir():
        return []
    return sorted(
        path
        for project_dir in root.iterdir()
        if project_dir.is_dir()
        for path in project_dir.glob("*.jsonl")
        if re.match(r"^\d{4}-\d{2}-\d{2}T", path.name)
    )


def nested_files(top: Path) -> list[Path]:
    directory = top.with_suffix("")
    if not directory.is_dir():
        return []
    return sorted(directory.rglob("session.jsonl"))


def header_for(path: Path) -> dict[str, Any]:
    for _, entry in read_jsonl(path):
        if entry.get("type") == "session":
            return entry
    return {}


def inspect_file(
    path: Path,
    source_kind: str,
    parent_alias: str,
    relative_source: str,
    start: datetime,
    end: datetime,
    timezone: ZoneInfo,
) -> tuple[Counter[str], list[dict[str, Any]], list[datetime], Counter[str], Counter[str], float, int]:
    """Read one source, retaining only window activity and candidate evidence."""
    stats: Counter[str] = Counter()
    candidates: list[dict[str, Any]] = []
    activity: list[datetime] = []
    providers: Counter[str] = Counter()
    models: Counter[str] = Counter()
    cost = 0.0
    tokens = 0

    def candidate(
        timestamp: datetime | None,
        kind: str,
        signal: str,
        *,
        tool: str = "",
        text: str = "",
    ) -> None:
        candidates.append(
            {
                "session": parent_alias,
                "timestamp": timestamp.isoformat() if timestamp else None,
                "sourceKind": source_kind,
                "source": relative_source,
                "kind": kind,
                "tool": tool or None,
                "signal": signal,
                "snippet": sanitized_snippet(text) if text else None,
            }
        )

    for line_number, entry in read_jsonl(path):
        if entry.get("_parse_error"):
            stats["parseErrors"] += 1
            candidate(None, "storage", "invalid-jsonl", text=f"line {line_number}")
            continue
        if entry.get("_read_error"):
            stats["readErrors"] += 1
            candidate(None, "storage", "read-error")
            continue

        timestamp = parse_time(entry.get("timestamp"), timezone)
        if not timestamp or not start <= timestamp < end:
            continue
        activity.append(timestamp)
        stats["entries"] += 1
        stats[f"entryType:{entry.get('type', 'unknown')}"] += 1

        if entry.get("type") == "compaction":
            stats["compactions"] += 1
        if entry.get("type") == "model_change":
            stats["modelChanges"] += 1
        if entry.get("type") != "message":
            continue

        message = entry.get("message")
        if not isinstance(message, dict):
            continue
        role = str(message.get("role", "unknown"))
        stats[f"messages:{role}"] += 1

        if role == "assistant":
            provider = str(message.get("provider") or "unknown")
            model = str(message.get("model") or "unknown")
            providers[provider] += 1
            models[f"{provider}/{model}"] += 1
            usage = message.get("usage")
            if isinstance(usage, dict):
                total_tokens = usage.get("totalTokens")
                if isinstance(total_tokens, (int, float)) and not isinstance(total_tokens, bool):
                    tokens += int(total_tokens)
                usage_cost = usage.get("cost")
                if isinstance(usage_cost, dict):
                    total_cost = usage_cost.get("total")
                    if isinstance(total_cost, (int, float)) and not isinstance(total_cost, bool):
                        cost += float(total_cost)
            stop_reason = str(message.get("stopReason") or "")
            stats[f"assistantStop:{stop_reason or 'unknown'}"] += 1
            if stop_reason in {"error", "aborted", "length"}:
                candidate(
                    timestamp,
                    "provider-runtime",
                    f"assistant-stop-{stop_reason}",
                    text=str(message.get("errorMessage") or ""),
                )
            for call in tool_calls(message):
                tool = str(call.get("name") or "unknown")
                stats["toolCalls"] += 1
                stats[f"toolCall:{tool}"] += 1

        elif role == "toolResult":
            tool = str(message.get("toolName") or "unknown")
            text = message_text(message)
            stats["toolResults"] += 1
            stats[f"toolResult:{tool}"] += 1
            if message.get("isError") is True:
                stats["toolErrors"] += 1
                candidate(timestamp, "tool", "tool-result-is-error", tool=tool, text=text)
            elif FAILURE_TEXT.search(text):
                stats["textFailureSignals"] += 1
                candidate(timestamp, "tool-or-orchestration", "failure-text-in-tool-result", tool=tool, text=text)

        elif role == "bashExecution":
            code = message.get("exitCode")
            cancelled = bool(message.get("cancelled"))
            text = str(message.get("output") or "")
            stats["bashExecutions"] += 1
            if cancelled:
                stats["bashCancelled"] += 1
                candidate(timestamp, "tool", "bash-cancelled", tool="bash", text=text)
            if isinstance(code, int) and not isinstance(code, bool) and code != 0:
                stats["bashNonzero"] += 1
                candidate(timestamp, "tool", f"bash-exit-{code}", tool="bash", text=text)

    return stats, candidates, activity, providers, models, cost, tokens


def write_text_atomically(path: Path, content: str) -> None:
    """Replace one generated file without deleting destination directories or other files."""
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent, text=True)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            handle.write(content)
        os.replace(temporary_name, path)
    except BaseException:
        Path(temporary_name).unlink(missing_ok=True)
        raise


def validate_owned_directories(root: Path) -> None:
    """Reject owned paths that could redirect generated writes."""
    for name in ("inventory", "analysis"):
        owned_directory = root / name
        if owned_directory.is_symlink():
            raise ValueError(f"owned directory must not be a symlink: {owned_directory}")
        if owned_directory.exists() and not owned_directory.is_dir():
            raise ValueError(f"owned path is not a directory: {owned_directory}")


def validate_destination(destination: Path, overwrite: bool) -> None:
    """Validate destination shape without mutating an existing snapshot."""
    if destination.is_symlink():
        raise ValueError(f"destination must not be a symlink: {destination}")
    if destination.exists() and not destination.is_dir():
        raise ValueError(f"destination is not a directory: {destination}")
    validate_owned_directories(destination)
    if destination.is_dir() and any(destination.iterdir()) and not overwrite:
        raise ValueError(f"destination is not empty: {destination}; pass --overwrite to replace generated files")


def staged_snapshot_files(
    inventory: dict[str, Any], candidates: list[dict[str, Any]], batches: list[list[dict[str, Any]]]
) -> dict[Path, str]:
    """Serialize every owned output before promotion can touch a prior snapshot."""
    files = {
        Path("inventory/session-inventory.json"): json.dumps(inventory, indent=2) + "\n",
        Path("inventory/failure-candidates.jsonl"): "".join(
            json.dumps(item, sort_keys=True) + "\n" for item in candidates
        ),
        Path("analysis/quantitative-baseline.md"): markdown_baseline(inventory),
    }
    for index, batch in enumerate(batches, 1):
        manifest = {
            "batch": index,
            "sessionCount": len(batch),
            "totalSourceBytes": sum(int(item["totalSourceBytes"]) for item in batch),
            "sessions": batch,
        }
        files[Path("inventory") / f"batch-{index:02d}.json"] = json.dumps(manifest, indent=2) + "\n"
    return files


def remove_owned_snapshot_files(staging: Path) -> None:
    """Remove prior generated files from private staging tree, never live destination."""
    inventory = staging / "inventory"
    for name in ("session-inventory.json", "failure-candidates.jsonl"):
        (inventory / name).unlink(missing_ok=True)
    if inventory.is_dir():
        for path in inventory.iterdir():
            if path.is_file() and GENERATED_BATCH.fullmatch(path.name):
                path.unlink()
    (staging / "analysis" / "quantitative-baseline.md").unlink(missing_ok=True)


def write_staged_snapshot(
    output_root: Path, destination: Path, files: dict[Path, str], overwrite: bool
) -> None:
    """Build replacement tree, then swap it into place with rollback on promotion failure."""
    output_root.mkdir(parents=True, exist_ok=True)
    if destination.parent != output_root:
        raise ValueError("destination must be a direct child of output root")
    validate_destination(destination, overwrite)

    with tempfile.TemporaryDirectory(prefix=".session-analysis-", dir=output_root) as transaction_directory:
        transaction = Path(transaction_directory)
        staging = transaction / "staging"
        if destination.exists():
            shutil.copytree(destination, staging, symlinks=True)
        else:
            staging.mkdir()
        validate_owned_directories(staging)
        remove_owned_snapshot_files(staging)
        for relative_path, content in files.items():
            if relative_path.is_absolute() or ".." in relative_path.parts:
                raise ValueError(f"generated path must stay inside destination: {relative_path}")
            write_text_atomically(staging / relative_path, content)

        directory_flags = os.O_RDONLY | getattr(os, "O_DIRECTORY", 0) | getattr(os, "O_NOFOLLOW", 0)
        output_descriptor = os.open(output_root, directory_flags)
        transaction_name = transaction.name
        staging_name = f"{transaction_name}/staging"
        backup_name = f"{transaction_name}/backup"
        had_destination = False
        try:
            try:
                destination_mode = os.stat(
                    destination.name,
                    dir_fd=output_descriptor,
                    follow_symlinks=False,
                ).st_mode
            except FileNotFoundError:
                pass
            else:
                if not stat.S_ISDIR(destination_mode):
                    raise ValueError(f"destination must not be a symlink or non-directory: {destination}")
                had_destination = True
                os.rename(
                    destination.name,
                    backup_name,
                    src_dir_fd=output_descriptor,
                    dst_dir_fd=output_descriptor,
                )

            try:
                os.rename(
                    staging_name,
                    destination.name,
                    src_dir_fd=output_descriptor,
                    dst_dir_fd=output_descriptor,
                )
            except BaseException:
                if had_destination:
                    os.rename(
                        backup_name,
                        destination.name,
                        src_dir_fd=output_descriptor,
                        dst_dir_fd=output_descriptor,
                    )
                raise
        finally:
            os.close(output_descriptor)


def balanced_batches(sessions: list[dict[str, Any]], requested_count: int) -> tuple[list[list[dict[str, Any]]], list[int]]:
    """Use largest-first placement to balance reviewer file-byte load."""
    batch_count = min(max(1, requested_count), max(1, len(sessions)))
    batches: list[list[dict[str, Any]]] = [[] for _ in range(batch_count)]
    weights = [0] * batch_count
    for session in sorted(sessions, key=lambda item: (int(item["totalSourceBytes"]), item["session"]), reverse=True):
        index = min(range(batch_count), key=lambda value: weights[value])
        batches[index].append(session)
        weights[index] += int(session["totalSourceBytes"])
    return batches, weights


def markdown_baseline(inventory: dict[str, Any]) -> str:
    """Render quantitative evidence only; qualitative root cause still needs review."""
    window = inventory["window"]
    lines = [
        "# Weekly Pi session quantitative baseline",
        "",
        f"Window: `{window['startInclusive']}` through `{window['endExclusive']}` (end exclusive).",
        "",
        "## Totals",
        "",
        f"- Top-level sessions active: {inventory['topLevelSessionCount']}",
        f"- Nested runs attached to included sessions: {inventory['nestedRunCount']}",
        f"- Failure candidates: {inventory['candidateFailureCount']}",
        f"- Scan complete: {'yes' if inventory['complete'] else 'no'}",
        f"- Scan issues: {inventory['scanIssueCount']}",
        f"- Assistant tokens: {inventory['windowTokens']}",
        f"- Assistant cost: {inventory['windowCost']:.6f}",
        f"- Review batches: {inventory['batchCount']}",
        "",
        "## Activity by day",
        "",
    ]
    by_day = inventory["sessionsByActiveDay"]
    lines.extend([f"- {day}: {count}" for day, count in by_day.items()] or ["- None"])
    lines.extend(["", "## Aggregate event statistics", ""])
    aggregate = inventory["aggregateStats"]
    lines.extend([f"- {name}: {count}" for name, count in aggregate.items()] or ["- None"])
    lines.extend(
        [
            "",
            "## Review boundary",
            "",
            "Counts and failure candidates are triage evidence, not qualitative conclusions. "
            "Read assigned batch manifests and original local session logs before diagnosing causes or changing settings.",
            "",
        ]
    )
    return "\n".join(lines)


def parse_date(value: str, label: str, parser: argparse.ArgumentParser) -> date:
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        parser.error(f"{label} must use YYYY-MM-DD")
    try:
        return date.fromisoformat(value)
    except ValueError:
        parser.error(f"{label} must use YYYY-MM-DD")


def parse_arguments() -> tuple[argparse.Namespace, date, date, ZoneInfo]:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--week-ending", metavar="YYYY-MM-DD", help="Sunday ending prior Sunday-Saturday window")
    mode.add_argument("--start", metavar="YYYY-MM-DD", help="inclusive analysis start date")
    parser.add_argument("--end", metavar="YYYY-MM-DD", help="exclusive analysis end date; required with --start")
    parser.add_argument("--timezone", default="America/New_York", help="IANA timezone (default: America/New_York)")
    parser.add_argument("--root", default=DEFAULT_ROOT, help="Pi session root (default: ~/.pi/agent/sessions)")
    parser.add_argument(
        "--output-root",
        default=str(DEFAULT_OUTPUT_ROOT),
        help="local output root; custom locations are not covered by repository ignore",
    )
    parser.add_argument("--batches", type=int, default=8, help="maximum balanced review batches (default: 8)")
    parser.add_argument("--overwrite", action="store_true", help="replace this tool's existing generated files")
    args = parser.parse_args()

    if args.week_ending and args.end:
        parser.error("--end cannot be used with --week-ending")
    if not args.week_ending and not args.start:
        parser.error("provide --week-ending or paired --start and --end")
    if args.start and not args.end:
        parser.error("--start requires --end")
    if args.end and not args.start:
        parser.error("--end requires --start")
    if args.batches < 1:
        parser.error("--batches must be at least 1")
    try:
        timezone = ZoneInfo(args.timezone)
    except ZoneInfoNotFoundError:
        parser.error(f"unknown timezone: {args.timezone}")

    if args.week_ending:
        end_date = parse_date(args.week_ending, "--week-ending", parser)
        if end_date.weekday() != 6:
            parser.error("--week-ending must be a Sunday")
        start_date = end_date - timedelta(days=7)
    else:
        start_date = parse_date(args.start, "--start", parser)
        end_date = parse_date(args.end, "--end", parser)
        if end_date <= start_date:
            parser.error("--end must be after --start")
    return args, start_date, end_date, timezone


def main() -> None:
    args, start_date, end_date, timezone = parse_arguments()
    start = datetime.combine(start_date, datetime.min.time(), tzinfo=timezone)
    end = datetime.combine(end_date, datetime.min.time(), tzinfo=timezone)
    root = Path(args.root).expanduser().resolve()
    if not root.is_dir():
        raise SystemExit(f"error: session root is not a directory: {root}")
    output_root = Path(args.output_root).expanduser().resolve()
    if output_root != DEFAULT_OUTPUT_ROOT.resolve():
        print(
            "warning: custom --output-root is not covered by repository ignore; "
            "keep it private and independently ignored",
            file=sys.stderr,
        )
    inclusive_end = end_date - timedelta(days=1)
    destination = output_root / f"{start_date.isoformat()}--{inclusive_end.isoformat()}"

    try:
        validate_destination(destination, args.overwrite)
    except ValueError as error:
        raise SystemExit(f"error: {error}") from error

    headers = [(top, header_for(top)) for top in top_level_files(root)]
    session_ids = [str(header.get("id") or top.stem.rsplit("_", 1)[-1]) for top, header in headers]
    try:
        aliases = unique_session_aliases(session_ids)
    except ValueError as error:
        raise SystemExit(f"error: {error}") from error

    sessions: list[dict[str, Any]] = []
    all_candidates: list[dict[str, Any]] = []
    aggregate: Counter[str] = Counter()
    by_day: Counter[str] = Counter()
    by_project: Counter[str] = Counter()
    by_provider: Counter[str] = Counter()
    by_model: Counter[str] = Counter()
    total_cost = 0.0
    total_tokens = 0
    scan_issues: list[dict[str, Any]] = []

    for top, header in headers:
        session_id = str(header.get("id") or top.stem.rsplit("_", 1)[-1])
        session_alias = aliases[session_id]
        nested = nested_files(top)
        sources = [(top, "top", top.name)] + [
            (path, "nested", str(path.relative_to(top.parent))) for path in nested
        ]
        session_stats: Counter[str] = Counter()
        session_candidates: list[dict[str, Any]] = []
        activity: list[datetime] = []
        providers: Counter[str] = Counter()
        models: Counter[str] = Counter()
        cost = 0.0
        tokens = 0

        for path, kind, relative_source in sources:
            stats, candidates, times, file_providers, file_models, file_cost, file_tokens = inspect_file(
                path, kind, session_alias, relative_source, start, end, timezone
            )
            session_stats.update(stats)
            session_candidates.extend(candidates)
            activity.extend(times)
            parse_errors = int(stats["parseErrors"])
            read_errors = int(stats["readErrors"])
            if parse_errors or read_errors:
                scan_issues.append(
                    {
                        "session": session_alias,
                        "sessionId": session_id,
                        "sourceKind": kind,
                        "source": str(path),
                        "relativeSource": relative_source,
                        "parseErrors": parse_errors,
                        "readErrors": read_errors,
                    }
                )
            providers.update(file_providers)
            models.update(file_models)
            cost += file_cost
            tokens += file_tokens

        # Inclusion is based on any timestamped parent or nested activity, rather
        # than top-file creation date; nested agents often run days after parent.
        if not activity:
            continue
        created = parse_time(header.get("timestamp"), timezone)
        total_source_bytes = sum(path.stat().st_size for path, _, _ in sources if path.exists())
        record = {
            "session": session_alias,
            "sessionId": session_id,
            "topFile": str(top),
            "cwd": str(header.get("cwd") or "unknown"),
            "projectKey": top.parent.name,
            "createdAt": created.isoformat() if created else None,
            "windowActivityStart": min(activity).isoformat(),
            "windowActivityEnd": max(activity).isoformat(),
            "activeDays": sorted({value.date().isoformat() for value in activity}),
            "nestedRunCount": len(nested),
            "nestedFiles": [str(path) for path in nested],
            "totalSourceBytes": total_source_bytes,
            "stats": dict(sorted(session_stats.items())),
            "providers": dict(providers.most_common()),
            "models": dict(models.most_common()),
            "windowTokens": tokens,
            "windowCost": round(cost, 6),
            "candidateFailureCount": len(session_candidates),
        }
        sessions.append(record)
        all_candidates.extend(session_candidates)
        aggregate.update(session_stats)
        for day in record["activeDays"]:
            by_day[day] += 1
        by_project[record["cwd"]] += 1
        by_provider.update(providers)
        by_model.update(models)
        total_cost += cost
        total_tokens += tokens

    sessions.sort(key=lambda item: (item["windowActivityStart"], item["session"]))
    all_candidates.sort(key=lambda item: (item.get("timestamp") or "", item["session"], item["source"]))
    batches, weights = balanced_batches(sessions, args.batches)
    inventory = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(tz=timezone).isoformat(),
        "sourceRoot": str(root),
        "window": {"startInclusive": start.isoformat(), "endExclusive": end.isoformat()},
        "inclusionRule": "top-level session or its nested runs has at least one timestamped entry in window",
        "complete": not scan_issues,
        "scanIssueCount": len(scan_issues),
        "scanIssues": scan_issues,
        "topLevelSessionCount": len(sessions),
        "nestedRunCount": sum(item["nestedRunCount"] for item in sessions),
        "candidateFailureCount": len(all_candidates),
        "windowTokens": total_tokens,
        "windowCost": round(total_cost, 6),
        "aggregateStats": dict(sorted(aggregate.items())),
        "sessionsByActiveDay": dict(sorted(by_day.items())),
        "sessionsByProject": dict(by_project.most_common()),
        "assistantMessagesByProvider": dict(by_provider.most_common()),
        "assistantMessagesByModel": dict(by_model.most_common()),
        "batchCount": len(batches),
        "batchWeightsBytes": weights,
        "sessions": sessions,
    }

    files = staged_snapshot_files(inventory, all_candidates, batches)
    write_staged_snapshot(output_root, destination, files, args.overwrite)

    print(
        json.dumps(
            {
                "destination": str(destination),
                "sessions": len(sessions),
                "nestedRuns": inventory["nestedRunCount"],
                "candidates": len(all_candidates),
                "tokens": total_tokens,
                "cost": inventory["windowCost"],
                "batches": len(batches),
                "batchWeightsBytes": weights,
                "complete": inventory["complete"],
                "scanIssueCount": inventory["scanIssueCount"],
            },
            indent=2,
        )
    )
    if scan_issues:
        raise SystemExit(
            f"error: analysis incomplete: {len(scan_issues)} source(s) could not be fully read or parsed; "
            f"inventory written to {destination}"
        )


if __name__ == "__main__":
    main()
