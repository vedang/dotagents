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
const validProjectRoot = join(fixturesRoot, "valid-project");
const temporaryRoots: string[] = [];
const fixtureRevision = "0123456789abcdef0123456789abcdef01234567";
const otherRevision = "abcdef0123456789abcdef0123456789abcdef01";

type MutableCatalog = {
  metadata: Record<string, unknown>;
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

type MutableCoverage = {
  schemaVersion: number;
  excluded: Array<{
    kind: "extension" | "skill" | "prompt" | "package";
    source: string;
    reason: string;
  }>;
};

type FixtureProject = {
  root: string;
  catalogPath: string;
};

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function createFixtureProject(): FixtureProject {
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
  writeJson(
    join(root, "dotagents", "coverage.json"),
    readJson(join(fixturesRoot, "valid-coverage.json")),
  );
  writeJson(join(root, "pi-settings.json"), { packages: [] });
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

function mutateCoverage(
  root: string,
  mutate: (coverage: MutableCoverage) => void,
): void {
  const path = join(root, "dotagents", "coverage.json");
  const coverage = readJson<MutableCoverage>(path);
  mutate(coverage);
  writeJson(path, coverage);
}

function setPackages(root: string, packages: string[]): void {
  writeJson(join(root, "pi-settings.json"), { packages });
}

function configureGitPackage(
  fixture: FixtureProject,
  locator = "git:github.com/example/handoff",
  configured = true,
): void {
  mutateCatalog(fixture.catalogPath, (catalog) => {
    Object.assign(catalog.projects[0], {
      installedLocator: locator,
      canonicalUrl: "https://github.com/example/handoff",
      relationship: "adopted",
      reviewedRevision: fixtureRevision,
    });
    catalog.licenses[0].evidence = {
      type: "url",
      value: `https://github.com/example/handoff/blob/${fixtureRevision}/LICENSE`,
    };
    catalog.licenses[0].scope = {
      type: "external-projects",
      projectIds: ["project/handoff"],
    };
    catalog.entries[0].delivery = "git-package";
    catalog.entries[0].source = { locator };
  });

  const evidencePath = join(
    fixture.root,
    "dotagents",
    "evidence",
    "extensions",
    "handoff.json",
  );
  const evidence = readJson<{
    claims: Array<Record<string, unknown>>;
  }>(evidencePath);
  evidence.claims = [
    {
      claim: "Registers an explicit handoff command.",
      sourceUrl: `https://github.com/example/handoff/blob/${fixtureRevision}/src/index.ts#L10-L20`,
    },
  ];
  writeJson(evidencePath, evidence);
  rmSync(join(fixture.root, "pi-extensions", "handoff.ts"));
  setPackages(fixture.root, configured ? [locator] : []);
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

  test("checks a valid catalog through the package CLI entrypoint", () => {
    const result = spawnSync(
      "bun",
      ["run", "check:catalog", "--", "--root", validProjectRoot],
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

  test("rejects route slugs with traversal, separators, or dot segments", () => {
    const unsafeSlugs = ["../index", "/handoff", "a/b", ".", "handoff/"];

    for (const slug of unsafeSlugs) {
      const { root, catalogPath } = createFixtureProject();
      mutateCatalog(catalogPath, (catalog) => {
        catalog.entries[0].slug = slug;
      });
      expectCatalogError(root, catalogPath, "schema-invalid");
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

  test("rejects in-root symlinks crossing source and license scope", () => {
    const source = createFixtureProject();
    const sourcePath = join(source.root, "pi-extensions", "handoff.ts");
    const internalSource = join(source.root, "internal", "handoff.ts");
    mkdirSync(dirname(internalSource), { recursive: true });
    writeFileSync(internalSource, "export const internal = true;\n");
    unlinkSync(sourcePath);
    symlinkSync(internalSource, sourcePath);
    expectCatalogError(source.root, source.catalogPath, "symlink-path");

    const license = createFixtureProject();
    const licensePath = join(license.root, "LICENSE.txt");
    const internalLicense = join(license.root, "internal", "LICENSE.txt");
    mkdirSync(dirname(internalLicense), { recursive: true });
    writeFileSync(internalLicense, "Internal terms.\n");
    unlinkSync(licensePath);
    symlinkSync(internalLicense, licensePath);
    expectCatalogError(license.root, license.catalogPath, "symlink-path");
  });

  test("rejects symlinked package and discovery authority inputs", () => {
    const outsideRoot = mkdtempSync(join(tmpdir(), "dotagents-authority-"));
    temporaryRoots.push(outsideRoot);
    const outsideSettings = join(outsideRoot, "pi-settings.json");
    writeJson(outsideSettings, { packages: [] });

    const outwardSettings = createFixtureProject();
    const outwardSettingsPath = join(outwardSettings.root, "pi-settings.json");
    unlinkSync(outwardSettingsPath);
    symlinkSync(outsideSettings, outwardSettingsPath);
    expectCatalogError(
      outwardSettings.root,
      outwardSettings.catalogPath,
      "path-outside-root",
    );

    const inRootSettings = createFixtureProject();
    const inRootSettingsPath = join(inRootSettings.root, "pi-settings.json");
    const inRootSettingsTarget = join(
      inRootSettings.root,
      "internal",
      "pi-settings.json",
    );
    writeJson(inRootSettingsTarget, { packages: [] });
    unlinkSync(inRootSettingsPath);
    symlinkSync(inRootSettingsTarget, inRootSettingsPath);
    expectCatalogError(
      inRootSettings.root,
      inRootSettings.catalogPath,
      "symlink-path",
    );

    const outwardDiscovery = createFixtureProject();
    const outsidePrompts = join(outsideRoot, "prompts");
    mkdirSync(outsidePrompts);
    symlinkSync(outsidePrompts, join(outwardDiscovery.root, "prompts"));
    expectCatalogError(
      outwardDiscovery.root,
      outwardDiscovery.catalogPath,
      "path-outside-root",
    );

    const inRootDiscovery = createFixtureProject();
    const inRootSkillsTarget = join(inRootDiscovery.root, "internal", "skills");
    mkdirSync(inRootSkillsTarget, { recursive: true });
    symlinkSync(inRootSkillsTarget, join(inRootDiscovery.root, "skills"));
    expectCatalogError(
      inRootDiscovery.root,
      inRootDiscovery.catalogPath,
      "symlink-path",
    );
  });

  test("rejects dangling discovery authority links", () => {
    const fixture = createFixtureProject();
    symlinkSync(
      join(fixture.root, "missing-prompts"),
      join(fixture.root, "prompts"),
    );

    expectCatalogError(fixture.root, fixture.catalogPath, "path-not-found");
  });

  test("rejects public artifact root symlinks before enumeration", () => {
    const outsideRoot = mkdtempSync(join(tmpdir(), "dotagents-artifacts-"));
    temporaryRoots.push(outsideRoot);

    const outward = createFixtureProject();
    const outwardDetails = join(outward.root, "dotagents", "details");
    const outwardTarget = join(outsideRoot, "details");
    cpSync(outwardDetails, outwardTarget, { recursive: true });
    rmSync(outwardDetails, { recursive: true });
    symlinkSync(outwardTarget, outwardDetails);
    const outwardError = expectCatalogError(
      outward.root,
      outward.catalogPath,
      "path-outside-root",
    );
    assert.equal(outwardError.context.path, "dotagents/details");

    const inRoot = createFixtureProject();
    const inRootEvidence = join(inRoot.root, "dotagents", "evidence");
    const inRootTarget = join(inRoot.root, "internal", "evidence");
    mkdirSync(dirname(inRootTarget), { recursive: true });
    cpSync(inRootEvidence, inRootTarget, { recursive: true });
    rmSync(inRootEvidence, { recursive: true });
    symlinkSync(inRootTarget, inRootEvidence);
    const inRootError = expectCatalogError(
      inRoot.root,
      inRoot.catalogPath,
      "symlink-path",
    );
    assert.equal(inRootError.context.path, "dotagents/evidence");
  });

  test("rejects empty and dangling public artifact root symlinks", () => {
    const cases = [
      {
        section: "details",
        target: "outside-empty",
        code: "path-outside-root",
      },
      { section: "evidence", target: "inside-empty", code: "symlink-path" },
      { section: "details", target: "dangling", code: "path-not-found" },
    ] as const;

    for (const { section, target, code } of cases) {
      const fixture = createFixtureProject();
      mutateCatalog(fixture.catalogPath, (catalog) => {
        catalog.entries[0].publication = "listed";
        catalog.entries[0].limitation = "Fixture limitation.";
        Reflect.deleteProperty(catalog.entries[0], "detailPath");
        Reflect.deleteProperty(catalog.entries[0], "evidencePath");
      });
      rmSync(join(fixture.root, "dotagents", "details"), {
        recursive: true,
      });
      rmSync(join(fixture.root, "dotagents", "evidence"), {
        recursive: true,
      });

      const sectionPath = join(fixture.root, "dotagents", section);
      let targetPath: string;
      if (target === "outside-empty") {
        const outsideRoot = mkdtempSync(
          join(tmpdir(), "dotagents-empty-artifacts-"),
        );
        temporaryRoots.push(outsideRoot);
        targetPath = outsideRoot;
      } else {
        targetPath = join(fixture.root, "internal", target);
        if (target === "inside-empty") {
          mkdirSync(targetPath, { recursive: true });
        }
      }
      symlinkSync(targetPath, sectionPath);

      const error = expectCatalogError(fixture.root, fixture.catalogPath, code);
      assert.equal(error.context.path, `dotagents/${section}`);
    }
  });

  test("rejects in-root symlinks crossing detail and evidence sections", () => {
    const detail = createFixtureProject();
    const detailPath = join(
      detail.root,
      "dotagents",
      "details",
      "extensions",
      "handoff.json",
    );
    const detailTarget = join(
      detail.root,
      "dotagents",
      "evidence",
      "extensions",
      "handoff-detail.data",
    );
    writeJson(detailTarget, readJson(detailPath));
    unlinkSync(detailPath);
    symlinkSync(detailTarget, detailPath);
    expectCatalogError(detail.root, detail.catalogPath, "symlink-path");

    const evidence = createFixtureProject();
    const evidencePath = join(
      evidence.root,
      "dotagents",
      "evidence",
      "extensions",
      "handoff.json",
    );
    const evidenceTarget = join(
      evidence.root,
      "dotagents",
      "details",
      "extensions",
      "handoff-evidence.data",
    );
    writeJson(
      evidenceTarget,
      readJson(join(fixturesRoot, "valid-evidence.json")),
    );
    unlinkSync(evidencePath);
    symlinkSync(evidenceTarget, evidencePath);
    expectCatalogError(evidence.root, evidence.catalogPath, "symlink-path");
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

  test("rejects non-JSON files in public detail and evidence trees", () => {
    const cases = [
      ["details", "extensions", "notes.md"],
      ["evidence", "extensions", "notes.txt"],
    ] as const;

    for (const [artifact, kind, name] of cases) {
      const fixture = createFixtureProject();
      writeFileSync(
        join(fixture.root, "dotagents", artifact, kind, name),
        "Unvalidated public artifact.\n",
      );
      expectCatalogError(
        fixture.root,
        fixture.catalogPath,
        "artifact-extension-invalid",
      );
    }
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
      catalog.entries[0].limitation = "Fixture limitation.";
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

  test("requires every discovered candidate to be public or explicitly excluded", () => {
    const unclassified = createFixtureProject();
    const unclassifiedSkill = join(
      unclassified.root,
      "skills",
      "private-skill",
      "SKILL.md",
    );
    mkdirSync(dirname(unclassifiedSkill), { recursive: true });
    writeFileSync(unclassifiedSkill, "# Private skill\n");
    expectCatalogError(
      unclassified.root,
      unclassified.catalogPath,
      "coverage-unclassified",
    );

    const excluded = createFixtureProject();
    const excludedSkill = join(
      excluded.root,
      "skills",
      "private-skill",
      "SKILL.md",
    );
    mkdirSync(dirname(excludedSkill), { recursive: true });
    writeFileSync(excludedSkill, "# Private skill\n");
    mutateCoverage(excluded.root, (coverage) => {
      coverage.excluded.push({
        kind: "skill",
        source: "skills/private-skill/SKILL.md",
        reason: "Not selected for public documentation.",
      });
    });
    assert.equal(validateCatalog(excluded).catalog.entries.length, 1);

    const unknown = createFixtureProject();
    mutateCoverage(unknown.root, (coverage) => {
      coverage.excluded.push({
        kind: "prompt",
        source: "prompts/missing.md",
        reason: "Not selected for public documentation.",
      });
    });
    expectCatalogError(
      unknown.root,
      unknown.catalogPath,
      "coverage-unknown-candidate",
    );

    const conflict = createFixtureProject();
    mutateCoverage(conflict.root, (coverage) => {
      coverage.excluded.push({
        kind: "extension",
        source: "pi-extensions/handoff.ts",
        reason: "Cannot exclude an explicitly public entry.",
      });
    });
    expectCatalogError(
      conflict.root,
      conflict.catalogPath,
      "coverage-public-conflict",
    );
  });

  test("discovers extension names containing test unless they are test files", () => {
    const fixture = createFixtureProject();
    writeFileSync(
      join(fixture.root, "pi-extensions", "status-test-helper.ts"),
      "export const helper = true;\n",
    );
    writeFileSync(
      join(fixture.root, "pi-extensions", "status.test.ts"),
      "throw new Error('test files are not public candidates');\n",
    );

    expectCatalogError(
      fixture.root,
      fixture.catalogPath,
      "coverage-unclassified",
    );
  });

  test("rejects malformed coverage rather than widening publication", () => {
    const fixture = createFixtureProject();
    const coveragePath = join(fixture.root, "dotagents", "coverage.json");
    const coverage = readJson<Record<string, unknown>>(coveragePath);
    coverage.autoPublish = true;
    writeJson(coveragePath, coverage);

    const error = expectCatalogError(
      fixture.root,
      fixture.catalogPath,
      "schema-invalid",
    );
    assert.equal(error.context.artifact, "coverage");
  });

  test("binds package entries to exact configured and project locators", () => {
    const missing = createFixtureProject();
    configureGitPackage(missing, undefined, false);
    expectCatalogError(
      missing.root,
      missing.catalogPath,
      "package-not-configured",
    );

    const mismatch = createFixtureProject();
    configureGitPackage(mismatch);
    mutateCatalog(mismatch.catalogPath, (catalog) => {
      catalog.projects[0].installedLocator =
        "git:github.com/example/different-project";
    });
    expectCatalogError(
      mismatch.root,
      mismatch.catalogPath,
      "project-locator-mismatch",
    );
  });

  test("allows mixed package surfaces only when project provenance is shared", () => {
    const fixture = createFixtureProject();
    const locator = "git:github.com/example/handoff";
    configureGitPackage(fixture, locator);
    mutateCatalog(fixture.catalogPath, (catalog) => {
      const skill = structuredClone(catalog.entries[0]);
      Object.assign(skill, {
        id: "skill/handoff",
        slug: "handoff",
        name: "Handoff skill",
        kind: "skill",
        publication: "listed",
        limitation: "Fixture limitation.",
        activation: ["model-invoked"],
      });
      Reflect.deleteProperty(skill, "detailPath");
      Reflect.deleteProperty(skill, "evidencePath");
      catalog.entries.push(skill);
    });
    assert.equal(validateCatalog(fixture).catalog.entries.length, 2);

    const splitProject = createFixtureProject();
    configureGitPackage(splitProject, locator);
    mutateCatalog(splitProject.catalogPath, (catalog) => {
      const project = structuredClone(catalog.projects[0]);
      project.id = "project/handoff-skill";
      catalog.projects.push(project);
      catalog.licenses[0].scope = {
        type: "external-projects",
        projectIds: ["project/handoff", "project/handoff-skill"],
      };
      const skill = structuredClone(catalog.entries[0]);
      Object.assign(skill, {
        id: "skill/handoff",
        projectId: "project/handoff-skill",
        slug: "handoff",
        name: "Handoff skill",
        kind: "skill",
        publication: "listed",
        limitation: "Fixture limitation.",
        activation: ["model-invoked"],
      });
      Reflect.deleteProperty(skill, "detailPath");
      Reflect.deleteProperty(skill, "evidencePath");
      catalog.entries.push(skill);
    });
    expectCatalogError(
      splitProject.root,
      splitProject.catalogPath,
      "package-project-split",
    );

    const differentLocator = "git:github.com/example/other";
    setPackages(fixture.root, [locator, differentLocator]);
    mutateCatalog(fixture.catalogPath, (catalog) => {
      catalog.entries[1].source = { locator: differentLocator };
    });
    expectCatalogError(
      fixture.root,
      fixture.catalogPath,
      "mixed-project-source",
    );
  });

  test("requires coherent provenance, license review dates, and revisions", () => {
    const fork = createFixtureProject();
    mutateCatalog(fork.catalogPath, (catalog) => {
      catalog.projects[0].relationship = "fork";
    });
    expectCatalogError(fork.root, fork.catalogPath, "provenance-invalid");

    const revision = createFixtureProject();
    const evidencePath = join(
      revision.root,
      "dotagents",
      "evidence",
      "extensions",
      "handoff.json",
    );
    const evidence = readJson<{
      verifiedAgainst: { value: string };
    }>(evidencePath);
    evidence.verifiedAgainst.value = otherRevision;
    writeJson(evidencePath, evidence);
    expectCatalogError(
      revision.root,
      revision.catalogPath,
      "revision-mismatch",
    );

    const license = createFixtureProject();
    mutateCatalog(license.catalogPath, (catalog) => {
      catalog.licenses[0].reviewedOn = "2026-99-99";
    });
    expectCatalogError(
      license.root,
      license.catalogPath,
      "license-review-invalid",
    );

    const listedPackage = createFixtureProject();
    configureGitPackage(listedPackage);
    mutateCatalog(listedPackage.catalogPath, (catalog) => {
      catalog.projects[0].relationship = "original";
      Reflect.deleteProperty(catalog.projects[0], "reviewedRevision");
      catalog.entries[0].publication = "listed";
      catalog.entries[0].limitation = "Fixture limitation.";
      Reflect.deleteProperty(catalog.entries[0], "detailPath");
      Reflect.deleteProperty(catalog.entries[0], "evidencePath");
    });
    rmSync(join(listedPackage.root, "dotagents", "details"), {
      recursive: true,
    });
    rmSync(join(listedPackage.root, "dotagents", "evidence"), {
      recursive: true,
    });
    expectCatalogError(
      listedPackage.root,
      listedPackage.catalogPath,
      "revision-missing",
    );
  });

  test("rejects Markdown, HTML, and arbitrary URIs in every detail field", () => {
    const cases: Array<["whatItDoes" | "commands", string]> = [
      ["whatItDoes", "Read [private notes](https://example.com/private)."],
      ["whatItDoes", "Use **hidden emphasis** here."],
      ["whatItDoes", "Email mailto:private@example.com."],
      ["whatItDoes", "## Hidden presentation heading"],
      ["whatItDoes", "- Hidden presentation list"],
      ["whatItDoes", "<!-- hidden HTML comment -->"],
      ["whatItDoes", "<!DOCTYPE html>"],
      ["whatItDoes", "    const hidden = true;"],
      ["whatItDoes", "Hidden setext heading\n====================="],
      ["whatItDoes", "Read example.com/private."],
      ["commands", "<script>alert('unsafe')</script>"],
    ];

    for (const [field, content] of cases) {
      const fixture = createFixtureProject();
      const detailPath = join(
        fixture.root,
        "dotagents",
        "details",
        "extensions",
        "handoff.json",
      );
      const detail = readJson<{
        whatItDoes: string[];
        commands: string[];
      }>(detailPath);
      detail[field][0] = content;
      writeJson(detailPath, detail);
      expectCatalogError(
        fixture.root,
        fixture.catalogPath,
        "detail-content-invalid",
      );
    }
  });

  test("rejects backslashes in repository evidence paths", () => {
    const fixture = createFixtureProject();
    const ambiguousSourcePath = "pi-extensions\\private.ts";
    writeFileSync(
      join(fixture.root, ambiguousSourcePath),
      "export const privateState = true;\n",
    );
    const evidencePath = join(
      fixture.root,
      "dotagents",
      "evidence",
      "extensions",
      "handoff.json",
    );
    const evidence = readJson<{
      claims: Array<{ sourcePath: string; sourceLines: string }>;
    }>(evidencePath);
    evidence.claims[0].sourcePath = ambiguousSourcePath;
    writeJson(evidencePath, evidence);

    expectCatalogError(fixture.root, fixture.catalogPath, "unsafe-path");
  });

  test("rejects private local files as public evidence", () => {
    const fixture = createFixtureProject();
    const privateSource = join(fixture.root, ".pi", "private.ts");
    mkdirSync(dirname(privateSource), { recursive: true });
    writeFileSync(privateSource, "export const privateState = true;\n");
    const evidencePath = join(
      fixture.root,
      "dotagents",
      "evidence",
      "extensions",
      "handoff.json",
    );
    const evidence = readJson<{
      claims: Array<{ sourcePath: string; sourceLines: string }>;
    }>(evidencePath);
    evidence.claims[0].sourcePath = ".pi/private.ts";
    writeJson(evidencePath, evidence);

    expectCatalogError(
      fixture.root,
      fixture.catalogPath,
      "evidence-source-invalid",
    );
  });

  test("binds external evidence URLs to reviewed immutable revision", () => {
    const fixture = createFixtureProject();
    configureGitPackage(fixture);
    const evidencePath = join(
      fixture.root,
      "dotagents",
      "evidence",
      "extensions",
      "handoff.json",
    );
    const evidence = readJson<{
      claims: Array<{ sourceUrl: string }>;
    }>(evidencePath);
    evidence.claims[0].sourceUrl = `https://github.com/example/handoff/blob/${otherRevision}/src/index.ts#L10-L20`;
    writeJson(evidencePath, evidence);

    expectCatalogError(
      fixture.root,
      fixture.catalogPath,
      "evidence-revision-mismatch",
    );
  });

  test("rejects private and machine-local patterns in public artifacts", () => {
    const catalogLeak = createFixtureProject();
    mutateCatalog(catalogLeak.catalogPath, (catalog) => {
      catalog.metadata.tagline = "Local source at /Users/alice/private.";
    });
    expectCatalogError(
      catalogLeak.root,
      catalogLeak.catalogPath,
      "private-content",
    );

    const readmeLeak = createFixtureProject();
    writeFileSync(
      join(readmeLeak.root, "dotagents", "README.md"),
      "Internal runtime: .pi/subagents/session.jsonl\n",
    );
    expectCatalogError(
      readmeLeak.root,
      readmeLeak.catalogPath,
      "private-content",
    );
  });
});
