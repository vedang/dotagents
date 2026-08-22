import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, test } from "vitest";

import { CatalogValidationError, validateCatalog } from "../src/catalog.js";

const dotagentsRoot = join(import.meta.dirname, "..");
const repositoryRoot = join(dotagentsRoot, "..");
const fixturesRoot = join(dotagentsRoot, "__fixtures__");
const temporaryRoots: string[] = [];

type MutableCatalog = {
  projects: Array<Record<string, unknown>>;
  licenses: Array<
    Record<string, unknown> & {
      scope: Record<string, unknown>;
    }
  >;
  entries: Array<
    Record<string, unknown> & {
      source: Record<string, unknown>;
    }
  >;
};

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function createFixtureProject(): {
  root: string;
  catalogPath: string;
} {
  const root = mkdtempSync(join(tmpdir(), "dotagents-validator-"));
  temporaryRoots.push(root);

  const catalogPath = join(root, "dotagents", "catalog.json");
  writeJson(catalogPath, readJson(join(fixturesRoot, "valid-catalog.json")));
  const detail = readJson<{ howItFits: Array<Record<string, unknown>> }>(
    join(fixturesRoot, "valid-detail.json"),
  );
  detail.howItFits = [];
  writeJson(
    join(root, "dotagents", "details", "extensions", "handoff.json"),
    detail,
  );
  writeJson(
    join(root, "dotagents", "evidence", "extensions", "handoff.json"),
    readJson(join(fixturesRoot, "valid-evidence.json")),
  );
  mkdirSync(join(root, "pi-extensions"), { recursive: true });
  cpSync(
    join(repositoryRoot, "pi-extensions", "handoff.ts"),
    join(root, "pi-extensions", "handoff.ts"),
  );
  cpSync(join(repositoryRoot, "LICENSE.txt"), join(root, "LICENSE.txt"));

  return { root, catalogPath };
}

function mutateCatalog(
  catalogPath: string,
  mutate: (catalog: MutableCatalog) => void,
): void {
  const catalog = readJson<MutableCatalog>(catalogPath);
  mutate(catalog);
  writeJson(catalogPath, catalog);
}

function expectCatalogError(
  root: string,
  catalogPath: string,
  code: string,
): CatalogValidationError {
  assert.throws(
    () => validateCatalog({ root, catalogPath }),
    (error: unknown) => {
      assert.ok(error instanceof CatalogValidationError);
      assert.equal(error.code, code);
      assert.ok(error.message.length > code.length);
      assert.equal(error.context.catalogPath, catalogPath);
      return true;
    },
  );

  try {
    validateCatalog({ root, catalogPath });
  } catch (error) {
    assert.ok(error instanceof CatalogValidationError);
    return error;
  }
  assert.fail(`expected ${code}`);
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("Dotagents catalog validator", () => {
  test("loads a valid catalog with referenced details and evidence", () => {
    const fixture = createFixtureProject();
    const result = validateCatalog(fixture);

    assert.equal(result.catalog.entries.length, 1);
    assert.equal(result.details.get("extension/handoff")?.schemaVersion, 1);
    assert.equal(
      result.evidence.get("extension/handoff")?.entryId,
      "extension/handoff",
    );
  });

  test("checks a valid catalog through the CLI seam", () => {
    const fixture = createFixtureProject();
    const result = spawnSync(
      "bun",
      [
        join(dotagentsRoot, "src", "check-catalog.ts"),
        "--root",
        fixture.root,
        "--catalog",
        fixture.catalogPath,
      ],
      { cwd: repositoryRoot, encoding: "utf8" },
    );

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Catalog valid: 1 entries \(1 featured\)\./);
  });

  test("rejects duplicate project, license, entry, and route identities", () => {
    const cases: Array<[string, string, (catalog: MutableCatalog) => void]> = [
      [
        "duplicate-project-id",
        "project/handoff",
        (catalog) =>
          catalog.projects.push(structuredClone(catalog.projects[0])),
      ],
      [
        "duplicate-license-id",
        "license/root-wtfpl",
        (catalog) =>
          catalog.licenses.push(structuredClone(catalog.licenses[0])),
      ],
      [
        "duplicate-entry-id",
        "extension/handoff",
        (catalog) => catalog.entries.push(structuredClone(catalog.entries[0])),
      ],
      [
        "duplicate-route",
        "extension/handoff-copy",
        (catalog) => {
          const duplicate = structuredClone(catalog.entries[0]);
          duplicate.id = "extension/handoff-copy";
          duplicate.detailPath =
            "dotagents/details/extensions/handoff-copy.json";
          duplicate.evidencePath =
            "dotagents/evidence/extensions/handoff-copy.json";
          catalog.entries.push(duplicate);
        },
      ],
    ];

    for (const [code, expectedIdentity, mutate] of cases) {
      const { root, catalogPath } = createFixtureProject();
      mutateCatalog(catalogPath, mutate);
      const error = expectCatalogError(root, catalogPath, code);
      assert.equal(error.context.identity, expectedIdentity);
    }
  });

  test("rejects broken project, license, related-entry, and evidence references", () => {
    const project = createFixtureProject();
    mutateCatalog(project.catalogPath, (catalog) => {
      catalog.entries[0].projectId = "project/missing";
    });
    expectCatalogError(project.root, project.catalogPath, "unknown-project");

    const license = createFixtureProject();
    mutateCatalog(license.catalogPath, (catalog) => {
      catalog.entries[0].licenseRef = "license/missing";
    });
    expectCatalogError(license.root, license.catalogPath, "unknown-license");

    const related = createFixtureProject();
    const detailPath = join(
      related.root,
      "dotagents",
      "details",
      "extensions",
      "handoff.json",
    );
    const detail = readJson<{
      howItFits: Array<Record<string, unknown>>;
    }>(detailPath);
    detail.howItFits.push({
      entryId: "extension/missing",
      relationship: "Missing related entry.",
    });
    writeJson(detailPath, detail);
    expectCatalogError(
      related.root,
      related.catalogPath,
      "unknown-related-entry",
    );

    const evidenceFixture = createFixtureProject();
    const evidencePath = join(
      evidenceFixture.root,
      "dotagents",
      "evidence",
      "extensions",
      "handoff.json",
    );
    const evidence = readJson<Record<string, unknown>>(evidencePath);
    evidence.entryId = "extension/other";
    writeJson(evidencePath, evidence);
    expectCatalogError(
      evidenceFixture.root,
      evidenceFixture.catalogPath,
      "entry-evidence-mismatch",
    );
  });

  test("rejects absolute, traversing, and missing local paths", () => {
    const cases: Array<[string, string]> = [
      ["../private.ts", "unsafe-path"],
      [join(tmpdir(), "private.ts"), "unsafe-path"],
      ["pi-extensions/missing.ts", "path-not-found"],
    ];

    for (const [sourcePath, code] of cases) {
      const { root, catalogPath } = createFixtureProject();
      mutateCatalog(catalogPath, (catalog) => {
        catalog.entries[0].source.path = sourcePath;
      });
      expectCatalogError(root, catalogPath, code);
    }
  });

  test("rejects realpath and multi-hop symlink escapes", () => {
    const outsideRoot = mkdtempSync(join(tmpdir(), "dotagents-outside-"));
    temporaryRoots.push(outsideRoot);
    const outsideFile = join(outsideRoot, "private.ts");
    writeFileSync(outsideFile, "export const secret = true;\n");

    const direct = createFixtureProject();
    const directSource = join(direct.root, "pi-extensions", "handoff.ts");
    unlinkSync(directSource);
    symlinkSync(outsideFile, directSource);
    expectCatalogError(direct.root, direct.catalogPath, "path-outside-root");

    const chained = createFixtureProject();
    const chainedSource = join(chained.root, "pi-extensions", "handoff.ts");
    const intermediate = join(chained.root, "pi-extensions", "intermediate.ts");
    unlinkSync(chainedSource);
    symlinkSync(outsideFile, intermediate);
    symlinkSync("intermediate.ts", chainedSource);
    expectCatalogError(chained.root, chained.catalogPath, "path-outside-root");
  });

  test("rejects missing and orphan featured detail or evidence files", () => {
    const missingDetail = createFixtureProject();
    rmSync(
      join(
        missingDetail.root,
        "dotagents",
        "details",
        "extensions",
        "handoff.json",
      ),
    );
    expectCatalogError(
      missingDetail.root,
      missingDetail.catalogPath,
      "path-not-found",
    );

    const missingEvidence = createFixtureProject();
    rmSync(
      join(
        missingEvidence.root,
        "dotagents",
        "evidence",
        "extensions",
        "handoff.json",
      ),
    );
    expectCatalogError(
      missingEvidence.root,
      missingEvidence.catalogPath,
      "path-not-found",
    );

    const orphanDetail = createFixtureProject();
    writeJson(
      join(
        orphanDetail.root,
        "dotagents",
        "details",
        "extensions",
        "orphan.json",
      ),
      readJson(join(fixturesRoot, "valid-detail.json")),
    );
    expectCatalogError(
      orphanDetail.root,
      orphanDetail.catalogPath,
      "orphan-detail",
    );

    const orphanEvidence = createFixtureProject();
    writeJson(
      join(
        orphanEvidence.root,
        "dotagents",
        "evidence",
        "extensions",
        "orphan.json",
      ),
      readJson(join(fixturesRoot, "valid-evidence.json")),
    );
    expectCatalogError(
      orphanEvidence.root,
      orphanEvidence.catalogPath,
      "orphan-evidence",
    );
  });

  test("rejects featured/listed mismatches before reading files", () => {
    const missingReference = createFixtureProject();
    mutateCatalog(missingReference.catalogPath, (catalog) => {
      Reflect.deleteProperty(catalog.entries[0], "detailPath");
    });
    expectCatalogError(
      missingReference.root,
      missingReference.catalogPath,
      "schema-invalid",
    );

    const listedWithDetail = createFixtureProject();
    mutateCatalog(listedWithDetail.catalogPath, (catalog) => {
      catalog.entries[0].publication = "listed";
    });
    expectCatalogError(
      listedWithDetail.root,
      listedWithDetail.catalogPath,
      "schema-invalid",
    );
  });

  test("binds local source paths and external projects to license scope", () => {
    const local = createFixtureProject();
    mutateCatalog(local.catalogPath, (catalog) => {
      catalog.licenses[0].scope.pathPrefixes = ["skills/"];
    });
    expectCatalogError(local.root, local.catalogPath, "license-scope-mismatch");

    const external = createFixtureProject();
    mutateCatalog(external.catalogPath, (catalog) => {
      catalog.entries[0].delivery = "git-package";
      catalog.entries[0].source = { locator: "git:github.com/example/handoff" };
      catalog.licenses[0].scope = {
        type: "external-projects",
        projectIds: ["project/other"],
      };
    });
    expectCatalogError(
      external.root,
      external.catalogPath,
      "license-scope-mismatch",
    );
  });
});
