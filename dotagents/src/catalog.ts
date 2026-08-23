import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
} from "node:fs";
import {
  dirname,
  extname,
  isAbsolute,
  join,
  normalize,
  relative,
  resolve,
  sep,
  win32,
} from "node:path";

import Ajv2020, {
  type AnySchema,
  type ErrorObject,
  type ValidateFunction,
} from "ajv/dist/2020.js";

export type CatalogValidationContext = Readonly<
  Record<string, unknown> & { catalogPath: string }
>;

export class CatalogValidationError extends Error {
  readonly code: string;
  readonly context: CatalogValidationContext;

  constructor(
    code: string,
    message: string,
    context: CatalogValidationContext,
    options?: ErrorOptions,
  ) {
    super(`${code}: ${message}`, options);
    this.name = "CatalogValidationError";
    this.code = code;
    this.context = context;
  }
}

type ProjectRelationship = "original" | "fork" | "adopted";

type Project = {
  id: string;
  installedLocator: string;
  canonicalUrl: string;
  upstreamUrl?: string;
  relationship: ProjectRelationship;
  originalAuthors: string[];
  currentMaintainers: string[];
  reviewedRevision?: string;
};

type LocalLicenseScope = {
  type: "local-paths";
  pathPrefixes: string[];
};

type ExternalLicenseScope = {
  type: "external-projects";
  projectIds: string[];
};

type License = {
  id: string;
  evidence: { type: "path" | "url"; value: string };
  scope: LocalLicenseScope | ExternalLicenseScope;
  reviewedBy: string;
  reviewedOn: string;
};

type EntryKind = "extension" | "skill" | "prompt";
type CandidateKind = EntryKind | "package";
type Delivery = "local-file" | "git-package" | "npm-package";

type Entry = {
  id: string;
  projectId: string;
  licenseRef: string;
  slug: string;
  kind: EntryKind;
  delivery: Delivery;
  source: { path?: string; locator?: string };
  publication: "featured" | "listed";
  detailPath?: string;
  evidencePath?: string;
};

type Exclusion = {
  kind: CandidateKind;
  source: string;
  reason: string;
};

type Coverage = {
  schemaVersion: 1;
  excluded: Exclusion[];
};

type Candidate = {
  kind: CandidateKind;
  source: string;
};

type DiscoveredCandidates = {
  candidates: Candidate[];
  packageLocators: ReadonlySet<string>;
};

export type Catalog = {
  schemaVersion: 1;
  metadata: Record<string, unknown>;
  projects: Project[];
  licenses: License[];
  entries: Entry[];
};

export type Detail = {
  schemaVersion: 1;
  howItFits: Array<{ entryId: string; relationship: string }>;
  [key: string]: unknown;
};

export type Evidence = {
  schemaVersion: 1;
  entryId: string;
  verifiedAgainst: { type: "commit"; value: string };
  reviewedBy: string;
  reviewedOn: string;
  claims: Array<{
    sourcePath?: string;
    sourceLines?: string;
    sourceUrl?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};

export type CatalogValidationOptions = {
  root: string;
  catalogPath: string;
};

export type CatalogValidationResult = {
  catalog: Catalog;
  details: ReadonlyMap<string, Detail>;
  evidence: ReadonlyMap<string, Evidence>;
};

type ValidationState = {
  root: string;
  catalogPath: string;
  catalogFilePath: string;
};

const kindDirectories: Readonly<Record<EntryKind, string>> = {
  extension: "extensions",
  skill: "skills",
  prompt: "prompts",
};

const privateContentPatterns: readonly RegExp[] = [
  /\/Users\/[^/\s]+/u,
  /\/home\/[^/\s]+/u,
  /[A-Za-z]:\\Users\\/u,
  /file:\/\//iu,
  /session_analysis/u,
  /\.pi\/subagents/u,
  /\.pi-subagents/u,
];

const extensionExclusionPattern =
  /^(?:(?:test|spec|config)|.+[._-](?:test|spec|config))\.ts$/iu;
const markdownPattern =
  /^(?:\s{0,3}(?:#{1,6}\s+|(?:[-*+]|>)\s+|\d+[.)]\s+|(?:[-*_]\s*){3,}|```|~~~))|```|~~~|!?\[[^\]\n]*\](?:\([^\n)]*\)|\[[^\]\n]*\])|`[^`\n]+`|\*\*(?=\S)(?:(?!\*\*).)*\S\*\*|__(?=\S)(?:(?!__).)*\S__|~~(?=\S)(?:(?!~~).)*\S~~|(?<!\*)\*(?!\*)(?=\S)[^*\n]*\S\*(?!\*)|(?<![\w_])_(?!_)(?=\S)[^_\n]*\S_(?![\w_])/imu;
const htmlPattern = /<\/?[A-Za-z][A-Za-z0-9-]*(?:\s+[^<>]*)?>/u;
const uriPattern =
  /(?:\b[A-Za-z][A-Za-z0-9+.-]*:\/\/|\b(?:data|file|git|javascript|mailto|sms|ssh|tel|urn|vbscript):|\/\/|www\.)[^\s<>"']+/iu;
const evidenceSourcePrefixes = [
  "pi-extensions/",
  "skills/",
  "specific_skills/",
  "prompts/",
] as const;

const schemaRoot = resolve(import.meta.dirname, "..");
const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateCatalogSchema = compileSchema("catalog.schema.json");
const validateDetailSchema = compileSchema("detail.schema.json");
const validateEvidenceSchema = compileSchema("evidence.schema.json");
const validateCoverageSchema = compileSchema("coverage.schema.json");

// [tag:dotagents_catalog_contract] Producer and consumer validators must reject
// unknown structure, broken references, and paths escaping the trusted root.
// [tag:dotagents_publish_boundary] Discovery coverage records exclusions only;
// catalog entries are the explicit allowlist for public publication.
export function validateCatalog(
  options: CatalogValidationOptions,
): CatalogValidationResult {
  const requestedRoot = resolve(options.root);
  const catalogPath = isAbsolute(options.catalogPath)
    ? normalize(options.catalogPath)
    : resolve(requestedRoot, options.catalogPath);
  const canonicalRoot = canonicalDirectory(requestedRoot, catalogPath);
  const state: ValidationState = {
    root: canonicalRoot,
    catalogPath,
    catalogFilePath: resolve(
      canonicalRoot,
      relative(requestedRoot, catalogPath),
    ),
  };

  assertCatalogPath(state);
  const catalog = readSchemaJson<Catalog>(
    state.catalogFilePath,
    validateCatalogSchema,
    "catalog",
    state,
  );
  assertNoPrivatePublicContent(state);

  const projects = uniqueIndex(catalog.projects, "project", state);
  const licenses = uniqueIndex(catalog.licenses, "license", state);
  const entries = uniqueIndex(catalog.entries, "entry", state);
  assertUniqueRoutes(catalog.entries, state);
  assertEntryReferences(catalog.entries, projects, licenses, state);
  assertProjectProvenance(catalog.projects, state);
  assertLicenseEvidencePaths(catalog.licenses, state);
  assertEntryPathsAndLicenseScopes(catalog.entries, licenses, state);
  assertLicenseScopeReferences(catalog.licenses, projects, state);

  const details = new Map<string, Detail>();
  const evidence = new Map<string, Evidence>();
  const referencedDetailPaths = new Set<string>();
  const referencedEvidencePaths = new Set<string>();

  for (const entry of catalog.entries) {
    if (entry.publication !== "featured") {
      continue;
    }

    const detailPath = assertSectionFile(
      requiredFeaturedPath(entry, "detailPath", state),
      join(
        dirname(state.catalogFilePath),
        "details",
        kindDirectories[entry.kind],
      ),
      "detail",
      entry.id,
      state,
    );
    const evidencePath = assertSectionFile(
      requiredFeaturedPath(entry, "evidencePath", state),
      join(
        dirname(state.catalogFilePath),
        "evidence",
        kindDirectories[entry.kind],
      ),
      "evidence",
      entry.id,
      state,
    );
    referencedDetailPaths.add(detailPath);
    referencedEvidencePaths.add(evidencePath);

    const detail = readSchemaJson<Detail>(
      detailPath,
      validateDetailSchema,
      "detail",
      state,
      entry.id,
    );
    const dossier = readSchemaJson<Evidence>(
      evidencePath,
      validateEvidenceSchema,
      "evidence",
      state,
      entry.id,
    );

    assertDetailContent(detail, entry.id, state);
    assertDetailReferences(detail, entry.id, entries, state);
    assertEvidenceReferences(dossier, entry.id, state);
    assertEvidenceReview(dossier, entry.id, state);
    assertFeaturedRevision(dossier, entry, projects, state);
    assertEvidenceSourcePaths(dossier, entry, projects, state);
    details.set(entry.id, detail);
    evidence.set(entry.id, dossier);
  }

  assertNoOrphans(
    join(dirname(state.catalogFilePath), "details"),
    referencedDetailPaths,
    "detail",
    state,
  );
  assertNoOrphans(
    join(dirname(state.catalogFilePath), "evidence"),
    referencedEvidencePaths,
    "evidence",
    state,
  );

  const discovered = discoverCandidates(state);
  assertProjectEntrySources(
    catalog.entries,
    projects,
    discovered.packageLocators,
    state,
  );
  assertCoverage(catalog.entries, discovered.candidates, state);

  return { catalog, details, evidence };
}

function compileSchema(name: string): ValidateFunction {
  return ajv.compile(
    JSON.parse(readFileSync(join(schemaRoot, name), "utf8")) as AnySchema,
  );
}

function canonicalDirectory(root: string, catalogPath: string): string {
  const resolvedRoot = resolve(root);
  try {
    const canonicalRoot = realpathSync(resolvedRoot);
    if (!lstatSync(canonicalRoot).isDirectory()) {
      throw catalogError(
        "invalid-root",
        `repository root is not a directory: ${resolvedRoot}`,
        catalogPath,
        { path: resolvedRoot },
      );
    }
    return canonicalRoot;
  } catch (error) {
    if (error instanceof CatalogValidationError) {
      throw error;
    }
    throw catalogError(
      "invalid-root",
      `cannot resolve repository root: ${resolvedRoot}`,
      catalogPath,
      { path: resolvedRoot },
      error,
    );
  }
}

function assertCatalogPath(state: ValidationState): void {
  const canonicalCatalog = assertExistingFile(
    state.catalogFilePath,
    "catalog",
    state,
  );
  if (!isWithin(state.root, canonicalCatalog)) {
    throw catalogError(
      "path-outside-root",
      `catalog resolves outside repository root: ${state.catalogPath}`,
      state.catalogPath,
      { path: state.catalogPath, resolvedPath: canonicalCatalog },
    );
  }
}

function readSchemaJson<T>(
  path: string,
  validate: ValidateFunction,
  artifact: string,
  state: ValidationState,
  entryId?: string,
): T {
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw catalogError(
      "invalid-json",
      `${artifact} is not readable JSON: ${path}`,
      state.catalogPath,
      { artifact, path, ...(entryId ? { entryId } : {}) },
      error,
    );
  }

  if (!validate(value)) {
    throw catalogError(
      "schema-invalid",
      `${artifact} does not match its schema: ${formatSchemaErrors(validate.errors)}`,
      state.catalogPath,
      {
        artifact,
        path,
        ...(entryId ? { entryId } : {}),
        errors: validate.errors ?? [],
      },
    );
  }
  return value as T;
}

function formatSchemaErrors(errors: ErrorObject[] | null | undefined): string {
  return (errors ?? [])
    .map(
      (error) =>
        `${error.instancePath || "/"} ${error.message ?? error.keyword}`,
    )
    .join("; ");
}

function uniqueIndex<T extends { id: string }>(
  records: T[],
  kind: "project" | "license" | "entry",
  state: ValidationState,
): Map<string, T> {
  const index = new Map<string, T>();
  for (const record of records) {
    if (index.has(record.id)) {
      throw catalogError(
        `duplicate-${kind}-id`,
        `${kind} ID appears more than once: ${record.id}`,
        state.catalogPath,
        { identity: record.id },
      );
    }
    index.set(record.id, record);
  }
  return index;
}

function assertUniqueRoutes(entries: Entry[], state: ValidationState): void {
  const routes = new Set<string>();
  for (const entry of entries) {
    const route = `${entry.kind}/${entry.slug}`;
    if (routes.has(route)) {
      throw catalogError(
        "duplicate-route",
        `entry route appears more than once: ${route}`,
        state.catalogPath,
        { identity: entry.id, route },
      );
    }
    routes.add(route);
  }
}

function assertEntryReferences(
  entries: Entry[],
  projects: ReadonlyMap<string, Project>,
  licenses: ReadonlyMap<string, License>,
  state: ValidationState,
): void {
  for (const entry of entries) {
    if (!projects.has(entry.projectId)) {
      throw catalogError(
        "unknown-project",
        `${entry.id} references missing project ${entry.projectId}`,
        state.catalogPath,
        { entryId: entry.id, identity: entry.projectId },
      );
    }
    if (!licenses.has(entry.licenseRef)) {
      throw catalogError(
        "unknown-license",
        `${entry.id} references missing license ${entry.licenseRef}`,
        state.catalogPath,
        { entryId: entry.id, identity: entry.licenseRef },
      );
    }
  }
}

function assertProjectProvenance(
  projects: Project[],
  state: ValidationState,
): void {
  for (const project of projects) {
    if (project.relationship === "fork" && !project.upstreamUrl) {
      throw catalogError(
        "provenance-invalid",
        `${project.id} fork has no upstream URL`,
        state.catalogPath,
        { projectId: project.id },
      );
    }
    if (
      project.relationship !== "original" &&
      project.reviewedRevision === undefined
    ) {
      throw catalogError(
        "provenance-invalid",
        `${project.id} ${project.relationship} has no reviewed revision`,
        state.catalogPath,
        { projectId: project.id },
      );
    }
  }
}

function assertLicenseEvidencePaths(
  licenses: License[],
  state: ValidationState,
): void {
  for (const license of licenses) {
    assertCalendarDate(
      license.reviewedOn,
      "license-review-invalid",
      `license ${license.id} review date is invalid`,
      state,
      { licenseId: license.id },
    );
    if (license.evidence.type === "path") {
      assertRepositoryFile(
        license.evidence.value,
        "license evidence",
        state,
        license.id,
      );
    }
    if (license.scope.type === "local-paths") {
      for (const prefix of license.scope.pathPrefixes) {
        assertSafeRelativePath(
          prefix,
          "license path prefix",
          state,
          license.id,
        );
      }
    }
  }
}

function assertLicenseScopeReferences(
  licenses: License[],
  projects: ReadonlyMap<string, Project>,
  state: ValidationState,
): void {
  for (const license of licenses) {
    if (license.scope.type !== "external-projects") {
      continue;
    }
    for (const projectId of license.scope.projectIds) {
      if (!projects.has(projectId)) {
        throw catalogError(
          "unknown-project",
          `${license.id} scope references missing project ${projectId}`,
          state.catalogPath,
          { licenseId: license.id, identity: projectId },
        );
      }
    }
  }
}

function assertEntryPathsAndLicenseScopes(
  entries: Entry[],
  licenses: ReadonlyMap<string, License>,
  state: ValidationState,
): void {
  for (const entry of entries) {
    const sourcePath = entry.source.path;
    if (sourcePath) {
      assertSafeRelativePath(sourcePath, "entry source", state, entry.id);
    }
    if (entry.delivery === "local-file") {
      if (!sourcePath) {
        throw catalogError(
          "schema-invalid",
          `${entry.id} local-file source has no path`,
          state.catalogPath,
          { entryId: entry.id },
        );
      }
      assertRepositoryFile(sourcePath, "entry source", state, entry.id);
    }

    const license = licenses.get(entry.licenseRef);
    if (!license) {
      continue;
    }
    if (license.scope.type === "local-paths") {
      if (
        !sourcePath ||
        !license.scope.pathPrefixes.some((prefix) =>
          pathHasPrefix(sourcePath, prefix),
        )
      ) {
        throw catalogError(
          "license-scope-mismatch",
          `${entry.id} source is outside ${license.id} local path scope`,
          state.catalogPath,
          { entryId: entry.id, licenseId: license.id, path: sourcePath },
        );
      }
    } else if (!license.scope.projectIds.includes(entry.projectId)) {
      throw catalogError(
        "license-scope-mismatch",
        `${entry.id} project is outside ${license.id} external project scope`,
        state.catalogPath,
        {
          entryId: entry.id,
          licenseId: license.id,
          identity: entry.projectId,
        },
      );
    }
  }
}

function assertProjectEntrySources(
  entries: Entry[],
  projects: ReadonlyMap<string, Project>,
  packageLocators: ReadonlySet<string>,
  state: ValidationState,
): void {
  const entriesByProject = new Map<string, Entry[]>();
  const projectByPackageLocator = new Map<string, string>();
  for (const entry of entries) {
    const projectEntries = entriesByProject.get(entry.projectId) ?? [];
    projectEntries.push(entry);
    entriesByProject.set(entry.projectId, projectEntries);

    const locator =
      entry.delivery === "local-file" ? undefined : entry.source.locator;
    const existingProjectId = locator
      ? projectByPackageLocator.get(locator)
      : undefined;
    if (locator && existingProjectId && existingProjectId !== entry.projectId) {
      throw catalogError(
        "package-project-split",
        `${locator} is modeled by more than one project`,
        state.catalogPath,
        { locator, projectIds: [existingProjectId, entry.projectId] },
      );
    }
    if (locator) {
      projectByPackageLocator.set(locator, entry.projectId);
    }
  }

  for (const [projectId, projectEntries] of entriesByProject) {
    const deliveries = new Set(projectEntries.map((entry) => entry.delivery));
    if (deliveries.size > 1) {
      throw catalogError(
        "mixed-project-delivery",
        `${projectId} mixes local and package delivery`,
        state.catalogPath,
        { projectId },
      );
    }

    const delivery = projectEntries[0]?.delivery;
    if (delivery === "local-file") {
      continue;
    }

    const project = projects.get(projectId);
    if (!project?.reviewedRevision) {
      throw catalogError(
        "revision-missing",
        `${projectId} package has no reviewed revision`,
        state.catalogPath,
        { projectId },
      );
    }

    const locators = new Set(
      projectEntries.map((entry) => entry.source.locator ?? ""),
    );
    if (locators.size !== 1) {
      throw catalogError(
        "mixed-project-source",
        `${projectId} package surfaces use different source locators`,
        state.catalogPath,
        { projectId },
      );
    }

    const kinds = new Set(projectEntries.map((entry) => entry.kind));
    if (kinds.size !== projectEntries.length) {
      throw catalogError(
        "duplicate-project-surface",
        `${projectId} repeats a package surface kind`,
        state.catalogPath,
        { projectId },
      );
    }

    const locator = projectEntries[0]?.source.locator;
    if (!locator) {
      continue;
    }
    if (project.installedLocator !== locator) {
      throw catalogError(
        "project-locator-mismatch",
        `${projectId} installed locator does not match ${locator}`,
        state.catalogPath,
        { projectId, locator, installedLocator: project.installedLocator },
      );
    }
    if (!packageLocators.has(locator)) {
      throw catalogError(
        "package-not-configured",
        `${projectId} package locator is absent from pi-settings.json: ${locator}`,
        state.catalogPath,
        { projectId, locator },
      );
    }
  }
}

function pathHasPrefix(path: string, prefix: string): boolean {
  const normalizedPath = normalizeCatalogPath(path);
  const normalizedPrefix = normalizeCatalogPath(prefix).replace(/\/$/, "");
  return (
    normalizedPath === normalizedPrefix ||
    normalizedPath.startsWith(`${normalizedPrefix}/`)
  );
}

function normalizeCatalogPath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/+$/, "");
}

function requiredFeaturedPath(
  entry: Entry,
  field: "detailPath" | "evidencePath",
  state: ValidationState,
): string {
  const path = entry[field];
  if (!path) {
    throw catalogError(
      "schema-invalid",
      `${entry.id} featured entry has no ${field}`,
      state.catalogPath,
      { entryId: entry.id, field },
    );
  }
  return path;
}

function assertSectionFile(
  repositoryPath: string,
  sectionRoot: string,
  artifact: "detail" | "evidence",
  entryId: string,
  state: ValidationState,
): string {
  assertSafeRelativePath(repositoryPath, artifact, state, entryId);
  const lexicalPath = resolve(state.root, repositoryPath);
  if (!isWithin(resolve(sectionRoot), lexicalPath)) {
    throw catalogError(
      "path-outside-section",
      `${entryId} ${artifact} path is outside its ${artifact} directory`,
      state.catalogPath,
      { artifact, entryId, path: repositoryPath },
    );
  }
  assertRepositoryFile(repositoryPath, artifact, state, entryId);
  return lexicalPath;
}

function assertRepositoryFile(
  repositoryPath: string,
  artifact: string,
  state: ValidationState,
  identity?: string,
): string {
  assertSafeRelativePath(repositoryPath, artifact, state, identity);
  const lexicalPath = resolve(state.root, repositoryPath);
  if (!isWithin(state.root, lexicalPath)) {
    throw catalogError(
      "path-outside-root",
      `${artifact} path escapes repository root: ${repositoryPath}`,
      state.catalogPath,
      { artifact, path: repositoryPath, ...(identity ? { identity } : {}) },
    );
  }

  const canonicalPath = assertExistingFile(
    lexicalPath,
    artifact,
    state,
    identity,
  );
  if (!isWithin(state.root, canonicalPath)) {
    throw catalogError(
      "path-outside-root",
      `${artifact} resolves outside repository root: ${repositoryPath}`,
      state.catalogPath,
      {
        artifact,
        path: repositoryPath,
        resolvedPath: canonicalPath,
        ...(identity ? { identity } : {}),
      },
    );
  }
  return lexicalPath;
}

function assertSafeRelativePath(
  path: string,
  artifact: string,
  state: ValidationState,
  identity?: string,
): void {
  const segments = path.split(/[\\/]+/);
  if (
    path.includes("\0") ||
    path.includes("\\") ||
    isAbsolute(path) ||
    win32.isAbsolute(path) ||
    segments.includes("..")
  ) {
    throw catalogError(
      "unsafe-path",
      `${artifact} must be a slash-separated, non-traversing repository-relative path: ${path}`,
      state.catalogPath,
      { artifact, path, ...(identity ? { identity } : {}) },
    );
  }
}

function assertExistingFile(
  path: string,
  artifact: string,
  state: ValidationState,
  identity?: string,
): string {
  if (!existsSync(path)) {
    throw catalogError(
      "path-not-found",
      `${artifact} path does not exist: ${path}`,
      state.catalogPath,
      { artifact, path, ...(identity ? { identity } : {}) },
    );
  }

  let canonicalPath: string;
  try {
    canonicalPath = realpathSync(path);
  } catch (error) {
    throw catalogError(
      "path-not-found",
      `${artifact} path cannot be resolved: ${path}`,
      state.catalogPath,
      { artifact, path, ...(identity ? { identity } : {}) },
      error,
    );
  }
  if (!lstatSync(canonicalPath).isFile()) {
    throw catalogError(
      "path-not-file",
      `${artifact} path is not a file: ${path}`,
      state.catalogPath,
      { artifact, path, ...(identity ? { identity } : {}) },
    );
  }

  const lexicalPath = resolve(path);
  if (
    isWithin(state.root, lexicalPath) &&
    isWithin(state.root, canonicalPath)
  ) {
    assertNoSymlinkComponents(lexicalPath, artifact, state, identity);
  }
  return canonicalPath;
}

function assertRepositoryDirectory(
  directory: string,
  artifact: string,
  state: ValidationState,
): void {
  const lexicalPath = resolve(directory);
  let canonicalPath: string;
  try {
    canonicalPath = realpathSync(lexicalPath);
  } catch (error) {
    throw catalogError(
      "path-not-found",
      `${artifact} directory cannot be resolved: ${directory}`,
      state.catalogPath,
      { artifact, path: repositoryRelativePath(directory, state) },
      error,
    );
  }

  if (!isWithin(state.root, canonicalPath)) {
    throw catalogError(
      "path-outside-root",
      `${artifact} directory resolves outside repository root: ${directory}`,
      state.catalogPath,
      {
        artifact,
        path: repositoryRelativePath(directory, state),
        resolvedPath: canonicalPath,
      },
    );
  }
  if (!lstatSync(canonicalPath).isDirectory()) {
    throw catalogError(
      "path-not-directory",
      `${artifact} path is not a directory: ${directory}`,
      state.catalogPath,
      { artifact, path: repositoryRelativePath(directory, state) },
    );
  }

  assertNoSymlinkComponents(lexicalPath, artifact, state);
}

function assertNoSymlinkComponents(
  path: string,
  artifact: string,
  state: ValidationState,
  identity?: string,
): void {
  let currentPath = state.root;
  for (const segment of relative(state.root, path).split(sep).filter(Boolean)) {
    currentPath = join(currentPath, segment);
    if (lstatSync(currentPath).isSymbolicLink()) {
      const repositoryPath = repositoryRelativePath(path, state);
      throw catalogError(
        "symlink-path",
        `${artifact} path must not contain symbolic links: ${repositoryPath}`,
        state.catalogPath,
        {
          artifact,
          path: repositoryPath,
          symlink: repositoryRelativePath(currentPath, state),
          ...(identity ? { identity } : {}),
        },
      );
    }
  }
}

function assertDetailContent(
  detail: Detail,
  entryId: string,
  state: ValidationState,
): void {
  for (const [field, value] of Object.entries(detail)) {
    for (const string of stringsIn(value)) {
      if (
        markdownPattern.test(string) ||
        htmlPattern.test(string) ||
        uriPattern.test(string)
      ) {
        throw catalogError(
          "detail-content-invalid",
          `${entryId} detail contains Markdown, HTML, or arbitrary URL content`,
          state.catalogPath,
          { entryId, field, value: string },
        );
      }
    }
  }
}

function* stringsIn(value: unknown): Generator<string> {
  if (typeof value === "string") {
    yield value;
  } else if (Array.isArray(value)) {
    for (const item of value) {
      yield* stringsIn(item);
    }
  } else if (value !== null && typeof value === "object") {
    for (const nestedValue of Object.values(value)) {
      yield* stringsIn(nestedValue);
    }
  }
}

function assertDetailReferences(
  detail: Detail,
  entryId: string,
  entries: ReadonlyMap<string, Entry>,
  state: ValidationState,
): void {
  for (const relationship of detail.howItFits) {
    if (!entries.has(relationship.entryId)) {
      throw catalogError(
        "unknown-related-entry",
        `${entryId} detail references missing entry ${relationship.entryId}`,
        state.catalogPath,
        { entryId, identity: relationship.entryId },
      );
    }
  }
}

function assertEvidenceReferences(
  evidence: Evidence,
  entryId: string,
  state: ValidationState,
): void {
  if (evidence.entryId !== entryId) {
    throw catalogError(
      "entry-evidence-mismatch",
      `${entryId} evidence names ${evidence.entryId}`,
      state.catalogPath,
      { entryId, identity: evidence.entryId },
    );
  }
}

function assertEvidenceReview(
  evidence: Evidence,
  entryId: string,
  state: ValidationState,
): void {
  assertCalendarDate(
    evidence.reviewedOn,
    "evidence-review-invalid",
    `${entryId} evidence review date is invalid`,
    state,
    { entryId },
  );
}

function assertFeaturedRevision(
  evidence: Evidence,
  entry: Entry,
  projects: ReadonlyMap<string, Project>,
  state: ValidationState,
): void {
  const project = projects.get(entry.projectId);
  if (!project?.reviewedRevision) {
    throw catalogError(
      "revision-missing",
      `${entry.id} featured claim has no project reviewed revision`,
      state.catalogPath,
      { entryId: entry.id, projectId: entry.projectId },
    );
  }
  if (evidence.verifiedAgainst.value !== project.reviewedRevision) {
    throw catalogError(
      "revision-mismatch",
      `${entry.id} evidence revision differs from ${project.id}`,
      state.catalogPath,
      {
        entryId: entry.id,
        projectId: project.id,
        evidenceRevision: evidence.verifiedAgainst.value,
        reviewedRevision: project.reviewedRevision,
      },
    );
  }
}

function assertEvidenceSourcePaths(
  evidence: Evidence,
  entry: Entry,
  projects: ReadonlyMap<string, Project>,
  state: ValidationState,
): void {
  const project = projects.get(entry.projectId);
  for (const claim of evidence.claims) {
    if (claim.sourcePath) {
      if (entry.delivery !== "local-file") {
        throw catalogError(
          "evidence-source-invalid",
          `${entry.id} package claim must use an immutable source URL`,
          state.catalogPath,
          { entryId: entry.id, sourcePath: claim.sourcePath },
        );
      }
      if (
        !evidenceSourcePrefixes.some((prefix) =>
          pathHasPrefix(claim.sourcePath ?? "", prefix),
        )
      ) {
        throw catalogError(
          "evidence-source-invalid",
          `${entry.id} local evidence is outside allowed public source roots`,
          state.catalogPath,
          { entryId: entry.id, sourcePath: claim.sourcePath },
        );
      }
      assertRepositoryFile(
        claim.sourcePath,
        "evidence source",
        state,
        entry.id,
      );
    }
    if (
      claim.sourceUrl &&
      project?.reviewedRevision &&
      !claim.sourceUrl.includes(`/${project.reviewedRevision}/`)
    ) {
      throw catalogError(
        "evidence-revision-mismatch",
        `${entry.id} evidence URL does not use ${project.reviewedRevision}`,
        state.catalogPath,
        {
          entryId: entry.id,
          projectId: project.id,
          sourceUrl: claim.sourceUrl,
        },
      );
    }
  }
}

function assertNoOrphans(
  directory: string,
  referencedPaths: ReadonlySet<string>,
  artifact: "detail" | "evidence",
  state: ValidationState,
): void {
  for (const path of listJsonFiles(directory)) {
    if (!referencedPaths.has(path)) {
      throw catalogError(
        `orphan-${artifact}`,
        `${artifact} file is not referenced by a featured entry: ${path}`,
        state.catalogPath,
        { artifact, path },
      );
    }
  }
}

function discoverCandidates(state: ValidationState): DiscoveredCandidates {
  const candidates = [
    ...discoverTopLevelFiles(
      join(state.root, "pi-extensions"),
      "extension",
      (name) =>
        extname(name) === ".ts" && !extensionExclusionPattern.test(name),
      state,
    ),
    ...discoverSkillFiles(join(state.root, "skills"), state),
    ...discoverSkillFiles(join(state.root, "specific_skills"), state),
    ...discoverTopLevelFiles(
      join(state.root, "prompts"),
      "prompt",
      (name) => extname(name) === ".md",
      state,
    ),
  ];
  const packageLocators = readPackageLocators(state);
  for (const locator of packageLocators) {
    candidates.push({ kind: "package", source: locator });
  }
  return { candidates, packageLocators };
}

function discoverTopLevelFiles(
  directory: string,
  kind: EntryKind,
  include: (name: string) => boolean,
  state: ValidationState,
): Candidate[] {
  if (!lstatSync(directory, { throwIfNoEntry: false })) {
    return [];
  }
  assertRepositoryDirectory(directory, "discovery root", state);

  const candidates: Candidate[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!include(entry.name) || !(entry.isFile() || entry.isSymbolicLink())) {
      continue;
    }
    const path = join(directory, entry.name);
    assertDiscoveredFile(path, state);
    candidates.push({ kind, source: repositoryRelativePath(path, state) });
  }
  return candidates;
}

function discoverSkillFiles(
  directory: string,
  state: ValidationState,
): Candidate[] {
  if (!lstatSync(directory, { throwIfNoEntry: false })) {
    return [];
  }
  assertRepositoryDirectory(directory, "discovery root", state);

  const candidates: Candidate[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!(entry.isDirectory() || entry.isSymbolicLink())) {
      continue;
    }
    const path = join(directory, entry.name, "SKILL.md");
    if (!existsSync(path)) {
      continue;
    }
    assertDiscoveredFile(path, state);
    candidates.push({
      kind: "skill",
      source: repositoryRelativePath(path, state),
    });
  }
  return candidates;
}

function assertDiscoveredFile(path: string, state: ValidationState): void {
  const canonicalPath = assertExistingFile(path, "discovery candidate", state);
  if (!isWithin(state.root, canonicalPath)) {
    throw catalogError(
      "path-outside-root",
      `discovery candidate resolves outside repository root: ${path}`,
      state.catalogPath,
      { path, resolvedPath: canonicalPath },
    );
  }
}

function repositoryRelativePath(path: string, state: ValidationState): string {
  return relative(state.root, path).split(sep).join("/");
}

function readPackageLocators(state: ValidationState): ReadonlySet<string> {
  const settingsPath = assertRepositoryFile(
    "pi-settings.json",
    "package config",
    state,
  );
  let settings: unknown;
  try {
    settings = JSON.parse(readFileSync(settingsPath, "utf8"));
  } catch (error) {
    throw catalogError(
      "package-config-invalid",
      `pi-settings.json packages are not readable: ${settingsPath}`,
      state.catalogPath,
      { path: settingsPath },
      error,
    );
  }

  if (
    settings === null ||
    typeof settings !== "object" ||
    !Array.isArray((settings as { packages?: unknown }).packages) ||
    !(settings as { packages: unknown[] }).packages.every(
      (locator) => typeof locator === "string" && locator.length > 0,
    )
  ) {
    throw catalogError(
      "package-config-invalid",
      "pi-settings.json#/packages must be an array of non-empty strings",
      state.catalogPath,
      { path: settingsPath },
    );
  }

  const locators = new Set<string>();
  for (const locator of (settings as { packages: string[] }).packages) {
    if (locators.has(locator)) {
      throw catalogError(
        "package-config-invalid",
        `pi-settings.json repeats package locator: ${locator}`,
        state.catalogPath,
        { path: settingsPath, locator },
      );
    }
    locators.add(locator);
  }
  return locators;
}

function assertCoverage(
  entries: Entry[],
  candidates: Candidate[],
  state: ValidationState,
): void {
  const coveragePath = join(dirname(state.catalogFilePath), "coverage.json");
  const coverage = readSchemaJson<Coverage>(
    coveragePath,
    validateCoverageSchema,
    "coverage",
    state,
  );
  const candidatesByKey = new Map<string, Candidate>();
  for (const candidate of candidates) {
    const key = candidateKey(candidate);
    if (candidatesByKey.has(key)) {
      throw catalogError(
        "discovery-duplicate",
        `discovery found candidate more than once: ${candidate.source}`,
        state.catalogPath,
        { kind: candidate.kind, source: candidate.source },
      );
    }
    candidatesByKey.set(key, candidate);
  }

  const publicEntriesByCandidate = new Map<string, Entry[]>();
  for (const entry of entries) {
    const candidate = candidateForEntry(entry);
    const key = candidateKey(candidate);
    if (!candidatesByKey.has(key)) {
      throw catalogError(
        "coverage-public-unknown",
        `${entry.id} source is outside discovery universe: ${candidate.source}`,
        state.catalogPath,
        { entryId: entry.id, kind: candidate.kind, source: candidate.source },
      );
    }
    const publicEntries = publicEntriesByCandidate.get(key) ?? [];
    publicEntries.push(entry);
    publicEntriesByCandidate.set(key, publicEntries);
  }

  const excludedKeys = new Set<string>();
  for (const exclusion of coverage.excluded) {
    const key = candidateKey(exclusion);
    if (!candidatesByKey.has(key)) {
      throw catalogError(
        "coverage-unknown-candidate",
        `coverage excludes undiscovered candidate: ${exclusion.source}`,
        state.catalogPath,
        { kind: exclusion.kind, source: exclusion.source },
      );
    }
    if (excludedKeys.has(key)) {
      throw catalogError(
        "coverage-duplicate",
        `coverage excludes candidate more than once: ${exclusion.source}`,
        state.catalogPath,
        { kind: exclusion.kind, source: exclusion.source },
      );
    }
    if (publicEntriesByCandidate.has(key)) {
      throw catalogError(
        "coverage-public-conflict",
        `coverage excludes public candidate: ${exclusion.source}`,
        state.catalogPath,
        { kind: exclusion.kind, source: exclusion.source },
      );
    }
    excludedKeys.add(key);
  }

  for (const [key, candidate] of candidatesByKey) {
    if (!publicEntriesByCandidate.has(key) && !excludedKeys.has(key)) {
      throw catalogError(
        "coverage-unclassified",
        `discovered candidate has no public entry or exclusion: ${candidate.source}`,
        state.catalogPath,
        { kind: candidate.kind, source: candidate.source },
      );
    }
  }
}

function candidateForEntry(entry: Entry): Candidate {
  if (entry.delivery === "local-file") {
    return {
      kind: entry.kind,
      source: normalizeCatalogPath(entry.source.path ?? ""),
    };
  }
  return { kind: "package", source: entry.source.locator ?? "" };
}

function candidateKey(candidate: Pick<Candidate, "kind" | "source">): string {
  return `${candidate.kind}\0${candidate.source}`;
}

function assertNoPrivatePublicContent(state: ValidationState): void {
  const dotagentsRoot = dirname(state.catalogFilePath);
  const paths = [
    state.catalogFilePath,
    ...[
      "README.md",
      "catalog.schema.json",
      "detail.schema.json",
      "evidence.schema.json",
      "coverage.schema.json",
      "coverage.json",
    ]
      .map((name) => join(dotagentsRoot, name))
      .filter((path) => path !== state.catalogFilePath && existsSync(path)),
    ...listFiles(join(dotagentsRoot, "details")),
    ...listFiles(join(dotagentsRoot, "evidence")),
  ];

  for (const path of paths) {
    const canonicalPath = assertExistingFile(path, "public artifact", state);
    if (!isWithin(state.root, canonicalPath)) {
      throw catalogError(
        "path-outside-root",
        `public artifact resolves outside repository root: ${path}`,
        state.catalogPath,
        { path, resolvedPath: canonicalPath },
      );
    }
    const content = readFileSync(path, "utf8");
    if (privateContentPatterns.some((pattern) => pattern.test(content))) {
      throw catalogError(
        "private-content",
        `public artifact contains private or machine-local content: ${path}`,
        state.catalogPath,
        { path },
      );
    }
  }
}

function listJsonFiles(directory: string): string[] {
  return listFiles(directory).filter((path) => path.endsWith(".json"));
}

function listFiles(directory: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  const paths: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      paths.push(...listFiles(path));
    } else if (entry.isFile() || entry.isSymbolicLink()) {
      paths.push(path);
    }
  }
  return paths.sort();
}

function assertCalendarDate(
  value: string,
  code: string,
  message: string,
  state: ValidationState,
  context: Record<string, unknown>,
): void {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) {
    throw catalogError(code, message, state.catalogPath, context);
  }
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    throw catalogError(code, message, state.catalogPath, context);
  }
}

function isWithin(root: string, candidate: string): boolean {
  const pathFromRoot = relative(root, candidate);
  return (
    pathFromRoot === "" ||
    (!isAbsolute(pathFromRoot) &&
      pathFromRoot !== ".." &&
      !pathFromRoot.startsWith(`..${sep}`))
  );
}

function catalogError(
  code: string,
  message: string,
  catalogPath: string,
  context: Record<string, unknown> = {},
  cause?: unknown,
): CatalogValidationError {
  return new CatalogValidationError(
    code,
    message,
    { catalogPath, ...context },
    cause === undefined ? undefined : { cause },
  );
}
