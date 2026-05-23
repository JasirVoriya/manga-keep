# General catalogs and update center design

## Overview

This design expands the app from a single `知音漫客` collection tracker into a
general magazine and comic catalog tracker. The first implementation stage uses
a mixed MVP model: public catalogs are maintained through a reviewed static data
source, users can create local catalogs in the app, and catalogs can be exported
and imported as JSON.

The app must continue to work without a paid server. Static hosting, local
storage, and plain JSON files are the core primitives. The design also keeps a
future app store release path open by routing update prompts through a static
update center page rather than hard-coding only APK links in the app.

## Goals

The first stage must support these outcomes:

- Support catalogs beyond `知音漫客`.
- Let users create local catalogs by entering a name, type, total issue count,
  number padding, and an optional cover URL pattern.
- Let users export and import catalog definitions as JSON.
- Keep user collection records local to the device.
- Load reviewed public catalogs from free static hosting.
- Support primary and fallback sources for catalog data, cover images, and
  version metadata.
- Use a static update center page for update prompts, with Android APK delivery
  now and store links later.
- Preserve the existing offline-first collection experience when network
  requests fail.

## Non-goals

The first stage intentionally does not include these features:

- User accounts.
- In-app image upload.
- A public write API or direct user publishing to the shared catalog.
- A full per-issue editor.
- In-app APK installation.
- Full app store integration.
- Ordinary user configuration for arbitrary remote subscription URLs.

Remote subscription URLs remain a future capability. The schema and loader
boundaries should not block that later addition, but the first MVP should not
expose it in the UI.

## Product model

The app uses a mixed catalog model.

Public catalogs are reviewed and maintained by the project owner. Users can
submit catalog JSON, cover links, or pull requests through GitHub or Gitee, but
the app only consumes catalogs that have been reviewed and published to the
public registry.

Local catalogs are created by users on their own devices. A local catalog is
private until the user exports and shares it. When another user imports the JSON,
that imported catalog becomes a local catalog on that device.

Collection records stay local. A public catalog update, host migration, or cover
URL change must not rewrite or invalidate the user's owned, missing, wishlist,
condition, or note data.

## Data architecture

All catalog sources should normalize into the existing `ComicCatalog` shape
before reaching the main library UI.

The app has three catalog sources:

- Public catalog registry and manifests from static hosting.
- Local catalogs created on the device.
- Imported catalog definitions saved as local catalogs.

Collection records continue to use `catalogId:issueNumber` keys. This keeps
records stable when catalog metadata changes.

```text
Public registry + manifest
          |
          v
Public catalogs     Local catalogs     Imported catalogs
          |                |                   |
          +----------------+-------------------+
                           |
                           v
                  ComicCatalog[] in the app
                           |
                           v
              IssueRecordMap keyed by catalogId:issueNumber
```

Introduce a `catalogStore` layer. It should load public catalogs, load local
catalogs, merge both lists, and expose the final `ComicCatalog[]` to screens.
`LibraryScreen` should not need to know whether a catalog came from static
hosting, local creation, or JSON import.

## Public catalog hosting

Public catalog data should remain serverless and free. The recommended layout is
a static data repository or static directory:

```text
catalog-data/
  registry/
    index.v1.json
  catalogs/
    zhiyin-manke/
      manifest.v1.json
    comic-world/
      manifest.v1.json
  covers/
    zhiyin-manke/
      001.webp
```

The app should support multiple public sources:

```json
{
  "catalogSources": [
    {
      "id": "gitee",
      "registryUrl": "https://gitee.com/example/manga-shelf-data/raw/master/registry/index.v1.json",
      "priority": 1
    },
    {
      "id": "github",
      "registryUrl": "https://example.github.io/manga-shelf-data/registry/index.v1.json",
      "priority": 2
    }
  ]
}
```

The loader should try sources in priority order. If a source fails because of a
network error, timeout, non-OK response, or invalid schema, it should try the
next source. Registry-level `redirectUrl` remains supported for source
migration.

Manifest cover URLs should support relative paths. The app resolves relative
cover paths against the manifest URL, so a whole data repository can move
without changing every issue entry.

## Local catalog creation

The first catalog editor should keep the required fields small:

- Name, such as `漫画世界`.
- Short name, with an automatic default derived from the name.
- Kind, using the existing catalog kind values.
- Total issue count.
- Number padding, defaulting to `3`.
- Optional cover URL pattern.

The cover URL pattern supports `{number}` and `{padded}` placeholders:

```text
https://example.com/covers/{padded}.jpg
https://example.com/covers/{number}.webp
```

When the user saves a local catalog, the app stores the catalog definition, not a
full generated list of every issue. At render time, the app generates issues
from `issueCount`, `numberPadding`, and the optional cover URL pattern.

The schema should reserve `issues?: []` for future per-issue overrides. The
first UI does not need to edit those overrides.

## Import and export

The app should separate catalog sharing from collection backup.

Catalog export shares the catalog definition: name, type, total issue count,
number padding, cover pattern, and future issue overrides. Another user can
import this file to start tracking that catalog.

Collection export backs up the user's personal collection state: status,
condition, note, and updated timestamp. This is mainly for the same user moving
between devices.

Import rules:

- Validate the JSON schema before saving.
- Accept only safe catalog IDs made from letters, numbers, underscores, and
  hyphens.
- On catalog ID conflict, let the user cancel, replace, or import with a new ID.
- Treat imported catalog definitions as local catalogs.
- Do not partially save invalid imports.
- When importing collection records for unknown catalog IDs, prompt the user to
  import the matching catalog definition first.

## Update center

The update flow should use a static update center page instead of direct
platform-specific download handling inside the app.

The version manifest should support multiple sources, like catalog data. A
manifest can include an `updatePageUrl` plus platform-specific metadata:

```json
{
  "latestVersion": "1.2.0",
  "minimumVersion": "1.0.0",
  "title": "发现新版本",
  "message": "新版本已经准备好。",
  "updatePageUrl": "https://example.com/app/update.html",
  "platforms": {
    "android": {
      "apkUrl": "https://gitee.com/example/app/releases/download/v1.2.0/app-1.2.0.apk",
      "storeUrl": ""
    },
    "ios": {
      "testFlightUrl": "",
      "appStoreUrl": ""
    }
  }
}
```

The app reads the version manifest, compares `latestVersion` with the current
app version, and shows the existing update prompt when an update is available.
The update action opens `updatePageUrl`.

For forced updates, `minimumVersion` controls whether the prompt can be
dismissed. Forced updates only apply after a valid manifest is fetched and
validated.

The static update page decides what to show per platform. During self-hosted
distribution it can show Android APK downloads. Later, the same page can point
to App Store, TestFlight, or Android store listings without an app code change.

## App modules

The implementation should keep changes scoped around clear module boundaries.

`catalogRegistry` keeps responsibility for public remote catalog loading:
registries, manifests, redirects, URL resolution, schema checks, and source
fallback.

`localCatalogStorage` should be added for local catalog definitions. It owns
AsyncStorage reads and writes, local schema validation, catalog import, catalog
export, and delete operations.

`catalogStore` should be added as the aggregation layer. It loads public
catalogs and local catalogs, de-duplicates or reports conflicts, and exposes the
merged catalog list to UI code.

The catalog editor UI should create and edit local catalog definitions. First
stage fields are name, short name, kind, total issue count, number padding, and
cover URL pattern.

The existing backup tools should be split conceptually into collection backup
and catalog import/export. They can share a modal or tools entry in the first
implementation, but the labels and data formats must be distinct.

`versionCheck` should expand to multiple version manifest sources and
`updatePageUrl`. `UpdatePromptModal` can remain the UI surface.

## Resource size strategy

Public covers should move out of the app bundle once the remote cover path is
verified. The app should keep only lightweight placeholder art and UI decoration
assets locally.

Cards should render a remote `coverUrl` when available. If the image cannot
load, the card should show the existing generated placeholder cover. Collection
tracking must not depend on cover availability.

## Error handling

Network failures must not block collection tracking.

When public catalogs fail to load, the app should try fallback sources. If every
public source fails, the app should still show local catalogs and the bundled
fallback catalog.

When a cover fails to load, only that card falls back to a placeholder.

When local catalog import fails, the app should show a specific error for
invalid JSON, missing fields, invalid IDs, URL pattern problems, or ID
conflicts. Failed imports should not change existing local data.

When update checks fail, the app should continue without blocking the user.
Forced updates must only trigger from a successfully fetched and validated
manifest.

## Testing and verification

The implementation must include focused tests for:

- Catalog source fallback.
- Registry redirects.
- Local catalog schema validation.
- Issue generation from total issue count and cover URL pattern.
- Catalog import and export.
- Catalog ID conflicts.
- Version manifest source fallback.
- Version comparison and forced update behavior.

Before reporting implementation work as complete, run:

```bash
cd mobile
npm run typecheck
npm test
```

For behavior or UI changes, the project AI rules require both desktop preview
and phone preview. Start Expo in a phone-accessible mode:

```bash
cd mobile
npm start -- --host lan
```

If LAN preview fails, try tunnel mode:

```bash
cd mobile
npm start -- --tunnel
```

If phone preview cannot be completed, the final report must state the exact
reason and must not claim full verification.

## Migration path

The first implementation should keep the existing `知音漫客` bundled catalog as
a fallback while public remote data is verified. Once public covers and catalog
data are stable, remove bundled cover requires from the production app bundle.

Existing collection records keyed as `zhiyin-manke:issueNumber` remain valid.
Legacy numeric keys should continue to migrate to the default catalog ID.

The app name, repository name, package identifiers, and app icon can be handled
as a separate design and implementation plan after the general catalog model is
approved.

