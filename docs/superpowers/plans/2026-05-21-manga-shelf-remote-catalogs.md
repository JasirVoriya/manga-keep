# Manga Shelf Remote Catalogs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the app load developer-controlled remote manga catalogs and remote cover URLs while keeping existing local collection records safe.

**Architecture:** Keep user collection data local in `AsyncStorage`, keyed by stable `catalogId:issueNumber`. Load public catalog metadata from the developer-configured registry URL in `mobile/app.json`, follow registry-level `redirectUrl` for migrations, and fall back to the bundled catalog when remote loading fails. UI should first support multiple catalogs and remote covers, then remove bundled cover dependencies only after the remote path is verified.

**Tech Stack:** Expo 54, React Native 0.81, TypeScript 5.9, AsyncStorage, Node built-in test runner with `tsx` for TypeScript tests.

---

## File Structure

- `mobile/src/data/catalogRegistry.ts`
  - Owns remote registry fetching, redirect following, manifest parsing, URL resolution, and fallback to bundled catalogs.
- `mobile/src/data/catalogs.ts`
  - Owns bundled catalog construction and shared catalog helpers such as `makeIssueKey()` and `createNumberedComicIssues()`.
- `mobile/src/data/issues.ts`
  - Temporary compatibility layer for the current single-catalog UI. This should remain until `LibraryScreen` is fully catalog-aware.
- `mobile/src/screens/LibraryScreen.tsx`
  - Will become catalog-aware: load configured catalogs, track selected catalog, derive issue lists/stats from that catalog.
- `mobile/src/components/IssueCard.tsx`
  - Will render either bundled `cover` or remote `coverUrl`, falling back to generated cover art.
- `mobile/src/components/CatalogSwitcher.tsx`
  - New small UI component for selecting among loaded manga catalogs. This is not a data-source URL selector.
- `mobile/src/data/catalogRegistry.test.ts`
  - New tests for registry redirect behavior and remote manifest conversion.
- `mobile/src/data/catalogFixtures.test.ts`
  - New tests ensuring bundled and sample remote catalogs keep stable issue keys.
- `release/catalog-registry.example.json`
  - Example registry file for static hosting.
- `release/catalog-registry-redirect.example.json`
  - Example migration redirect registry.
- `release/catalogs/zhiyin-manke/manifest.example.json`
  - Example manga manifest.
- `docs/remote-catalog-data.md`
  - Developer-facing documentation for remote catalog hosting and migration.
- `mobile/package.json`
  - Add test scripts and dev dependency for `tsx`.

---

### Task 1: Add TypeScript Test Harness for Catalog Data

**Files:**
- Modify: `mobile/package.json`
- Create: `mobile/src/data/catalogFixtures.test.ts`

- [ ] **Step 1: Add the test script and dev dependency**

Edit `mobile/package.json` so `scripts` and `devDependencies` include:

```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "test": "tsx --test \"src/**/*.test.ts\"",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/react": "~19.1.0",
    "tsx": "^4.20.6",
    "typescript": "~5.9.2"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:

```bash
npm install
```

Expected: `package-lock.json` updates and `node_modules` contains `tsx`.

- [ ] **Step 3: Write the first failing catalog fixture test**

Create `mobile/src/data/catalogFixtures.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { defaultCatalog, DEFAULT_CATALOG_ID, makeIssueKey } from './catalogs';

describe('bundled catalog fixtures', () => {
  it('uses stable issue keys for the default catalog', () => {
    assert.equal(defaultCatalog.id, DEFAULT_CATALOG_ID);
    assert.equal(defaultCatalog.issues[0].key, makeIssueKey(DEFAULT_CATALOG_ID, 1));
    assert.equal(defaultCatalog.issues[127].key, 'zhiyin-manke:128');
  });

  it('keeps issue count and sort order stable', () => {
    assert.equal(defaultCatalog.issueCount, 704);
    assert.equal(defaultCatalog.issues.length, 704);
    assert.deepEqual(
      defaultCatalog.issues.slice(0, 3).map((issue) => issue.number),
      [1, 2, 3],
    );
  });
});
```

- [ ] **Step 4: Run the test and typecheck**

Run:

```bash
npm run test
npm run typecheck
```

Expected: both commands pass. If `npm run test` fails because React Native image `require()` resolution leaks into Node, replace the direct `defaultCatalog` import with a helper test that only imports `makeIssueKey()` and `createNumberedComicIssues()`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createNumberedComicIssues, makeIssueKey } from './catalogs';

describe('catalog helpers', () => {
  it('creates stable issue keys', () => {
    const issues = createNumberedComicIssues({
      catalogId: 'demo',
      catalogName: '测试漫画',
      issueCount: 3,
      numberPadding: 2,
    });

    assert.equal(issues[0].key, makeIssueKey('demo', 1));
    assert.equal(issues[0].label, '第01期');
    assert.equal(issues[2].displayTitle, '测试漫画 03');
  });
});
```

- [ ] **Step 5: Commit**

```bash
git add mobile/package.json mobile/package-lock.json mobile/src/data/catalogFixtures.test.ts
git commit -m "test: add catalog data test harness"
```

---

### Task 2: Test and Harden Remote Registry Parsing

**Files:**
- Create: `mobile/src/data/catalogRegistry.test.ts`
- Modify: `mobile/src/data/catalogRegistry.ts`
- Modify: `mobile/src/types.ts`

- [ ] **Step 1: Write failing tests for remote manifest conversion**

Create `mobile/src/data/catalogRegistry.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isRemoteCatalogRegistry, remoteManifestToCatalog, resolveRemoteUrl } from './catalogRegistry';

describe('remote catalog registry parsing', () => {
  it('accepts redirect registries with an empty catalog list', () => {
    assert.equal(
      isRemoteCatalogRegistry({
        schemaVersion: 1,
        redirectUrl: 'https://example.com/new/registry/index.v1.json',
        catalogs: [],
      }),
      true,
    );
  });

  it('rejects catalog entries without a manifest URL', () => {
    assert.equal(
      isRemoteCatalogRegistry({
        schemaVersion: 1,
        catalogs: [
          {
            id: 'bad',
            name: 'Bad',
            kind: 'magazine',
          },
        ],
      }),
      false,
    );
  });

  it('converts a remote manifest into stable issue records with generated covers', () => {
    const catalog = remoteManifestToCatalog(
      {
        schemaVersion: 1,
        id: 'demo-comic',
        name: '测试漫画',
        shortName: '测试',
        kind: 'series',
        issueCount: 3,
        numberPadding: 2,
        coverBaseUrl: '../covers/demo-comic/',
        coverPattern: '{padded}.webp',
      },
      'https://example.com/catalogs/demo-comic/manifest.v1.json',
    );

    assert.equal(catalog.id, 'demo-comic');
    assert.equal(catalog.issues.length, 3);
    assert.equal(catalog.issues[0].key, 'demo-comic:1');
    assert.equal(catalog.issues[0].coverUrl, 'https://example.com/catalogs/covers/demo-comic/01.webp');
  });

  it('resolves relative URLs from the current document URL', () => {
    assert.equal(
      resolveRemoteUrl('../catalogs/demo/manifest.v1.json', 'https://example.com/registry/index.v1.json'),
      'https://example.com/catalogs/demo/manifest.v1.json',
    );
  });
});
```

- [ ] **Step 2: Run tests to verify current behavior**

Run:

```bash
npm run test
```

Expected: PASS if current parser already accepts these cases. If the cover URL assertion fails, keep the test expectation and adjust the implementation in Step 3.

- [ ] **Step 3: Normalize registry and manifest values**

Update `mobile/src/data/catalogRegistry.ts` to ensure manifest IDs and names are trimmed:

```ts
function normalizeManifest(manifest: RemoteComicCatalogManifest): RemoteComicCatalogManifest {
  return {
    ...manifest,
    id: manifest.id.trim(),
    name: manifest.name.trim(),
    shortName: manifest.shortName?.trim(),
    description: manifest.description?.trim(),
    coverBaseUrl: manifest.coverBaseUrl?.trim(),
    coverPattern: manifest.coverPattern?.trim(),
    issues: manifest.issues?.map((issue) => ({
      ...issue,
      label: issue.label?.trim(),
      displayTitle: issue.displayTitle?.trim(),
      coverUrl: issue.coverUrl?.trim(),
    })),
  };
}
```

Then call it at the top of `remoteManifestToCatalog()`:

```ts
export function remoteManifestToCatalog(rawManifest: RemoteComicCatalogManifest, manifestUrl: string): ComicCatalog {
  const manifest = normalizeManifest(rawManifest);
  const numberPadding = manifest.numberPadding ?? DEFAULT_CATALOG_NUMBER_PADDING;
  // keep existing function body after this line
}
```

- [ ] **Step 4: Run tests and typecheck**

Run:

```bash
npm run test
npm run typecheck
```

Expected: both pass.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/data/catalogRegistry.ts mobile/src/data/catalogRegistry.test.ts mobile/src/types.ts
git commit -m "test: cover remote catalog registry parsing"
```

---

### Task 3: Load Configured Catalogs in the Library Screen

**Files:**
- Modify: `mobile/src/screens/LibraryScreen.tsx`
- Create: `mobile/src/components/CatalogSwitcher.tsx`

- [ ] **Step 1: Create the catalog switcher component**

Create `mobile/src/components/CatalogSwitcher.tsx`:

```tsx
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '../styles/theme';
import type { ComicCatalog } from '../types';

type Props = {
  catalogs: ComicCatalog[];
  selectedCatalogId: string;
  onSelectCatalog: (catalogId: string) => void;
};

export function CatalogSwitcher({ catalogs, selectedCatalogId, onSelectCatalog }: Props) {
  if (catalogs.length <= 1) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
        {catalogs.map((catalog) => {
          const selected = catalog.id === selectedCatalogId;
          return (
            <Pressable
              key={catalog.id}
              accessibilityRole="button"
              accessibilityLabel={`切换到${catalog.name}`}
              onPress={() => onSelectCatalog(catalog.id)}
              style={[styles.tab, selected && styles.selectedTab]}
            >
              <Text style={[styles.tabText, selected && styles.selectedTabText]}>{catalog.shortName}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 10,
  },
  content: {
    gap: 8,
    paddingRight: 4,
  },
  tab: {
    minHeight: 34,
    justifyContent: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    paddingHorizontal: 12,
    backgroundColor: colors.cream,
  },
  selectedTab: {
    borderColor: colors.shelfDark,
    backgroundColor: colors.shelf,
  },
  tabText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  selectedTabText: {
    color: colors.white,
  },
});
```

- [ ] **Step 2: Import catalog loading dependencies**

In `mobile/src/screens/LibraryScreen.tsx`, replace:

```ts
import { issues, TOTAL_ISSUES } from '../data/issues';
```

with:

```ts
import { CatalogSwitcher } from '../components/CatalogSwitcher';
import { defaultCatalog } from '../data/catalogs';
import { loadConfiguredCatalogs } from '../data/catalogRegistry';
```

Also update the type import:

```ts
import type { ComicCatalog, ComicIssue, ComicIssueKey, IssueFilter, IssueRecordMap, OwnershipStatus } from '../types';
```

- [ ] **Step 3: Add catalog state**

Inside `LibraryScreen()`, after `records` state, add:

```ts
const [catalogs, setCatalogs] = useState<ComicCatalog[]>([defaultCatalog]);
const [selectedCatalogId, setSelectedCatalogId] = useState(defaultCatalog.id);
const [catalogLoadFailed, setCatalogLoadFailed] = useState(false);
```

- [ ] **Step 4: Load configured catalogs**

After the existing `loadRecords()` effect, add:

```ts
useEffect(() => {
  let cancelled = false;

  loadConfiguredCatalogs()
    .then((loadedCatalogs) => {
      if (cancelled) {
        return;
      }
      setCatalogs(loadedCatalogs);
      setSelectedCatalogId((currentId) => {
        if (loadedCatalogs.some((catalog) => catalog.id === currentId)) {
          return currentId;
        }
        return loadedCatalogs[0]?.id ?? defaultCatalog.id;
      });
      setCatalogLoadFailed(false);
    })
    .catch(() => {
      if (!cancelled) {
        setCatalogs([defaultCatalog]);
        setSelectedCatalogId(defaultCatalog.id);
        setCatalogLoadFailed(true);
      }
    });

  return () => {
    cancelled = true;
  };
}, []);
```

- [ ] **Step 5: Derive current catalog and issue list**

Before `stats`, add:

```ts
const currentCatalog = useMemo(
  () => catalogs.find((catalog) => catalog.id === selectedCatalogId) ?? catalogs[0] ?? defaultCatalog,
  [catalogs, selectedCatalogId],
);

const currentIssues = currentCatalog.issues;
const totalIssues = currentCatalog.issueCount;
```

Then replace every `issues` reference used for UI data with `currentIssues`, and every `TOTAL_ISSUES` reference with `totalIssues`.

Specific replacements:

```ts
const owned = currentIssues.filter((issue) => records[issue.key]?.status === 'owned').length;
const wishlist = currentIssues.filter((issue) => records[issue.key]?.status === 'wishlist').length;
missing: totalIssues - owned,
percent: totalIssues > 0 ? Math.round((owned / totalIssues) * 100) : 0,
```

```ts
return currentIssues.filter((issue) => {
  const record = records[issue.key] ?? defaultRecord;
  // keep existing filter body
});
```

```ts
const issue = currentIssues.find((candidate) => candidate.key === issueKey);
```

```tsx
<Text style={styles.statLine}>已有 {stats.owned} / {totalIssues}</Text>
```

- [ ] **Step 6: Render catalog switcher and load status**

Inside `styles.controls`, before the search row, render:

```tsx
<CatalogSwitcher
  catalogs={catalogs}
  selectedCatalogId={currentCatalog.id}
  onSelectCatalog={(catalogId) => {
    setSelectedCatalogId(catalogId);
    setSelectedIssue(null);
    setSelectedIssueKeys(new Set());
    setBatchMode(false);
  }}
/>
{catalogLoadFailed && (
  <Text style={styles.catalogWarning}>远程漫画目录暂时不可用，正在使用内置目录。</Text>
)}
```

Add this style:

```ts
catalogWarning: {
  marginBottom: 10,
  color: colors.redDark,
  fontSize: 12,
  fontWeight: '800',
},
```

- [ ] **Step 7: Update static app copy without broad redesign**

Change:

```tsx
<Text style={styles.eyebrow}>纸刊收藏记录</Text>
<Text style={styles.appName}>知音漫客收藏册</Text>
```

to:

```tsx
<Text style={styles.eyebrow}>漫画收藏记录</Text>
<Text style={styles.appName}>{currentCatalog.name}</Text>
```

Change empty copy:

```tsx
<Text style={styles.emptyTitle}>没有匹配的漫画</Text>
<Text style={styles.emptyText}>换一个编号或筛选条件，再查一次。</Text>
```

- [ ] **Step 8: Run verification**

Run:

```bash
npm run typecheck
npm run test
```

Expected: both pass. Launch with:

```bash
npm run web
```

Expected: screen still renders the bundled default catalog when remote registry URL is a placeholder or unavailable.

- [ ] **Step 9: Commit**

```bash
git add mobile/src/screens/LibraryScreen.tsx mobile/src/components/CatalogSwitcher.tsx
git commit -m "feat: load configured manga catalogs in library"
```

---

### Task 4: Render Remote Cover URLs with Safe Fallback

**Files:**
- Modify: `mobile/src/components/IssueCard.tsx`
- Modify: `mobile/src/types.ts`

- [ ] **Step 1: Update card image source logic**

In `mobile/src/components/IssueCard.tsx`, replace the cover image condition:

```tsx
{issue.cover ? (
  <Image source={issue.cover} style={styles.coverImage} resizeMode="cover" />
) : (
```

with:

```tsx
{issue.cover || issue.coverUrl ? (
  <Image
    source={issue.cover ?? { uri: issue.coverUrl }}
    style={styles.coverImage}
    resizeMode="cover"
  />
) : (
```

- [ ] **Step 2: Make fallback text catalog-aware**

Replace:

```tsx
<Text style={styles.brand}>知音漫客</Text>
<Text style={styles.subBrand}>COMIC GUESTS</Text>
```

with:

```tsx
<Text style={styles.brand}>{issue.displayTitle.split(' ')[0] || '漫画收藏'}</Text>
<Text style={styles.subBrand}>MANGA SHELF</Text>
```

- [ ] **Step 3: Run verification**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Manual visual check**

Run:

```bash
npm run web
```

Expected:
- Bundled covers still show for the default catalog.
- Cards without `cover` but with `coverUrl` attempt remote loading.
- Cards without any cover still show fallback art.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/components/IssueCard.tsx
git commit -m "feat: render remote manga cover urls"
```

---

### Task 5: Prepare Static Data Artifacts for Remote Hosting

**Files:**
- Modify: `release/catalog-registry.example.json`
- Modify: `release/catalog-registry-redirect.example.json`
- Modify: `release/catalogs/zhiyin-manke/manifest.example.json`
- Modify: `docs/remote-catalog-data.md`
- Create: `scripts/generate-remote-catalog-manifest.mjs`

- [ ] **Step 1: Create manifest generation script**

Create `scripts/generate-remote-catalog-manifest.mjs`:

```js
import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const coversDir = path.join(repoRoot, 'mobile', 'assets', 'covers');
const outputFile = path.join(repoRoot, 'release', 'catalogs', 'zhiyin-manke', 'manifest.generated.json');

function issueNumberFromFile(fileName) {
  const match = fileName.match(/^(\d{1,4})\.(jpg|jpeg|png|webp)$/i);
  return match ? Number(match[1]) : null;
}

const files = await readdir(coversDir);
const issues = files
  .map((fileName) => ({ fileName, number: issueNumberFromFile(fileName) }))
  .filter((entry) => entry.number)
  .sort((left, right) => left.number - right.number)
  .map((entry) => ({
    number: entry.number,
    coverUrl: `../../covers/zhiyin-manke/${entry.fileName}`,
  }));

const manifest = {
  schemaVersion: 1,
  id: 'zhiyin-manke',
  name: '知音漫客',
  shortName: '漫客',
  kind: 'magazine',
  description: '默认漫画杂志目录',
  issueCount: 704,
  numberPadding: 3,
  issues,
};

await writeFile(outputFile, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Wrote ${issues.length} issue cover entries to ${path.relative(repoRoot, outputFile)}`);
```

- [ ] **Step 2: Add npm script at repo root is not available, so run script directly**

Run:

```bash
node scripts/generate-remote-catalog-manifest.mjs
```

Expected:

```text
Wrote 627 issue cover entries to release\catalogs\zhiyin-manke\manifest.generated.json
```

- [ ] **Step 3: Update docs with generation command**

In `docs/remote-catalog-data.md`, add under "漫画目录格式":

````markdown
## 生成知音漫客远程目录

当前本地封面仍在 `mobile/assets/covers`。可以先生成远程 manifest：

```bash
node scripts/generate-remote-catalog-manifest.mjs
```

生成文件：

```text
release/catalogs/zhiyin-manke/manifest.generated.json
```

把该文件随 `covers/zhiyin-manke/` 上传到静态托管后，再把注册表中的 `manifestUrl` 指向它。
````

- [ ] **Step 4: Run verification**

Run:

```bash
node scripts/generate-remote-catalog-manifest.mjs
npm --prefix mobile run typecheck
```

Expected: manifest regenerates and typecheck passes.

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-remote-catalog-manifest.mjs release/catalogs/zhiyin-manke/manifest.generated.json docs/remote-catalog-data.md
git commit -m "chore: generate remote catalog manifest"
```

---

### Task 6: Remove Bundled Cover Dependency After Remote Path Is Verified

**Files:**
- Modify: `mobile/src/data/catalogs.ts`
- Modify: `mobile/src/data/issues.ts`
- Modify: `mobile/scripts/build-cover-index.mjs`
- Delete or archive: `mobile/src/data/coverSources.generated.ts`
- Move outside app bundle: `mobile/assets/covers/*`

- [ ] **Step 1: Confirm remote catalog works before removing local covers**

Run:

```bash
npm --prefix mobile run web
```

Expected:
- App loads catalog data from the configured registry when the URL is real.
- Cards use `coverUrl`.
- Collection status still persists because keys remain `zhiyin-manke:<number>`.

- [ ] **Step 2: Stop importing generated local cover sources**

In `mobile/src/data/catalogs.ts`, remove:

```ts
import { coverSources } from './coverSources.generated';
```

Then remove this property from `defaultCatalog` creation:

```ts
covers: coverSources,
```

The default catalog should become:

```ts
issues: createNumberedComicIssues({
  catalogId: DEFAULT_CATALOG_ID,
  catalogName: DEFAULT_CATALOG_NAME,
  issueCount: DEFAULT_CATALOG_ISSUE_COUNT,
  numberPadding: DEFAULT_CATALOG_NUMBER_PADDING,
}),
```

- [ ] **Step 3: Keep the cover index script but document it as legacy**

At the top of `mobile/scripts/build-cover-index.mjs`, add:

```js
// Legacy helper for bundled cover experiments. Production catalogs should use
// remote coverUrl values generated by scripts/generate-remote-catalog-manifest.mjs.
```

- [ ] **Step 4: Move bundled covers out of the mobile bundle**

Move covers to a non-bundled release staging folder:

```powershell
New-Item -ItemType Directory -Force -Path release\covers\zhiyin-manke | Out-Null
Move-Item -Path mobile\assets\covers\* -Destination release\covers\zhiyin-manke
```

If you are not ready to move files yet, skip this step and leave a separate commit for asset migration. Do not delete covers until the remote path has been tested on a device.

- [ ] **Step 5: Run verification**

Run:

```bash
npm --prefix mobile run typecheck
npm --prefix mobile run web
```

Expected:
- Typecheck passes.
- App still renders cards, using remote covers when available and fallback art otherwise.
- APK bundle size should drop after rebuilding because `mobile/assets/covers` is empty or absent.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/data/catalogs.ts mobile/scripts/build-cover-index.mjs release/covers/zhiyin-manke
git rm mobile/src/data/coverSources.generated.ts
git commit -m "chore: remove bundled cover dependency"
```

---

## Self-Review

**Spec coverage:** This plan covers developer-controlled data source configuration, registry redirect migration, remote catalog loading, multiple manga catalogs in the library, remote cover rendering, static manifest generation, and eventual removal of bundled covers. It intentionally does not cover app renaming, package identifiers, icon design, or release CI; those should be separate plans.

**Placeholder scan:** No red-flag placeholder patterns remain. Each code-changing task includes exact snippets, commands, and expected outcomes.

**Type consistency:** The plan uses existing types `ComicCatalog`, `ComicIssue`, `ComicIssueKey`, `RemoteComicCatalogManifest`, `RemoteComicCatalogRegistry`, and existing helpers `loadConfiguredCatalogs()`, `makeIssueKey()`, `createNumberedComicIssues()`, `remoteManifestToCatalog()`. The new `CatalogSwitcher` accepts `ComicCatalog[]` and only selects catalog IDs; it does not expose registry URLs to users.
