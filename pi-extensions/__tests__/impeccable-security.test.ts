import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "vitest";

const repoRoot = join(import.meta.dirname, "../..");

test("impeccable generated-file helper avoids shell-string execSync", () => {
  const source = readFileSync(
    join(repoRoot, "skills/impeccable/scripts/is-generated.mjs"),
    "utf8",
  );

  assert.ok(
    !source.includes("execSync"),
    "use an argument-vector child process API instead of shell-string execSync",
  );
});
