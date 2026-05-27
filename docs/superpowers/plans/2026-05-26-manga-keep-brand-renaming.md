# MangaKeep brand renaming implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the app to `漫集` with `MangaKeep` technical identifiers, remove
legacy `comic-guests` and `manga-shelf` runtime compatibility, and update
user-facing copy to match the approved brand.

**Architecture:** Keep the existing app structure and domain types. Change only
brand identifiers, storage keys, backup envelope validation, app configuration,
and docs. Preserve `ComicCatalog`, `ComicIssue`, and `zhiyin-manke` because
they describe domain data, not the app brand. Use `漫刊收藏`, `数字书架`, and
the approved header copy to keep `漫集` from reading like a manga reader or
content aggregation app.

**Tech Stack:** Expo 54, React Native 0.81, TypeScript 5.9, Node `tsx --test`,
AsyncStorage, JSON backup envelopes.

---

## File structure

This work changes brand surfaces without adding new app modules.

- Modify `mobile/app.json` for the Expo display name, slug, native package
  identifiers, and example remote URLs.
- Modify `mobile/src/storage/collectionStorage.ts` for the collection storage
  key, backup `app` field, strict import validation, and removal of numeric
  key migration.
- Modify `mobile/src/storage/collectionStorage.test.ts` to lock the new
  `manga-keep` backup behavior and no-compatibility rule.
- Modify `mobile/src/storage/localCatalogStorage.ts` for the local catalog
  storage key, backup `app` field, and strict import validation.
- Modify `mobile/src/storage/localCatalogStorage.test.ts` to lock the new
  catalog backup behavior and no-compatibility rule.
- Modify `mobile/src/screens/LibraryScreen.tsx` for the approved header copy.
- Modify `README.md`, `docs/release-and-updates.md`,
  `docs/remote-catalog-data.md`, `docs/technical-architecture.zh.md`,
  `docs/app-feature-inventory.zh.md`, `docs/project-visual-overview.html`,
  `release/version.example.json`, and
  `release/catalog-registry-redirect.example.json` so current docs and examples
  use `漫集`, `MangaKeep`, and `manga-keep`.
- Do not edit historical plan/spec files except the already-approved brand spec.
  Historical plans can mention old names because they document past work.

## Task 1: Collection storage tests

**Files:**

- Modify: `mobile/src/storage/collectionStorage.test.ts`

- [ ] **Step 1: Replace legacy migration expectations with new brand rules**

Replace the full contents of `mobile/src/storage/collectionStorage.test.ts`
with this test file:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { exportRecords, normalizeRecordMap, parseImportedRecords } from './collectionStorage';
import type { IssueRecord } from '../types';

const validRecord: IssueRecord = {
  status: 'owned',
  condition: 'good',
  note: 'bagged',
  updatedAt: '2026-05-22T00:00:00.000Z',
};

describe('collection storage record normalization', () => {
  it('rejects legacy numeric record keys instead of migrating them', () => {
    assert.deepEqual(normalizeRecordMap({ 128: validRecord }), {});
  });

  it('preserves already-qualified record keys', () => {
    assert.deepEqual(normalizeRecordMap({ 'zhiyin-manke:128': validRecord }), {
      'zhiyin-manke:128': validRecord,
    });
  });

  it('ignores invalid record values', () => {
    assert.deepEqual(normalizeRecordMap({ 'zhiyin-manke:128': { ...validRecord, updatedAt: null } }), {});
  });

  it('exports MangaKeep backup envelopes', () => {
    const exported = JSON.parse(exportRecords({ 'zhiyin-manke:128': validRecord })) as {
      app: string;
      version: number;
      records: unknown;
    };

    assert.equal(exported.app, 'manga-keep');
    assert.equal(exported.version, 2);
    assert.deepEqual(exported.records, { 'zhiyin-manke:128': validRecord });
  });

  it('imports wrapped MangaKeep records', () => {
    assert.deepEqual(
      parseImportedRecords(JSON.stringify({ app: 'manga-keep', records: { 'zhiyin-manke:1': validRecord } })),
      {
        'zhiyin-manke:1': validRecord,
      },
    );
  });

  it('rejects legacy manga-shelf backup envelopes', () => {
    assert.throws(
      () => parseImportedRecords(JSON.stringify({ app: 'manga-shelf', records: { 'zhiyin-manke:1': validRecord } })),
      /当前版本只接受 manga-keep 格式备份/,
    );
  });
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run:

```bash
cd mobile
npm test -- src/storage/collectionStorage.test.ts
```

Expected: FAIL. The failures must show the current implementation still
migrates numeric keys and exports `app: "manga-shelf"`.

- [ ] **Step 3: Commit the failing tests**

Run:

```bash
git add mobile/src/storage/collectionStorage.test.ts
git commit -m "test: define MangaKeep collection storage behavior"
```

## Task 2: Collection storage implementation

**Files:**

- Modify: `mobile/src/storage/collectionStorage.ts`
- Test: `mobile/src/storage/collectionStorage.test.ts`

- [ ] **Step 1: Update storage key, key normalization, and backup app field**

In `mobile/src/storage/collectionStorage.ts`, remove the unused
`DEFAULT_CATALOG_ID` import. Then change these blocks:

```ts
const STORAGE_KEY = 'manga-keep.collection.v1';
const BACKUP_APP_ID = 'manga-keep';
```

Replace `normalizeRecordKey()` with:

```ts
function normalizeRecordKey(key: string): ComicIssueKey | null {
  if (/^[^:]+:\d+$/.test(key)) {
    return key as ComicIssueKey;
  }

  return null;
}
```

Replace the `app` value in `exportRecords()` with:

```ts
app: BACKUP_APP_ID,
```

- [ ] **Step 2: Add strict wrapped backup validation**

Add this helper above `parseImportedRecords()`:

```ts
function getWrappedRecords(parsed: unknown) {
  if (!parsed || typeof parsed !== 'object' || !('records' in parsed)) {
    return parsed;
  }

  const envelope = parsed as { app?: unknown; records?: unknown };
  if (envelope.app !== BACKUP_APP_ID) {
    throw new Error(`当前版本只接受 ${BACKUP_APP_ID} 格式备份。`);
  }

  return envelope.records;
}
```

Replace the start of `parseImportedRecords()` with:

```ts
export function parseImportedRecords(raw: string): IssueRecordMap {
  const parsed = JSON.parse(raw) as unknown;
  const records = getWrappedRecords(parsed);
  const normalized = normalizeRecordMap(records);
```

Leave the existing invalid-record error block after `normalized`.

- [ ] **Step 3: Run the focused test and confirm it passes**

Run:

```bash
cd mobile
npm test -- src/storage/collectionStorage.test.ts
```

Expected: PASS for all collection storage tests.

- [ ] **Step 4: Run all storage-related tests**

Run:

```bash
cd mobile
npm test -- src/storage/*.test.ts src/data/catalogStore.test.ts
```

Expected: PASS. If the shell does not expand both globs, run:

```bash
cd mobile
npm test
```

- [ ] **Step 5: Commit collection storage implementation**

Run:

```bash
git add mobile/src/storage/collectionStorage.ts
git commit -m "refactor: switch collection storage to MangaKeep"
```

## Task 3: Local catalog storage tests

**Files:**

- Modify: `mobile/src/storage/localCatalogStorage.test.ts`

- [ ] **Step 1: Add MangaKeep export and legacy rejection assertions**

In `mobile/src/storage/localCatalogStorage.test.ts`, replace the existing
`round trips exported catalog definitions` test with these tests:

```ts
  it('exports MangaKeep catalog backup envelopes', () => {
    const exported = JSON.parse(exportCatalogDefinition(validDefinition)) as {
      app: string;
      type: string;
      version: number;
      catalog: unknown;
    };

    assert.equal(exported.app, 'manga-keep');
    assert.equal(exported.type, 'catalog-definition');
    assert.equal(exported.version, 1);
    assert.deepEqual(exported.catalog, validDefinition);
  });

  it('round trips exported catalog definitions', () => {
    assert.deepEqual(parseImportedCatalogDefinition(exportCatalogDefinition(validDefinition)), validDefinition);
  });

  it('rejects legacy manga-shelf catalog backup envelopes', () => {
    assert.throws(
      () =>
        parseImportedCatalogDefinition(
          JSON.stringify({
            app: 'manga-shelf',
            type: 'catalog-definition',
            version: 1,
            catalog: validDefinition,
          }),
        ),
      /当前版本只接受 manga-keep 格式目录备份/,
    );
  });
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run:

```bash
cd mobile
npm test -- src/storage/localCatalogStorage.test.ts
```

Expected: FAIL. The failures must show the current implementation still exports
`app: "manga-shelf"` and accepts wrapped legacy catalog backups.

- [ ] **Step 3: Commit the failing tests**

Run:

```bash
git add mobile/src/storage/localCatalogStorage.test.ts
git commit -m "test: define MangaKeep catalog storage behavior"
```

## Task 4: Local catalog storage implementation

**Files:**

- Modify: `mobile/src/storage/localCatalogStorage.ts`
- Test: `mobile/src/storage/localCatalogStorage.test.ts`

- [ ] **Step 1: Update storage key and export app field**

In `mobile/src/storage/localCatalogStorage.ts`, change the constants near the
top to:

```ts
const LOCAL_CATALOGS_STORAGE_KEY = 'manga-keep.local-catalogs.v1';
const BACKUP_APP_ID = 'manga-keep';
```

Replace the `app` value in `exportCatalogDefinition()` with:

```ts
app: BACKUP_APP_ID,
```

- [ ] **Step 2: Add strict wrapped catalog validation**

Add this helper above `parseImportedCatalogDefinition()`:

```ts
function getWrappedCatalog(parsed: unknown) {
  if (!parsed || typeof parsed !== 'object' || !('catalog' in parsed)) {
    return parsed;
  }

  const envelope = parsed as { app?: unknown; catalog?: unknown };
  if (envelope.app !== BACKUP_APP_ID) {
    throw new Error(`当前版本只接受 ${BACKUP_APP_ID} 格式目录备份。`);
  }

  return envelope.catalog;
}
```

Replace the `catalog` extraction inside `parseImportedCatalogDefinition()` with:

```ts
    const catalog = getWrappedCatalog(parsed);
```

Keep the existing `isStoredCatalogDefinition(catalog)` validation.

- [ ] **Step 3: Run the focused test and confirm it passes**

Run:

```bash
cd mobile
npm test -- src/storage/localCatalogStorage.test.ts
```

Expected: PASS for all local catalog storage tests.

- [ ] **Step 4: Run all tests**

Run:

```bash
cd mobile
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit local catalog storage implementation**

Run:

```bash
git add mobile/src/storage/localCatalogStorage.ts
git commit -m "refactor: switch catalog storage to MangaKeep"
```

## Task 5: Expo configuration and app header copy

**Files:**

- Modify: `mobile/app.json`
- Modify: `mobile/src/screens/LibraryScreen.tsx`
- Test: `mobile/src/update/versionCheck.test.ts`

- [ ] **Step 1: Update Expo app identity**

In `mobile/app.json`, update these fields:

```json
{
  "expo": {
    "name": "漫集",
    "slug": "manga-keep",
    "ios": {
      "bundleIdentifier": "com.mangakeep.app"
    },
    "android": {
      "package": "com.mangakeep.app"
    }
  }
}
```

Keep the existing `version`, `buildNumber`, `versionCode`, icon paths, and
platform settings.

- [ ] **Step 2: Update example remote URLs**

In `mobile/app.json`, update example URLs so new work points at `manga-keep`
repositories:

```json
"registryUrl": "https://gitee.com/YOUR_NAME/manga-keep-data/raw/master/registry/index.v1.json"
```

```json
"registryUrl": "https://YOUR_NAME.github.io/manga-keep-data/registry/index.v1.json"
```

```json
"manifestUrl": "https://gitee.com/YOUR_NAME/manga-keep/raw/master/release/version.json"
```

```json
"manifestUrl": "https://raw.githubusercontent.com/YOUR_NAME/manga-keep/main/release/version.json"
```

- [ ] **Step 3: Update header copy**

In `mobile/src/screens/LibraryScreen.tsx`, replace:

```tsx
<Text style={styles.eyebrow}>漫画收藏记录</Text>
```

with:

```tsx
<Text style={styles.eyebrow}>把那些年追过的漫刊，好好收藏起来</Text>
```

- [ ] **Step 4: Update update source test fixture**

In `mobile/src/update/versionCheck.test.ts`, replace the old sample
`comic-guests` URL with:

```ts
updateManifestUrl: 'https://gitee.com/YOUR_NAME/manga-keep/raw/master/release/version.json',
```

- [ ] **Step 5: Run typecheck and update tests**

Run:

```bash
cd mobile
npm run typecheck
npm test -- src/update/versionCheck.test.ts
```

Expected: TypeScript passes, and update manifest tests pass.

- [ ] **Step 6: Commit configuration and header copy**

Run:

```bash
git add mobile/app.json mobile/src/screens/LibraryScreen.tsx mobile/src/update/versionCheck.test.ts
git commit -m "refactor: rename app identity to MangaKeep"
```

## Task 6: Documentation and release examples

**Files:**

- Modify: `README.md`
- Modify: `docs/release-and-updates.md`
- Modify: `docs/remote-catalog-data.md`
- Modify: `docs/technical-architecture.zh.md`
- Modify: `docs/app-feature-inventory.zh.md`
- Modify: `docs/project-visual-overview.html`
- Modify: `release/version.example.json`
- Modify: `release/catalog-registry-redirect.example.json`

- [ ] **Step 1: Update README title and opening**

In `README.md`, replace the title and opening paragraph with:

```md
# 漫集：给漫刊收藏者的数字书架

漫集是一个用于记录纸质漫画杂志、画集和特刊收藏进度的 Android/iOS App
雏形。移动端工程在 `mobile/`。项目仍内置《知音漫客》目录作为默认示例，
同时支持用户创建自己的本地目录，并从免费静态托管读取公共目录。
```

- [ ] **Step 2: Update release examples**

In `docs/release-and-updates.md` and `release/version.example.json`, replace
artifact and URL examples:

```text
comic-guests
```

with:

```text
manga-keep
```

Replace package examples:

```text
com.comicguests.app
```

with:

```text
com.mangakeep.app
```

- [ ] **Step 3: Update remote catalog data examples**

In `docs/remote-catalog-data.md`,
`release/catalog-registry-redirect.example.json`, and the current public catalog
source examples, replace:

```text
manga-shelf-data
```

with:

```text
manga-keep-data
```

- [ ] **Step 4: Update technical docs and visual overview**

In `docs/technical-architecture.zh.md`, update current app identity references
to:

```md
本文档基于当前代码和配置说明 `manga-keep` 的技术架构。
```

Use these current storage and backup examples:

```text
AsyncStorage: manga-keep.collection.v1
AsyncStorage: manga-keep.local-catalogs.v1
"app": "manga-keep"
```

In `docs/app-feature-inventory.zh.md` and `docs/project-visual-overview.html`,
replace the current-status text that says naming still needs a decision with
text that says the approved brand is `漫集` / `MangaKeep`, while implementation
is handled by this rename plan.

- [ ] **Step 5: Check current docs for old live-brand references**

Run:

```bash
rg -n "知音漫客收藏册|comic-guests|com\\.comicguests|manga-shelf" README.md docs release mobile/app.json mobile/src
```

Expected: Remaining matches are only in historical specs/plans or in explicit
phrases that describe old identifiers as rejected legacy values.

- [ ] **Step 6: Commit docs and release examples**

Run:

```bash
git add README.md docs/release-and-updates.md docs/remote-catalog-data.md docs/technical-architecture.zh.md docs/app-feature-inventory.zh.md docs/project-visual-overview.html release/version.example.json release/catalog-registry-redirect.example.json
git commit -m "docs: update project branding to MangaKeep"
```

## Task 7: Final verification and previews

**Files:**

- Verify: `mobile/package.json`
- Verify: `mobile/app.json`
- Verify: `mobile/src/screens/LibraryScreen.tsx`
- Verify: `mobile/src/storage/collectionStorage.ts`
- Verify: `mobile/src/storage/localCatalogStorage.ts`

- [ ] **Step 1: Run full static checks**

Run:

```bash
cd mobile
npm run typecheck
npm test
```

Expected: Both commands pass.

- [ ] **Step 2: Run final brand search**

Run:

```bash
rg -n "知音漫客收藏册|comic-guests|com\\.comicguests|manga-shelf|Jiman|jiman" README.md docs release mobile/app.json mobile/src
```

Expected: Remaining matches are either historical docs or explicit rejected
legacy examples in the brand spec and import tests. No runtime file under
`mobile/src` or `mobile/app.json` should contain old app brand identifiers.

- [ ] **Step 3: Start LAN preview**

Run:

```bash
cd mobile
npm start -- --host lan
```

Expected: Expo starts and prints a QR code. Keep this process running until
desktop and phone preview checks are complete.

- [ ] **Step 4: Verify desktop preview**

Open the Expo web preview or simulator from the running dev server. Confirm:

- The app opens without a red error screen.
- The first screen shows `把那些年追过的漫刊，好好收藏起来`.
- The tools modal can still open.
- Exported collection JSON contains `"app": "manga-keep"`.
- Exported local catalog JSON contains `"app": "manga-keep"` when a local
  catalog is selected.

- [ ] **Step 5: Verify phone preview**

Using a real phone on the same Wi-Fi network, scan the Expo QR code in Expo Go.
Confirm:

- The app opens on the phone.
- The header text fits without overlapping key controls.
- The grid, catalog switcher, details modal, and tools modal still work.

If LAN preview is blocked, stop the LAN server and run:

```bash
cd mobile
npm start -- --tunnel
```

Then repeat the phone preview checks through the tunnel QR code.

- [ ] **Step 6: Commit final verification notes if docs changed**

If verification required documentation changes, commit them:

```bash
git add README.md docs release mobile
git commit -m "docs: finalize MangaKeep verification notes"
```

If verification did not change files, do not create an empty commit.

## Self-review

Spec coverage:

- The plan covers App name, English name, slug, package IDs, export JSON app
  fields, storage key prefixes, user-facing header copy, README title, release
  examples, and documentation.
- The plan removes legacy numeric key migration and rejects old `manga-shelf`
  backup envelopes, matching the no-compatibility decision.
- The plan keeps `Comic*` domain types and the `zhiyin-manke` default catalog ID
  unchanged, matching the non-goals.
- The plan includes typecheck, full tests, desktop preview, and real phone Expo
  Go preview.

Placeholder scan:

- The plan contains no unfinished markers or unspecified implementation steps.
- Each code-changing task includes concrete code snippets and exact commands.

Type consistency:

- Backup identifier is consistently `manga-keep`.
- Native package identifier is consistently `com.mangakeep.app`.
- Display brand is consistently `漫集`, and English brand is `MangaKeep`.
