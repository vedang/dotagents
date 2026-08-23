import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import Ajv2020, {
  type AnySchema,
  type ValidateFunction,
} from "ajv/dist/2020.js";
import { describe, test } from "vitest";

const dotagentsRoot = join(import.meta.dirname, "..");
const fixturesRoot = join(dotagentsRoot, "__fixtures__");

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readFixture(name: string): unknown {
  return readJson(join(fixturesRoot, name));
}

function compileSchema(name: string): ValidateFunction {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  return ajv.compile(readJson(join(dotagentsRoot, name)) as AnySchema);
}

function removeProperty(object: Record<string, unknown>, key: string): void {
  Reflect.deleteProperty(object, key);
}

function cloneFixture<T>(name: string): T {
  return structuredClone(readFixture(name)) as T;
}

function assertValid(validate: ValidateFunction, value: unknown): void {
  assert.equal(
    validate(value),
    true,
    `expected schema-valid value, got ${JSON.stringify(validate.errors)}`,
  );
}

function assertInvalid(
  validate: ValidateFunction,
  value: unknown,
  keyword?: string,
): void {
  assert.equal(validate(value), false, "expected schema-invalid value");
  if (keyword) {
    assert.ok(
      validate.errors?.some((error) => error.keyword === keyword),
      `expected ${keyword} error, got ${JSON.stringify(validate.errors)}`,
    );
  }
}

type MutableCatalog = {
  metadata: Record<string, unknown>;
  projects: Array<Record<string, unknown>>;
  licenses: Array<Record<string, unknown>>;
  entries: Array<Record<string, unknown> & { source: Record<string, unknown> }>;
};

describe("Dotagents JSON schemas", () => {
  test("accept the canonical positive fixtures", () => {
    assertValid(
      compileSchema("catalog.schema.json"),
      readFixture("valid-catalog.json"),
    );
    assertValid(
      compileSchema("detail.schema.json"),
      readFixture("valid-detail.json"),
    );
    assertValid(
      compileSchema("evidence.schema.json"),
      readFixture("valid-evidence.json"),
    );
    assertValid(
      compileSchema("coverage.schema.json"),
      readFixture("valid-coverage.json"),
    );
  });

  test("close catalog, detail, and evidence objects to unknown fields", () => {
    assertInvalid(
      compileSchema("catalog.schema.json"),
      readFixture("invalid-catalog-unknown-field.json"),
      "additionalProperties",
    );
    assertInvalid(
      compileSchema("detail.schema.json"),
      readFixture("invalid-detail-unknown-field.json"),
      "additionalProperties",
    );

    const evidence = cloneFixture<Record<string, unknown>>(
      "valid-evidence.json",
    );
    evidence.privateNotes = "never public";
    assertInvalid(
      compileSchema("evidence.schema.json"),
      evidence,
      "additionalProperties",
    );

    const coverage = cloneFixture<Record<string, unknown>>(
      "valid-coverage.json",
    );
    coverage.discovered = ["private/session"];
    assertInvalid(
      compileSchema("coverage.schema.json"),
      coverage,
      "additionalProperties",
    );
  });

  test("reject unsupported schema versions", () => {
    const cases = [
      ["catalog.schema.json", "valid-catalog.json"],
      ["detail.schema.json", "valid-detail.json"],
      ["evidence.schema.json", "valid-evidence.json"],
    ] as const;

    for (const [schemaName, fixtureName] of cases) {
      const value = cloneFixture<Record<string, unknown>>(fixtureName);
      value.schemaVersion = 2;
      assertInvalid(compileSchema(schemaName), value, "const");
    }
  });

  test("require complete project, license, and entry layers", () => {
    const validate = compileSchema("catalog.schema.json");
    const cases: Array<[string, (catalog: MutableCatalog) => void]> = [
      [
        "project maintainers",
        (catalog) => removeProperty(catalog.projects[0], "currentMaintainers"),
      ],
      [
        "license publication scope",
        (catalog) => removeProperty(catalog.licenses[0], "publicationScope"),
      ],
      [
        "entry compatibility",
        (catalog) => removeProperty(catalog.entries[0], "compatibility"),
      ],
    ];

    for (const [label, mutate] of cases) {
      const catalog = cloneFixture<MutableCatalog>("valid-catalog.json");
      mutate(catalog);
      assertInvalid(validate, catalog, "required");
      assert.ok(validate.errors, `${label} should produce schema errors`);
    }
  });

  test("require HTTPS public and license-evidence URLs", () => {
    const validate = compileSchema("catalog.schema.json");
    const cases: Array<(catalog: MutableCatalog) => void> = [
      (catalog) => {
        catalog.metadata.repository = "github.com/vedang/dotagents";
      },
      (catalog) => {
        catalog.projects[0].canonicalUrl = "javascript:alert(1)";
      },
      (catalog) => {
        catalog.projects[0].upstreamUrl = "http://example.com/handoff";
      },
      (catalog) => {
        catalog.licenses[0].evidence = {
          type: "url",
          value: "LICENSE.txt",
        };
      },
    ];

    for (const mutate of cases) {
      const catalog = cloneFixture<MutableCatalog>("valid-catalog.json");
      mutate(catalog);
      assertInvalid(validate, catalog);
    }
  });

  test("constrain contract enums and constants", () => {
    const validateCatalog = compileSchema("catalog.schema.json");
    const cases: Array<(catalog: MutableCatalog) => void> = [
      (catalog) => {
        catalog.projects[0].relationship = "mirror";
      },
      (catalog) => {
        catalog.licenses[0].scheme = "freeform";
      },
      (catalog) => {
        catalog.entries[0].kind = "agent";
      },
      (catalog) => {
        catalog.entries[0].delivery = "filesystem";
      },
      (catalog) => {
        catalog.entries[0].activation = ["ambient-magic"];
      },
      (catalog) => {
        catalog.entries[0].publication = "private";
      },
    ];

    for (const mutate of cases) {
      const catalog = cloneFixture<MutableCatalog>("valid-catalog.json");
      mutate(catalog);
      assertInvalid(validateCatalog, catalog, "enum");
    }

    const evidence = cloneFixture<{
      verifiedAgainst: Record<string, unknown>;
    }>("valid-evidence.json");
    evidence.verifiedAgainst.type = "tag";
    assertInvalid(compileSchema("evidence.schema.json"), evidence, "const");
  });

  test("bind each delivery mode to its source shape", () => {
    const validate = compileSchema("catalog.schema.json");
    const local = cloneFixture<MutableCatalog>("valid-catalog.json");
    local.entries[0].source = { locator: "git:github.com/example/handoff" };
    assertInvalid(validate, local);

    const gitPackage = cloneFixture<MutableCatalog>("valid-catalog.json");
    gitPackage.entries[0].delivery = "git-package";
    assertInvalid(validate, gitPackage);
    gitPackage.entries[0].source = {
      locator: "git:github.com/example/handoff",
    };
    assertValid(validate, gitPackage);

    const npmPackage = cloneFixture<MutableCatalog>("valid-catalog.json");
    npmPackage.entries[0].delivery = "npm-package";
    npmPackage.entries[0].source = { locator: "npm:@example/handoff" };
    assertValid(validate, npmPackage);
  });

  test("require detail and evidence only for featured entries", () => {
    const validate = compileSchema("catalog.schema.json");
    const featured = cloneFixture<MutableCatalog>("valid-catalog.json");
    removeProperty(featured.entries[0], "detailPath");
    assertInvalid(validate, featured, "required");

    const listed = cloneFixture<MutableCatalog>("valid-catalog.json");
    listed.entries[0].publication = "listed";
    assertInvalid(validate, listed);

    removeProperty(listed.entries[0], "detailPath");
    removeProperty(listed.entries[0], "evidencePath");
    listed.entries[0].limitation = "Review output before relying on it.";
    assertValid(validate, listed);
  });

  test("require approved limitation wording for listed entries", () => {
    const validate = compileSchema("catalog.schema.json");
    const listed = cloneFixture<MutableCatalog>("valid-catalog.json");
    listed.entries[0].publication = "listed";
    removeProperty(listed.entries[0], "detailPath");
    removeProperty(listed.entries[0], "evidencePath");
    assertInvalid(validate, listed, "required");

    listed.entries[0].limitation = "Review output before relying on it.";
    assertValid(validate, listed);

    const catalog = readJson(join(dotagentsRoot, "catalog.json")) as {
      entries: Array<{
        id: string;
        limitation?: string;
        publication: "featured" | "listed";
      }>;
    };
    const actual = Object.fromEntries(
      catalog.entries
        .filter((entry) => entry.publication === "listed")
        .map((entry) => [entry.id, entry.limitation]),
    );
    assert.deepEqual(actual, {
      "extension/mac-system-theme":
        "macOS-only; AppleScript failures fall back to light, and appearance is polled every two seconds.",
      "extension/notify":
        "Terminal support is heuristic, notification failures are not surfaced, and this local copy still triggers on `agent_end` rather than newer upstream settled semantics.",
      "extension/status-line":
        "Display state is process-local, uses a fixed status key, and is a compact activity indicator rather than durable telemetry.",
    });
  });

  test("keep details structured as plain strings and arrays", () => {
    const validate = compileSchema("detail.schema.json");
    assertInvalid(
      validate,
      readFixture("invalid-detail-unknown-field.json"),
      "additionalProperties",
    );

    const detail = cloneFixture<Record<string, unknown>>("valid-detail.json");
    detail.whatItDoes = [{ html: "<strong>unsafe</strong>" }];
    assertInvalid(validate, detail, "type");
  });

  test("require each evidence claim to choose local lines or immutable URL", () => {
    const validate = compileSchema("evidence.schema.json");
    assertInvalid(
      validate,
      readFixture("invalid-evidence-source.json"),
      "required",
    );

    const evidence = cloneFixture<{
      claims: Array<Record<string, unknown>>;
    }>("valid-evidence.json");
    evidence.claims[0] = {
      claim: "Registers a command.",
      sourceUrl:
        "https://github.com/example/handoff/blob/0123456789abcdef0123456789abcdef01234567/src/index.ts#L10-L20",
    };
    assertValid(validate, evidence);

    evidence.claims[0].sourceUrl =
      "https://github.com/example/handoff/blob/main/src/index.ts#L10-L20";
    assertInvalid(validate, evidence, "pattern");

    evidence.claims[0].sourceUrl =
      "https://github.com/example/handoff/blob/0123456789abcdef0123456789abcdef01234567/src/index.ts#L10-L20";
    evidence.claims[0].sourcePath = "pi-extensions/handoff.ts";
    evidence.claims[0].sourceLines = "96-180";
    assertInvalid(validate, evidence);
  });
});
