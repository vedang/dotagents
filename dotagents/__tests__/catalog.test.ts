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
const publishedPackageLocators = [
  "git:github.com/ghoseb/pi-askuserquestion",
  "git:github.com/mattleong/pi-better-openai",
  "git:github.com/unravel-team/denote-mono",
  "git:github.com/vedang/caveman",
  "git:github.com/vedang/chrome-cdp-skill",
  "git:github.com/vedang/pi-adr",
  "git:github.com/vedang/pi-boomerang",
  "git:github.com/vedang/pi-btw",
  "git:github.com/vedang/pi-exa",
  "git:github.com/vedang/pi-prompt-history",
  "git:github.com/vedang/pi-quizme",
  "git:github.com/vedang/pi-review-code",
  "git:github.com/vedang/pi-simplify-code",
  "git:github.com/Whamp/pi-read-map",
  "npm:pi-interactive-shell",
  "npm:pi-intercom",
] as const;
const blockedPackageLocators = [
  "git:github.com/ghoseb/pi-damage-control",
  "git:github.com/unravel-team/dafny-estimation",
  "git:github.com/unravel-team/unravel-proposal-creator",
  "git:github.com/unravel-team/thing.git",
  "git:github.com/vedang/shaping-skills",
] as const;

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

  test("accepts only reviewed launch SPDX identifiers", () => {
    const validate = compileSchema("catalog.schema.json");
    for (const identifier of ["MIT", "WTFPL"]) {
      const catalog = cloneFixture<MutableCatalog>("valid-catalog.json");
      catalog.licenses[0].identifier = identifier;
      assertValid(validate, catalog);
    }

    const custom = cloneFixture<MutableCatalog>("valid-catalog.json");
    custom.licenses[0].scheme = "custom";
    custom.licenses[0].identifier = "Reviewed custom terms";
    assertValid(validate, custom);

    const unsupported = cloneFixture<MutableCatalog>("valid-catalog.json");
    unsupported.licenses[0].identifier = "WTFPL-2.0";
    assertInvalid(validate, unsupported, "enum");
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

  test("bind each delivery mode to its complete source shape", () => {
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
    assertInvalid(validate, gitPackage, "required");
    gitPackage.entries[0].source.path = "src/index.ts";
    assertValid(validate, gitPackage);

    const npmPackage = cloneFixture<MutableCatalog>("valid-catalog.json");
    npmPackage.entries[0].delivery = "npm-package";
    npmPackage.entries[0].source = { locator: "npm:@example/handoff" };
    assertInvalid(validate, npmPackage, "required");
    npmPackage.entries[0].source.path = "dist/index.js";
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
  });

  test("publish Pi Agent-maintained documentation for every current entry", () => {
    const expectedTagline =
      "All documentation on this page and its sub-pages is automatically generated and maintained by Vedang's Pi Agent from source-backed records of the extensions, skills, and prompts in Vedang's agent setup.";
    const directoryByKind = {
      extension: "extensions",
      skill: "skills",
      prompt: "prompts",
    } as const;
    const catalog = readJson(join(dotagentsRoot, "catalog.json")) as {
      metadata: { tagline: string };
      entries: Array<{
        id: string;
        kind: keyof typeof directoryByKind;
        slug: string;
        publication: "featured" | "listed";
        detailPath?: string;
        evidencePath?: string;
      }>;
    };

    assert.equal(catalog.metadata.tagline, expectedTagline);
    assert.equal(catalog.entries.length, 11 + publishedPackageLocators.length);
    assert.deepEqual(
      catalog.entries.filter(({ publication }) => publication !== "featured"),
      [],
    );

    for (const entry of catalog.entries) {
      const directory = directoryByKind[entry.kind];
      assert.equal(
        entry.detailPath,
        `dotagents/details/${directory}/${entry.slug}.json`,
      );
      assert.equal(
        entry.evidencePath,
        `dotagents/evidence/${directory}/${entry.slug}.json`,
      );
    }
  });

  test("publishes every approved package from reviewed surface coverage", () => {
    const catalog = readJson(join(dotagentsRoot, "catalog.json")) as {
      projects: Array<{ installedLocator: string }>;
      entries: Array<{
        kind: "extension" | "skill" | "prompt";
        publication: "featured" | "listed";
        source: { locator?: string; path?: string };
      }>;
    };
    const coverage = readJson(join(dotagentsRoot, "coverage.json")) as {
      packageSurfaces: Array<{
        locator: string;
        surfaces: Array<{
          kind: "extension" | "skill" | "prompt";
          path: string;
        }>;
      }>;
      excluded: Array<{
        kind: "extension" | "skill" | "prompt" | "package";
        source: string;
        surfacePath?: string;
      }>;
    };

    for (const locator of publishedPackageLocators) {
      assert.ok(
        catalog.projects.some(
          ({ installedLocator }) => installedLocator === locator,
        ),
        `missing project for ${locator}`,
      );
      assert.ok(
        catalog.entries.some(
          ({ publication, source }) =>
            publication === "featured" && source.locator === locator,
        ),
        `missing featured entry for ${locator}`,
      );

      const inventory = coverage.packageSurfaces.find(
        ({ locator: candidate }) => candidate === locator,
      );
      assert.ok(inventory, `missing surface inventory for ${locator}`);
      assert.ok(
        inventory.surfaces.length > 0,
        `empty inventory for ${locator}`,
      );
      assert.equal(
        coverage.excluded.some(
          ({ kind, source }) => kind === "package" && source === locator,
        ),
        false,
        `package exclusion remains for ${locator}`,
      );

      for (const surface of inventory.surfaces) {
        const publicMatches = catalog.entries.filter(
          ({ kind, source }) =>
            kind === surface.kind &&
            source.locator === locator &&
            source.path === surface.path,
        );
        const excludedMatches = coverage.excluded.filter(
          ({ kind, source, surfacePath }) =>
            kind === surface.kind &&
            source === locator &&
            surfacePath === surface.path,
        );
        assert.equal(
          publicMatches.length + excludedMatches.length,
          1,
          `surface needs one classification: ${locator} ${surface.kind} ${surface.path}`,
        );
      }
    }
  });

  test("keeps rights- or evidence-blocked packages fail closed", () => {
    const catalog = readJson(join(dotagentsRoot, "catalog.json")) as {
      projects: Array<{ installedLocator: string }>;
      entries: Array<{ source: { locator?: string } }>;
    };
    const coverage = readJson(join(dotagentsRoot, "coverage.json")) as {
      packageSurfaces: Array<{ locator: string }>;
      excluded: Array<{
        kind: "extension" | "skill" | "prompt" | "package";
        source: string;
        reason: string;
      }>;
    };

    for (const locator of blockedPackageLocators) {
      assert.equal(
        catalog.projects.some(
          ({ installedLocator }) => installedLocator === locator,
        ),
        false,
        `blocked project became public: ${locator}`,
      );
      assert.equal(
        catalog.entries.some(({ source }) => source.locator === locator),
        false,
        `blocked entry became public: ${locator}`,
      );
      assert.equal(
        coverage.packageSurfaces.some(
          ({ locator: candidate }) => candidate === locator,
        ),
        false,
        `blocked package gained surface inventory: ${locator}`,
      );
      const exclusion = coverage.excluded.find(
        ({ kind, source }) => kind === "package" && source === locator,
      );
      assert.ok(exclusion, `blocked package lacks exclusion: ${locator}`);
      assert.ok(
        exclusion.reason.length > 20,
        `blocked package needs an explicit reason: ${locator}`,
      );
    }
  });

  test("keeps adopted Read Map provenance and Exa credentials explicit", () => {
    const catalog = readJson(join(dotagentsRoot, "catalog.json")) as {
      projects: Array<{
        id: string;
        upstreamUrl?: string;
        relationship: string;
        originalAuthors: string[];
      }>;
      licenses: Array<{ id: string; evidence: { value: string } }>;
      entries: Array<{
        id: string;
        licenseRef: string;
        compatibility: string[];
      }>;
    };
    const readMapEvidence = readJson(
      join(dotagentsRoot, "evidence", "extensions", "pi-read-map.json"),
    ) as { claims: Array<{ claim: string }> };
    const exaEvidence = readJson(
      join(dotagentsRoot, "evidence", "extensions", "pi-exa.json"),
    ) as { claims: Array<{ claim: string }> };

    const readMapProject = catalog.projects.find(
      ({ id }) => id === "project/pi-read-map",
    );
    assert.equal(readMapProject?.relationship, "adopted");
    assert.equal(
      readMapProject?.upstreamUrl,
      "https://github.com/kcosr/codemap",
    );
    assert.deepEqual(readMapProject?.originalAuthors, ["Kevin"]);
    assert.equal(
      catalog.entries.find(({ id }) => id === "extension/pi-read-map")
        ?.licenseRef,
      "codemap-upstream-mit",
    );
    assert.match(
      catalog.licenses.find(({ id }) => id === "codemap-upstream-mit")?.evidence
        .value ?? "",
      /github\.com\/kcosr\/codemap\/blob\/[0-9a-f]{40}\/LICENSE/u,
    );
    assert.ok(
      readMapEvidence.claims.some(({ claim }) =>
        claim.includes("ported from Codemap"),
      ),
    );

    assert.ok(
      catalog.entries
        .find(({ id }) => id === "extension/pi-exa")
        ?.compatibility.includes("Configured Exa API credentials"),
    );
    assert.ok(
      exaEvidence.claims.some(({ claim }) =>
        claim.includes("Requires configured Exa API credentials"),
      ),
    );
    assert.ok(
      exaEvidence.claims.some(({ claim }) => claim.includes("Redacts")),
    );
  });

  test("keep the approved Handoff context contract pinned exactly", () => {
    const approvedRevision = "c62070608e339560fb676f939fe38b74a42bdc9f";
    const catalog = readJson(join(dotagentsRoot, "catalog.json")) as {
      projects: Array<{ id: string; reviewedRevision?: string }>;
    };
    const detail = readJson(
      join(dotagentsRoot, "details", "extensions", "handoff.json"),
    ) as {
      whatItDoes: string[];
      questions: Array<{ answer: string[] }>;
    };
    const evidence = readJson(
      join(dotagentsRoot, "evidence", "extensions", "handoff.json"),
    ) as {
      claims: Array<{
        claim: string;
        sourceLines?: string;
        sourcePath?: string;
      }>;
      verifiedAgainst: { value: string };
    };

    assert.equal(
      catalog.projects.find(({ id }) => id === "project/handoff")
        ?.reviewedRevision,
      approvedRevision,
    );
    assert.equal(evidence.verifiedAgainst.value, approvedRevision);
    assert.equal(
      detail.whatItDoes[1],
      "Before generation, it asks Pi for the current model context and converts the selected entries through Pi's host context pipeline. It does not transfer live process state.",
    );
    assert.equal(
      detail.questions[0]?.answer[0],
      "Review the model-generated draft before continuing: its output is intentionally selective. Handoff asks Pi for the current model context, converts the selected entries through Pi's host context pipeline, and sends the serialized result to the configured model. It does not transfer live process state.",
    );
    assert.deepEqual(evidence.claims, [
      {
        claim:
          "Registers the handoff command and validates interactive UI, selected model, and goal input.",
        sourcePath: "pi-extensions/handoff.ts",
        sourceLines: "47-65",
      },
      {
        claim:
          "Uses Pi's host context selection and session-entry conversion to build the model-visible handoff context.",
        sourcePath: "pi-extensions/handoff.ts",
        sourceLines: "67-71",
      },
      {
        claim:
          "Serializes the host-selected context and sends it with the requested goal to the configured model.",
        sourcePath: "pi-extensions/handoff.ts",
        sourceLines: "78-113",
      },
      {
        claim:
          "Delegates generation to the host model registry with abort signaling, disabled cache retention, and a unique session ID.",
        sourcePath: "pi-extensions/handoff.ts",
        sourceLines: "105-113",
      },
      {
        claim: "Reads the current session file for optional parent tracking.",
        sourcePath: "pi-extensions/handoff.ts",
        sourceLines: "81",
      },
      {
        claim:
          "Lets the user edit the generated prompt before opening a replacement session and passes the captured session-file value as the parent-session option.",
        sourcePath: "pi-extensions/handoff.ts",
        sourceLines: "143-160",
      },
    ]);
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
