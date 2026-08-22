import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
} from "node:fs";
import {
  dirname,
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

type Project = {
  id: string;
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
};

type EntryKind = "extension" | "skill" | "prompt";

type Entry = {
  id: string;
  projectId: string;
  licenseRef: string;
  slug: string;
  kind: EntryKind;
  delivery: "local-file" | "git-package" | "npm-package";
  source: { path?: string; locator?: string };
  publication: "featured" | "listed";
  detailPath?: string;
  evidencePath?: string;
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

const schemaRoot = resolve(import.meta.dirname, "..");
const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateCatalogSchema = compileSchema("catalog.schema.json");
const validateDetailSchema = compileSchema("detail.schema.json");
const validateEvidenceSchema = compileSchema("evidence.schema.json");

// [tag:dotagents_catalog_contract] Producer and consumer validators must reject
// unknown structure, broken references, and paths escaping the trusted root.
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

  const projects = uniqueIndex(catalog.projects, "project", state);
  const licenses = uniqueIndex(catalog.licenses, "license", state);
  const entries = uniqueIndex(catalog.entries, "entry", state);
  assertUniqueRoutes(catalog.entries, state);
  assertEntryReferences(catalog.entries, projects, licenses, state);
  assertLicenseEvidencePaths(catalog.licenses, state);
  assertEntryPathsAndLicenseScopes(catalog.entries, licenses, state);

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

    assertDetailReferences(detail, entry.id, entries, state);
    assertEvidenceReferences(dossier, entry.id, state);
    assertEvidenceSourcePaths(dossier, entry.id, state);
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

function assertLicenseEvidencePaths(
  licenses: License[],
  state: ValidationState,
): void {
  for (const license of licenses) {
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
    isAbsolute(path) ||
    win32.isAbsolute(path) ||
    segments.includes("..")
  ) {
    throw catalogError(
      "unsafe-path",
      `${artifact} must be a non-traversing repository-relative path: ${path}`,
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
  return canonicalPath;
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

function assertEvidenceSourcePaths(
  evidence: Evidence,
  entryId: string,
  state: ValidationState,
): void {
  for (const claim of evidence.claims) {
    if (claim.sourcePath) {
      assertRepositoryFile(claim.sourcePath, "evidence source", state, entryId);
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

function listJsonFiles(directory: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  const paths: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      paths.push(...listJsonFiles(path));
    } else if (
      (entry.isFile() || entry.isSymbolicLink()) &&
      path.endsWith(".json")
    ) {
      paths.push(path);
    }
  }
  return paths.sort();
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
