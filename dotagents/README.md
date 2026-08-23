# Dotagents public catalog

This directory is the source contract for the public guide at [vedang.me/dotagents](https://vedang.me/dotagents/).

- `catalog.json` is the explicit publication allowlist.
- `coverage.json` neutrally classifies every discovered source not selected for publication.
- `details/` contains presentation-neutral explanations for featured entries.
- `evidence/` maps featured behavior claims to reviewed source revisions.
- Schema and validator files fail closed on unknown structure, unsafe paths, broken references, unreviewed claims, and private content.

Listed entries link to source without detail pages. Featured entries require one detail file and one evidence dossier. Discovery audits coverage but never publishes an entry.

Run validation from repository root:

```sh
bun run check:catalog
```
