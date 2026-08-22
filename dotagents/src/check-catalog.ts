#!/usr/bin/env bun

import { resolve } from "node:path";

import { CatalogValidationError, validateCatalog } from "./catalog.js";

type CliOptions = {
  root: string;
  catalogPath: string;
};

export function runCatalogCheck(args: string[]): number {
  try {
    const options = parseArgs(args);
    const result = validateCatalog(options);
    console.log(
      `Catalog valid: ${result.catalog.entries.length} entries (${result.details.size} featured).`,
    );
    return 0;
  } catch (error) {
    if (error instanceof CatalogValidationError) {
      console.error(error.message);
      return 1;
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error(`catalog-cli-error: ${message}`);
    return 1;
  }
}

function parseArgs(args: string[]): CliOptions {
  let root = process.cwd();
  let catalogPath: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--root") {
      root = requiredFlagValue(args, ++index, "--root");
    } else if (argument === "--catalog") {
      catalogPath = requiredFlagValue(args, ++index, "--catalog");
    } else {
      throw new Error(`unknown argument: ${argument}`);
    }
  }

  const resolvedRoot = resolve(root);
  return {
    root: resolvedRoot,
    catalogPath: catalogPath
      ? resolve(resolvedRoot, catalogPath)
      : resolve(resolvedRoot, "dotagents", "catalog.json"),
  };
}

function requiredFlagValue(
  args: string[],
  index: number,
  flag: string,
): string {
  const value = args[index];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

process.exitCode = runCatalogCheck(process.argv.slice(2));
