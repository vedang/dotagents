import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const CONFIG_PATHS = [
  new URL("../../.pi/damage-control.yaml", import.meta.url),
  new URL("../../extension_config/damage-control/config.yaml", import.meta.url),
];

const DEPENDENCY_MUTATION_RULE_IDS = [
  "package-mutation",
  "uv-add-remove",
  "uv-pip-install",
];

function ruleBlock(config: string, ruleId: string): string {
  const marker = `  - id: ${ruleId}\n`;
  const start = config.indexOf(marker);
  expect(start, `missing ${ruleId}`).toBeGreaterThanOrEqual(0);

  const nextRule = config.indexOf("\n  - id: ", start + marker.length);
  return config.slice(start, nextRule === -1 ? config.length : nextRule);
}

test("dependency mutation safeguards stay active in both config mirrors", () => {
  for (const configPath of CONFIG_PATHS) {
    const config = readFileSync(configPath, "utf8");

    for (const ruleId of DEPENDENCY_MUTATION_RULE_IDS) {
      const rule = ruleBlock(config, ruleId);
      expect(rule, `${configPath.pathname}: ${ruleId}`).toMatch(
        /^ {4}action: block$/m,
      );
      expect(rule, `${configPath.pathname}: ${ruleId}`).not.toMatch(
        /^ {4}enabled: false$/m,
      );
    }
  }
});
