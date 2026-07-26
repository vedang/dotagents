#!/usr/bin/env python3
"""Tests for reusable weekly Pi session analysis."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts.session_analysis import sanitized_snippet, unique_session_aliases, write_staged_snapshot

SCRIPT = Path(__file__).with_name("session_analysis.py")
SESSION_ID = "11111111-2222-4333-8444-555555555555"


def write_jsonl(path: Path, entries: list[dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(entry) + "\n" for entry in entries))


class SessionAnalysisCliTest(unittest.TestCase):
    def run_script(self, *args: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(SCRIPT), *args],
            check=False,
            capture_output=True,
            text=True,
        )

    def test_weekly_analysis_includes_old_parent_with_nested_activity(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            temporary = Path(temporary_directory)
            sessions_root = temporary / "sessions"
            project = sessions_root / "--tmp-project--"
            top = project / f"2026-07-01T09-00-00_{SESSION_ID}.jsonl"
            nested = top.with_suffix("") / "worker" / "session.jsonl"

            write_jsonl(
                top,
                [
                    {
                        "type": "session",
                        "version": 3,
                        "id": SESSION_ID,
                        "timestamp": "2026-07-01T13:00:00.000Z",
                        "cwd": "/private/client-project",
                    },
                    {
                        "type": "message",
                        "id": "outside01",
                        "parentId": None,
                        "timestamp": "2026-07-01T13:01:00.000Z",
                        "message": {"role": "user", "content": "old activity"},
                    },
                ],
            )
            write_jsonl(
                nested,
                [
                    {
                        "type": "session",
                        "version": 3,
                        "id": "child-session",
                        "timestamp": "2026-07-20T13:00:00.000Z",
                        "cwd": "/private/client-project",
                    },
                    {
                        "type": "message",
                        "id": "inside01",
                        "parentId": None,
                        "timestamp": "2026-07-20T13:01:00.000Z",
                        "message": {
                            "role": "assistant",
                            "provider": "test-provider",
                            "model": "test-model",
                            "content": [],
                            "usage": {
                                "totalTokens": 42,
                                "cost": {"total": 0.25},
                            },
                            "stopReason": "toolUse",
                        },
                    },
                    {
                        "type": "message",
                        "id": "inside02",
                        "parentId": "inside01",
                        "timestamp": "2026-07-20T13:02:00.000Z",
                        "message": {
                            "role": "toolResult",
                            "toolName": "bash",
                            "content": [
                                {
                                    "type": "text",
                                    "text": "error authorization: Bearer abcdefghijklmnop",
                                }
                            ],
                            "isError": True,
                        },
                    },
                ],
            )

            result = self.run_script(
                "--week-ending",
                "2026-07-26",
                "--timezone",
                "America/New_York",
                "--root",
                str(sessions_root),
                "--output-root",
                str(temporary / "output"),
                "--batches",
                "2",
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("not covered by repository ignore", result.stderr)
            output = temporary / "output" / "2026-07-19--2026-07-25"
            inventory = json.loads((output / "inventory" / "session-inventory.json").read_text())
            candidates = [
                json.loads(line)
                for line in (output / "inventory" / "failure-candidates.jsonl").read_text().splitlines()
            ]

            self.assertEqual(inventory["topLevelSessionCount"], 1)
            self.assertEqual(inventory["nestedRunCount"], 1)
            self.assertEqual(inventory["window"]["startInclusive"], "2026-07-19T00:00:00-04:00")
            self.assertEqual(inventory["window"]["endExclusive"], "2026-07-26T00:00:00-04:00")
            self.assertEqual(inventory["sessions"][0]["session"], "11111111")
            self.assertEqual(inventory["windowTokens"], 42)
            self.assertEqual(inventory["windowCost"], 0.25)
            self.assertEqual(candidates[0]["snippet"], "error authorization: [REDACTED]")
            self.assertTrue((output / "inventory" / "batch-01.json").is_file())
            self.assertTrue((output / "analysis" / "quantitative-baseline.md").is_file())

    def test_compact_date_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            result = self.run_script(
                "--week-ending",
                "20260726",
                "--root",
                temporary_directory,
                "--output-root",
                str(Path(temporary_directory) / "output"),
            )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("YYYY-MM-DD", result.stderr)

    def test_week_ending_must_be_sunday(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            result = self.run_script(
                "--week-ending",
                "2026-07-25",
                "--root",
                temporary_directory,
                "--output-root",
                str(Path(temporary_directory) / "output"),
            )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Sunday", result.stderr)

    def test_missing_session_root_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            temporary = Path(temporary_directory)
            result = self.run_script(
                "--week-ending",
                "2026-07-26",
                "--root",
                str(temporary / "missing-sessions"),
                "--output-root",
                str(temporary / "output"),
            )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("session root", result.stderr)

    def test_malformed_source_marks_audit_incomplete(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            temporary = Path(temporary_directory)
            sessions_root = temporary / "sessions"
            top = sessions_root / "--tmp-project--" / f"2026-07-20T09-00-00_{SESSION_ID}.jsonl"
            top.parent.mkdir(parents=True)
            top.write_text("{not-json}\n")

            result = self.run_script(
                "--week-ending",
                "2026-07-26",
                "--root",
                str(sessions_root),
                "--output-root",
                str(temporary / "output"),
            )

            output = temporary / "output" / "2026-07-19--2026-07-25"
            inventory = json.loads((output / "inventory" / "session-inventory.json").read_text())

        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(inventory["complete"])
        self.assertEqual(inventory["scanIssueCount"], 1)
        self.assertEqual(inventory["scanIssues"][0]["parseErrors"], 1)

    def test_nonempty_destination_requires_overwrite(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            temporary = Path(temporary_directory)
            sessions_root = temporary / "sessions"
            sessions_root.mkdir()
            destination = temporary / "output" / "2026-07-19--2026-07-25"
            destination.mkdir(parents=True)
            (destination / "keep.txt").write_text("do not mix snapshots\n")

            result = self.run_script(
                "--week-ending",
                "2026-07-26",
                "--root",
                str(sessions_root),
                "--output-root",
                str(temporary / "output"),
            )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("--overwrite", result.stderr)

    def test_failed_overwrite_preserves_last_good_snapshot(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            temporary = Path(temporary_directory)
            sessions_root = temporary / "sessions"
            project = sessions_root / "--tmp-project--"
            for index in (1, 2):
                write_jsonl(
                    project / f"2026-07-20T09-00-0{index}_{index}.jsonl",
                    [
                        {
                            "type": "session",
                            "version": 3,
                            "id": SESSION_ID,
                            "timestamp": "2026-07-20T13:00:00.000Z",
                            "cwd": "/private/client-project",
                        }
                    ],
                )
            destination = temporary / "output" / "2026-07-19--2026-07-25"
            inventory_path = destination / "inventory" / "session-inventory.json"
            inventory_path.parent.mkdir(parents=True)
            inventory_path.write_text('{"snapshot":"last-good"}\n')

            result = self.run_script(
                "--week-ending",
                "2026-07-26",
                "--root",
                str(sessions_root),
                "--output-root",
                str(temporary / "output"),
                "--overwrite",
            )

            preserved = inventory_path.read_text()

        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(preserved, '{"snapshot":"last-good"}\n')

    def test_overwrite_removes_all_stale_batches_but_keeps_unrelated_files(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            temporary = Path(temporary_directory)
            sessions_root = temporary / "sessions"
            sessions_root.mkdir()
            destination = temporary / "output" / "2026-07-19--2026-07-25"
            inventory = destination / "inventory"
            inventory.mkdir(parents=True)
            (inventory / "batch-100.json").write_text("stale\n")
            unrelated = destination / "keep.txt"
            unrelated.write_text("keep\n")

            result = self.run_script(
                "--week-ending",
                "2026-07-26",
                "--root",
                str(sessions_root),
                "--output-root",
                str(temporary / "output"),
                "--overwrite",
            )

            stale_exists = (inventory / "batch-100.json").exists()
            unrelated_content = unrelated.read_text()

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(stale_exists)
        self.assertEqual(unrelated_content, "keep\n")


class SnapshotTransactionTest(unittest.TestCase):
    def test_mid_promotion_failure_rolls_back_last_good_snapshot(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            output_root = Path(temporary_directory)
            destination = output_root / "2026-07-19--2026-07-25"
            inventory = destination / "inventory" / "session-inventory.json"
            baseline = destination / "analysis" / "quantitative-baseline.md"
            inventory.parent.mkdir(parents=True)
            baseline.parent.mkdir(parents=True)
            inventory.write_text("last-good inventory\n")
            baseline.write_text("last-good baseline\n")
            files = {
                Path("inventory/session-inventory.json"): "new inventory\n",
                Path("analysis/quantitative-baseline.md"): "new baseline\n",
            }
            real_rename = os.rename
            rename_calls = 0

            def fail_second_rename(*args: object, **kwargs: object) -> None:
                nonlocal rename_calls
                rename_calls += 1
                if rename_calls == 2:
                    raise OSError("injected promotion failure")
                real_rename(*args, **kwargs)

            with patch("scripts.session_analysis.os.rename", side_effect=fail_second_rename):
                with self.assertRaisesRegex(OSError, "injected promotion failure"):
                    write_staged_snapshot(output_root, destination, files, overwrite=True)

            self.assertEqual(inventory.read_text(), "last-good inventory\n")
            self.assertEqual(baseline.read_text(), "last-good baseline\n")

    def test_promotion_rejects_destination_symlink_at_use_time(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            temporary = Path(temporary_directory)
            output_root = temporary / "output"
            output_root.mkdir()
            external = temporary / "external"
            external_inventory = external / "inventory" / "session-inventory.json"
            external_inventory.parent.mkdir(parents=True)
            external_inventory.write_text("external\n")
            destination = output_root / "2026-07-19--2026-07-25"
            destination.symlink_to(external, target_is_directory=True)
            files = {Path("inventory/session-inventory.json"): "new inventory\n"}

            with self.assertRaisesRegex(ValueError, "symlink"):
                write_staged_snapshot(output_root, destination, files, overwrite=True)

            self.assertEqual(external_inventory.read_text(), "external\n")


class SecretRedactionTest(unittest.TestCase):
    def test_redacts_common_credential_forms(self) -> None:
        cases = {
            'error {"api_key":"plain-secret"}': "plain-secret",
            "error authorization: Basic dXNlcjpwYXNz": "dXNlcjpwYXNz",
            'error password = "correct horse battery staple"': "correct horse battery staple",
            "error authorization: Bearer abcdefghijklmnop": "abcdefghijklmnop",
        }

        for source, leaked_value in cases.items():
            with self.subTest(source=source):
                redacted = sanitized_snippet(source)
                self.assertNotIn(leaked_value, redacted)
                self.assertIn("[REDACTED]", redacted)


class UniqueSessionAliasesTest(unittest.TestCase):
    def test_expands_only_colliding_uuid_prefixes(self) -> None:
        first = "aaaaaaaa-1111-4aaa-8aaa-000000000001"
        second = "aaaaaaaa-2222-4aaa-8aaa-000000000002"
        unique = "bbbbbbbb-3333-4bbb-8bbb-000000000003"

        aliases = unique_session_aliases([first, second, unique])

        self.assertEqual(aliases[first], "aaaaaaaa-1111")
        self.assertEqual(aliases[second], "aaaaaaaa-2222")
        self.assertEqual(aliases[unique], "bbbbbbbb")
        self.assertEqual(len(set(aliases.values())), 3)

    def test_rejects_duplicate_full_session_ids(self) -> None:
        with self.assertRaisesRegex(ValueError, "duplicate session ID"):
            unique_session_aliases([SESSION_ID, SESSION_ID])


if __name__ == "__main__":
    unittest.main()
