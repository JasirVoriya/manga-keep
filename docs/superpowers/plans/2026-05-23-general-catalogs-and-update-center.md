# General Catalogs And Update Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first mixed MVP for general catalogs: reviewed public catalogs, user-created local catalogs, catalog import/export, and update-center based app updates.

**Architecture:** Keep collection records local and keyed by `catalogId:issueNumber`. Add a local catalog storage module and a catalog store aggregation layer so UI code receives one merged `ComicCatalog[]` list. Extend remote catalog and update loading to support prioritized source fallback without adding a server.

**Tech Stack:** Expo 54, React Native 0.81, TypeScript 5.9, AsyncStorage, Node built-in test runner with `tsx`.

---

## File Structure

- `mobile/src/types.ts`
  - Add local catalog definition types, source metadata, public source types, and update manifest source types.
- `mobile/src/data/catalogHelpers.ts`
  - Add reusable issue generation from a stored catalog definition and reusable cover URL pattern expansion.
- `mobile/src/storage/localCatalogStorage.ts`
  - New local catalog persistence, validation, import, export, and conflict helpers.
- `mobile/src/storage/localCatalogStorage.test.ts`
  - New tests for local catalog schema validation, import/export, conflict detection, and generated issues.
- `mobile/src/data/catalogRegistry.ts`
  - Extend public catalog loading from one configured URL to prioritized source fallback while preserving the existing single URL behavior.
- `mobile/src/data/catalogRegistry.test.ts`
  - Add tests for source fallback and registry redirect compatibility.
- `mobile/src/data/catalogStore.ts`
  - New aggregation layer that loads public catalogs and local catalogs and returns one merged list.
- `mobile/src/data/catalogStore.test.ts`
  - New tests for merged catalog order, fallback behavior, and conflict handling.
- `mobile/src/components/LocalCatalogEditorModal.tsx`
  - New modal for creating a local catalog with name, short name, kind, issue count, padding, and cover URL pattern.
- `mobile/src/components/ToolsModal.tsx`
  - New modal to separate collection backup from catalog import/export and local catalog creation.
- `mobile/src/screens/LibraryScreen.tsx`
  - Replace direct `loadConfiguredCatalogs()` and inline tools modal with `catalogStore` and the new tools modal.
- `mobile/src/update/versionCheck.ts`
  - Extend update manifests to support prioritized source fallback and `updatePageUrl`.
- `mobile/src/update/versionCheck.test.ts`
  - New tests for update manifest source fallback, update page URL, and forced update behavior.
- `release/version.example.json`
  - Update the example to include `updatePageUrl` and platform metadata.
- `docs/remote-catalog-data.md`
  - Update docs to describe multiple catalog sources.
- `docs/release-and-updates.md`
  - Update docs to describe the static update center flow.

---

### Task 1: Add Catalog Definition Types And Helpers

**Files:**
- Modify: `mobile/src/types.ts`
- Modify: `mobile/src/data/catalogHelpers.ts`
- Modify: `mobile/src/data/catalogFixtures.test.ts`

- [ ] **Step 1: Write failing helper tests**

Edit `mobile/src/data/catalogFixtures.test.ts` and replace its contents with:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createCatalogFromDefinition,
  createNumberedComicIssues,
  expandCoverPattern,
  isSafeCatalogId,
  makeIssueKey,
} from './catalogHelpers';
import type { StoredComicCatalogDefinition } from '../types';

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

  it('validates catalog IDs safe for storage keys', () => {
    for (const id of ['zhiyin-manke', 'Demo_2026', 'ABC-123']) {
      assert.equal(isSafeCatalogId(id), true);
    }

    for (const id of ['', 'foo:bar', 'foo/bar', 'foo bar']) {
      assert.equal(isSafeCatalogId(id), false);
    }
  });

  it('expands cover patterns with padded and raw numbers', () => {
    assert.equal(
      expandCoverPattern('https://img.example.test/demo/{padded}.webp', 7, 3),
      'https://img.example.test/demo/007.webp',
    );
    assert.equal(
      expandCoverPattern('https://img.example.test/demo/{number}.jpg', 12, 3),
      'https://img.example.test/demo/12.jpg',
    );
  });

  it('creates a catalog from a stored local definition', () => {
    const definition: StoredComicCatalogDefinition = {
      schemaVersion: 1,
      id: 'comic-world',
      name: '漫画世界',
      shortName: '漫世',
      kind: 'magazine',
      issueCount: 2,
      numberPadding: 3,
      coverPattern: 'https://img.example.test/comic-world/{padded}.webp',
      createdAt: '2026-05-23T00:00:00.000Z',
      updatedAt: '2026-05-23T00:00:00.000Z',
    };

    const catalog = createCatalogFromDefinition(definition);

    assert.equal(catalog.id, 'comic-world');
    assert.equal(catalog.source.type, 'local');
    assert.equal(catalog.issues.length, 2);
    assert.equal(catalog.issues[0].coverUrl, 'https://img.example.test/comic-world/001.webp');
    assert.equal(catalog.issues[1].displayTitle, '漫画世界 002');
  });
});
```

- [ ] **Step 2: Run the failing helper tests**

Run:

```bash
cd mobile
npm test -- src/data/catalogFixtures.test.ts
```

Expected: FAIL because `StoredComicCatalogDefinition`,
`expandCoverPattern()`, and `createCatalogFromDefinition()` do not exist.

- [ ] **Step 3: Add catalog definition types**

In `mobile/src/types.ts`, update `ComicCatalogSource` and add the local catalog
definition type:

```ts
export type ComicCatalogSource =
  | {
      type: 'bundled';
    }
  | {
      type: 'remote';
      manifestUrl: string;
      sourceId?: string;
    }
  | {
      type: 'local';
      definition: StoredComicCatalogDefinition;
    };

export type StoredComicCatalogDefinition = {
  schemaVersion: 1;
  id: string;
  name: string;
  shortName: string;
  kind: ComicCatalogKind;
  description?: string;
  issueCount: number;
  numberPadding: number;
  coverPattern?: string;
  createdAt: string;
  updatedAt: string;
};

export type CatalogSourceConfig = {
  id: string;
  registryUrl: string;
  priority: number;
};
```

- [ ] **Step 4: Add helper implementations**

In `mobile/src/data/catalogHelpers.ts`, replace the existing import line with:

```ts
import type { ComicCatalog, ComicIssue, ComicIssueKey, StoredComicCatalogDefinition } from '../types';
```

Then append these helper functions:

```ts
export function expandCoverPattern(pattern: string, issueNumber: number, padding = DEFAULT_CATALOG_NUMBER_PADDING) {
  const padded = formatIssueNumber(issueNumber, padding);
  return pattern
    .split('{number}')
    .join(String(issueNumber))
    .split('{padded}')
    .join(padded);
}

export function createCatalogFromDefinition(definition: StoredComicCatalogDefinition): ComicCatalog {
  return {
    id: definition.id,
    name: definition.name,
    shortName: definition.shortName,
    kind: definition.kind,
    description: definition.description,
    issueCount: definition.issueCount,
    numberPadding: definition.numberPadding,
    source: {
      type: 'local',
      definition,
    },
    issues: createNumberedComicIssues({
      catalogId: definition.id,
      catalogName: definition.name,
      issueCount: definition.issueCount,
      numberPadding: definition.numberPadding,
      coverUrlForIssue: definition.coverPattern
        ? (issueNumber) => expandCoverPattern(definition.coverPattern as string, issueNumber, definition.numberPadding)
        : undefined,
    }),
  };
}
```

- [ ] **Step 5: Run helper tests**

Run:

```bash
cd mobile
npm test -- src/data/catalogFixtures.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run typecheck**

Run:

```bash
cd mobile
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit helper changes**

Run:

```bash
git add mobile/src/types.ts mobile/src/data/catalogHelpers.ts mobile/src/data/catalogFixtures.test.ts
git commit -m "feat: add local catalog helpers"
```

---

### Task 2: Add Local Catalog Storage

**Files:**
- Create: `mobile/src/storage/localCatalogStorage.ts`
- Create: `mobile/src/storage/localCatalogStorage.test.ts`

- [ ] **Step 1: Write failing local catalog storage tests**

Create `mobile/src/storage/localCatalogStorage.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  catalogDefinitionFromInput,
  exportCatalogDefinition,
  findCatalogConflict,
  normalizeCatalogDefinitions,
  parseImportedCatalogDefinition,
} from './localCatalogStorage';
import type { StoredComicCatalogDefinition } from '../types';

const validDefinition: StoredComicCatalogDefinition = {
  schemaVersion: 1,
  id: 'comic-world',
  name: '漫画世界',
  shortName: '漫世',
  kind: 'magazine',
  issueCount: 300,
  numberPadding: 3,
  coverPattern: 'https://img.example.test/comic-world/{padded}.webp',
  createdAt: '2026-05-23T00:00:00.000Z',
  updatedAt: '2026-05-23T00:00:00.000Z',
};

describe('local catalog storage helpers', () => {
  it('normalizes valid catalog definitions', () => {
    assert.deepEqual(normalizeCatalogDefinitions([validDefinition]), [validDefinition]);
  });

  it('rejects unsafe IDs and invalid issue counts', () => {
    assert.deepEqual(
      normalizeCatalogDefinitions([
        { ...validDefinition, id: 'bad/id' },
        { ...validDefinition, id: 'bad-count', issueCount: 0 },
      ]),
      [],
    );
  });

  it('creates definitions from user input', () => {
    const definition = catalogDefinitionFromInput(
      {
        id: 'comic-world',
        name: ' 漫画世界 ',
        shortName: '',
        kind: 'magazine',
        issueCount: '300',
        numberPadding: '3',
        coverPattern: ' https://img.example.test/comic-world/{padded}.webp ',
      },
      '2026-05-23T00:00:00.000Z',
    );

    assert.equal(definition.id, 'comic-world');
    assert.equal(definition.name, '漫画世界');
    assert.equal(definition.shortName, '漫画世');
    assert.equal(definition.issueCount, 300);
    assert.equal(definition.coverPattern, 'https://img.example.test/comic-world/{padded}.webp');
  });

  it('exports and imports catalog definitions', () => {
    const raw = exportCatalogDefinition(validDefinition);
    assert.deepEqual(parseImportedCatalogDefinition(raw), validDefinition);
  });

  it('detects catalog ID conflicts', () => {
    assert.equal(findCatalogConflict([validDefinition], 'comic-world')?.id, 'comic-world');
    assert.equal(findCatalogConflict([validDefinition], 'other'), null);
  });
});
```

- [ ] **Step 2: Run the failing local catalog storage tests**

Run:

```bash
cd mobile
npm test -- src/storage/localCatalogStorage.test.ts
```

Expected: FAIL because `localCatalogStorage.ts` does not exist.

- [ ] **Step 3: Implement local catalog storage**

Create `mobile/src/storage/localCatalogStorage.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSafeCatalogId } from '../data/catalogHelpers';
import type { ComicCatalogKind, StoredComicCatalogDefinition } from '../types';

const LOCAL_CATALOGS_STORAGE_KEY = 'comic-guests.local-catalogs.v1';
const catalogKinds: ComicCatalogKind[] = ['magazine', 'series', 'one-shot', 'artbook', 'special'];

export type LocalCatalogInput = {
  id: string;
  name: string;
  shortName: string;
  kind: ComicCatalogKind;
  issueCount: string;
  numberPadding: string;
  coverPattern: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isCatalogKind(value: unknown): value is ComicCatalogKind {
  return typeof value === 'string' && catalogKinds.includes(value as ComicCatalogKind);
}

function optionalString(record: Record<string, unknown>, key: string) {
  return !(key in record) || typeof record[key] === 'string';
}

export function isStoredCatalogDefinition(value: unknown): value is StoredComicCatalogDefinition {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.schemaVersion === 1 &&
    isSafeCatalogId(value.id) &&
    typeof value.name === 'string' &&
    value.name.trim().length > 0 &&
    typeof value.shortName === 'string' &&
    value.shortName.trim().length > 0 &&
    isCatalogKind(value.kind) &&
    optionalString(value, 'description') &&
    typeof value.issueCount === 'number' &&
    Number.isInteger(value.issueCount) &&
    value.issueCount > 0 &&
    typeof value.numberPadding === 'number' &&
    Number.isInteger(value.numberPadding) &&
    value.numberPadding > 0 &&
    optionalString(value, 'coverPattern') &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

export function normalizeCatalogDefinitions(value: unknown): StoredComicCatalogDefinition[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isStoredCatalogDefinition).map((definition) => ({
    ...definition,
    id: definition.id.trim(),
    name: definition.name.trim(),
    shortName: definition.shortName.trim(),
    description: definition.description?.trim(),
    coverPattern: definition.coverPattern?.trim(),
  }));
}

export function catalogDefinitionFromInput(input: LocalCatalogInput, now = new Date().toISOString()) {
  const id = input.id.trim();
  if (!isSafeCatalogId(id)) {
    throw new Error('目录 ID 只能包含字母、数字、下划线和短横线。');
  }

  const name = input.name.trim();
  if (!name) {
    throw new Error('目录名称不能为空。');
  }

  const issueCount = Number.parseInt(input.issueCount, 10);
  if (!Number.isInteger(issueCount) || issueCount <= 0) {
    throw new Error('总期数必须是大于 0 的整数。');
  }

  const numberPadding = Number.parseInt(input.numberPadding, 10);
  if (!Number.isInteger(numberPadding) || numberPadding <= 0) {
    throw new Error('期号补零位数必须是大于 0 的整数。');
  }

  const coverPattern = input.coverPattern.trim();
  if (coverPattern && !coverPattern.includes('{number}') && !coverPattern.includes('{padded}')) {
    throw new Error('封面 URL 规则必须包含 {number} 或 {padded}。');
  }

  return {
    schemaVersion: 1,
    id,
    name,
    shortName: input.shortName.trim() || name.slice(0, 3),
    kind: input.kind,
    issueCount,
    numberPadding,
    coverPattern: coverPattern || undefined,
    createdAt: now,
    updatedAt: now,
  } satisfies StoredComicCatalogDefinition;
}

export function exportCatalogDefinition(definition: StoredComicCatalogDefinition) {
  return JSON.stringify(
    {
      app: 'manga-shelf',
      type: 'catalog-definition',
      version: 1,
      exportedAt: new Date().toISOString(),
      catalog: definition,
    },
    null,
    2,
  );
}

export function parseImportedCatalogDefinition(raw: string) {
  const parsed = JSON.parse(raw) as unknown;
  const catalog =
    isRecord(parsed) && 'catalog' in parsed
      ? (parsed as { catalog?: unknown }).catalog
      : parsed;

  if (!isStoredCatalogDefinition(catalog)) {
    throw new Error('导入内容不是有效的目录定义 JSON。');
  }

  return normalizeCatalogDefinitions([catalog])[0];
}

export function findCatalogConflict(catalogs: StoredComicCatalogDefinition[], catalogId: string) {
  return catalogs.find((catalog) => catalog.id === catalogId) ?? null;
}

export async function loadLocalCatalogDefinitions() {
  const raw = await AsyncStorage.getItem(LOCAL_CATALOGS_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    return normalizeCatalogDefinitions(JSON.parse(raw));
  } catch {
    return [];
  }
}

export async function saveLocalCatalogDefinitions(catalogs: StoredComicCatalogDefinition[]) {
  await AsyncStorage.setItem(LOCAL_CATALOGS_STORAGE_KEY, JSON.stringify(catalogs));
}

export async function upsertLocalCatalogDefinition(definition: StoredComicCatalogDefinition) {
  const current = await loadLocalCatalogDefinitions();
  const next = [
    ...current.filter((catalog) => catalog.id !== definition.id),
    {
      ...definition,
      updatedAt: new Date().toISOString(),
    },
  ];
  await saveLocalCatalogDefinitions(next);
  return next;
}
```

- [ ] **Step 4: Run local catalog storage tests**

Run:

```bash
cd mobile
npm test -- src/storage/localCatalogStorage.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run full tests and typecheck**

Run:

```bash
cd mobile
npm test
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit local catalog storage**

Run:

```bash
git add mobile/src/storage/localCatalogStorage.ts mobile/src/storage/localCatalogStorage.test.ts
git commit -m "feat: add local catalog storage"
```

---

### Task 3: Add Public Catalog Source Fallback

**Files:**
- Modify: `mobile/src/data/catalogRegistry.ts`
- Modify: `mobile/src/data/catalogRegistry.test.ts`
- Modify: `mobile/app.json`

- [ ] **Step 1: Add failing source fallback tests**

Append these imports and tests to `mobile/src/data/catalogRegistry.test.ts`.
Add `fetchRemoteCatalogsFromSources` to the existing import list:

```ts
import type { CatalogSourceConfig } from '../types';
```

Append this `describe` block:

```ts
describe('remote catalog source fallback', () => {
  it('loads catalogs from the first working source', async () => {
    const sources: CatalogSourceConfig[] = [
      {
        id: 'bad',
        registryUrl: 'https://bad.example.test/registry/index.v1.json',
        priority: 1,
      },
      {
        id: 'good',
        registryUrl: 'https://good.example.test/registry/index.v1.json',
        priority: 2,
      },
    ];

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input) => {
      const url = String(input);
      if (url.includes('bad.example.test')) {
        return new Response('not found', { status: 404 });
      }
      if (url.endsWith('/registry/index.v1.json')) {
        return Response.json({
          schemaVersion: 1,
          catalogs: [
            {
              id: 'demo-comic',
              name: '测试漫画',
              kind: 'series',
              manifestUrl: '../catalogs/demo-comic/manifest.v1.json',
            },
          ],
        });
      }
      return Response.json({
        schemaVersion: 1,
        id: 'demo-comic',
        name: '测试漫画',
        kind: 'series',
        issueCount: 1,
      });
    };

    try {
      const result = await fetchRemoteCatalogsFromSources(sources);
      assert.equal(result.sourceId, 'good');
      assert.equal(result.catalogs[0].id, 'demo-comic');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
```

- [ ] **Step 2: Run the failing fallback test**

Run:

```bash
cd mobile
npm test -- src/data/catalogRegistry.test.ts
```

Expected: FAIL because `fetchRemoteCatalogsFromSources()` does not exist.

- [ ] **Step 3: Implement source fallback**

In `mobile/src/data/catalogRegistry.ts`, add `CatalogSourceConfig` to the type
import and extend `AppExtra`:

```ts
import type {
  CatalogSourceConfig,
  ComicCatalog,
  ComicCatalogKind,
  ComicIssue,
  RemoteComicCatalogManifest,
  RemoteComicCatalogRegistry,
  RemoteComicCatalogRegistryEntry,
  RemoteComicIssue,
} from '../types';
```

```ts
type AppExtra = {
  catalogRegistryUrl?: string;
  catalogSources?: CatalogSourceConfig[];
};
```

Add these functions near `getCatalogRegistryUrl()`:

```ts
export function getConfiguredCatalogSources(): CatalogSourceConfig[] {
  const extra = getExpoConstants().expoConfig?.extra as AppExtra | undefined;
  const rawSources = Array.isArray(extra?.catalogSources) ? extra.catalogSources : [];
  const sources = rawSources
    .filter(
      (source): source is CatalogSourceConfig =>
        isRecord(source) &&
        typeof source.id === 'string' &&
        typeof source.registryUrl === 'string' &&
        typeof source.priority === 'number' &&
        !isPlaceholderCatalogRegistryUrl(source.registryUrl),
    )
    .sort((left, right) => left.priority - right.priority);

  if (sources.length > 0) {
    return sources;
  }

  const legacyUrl = getCatalogRegistryUrl();
  return legacyUrl
    ? [
        {
          id: 'legacy',
          registryUrl: legacyUrl,
          priority: 1,
        },
      ]
    : [];
}

export async function fetchRemoteCatalogsFromSources(sources: CatalogSourceConfig[]) {
  const orderedSources = [...sources].sort((left, right) => left.priority - right.priority);
  let lastError: unknown = null;

  for (const source of orderedSources) {
    try {
      const catalogs = await fetchRemoteCatalogs(source.registryUrl);
      return {
        sourceId: source.id,
        catalogs: catalogs.map((catalog) => ({
          ...catalog,
          source: catalog.source.type === 'remote'
            ? {
                ...catalog.source,
                sourceId: source.id,
              }
            : catalog.source,
        })),
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('所有公共目录源都不可用。');
}
```

Replace `loadConfiguredCatalogs()` with:

```ts
export async function loadConfiguredCatalogs(options: { fallbackToBundled?: boolean } = {}) {
  const sources = getConfiguredCatalogSources();
  const fallbackToBundled = options.fallbackToBundled ?? true;

  if (sources.length === 0) {
    return fallbackToBundled ? getBundledCatalogs() : [];
  }

  try {
    const result = await fetchRemoteCatalogsFromSources(sources);
    return result.catalogs.length > 0 || !fallbackToBundled ? result.catalogs : getBundledCatalogs();
  } catch (error) {
    if (fallbackToBundled) {
      return getBundledCatalogs();
    }
    throw error;
  }
}
```

- [ ] **Step 4: Update app config with two catalog sources**

In `mobile/app.json`, replace `extra.catalogRegistryUrl` with `catalogSources`
while keeping the legacy URL out of production config:

```json
"extra": {
  "catalogSources": [
    {
      "id": "gitee",
      "registryUrl": "https://gitee.com/YOUR_NAME/manga-shelf-data/raw/master/registry/index.v1.json",
      "priority": 1
    },
    {
      "id": "github",
      "registryUrl": "https://YOUR_NAME.github.io/manga-shelf-data/registry/index.v1.json",
      "priority": 2
    }
  ],
  "updateManifestUrl": "https://gitee.com/YOUR_NAME/comic-guests/raw/master/release/version.json"
}
```

- [ ] **Step 5: Run registry tests**

Run:

```bash
cd mobile
npm test -- src/data/catalogRegistry.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run full verification**

Run:

```bash
cd mobile
npm test
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit public catalog source fallback**

Run:

```bash
git add mobile/src/data/catalogRegistry.ts mobile/src/data/catalogRegistry.test.ts mobile/app.json
git commit -m "feat: add catalog source fallback"
```

---

### Task 4: Add Catalog Store Aggregation

**Files:**
- Create: `mobile/src/data/catalogStore.ts`
- Create: `mobile/src/data/catalogStore.test.ts`
- Modify: `mobile/src/screens/LibraryScreen.tsx`

- [ ] **Step 1: Write failing catalog store tests**

Create `mobile/src/data/catalogStore.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mergeCatalogLists } from './catalogStore';
import type { ComicCatalog } from '../types';

function catalog(id: string, source: ComicCatalog['source']): ComicCatalog {
  return {
    id,
    name: id,
    shortName: id,
    kind: 'magazine',
    issueCount: 1,
    numberPadding: 3,
    source,
    issues: [
      {
        key: `${id}:1`,
        catalogId: id,
        number: 1,
        sortNumber: 1,
        label: '第001期',
        displayTitle: `${id} 001`,
      },
    ],
  };
}

describe('catalog store', () => {
  it('keeps local catalogs before public catalogs', () => {
    const localDefinition = {
      schemaVersion: 1,
      id: 'local-demo',
      name: 'local-demo',
      shortName: 'local-demo',
      kind: 'magazine',
      issueCount: 1,
      numberPadding: 3,
      createdAt: '2026-05-23T00:00:00.000Z',
      updatedAt: '2026-05-23T00:00:00.000Z',
    } as const;
    const merged = mergeCatalogLists({
      localCatalogs: [catalog('local-demo', { type: 'local', definition: localDefinition })],
      publicCatalogs: [catalog('public-demo', { type: 'remote', manifestUrl: 'https://example.test/manifest.json' })],
      bundledCatalogs: [],
    });

    assert.deepEqual(
      merged.map((item) => item.id),
      ['local-demo', 'public-demo'],
    );
  });

  it('local catalogs override public catalogs with the same ID', () => {
    const localDefinition = {
      schemaVersion: 1,
      id: 'demo',
      name: 'demo',
      shortName: 'demo',
      kind: 'magazine',
      issueCount: 1,
      numberPadding: 3,
      createdAt: '2026-05-23T00:00:00.000Z',
      updatedAt: '2026-05-23T00:00:00.000Z',
    } as const;
    const merged = mergeCatalogLists({
      localCatalogs: [catalog('demo', { type: 'local', definition: localDefinition })],
      publicCatalogs: [catalog('demo', { type: 'remote', manifestUrl: 'https://example.test/manifest.json' })],
      bundledCatalogs: [],
    });

    assert.equal(merged.length, 1);
    assert.equal(merged[0].source.type, 'local');
  });

  it('uses bundled catalogs when public and local lists are empty', () => {
    const merged = mergeCatalogLists({
      localCatalogs: [],
      publicCatalogs: [],
      bundledCatalogs: [catalog('bundled-demo', { type: 'bundled' })],
    });

    assert.deepEqual(
      merged.map((item) => item.id),
      ['bundled-demo'],
    );
  });
});
```

- [ ] **Step 2: Run the failing catalog store tests**

Run:

```bash
cd mobile
npm test -- src/data/catalogStore.test.ts
```

Expected: FAIL because `catalogStore.ts` does not exist.

- [ ] **Step 3: Implement catalog store**

Create `mobile/src/data/catalogStore.ts`:

```ts
import { defaultCatalog } from './catalogs';
import { loadConfiguredCatalogs } from './catalogRegistry';
import { createCatalogFromDefinition } from './catalogHelpers';
import { loadLocalCatalogDefinitions } from '../storage/localCatalogStorage';
import type { ComicCatalog } from '../types';

export type CatalogLoadResult = {
  catalogs: ComicCatalog[];
  publicCatalogLoadFailed: boolean;
};

export function mergeCatalogLists(options: {
  localCatalogs: ComicCatalog[];
  publicCatalogs: ComicCatalog[];
  bundledCatalogs: ComicCatalog[];
}) {
  const byId = new Map<string, ComicCatalog>();

  for (const catalog of options.bundledCatalogs) {
    byId.set(catalog.id, catalog);
  }
  for (const catalog of options.publicCatalogs) {
    byId.set(catalog.id, catalog);
  }
  for (const catalog of options.localCatalogs) {
    byId.set(catalog.id, catalog);
  }

  const localIds = new Set(options.localCatalogs.map((catalog) => catalog.id));
  const publicIds = new Set(options.publicCatalogs.map((catalog) => catalog.id));

  return [...byId.values()].sort((left, right) => {
    const leftRank = localIds.has(left.id) ? 0 : publicIds.has(left.id) ? 1 : 2;
    const rightRank = localIds.has(right.id) ? 0 : publicIds.has(right.id) ? 1 : 2;
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }
    return left.name.localeCompare(right.name, 'zh-Hans-CN');
  });
}

export async function loadCatalogStore(): Promise<CatalogLoadResult> {
  const localDefinitions = await loadLocalCatalogDefinitions();
  const localCatalogs = localDefinitions.map(createCatalogFromDefinition);

  try {
    const publicCatalogs = await loadConfiguredCatalogs({ fallbackToBundled: false });
    const catalogs = mergeCatalogLists({
      localCatalogs,
      publicCatalogs,
      bundledCatalogs: publicCatalogs.length === 0 && localCatalogs.length === 0 ? [defaultCatalog] : [],
    });

    return {
      catalogs,
      publicCatalogLoadFailed: false,
    };
  } catch {
    return {
      catalogs: mergeCatalogLists({
        localCatalogs,
        publicCatalogs: [],
        bundledCatalogs: [defaultCatalog],
      }),
      publicCatalogLoadFailed: true,
    };
  }
}
```

- [ ] **Step 4: Run catalog store tests**

Run:

```bash
cd mobile
npm test -- src/data/catalogStore.test.ts
```

Expected: PASS.

- [ ] **Step 5: Switch LibraryScreen to catalog store**

In `mobile/src/screens/LibraryScreen.tsx`, replace:

```ts
import { loadConfiguredCatalogs } from '../data/catalogRegistry';
```

with:

```ts
import { loadCatalogStore } from '../data/catalogStore';
```

Replace the catalog loading effect with:

```ts
  useEffect(() => {
    let cancelled = false;

    loadCatalogStore()
      .then((result) => {
        if (cancelled) {
          return;
        }
        const loadedCatalogs = result.catalogs;
        setCatalogs(loadedCatalogs);
        const currentId = selectedCatalogIdRef.current;
        const nextSelectedId = loadedCatalogs.some((catalog) => catalog.id === currentId)
          ? currentId
          : loadedCatalogs[0]?.id ?? defaultCatalog.id;
        if (nextSelectedId !== currentId) {
          resetCatalogSelectionState();
          selectedCatalogIdRef.current = nextSelectedId;
          setSelectedCatalogId(nextSelectedId);
        }
        setCatalogLoadFailed(result.publicCatalogLoadFailed);
      })
      .catch(() => {
        if (!cancelled) {
          setCatalogs([defaultCatalog]);
          setCatalogLoadFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);
```

- [ ] **Step 6: Update fallback warning text**

In `LibraryScreen`, replace:

```tsx
<Text style={styles.catalogWarning}>远程漫画目录暂时不可用，正在使用内置目录。</Text>
```

with:

```tsx
<Text style={styles.catalogWarning}>公共目录暂时不可用，已显示本地目录和内置目录。</Text>
```

- [ ] **Step 7: Run tests and typecheck**

Run:

```bash
cd mobile
npm test
npm run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit catalog store**

Run:

```bash
git add mobile/src/data/catalogStore.ts mobile/src/data/catalogStore.test.ts mobile/src/screens/LibraryScreen.tsx
git commit -m "feat: merge public and local catalogs"
```

---

### Task 5: Add Local Catalog Creation And Catalog Import UI

**Files:**
- Create: `mobile/src/components/LocalCatalogEditorModal.tsx`
- Create: `mobile/src/components/ToolsModal.tsx`
- Modify: `mobile/src/screens/LibraryScreen.tsx`

- [ ] **Step 1: Create local catalog editor modal**

Create `mobile/src/components/LocalCatalogEditorModal.tsx`:

```tsx
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { catalogDefinitionFromInput } from '../storage/localCatalogStorage';
import { colors, radii } from '../styles/theme';
import type { ComicCatalogKind, StoredComicCatalogDefinition } from '../types';
import { SegmentedControl } from './SegmentedControl';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (definition: StoredComicCatalogDefinition) => void;
};

const kindOptions: Array<{ label: string; value: ComicCatalogKind }> = [
  { label: '杂志', value: 'magazine' },
  { label: '单行本', value: 'series' },
  { label: '单册', value: 'one-shot' },
  { label: '画集', value: 'artbook' },
  { label: '特刊', value: 'special' },
];

export function LocalCatalogEditorModal({ visible, onClose, onSave }: Props) {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [kind, setKind] = useState<ComicCatalogKind>('magazine');
  const [issueCount, setIssueCount] = useState('');
  const [numberPadding, setNumberPadding] = useState('3');
  const [coverPattern, setCoverPattern] = useState('');
  const [error, setError] = useState('');

  function reset() {
    setId('');
    setName('');
    setShortName('');
    setKind('magazine');
    setIssueCount('');
    setNumberPadding('3');
    setCoverPattern('');
    setError('');
  }

  function save() {
    try {
      const definition = catalogDefinitionFromInput({
        id,
        name,
        shortName,
        kind,
        issueCount,
        numberPadding,
        coverPattern,
      });
      onSave(definition);
      reset();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '目录信息无效。');
    }
  }

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.kicker}>本地目录</Text>
              <Text style={styles.title}>新建期刊目录</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={20} color={colors.white} />
            </Pressable>
          </View>

          <TextInput value={id} onChangeText={setId} placeholder="目录 ID，例如 comic-world" style={styles.input} />
          <TextInput value={name} onChangeText={setName} placeholder="名称，例如 漫画世界" style={styles.input} />
          <TextInput value={shortName} onChangeText={setShortName} placeholder="简称，可留空" style={styles.input} />
          <SegmentedControl options={kindOptions} value={kind} onChange={setKind} />
          <TextInput value={issueCount} onChangeText={setIssueCount} keyboardType="number-pad" placeholder="总期数，例如 300" style={styles.input} />
          <TextInput value={numberPadding} onChangeText={setNumberPadding} keyboardType="number-pad" placeholder="期号补零位数，例如 3" style={styles.input} />
          <TextInput value={coverPattern} onChangeText={setCoverPattern} placeholder="封面 URL 规则，可留空" style={styles.input} />
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable accessibilityRole="button" onPress={save} style={styles.saveButton}>
            <MaterialCommunityIcons name="content-save-check" size={18} color={colors.white} />
            <Text style={styles.saveText}>保存目录</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(59, 29, 18, 0.44)',
  },
  sheet: {
    gap: 10,
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.lineStrong,
    padding: 18,
    paddingBottom: 28,
    backgroundColor: colors.paperWarm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  kicker: {
    color: colors.redDark,
    fontSize: 12,
    fontWeight: '900',
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.shelf,
  },
  input: {
    minHeight: 42,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    paddingHorizontal: 12,
    color: colors.ink,
    backgroundColor: colors.cream,
  },
  error: {
    color: colors.redDark,
    fontSize: 12,
    fontWeight: '800',
  },
  saveButton: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radii.md,
    backgroundColor: colors.redDark,
  },
  saveText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '900',
  },
});
```

- [ ] **Step 2: Create tools modal**

Create `mobile/src/components/ToolsModal.tsx`:

```tsx
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radii } from '../styles/theme';

type Props = {
  visible: boolean;
  backupText: string;
  onChangeBackupText: (value: string) => void;
  onClose: () => void;
  onCreateCatalog: () => void;
  onExportRecords: () => void;
  onImportRecords: () => void;
  onExportCurrentCatalog: () => void;
  onImportCatalog: () => void;
};

export function ToolsModal({
  visible,
  backupText,
  onChangeBackupText,
  onClose,
  onCreateCatalog,
  onExportRecords,
  onImportRecords,
  onExportCurrentCatalog,
  onImportCatalog,
}: Props) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.toolsSheet}>
          <View style={styles.toolsHeader}>
            <View>
              <Text style={styles.eyebrow}>本地数据</Text>
              <Text style={styles.toolsTitle}>工具</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="关闭工具" onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={20} color={colors.white} />
            </Pressable>
          </View>

          <View style={styles.backupActions}>
            <Pressable style={styles.secondaryButton} onPress={onCreateCatalog}>
              <MaterialCommunityIcons name="book-plus" size={16} color={colors.shelfDark} />
              <Text style={styles.secondaryText}>新建目录</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={onExportCurrentCatalog}>
              <MaterialCommunityIcons name="file-export-outline" size={16} color={colors.shelfDark} />
              <Text style={styles.secondaryText}>导出目录</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={onImportCatalog}>
              <MaterialCommunityIcons name="file-import-outline" size={16} color={colors.shelfDark} />
              <Text style={styles.secondaryText}>导入目录</Text>
            </Pressable>
          </View>

          <View style={styles.backupActions}>
            <Pressable style={styles.secondaryButton} onPress={onExportRecords}>
              <MaterialCommunityIcons name="download-box-outline" size={16} color={colors.shelfDark} />
              <Text style={styles.secondaryText}>导出收藏</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={onImportRecords}>
              <MaterialCommunityIcons name="upload-box-outline" size={16} color={colors.shelfDark} />
              <Text style={styles.secondaryText}>导入收藏</Text>
            </Pressable>
          </View>

          <TextInput
            multiline
            value={backupText}
            onChangeText={onChangeBackupText}
            placeholder="JSON 会显示在这里，也可以粘贴目录或收藏备份再导入"
            placeholderTextColor="#8b8173"
            style={styles.backupInput}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(59, 29, 18, 0.42)',
  },
  toolsSheet: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.lineStrong,
    padding: 16,
    paddingBottom: 24,
    backgroundColor: colors.paperWarm,
  },
  toolsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  eyebrow: {
    color: colors.redDark,
    fontSize: 12,
    fontWeight: '900',
  },
  toolsTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
  },
  closeButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.shelf,
  },
  backupActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  secondaryButton: {
    minWidth: 116,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    paddingHorizontal: 10,
    backgroundColor: colors.cream,
  },
  secondaryText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  backupInput: {
    minHeight: 120,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: 10,
    color: colors.ink,
    backgroundColor: colors.cream,
    fontSize: 12,
    textAlignVertical: 'top',
  },
});
```

- [ ] **Step 3: Wire the new modals into LibraryScreen**

In `mobile/src/screens/LibraryScreen.tsx`, add imports:

```ts
import { LocalCatalogEditorModal } from '../components/LocalCatalogEditorModal';
import { ToolsModal } from '../components/ToolsModal';
import { createCatalogFromDefinition } from '../data/catalogHelpers';
import {
  exportCatalogDefinition,
  parseImportedCatalogDefinition,
  upsertLocalCatalogDefinition,
} from '../storage/localCatalogStorage';
import type { StoredComicCatalogDefinition } from '../types';
```

Add state:

```ts
  const [catalogEditorOpen, setCatalogEditorOpen] = useState(false);
```

Add helper functions:

```ts
  function addCatalogToState(definition: StoredComicCatalogDefinition) {
    const catalog = createCatalogFromDefinition(definition);
    setCatalogs((current) => [catalog, ...current.filter((candidate) => candidate.id !== catalog.id)]);
    selectedCatalogIdRef.current = catalog.id;
    setSelectedCatalogId(catalog.id);
    resetCatalogSelectionState();
  }

  function handleCreateCatalog(definition: StoredComicCatalogDefinition) {
    upsertLocalCatalogDefinition(definition)
      .then(() => {
        addCatalogToState(definition);
        setCatalogEditorOpen(false);
        setToolsOpen(false);
      })
      .catch(() => {
        Alert.alert('保存失败', '本地目录没有写入本机，请稍后再试。');
      });
  }

  function handleExportCurrentCatalog() {
    if (currentCatalog.source.type !== 'local') {
      Alert.alert('暂不支持导出', '第一版只导出本机创建或导入的目录。');
      return;
    }
    setBackupText(exportCatalogDefinition(currentCatalog.source.definition));
  }

  function handleImportCatalog() {
    try {
      const definition = parseImportedCatalogDefinition(backupText);
      upsertLocalCatalogDefinition(definition)
        .then(() => {
          addCatalogToState(definition);
          Alert.alert('导入完成', '目录已经保存到本机。');
        })
        .catch(() => {
          Alert.alert('导入失败', '目录没有写入本机，请稍后再试。');
        });
    } catch (error) {
      Alert.alert('导入失败', error instanceof Error ? error.message : '无法解析目录 JSON。');
    }
  }
```

Replace the inline tools `<Modal>` block with:

```tsx
      <ToolsModal
        visible={toolsOpen}
        backupText={backupText}
        onChangeBackupText={setBackupText}
        onClose={() => setToolsOpen(false)}
        onCreateCatalog={() => setCatalogEditorOpen(true)}
        onExportRecords={handleExport}
        onImportRecords={handleImport}
        onExportCurrentCatalog={handleExportCurrentCatalog}
        onImportCatalog={handleImportCatalog}
      />

      <LocalCatalogEditorModal
        visible={catalogEditorOpen}
        onClose={() => setCatalogEditorOpen(false)}
        onSave={handleCreateCatalog}
      />
```

- [ ] **Step 4: Remove unused inline tools styles**

Remove `modalBackdrop`, `toolsSheet`, `toolsHeader`, `toolsTitle`,
`closeButton`, `backupActions`, `secondaryButton`, `secondaryText`, and
`backupInput` from `LibraryScreen` if they are only used by the old inline
tools modal.

- [ ] **Step 5: Run typecheck**

Run:

```bash
cd mobile
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Run tests**

Run:

```bash
cd mobile
npm test
```

Expected: PASS.

- [ ] **Step 7: Preview on desktop and phone**

Run:

```bash
cd mobile
npm start -- --host lan
```

Expected:
- Desktop web preview can open from the Expo terminal.
- A phone on the same Wi-Fi can scan the Expo QR code in Expo Go.
- The tools modal has entries for creating a catalog, exporting a catalog,
  importing a catalog, exporting collection records, and importing collection
  records.

- [ ] **Step 8: Commit UI changes**

Run:

```bash
git add mobile/src/components/LocalCatalogEditorModal.tsx mobile/src/components/ToolsModal.tsx mobile/src/screens/LibraryScreen.tsx
git commit -m "feat: add local catalog tools"
```

---

### Task 6: Add Update Center Source Fallback

**Files:**
- Modify: `mobile/src/update/versionCheck.ts`
- Create: `mobile/src/update/versionCheck.test.ts`
- Modify: `mobile/src/components/UpdatePromptModal.tsx`
- Modify: `mobile/app.json`
- Modify: `release/version.example.json`

- [ ] **Step 1: Write failing update tests**

Create `mobile/src/update/versionCheck.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { checkForAppUpdate, compareVersions, fetchUpdateManifestFromSources } from './versionCheck';

describe('version checks', () => {
  it('compares semantic versions', () => {
    assert.equal(compareVersions('1.2.0', '1.1.9'), 1);
    assert.equal(compareVersions('1.0.0', '1.0'), 0);
    assert.equal(compareVersions('1.0.0', '1.0.1'), -1);
  });

  it('falls back to the first working update manifest source', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input) => {
      const url = String(input);
      if (url.includes('bad.example.test')) {
        return new Response('nope', { status: 500 });
      }
      return Response.json({
        latestVersion: '1.2.0',
        updatePageUrl: 'https://updates.example.test/app.html',
      });
    };

    try {
      const result = await fetchUpdateManifestFromSources([
        { id: 'bad', manifestUrl: 'https://bad.example.test/version.json', priority: 1 },
        { id: 'good', manifestUrl: 'https://good.example.test/version.json', priority: 2 },
      ]);
      assert.equal(result.sourceId, 'good');
      assert.equal(result.manifest.updatePageUrl, 'https://updates.example.test/app.html');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('returns update page URL and force update metadata', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      Response.json({
        latestVersion: '1.2.0',
        minimumVersion: '1.1.0',
        updatePageUrl: 'https://updates.example.test/app.html',
      });

    try {
      const info = await checkForAppUpdate('https://good.example.test/version.json', '1.0.0');
      assert.equal(info?.latestVersion, '1.2.0');
      assert.equal(info?.forceUpdate, true);
      assert.equal(info?.updatePageUrl, 'https://updates.example.test/app.html');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
```

- [ ] **Step 2: Run failing update tests**

Run:

```bash
cd mobile
npm test -- src/update/versionCheck.test.ts
```

Expected: FAIL because update source fallback and `updatePageUrl` do not exist.

- [ ] **Step 3: Extend update types and source fallback**

In `mobile/src/update/versionCheck.ts`, replace the top type block with:

```ts
import Constants from 'expo-constants';

export type AppUpdateManifest = {
  latestVersion: string;
  minimumVersion?: string;
  title?: string;
  message?: string;
  updatePageUrl?: string;
  iosUrl?: string;
  androidUrl?: string;
  downloadUrl?: string;
  releaseNotesUrl?: string;
  platforms?: {
    android?: {
      apkUrl?: string;
      storeUrl?: string;
    };
    ios?: {
      testFlightUrl?: string;
      appStoreUrl?: string;
    };
  };
};

export type AppUpdateManifestSource = {
  id: string;
  manifestUrl: string;
  priority: number;
};

export type AppUpdateInfo = AppUpdateManifest & {
  currentVersion: string;
  forceUpdate: boolean;
  sourceId?: string;
};
```

Change `getUpdateManifestUrl()` and add source helpers:

```ts
export function getUpdateManifestUrl() {
  const extra = Constants.expoConfig?.extra as { updateManifestUrl?: string } | undefined;
  return extra?.updateManifestUrl?.trim() ?? '';
}

export function getUpdateManifestSources() {
  const extra = Constants.expoConfig?.extra as { updateManifestSources?: AppUpdateManifestSource[] } | undefined;
  const sources = Array.isArray(extra?.updateManifestSources)
    ? extra.updateManifestSources
        .filter(
          (source): source is AppUpdateManifestSource =>
            Boolean(source) &&
            typeof source.id === 'string' &&
            typeof source.manifestUrl === 'string' &&
            typeof source.priority === 'number',
        )
        .sort((left, right) => left.priority - right.priority)
    : [];

  if (sources.length > 0) {
    return sources;
  }

  const legacyUrl = getUpdateManifestUrl();
  return legacyUrl
    ? [
        {
          id: 'legacy',
          manifestUrl: legacyUrl,
          priority: 1,
        },
      ]
    : [];
}
```

Add:

```ts
async function fetchUpdateManifest(manifestUrl: string) {
  const response = await fetch(manifestUrl, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Version manifest request failed: ${response.status}`);
  }

  const data = await response.json();
  if (!isManifest(data)) {
    throw new Error('Version manifest is invalid.');
  }

  return data;
}

export async function fetchUpdateManifestFromSources(sources: AppUpdateManifestSource[]) {
  const orderedSources = [...sources].sort((left, right) => left.priority - right.priority);
  let lastError: unknown = null;

  for (const source of orderedSources) {
    try {
      return {
        sourceId: source.id,
        manifest: await fetchUpdateManifest(source.manifestUrl),
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('所有版本清单源都不可用。');
}
```

Replace `checkForAppUpdate()` with:

```ts
export async function checkForAppUpdate(
  manifestUrl = getUpdateManifestUrl(),
  currentVersion = getCurrentAppVersion(),
): Promise<AppUpdateInfo | null> {
  const result = manifestUrl
    ? {
        sourceId: 'direct',
        manifest: await fetchUpdateManifest(manifestUrl),
      }
    : await fetchUpdateManifestFromSources(getUpdateManifestSources());

  const data = result.manifest;
  const latestVersion = data.latestVersion.trim();
  if (compareVersions(latestVersion, currentVersion) <= 0) {
    return null;
  }

  const minimumVersion = data.minimumVersion?.trim();
  const forceUpdate = minimumVersion ? compareVersions(minimumVersion, currentVersion) > 0 : false;

  return {
    ...data,
    latestVersion,
    currentVersion,
    forceUpdate,
    sourceId: result.sourceId,
  };
}
```

- [ ] **Step 4: Update prompt URL resolution**

In `mobile/src/components/UpdatePromptModal.tsx`, update `getUpdateUrl()`:

```ts
function getUpdateUrl(updateInfo: AppUpdateInfo) {
  if (updateInfo.updatePageUrl) {
    return updateInfo.updatePageUrl;
  }
  if (Platform.OS === 'ios') {
    return updateInfo.platforms?.ios?.appStoreUrl ??
      updateInfo.platforms?.ios?.testFlightUrl ??
      updateInfo.iosUrl ??
      updateInfo.downloadUrl ??
      updateInfo.releaseNotesUrl;
  }
  if (Platform.OS === 'android') {
    return updateInfo.platforms?.android?.storeUrl ??
      updateInfo.platforms?.android?.apkUrl ??
      updateInfo.androidUrl ??
      updateInfo.downloadUrl ??
      updateInfo.releaseNotesUrl;
  }
  return updateInfo.downloadUrl ?? updateInfo.releaseNotesUrl ?? updateInfo.iosUrl ?? updateInfo.androidUrl;
}
```

- [ ] **Step 5: Update app config and release example**

In `mobile/app.json`, replace `updateManifestUrl` with:

```json
"updateManifestSources": [
  {
    "id": "gitee",
    "manifestUrl": "https://gitee.com/YOUR_NAME/comic-guests/raw/master/release/version.json",
    "priority": 1
  },
  {
    "id": "github",
    "manifestUrl": "https://YOUR_NAME.github.io/comic-guests/release/version.json",
    "priority": 2
  }
]
```

Replace `release/version.example.json` with:

```json
{
  "latestVersion": "1.1.0",
  "minimumVersion": "1.0.0",
  "title": "发现新版本",
  "message": "新版本优化了目录和收藏体验，建议更新后继续使用。",
  "updatePageUrl": "https://YOUR_NAME.github.io/comic-guests/update.html",
  "platforms": {
    "android": {
      "apkUrl": "https://gitee.com/YOUR_NAME/comic-guests/releases/download/v1.1.0/comic-guests-1.1.0.apk",
      "storeUrl": ""
    },
    "ios": {
      "testFlightUrl": "",
      "appStoreUrl": ""
    }
  },
  "releaseNotesUrl": "https://gitee.com/YOUR_NAME/comic-guests/releases/tag/v1.1.0"
}
```

- [ ] **Step 6: Run update tests**

Run:

```bash
cd mobile
npm test -- src/update/versionCheck.test.ts
```

Expected: PASS.

- [ ] **Step 7: Run full verification**

Run:

```bash
cd mobile
npm test
npm run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit update center changes**

Run:

```bash
git add mobile/src/update/versionCheck.ts mobile/src/update/versionCheck.test.ts mobile/src/components/UpdatePromptModal.tsx mobile/app.json release/version.example.json
git commit -m "feat: add update center fallback"
```

---

### Task 7: Update Documentation And Preview Requirements

**Files:**
- Modify: `docs/remote-catalog-data.md`
- Modify: `docs/release-and-updates.md`
- Modify: `README.md`

- [ ] **Step 1: Update remote catalog docs**

In `docs/remote-catalog-data.md`, update the entrance section to describe
`catalogSources`:

```md
App 读取 `mobile/app.json` 中的 `expo.extra.catalogSources`。它是一组公共目录源，
按 `priority` 从小到大尝试：

```json
{
  "catalogSources": [
    {
      "id": "gitee",
      "registryUrl": "https://gitee.com/YOUR_NAME/manga-shelf-data/raw/master/registry/index.v1.json",
      "priority": 1
    },
    {
      "id": "github",
      "registryUrl": "https://YOUR_NAME.github.io/manga-shelf-data/registry/index.v1.json",
      "priority": 2
    }
  ]
}
```

如果主源不可用，App 会尝试备用源。所有公共源失败时，本地目录和内置兜底
目录仍然可用。
```

- [ ] **Step 2: Update release docs**

In `docs/release-and-updates.md`, update the version manifest example:

```json
{
  "latestVersion": "1.1.0",
  "minimumVersion": "1.0.0",
  "title": "发现新版本",
  "message": "新版本优化了目录和收藏体验，建议更新后继续使用。",
  "updatePageUrl": "https://YOUR_NAME.github.io/comic-guests/update.html",
  "platforms": {
    "android": {
      "apkUrl": "https://gitee.com/YOUR_NAME/comic-guests/releases/download/v1.1.0/comic-guests-1.1.0.apk",
      "storeUrl": ""
    },
    "ios": {
      "testFlightUrl": "",
      "appStoreUrl": ""
    }
  },
  "releaseNotesUrl": "https://gitee.com/YOUR_NAME/comic-guests/releases/tag/v1.1.0"
}
```

Add this paragraph after the example:

```md
App 打开的是 `updatePageUrl`，不是直接下载安装包。这个静态页面可以根据平台
展示 Android APK、TestFlight、App Store、应用商店或发布说明链接。后续上架
时，只需要更新版本清单和更新页面，不需要改 App 内更新逻辑。
```

- [ ] **Step 3: Update README feature summary**

In `README.md`, add these bullets to the implemented MVP section after the
remote update bullet:

```md
- 规划支持通用期刊目录：公共目录由维护者审核发布，本地目录由用户在 App 内创建。
- 规划支持目录 JSON 导入导出，收藏记录和目录定义分开备份。
```

- [ ] **Step 4: Run docs grep checks**

Run:

```bash
rg -n "catalogRegistryUrl|updateManifestUrl|updatePageUrl|catalogSources|updateManifestSources" README.md docs mobile/app.json release/version.example.json
```

Expected:
- `catalogSources` appears in `docs/remote-catalog-data.md` and `mobile/app.json`.
- `updateManifestSources` appears in `mobile/app.json`.
- `updatePageUrl` appears in `docs/release-and-updates.md`, `mobile/src/update/versionCheck.ts`, and `release/version.example.json`.
- Old `catalogRegistryUrl` and `updateManifestUrl` only appear as migration notes or not at all.

- [ ] **Step 5: Run full verification**

Run:

```bash
cd mobile
npm test
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit docs**

Run:

```bash
git add README.md docs/remote-catalog-data.md docs/release-and-updates.md
git commit -m "docs: update catalog and release flows"
```

---

### Task 8: Final Manual Preview And Completion Check

**Files:**
- No code files should change in this task unless a previous task left a defect.

- [ ] **Step 1: Run full automated checks**

Run:

```bash
cd mobile
npm test
npm run typecheck
```

Expected:
- All tests pass.
- TypeScript passes with no errors.

- [ ] **Step 2: Start Expo for desktop and phone preview**

Run:

```bash
cd mobile
npm start -- --host lan
```

Expected:
- Expo prints a LAN QR code.
- Desktop preview is reachable.
- Expo Go on a phone on the same Wi-Fi can scan the QR code.

- [ ] **Step 3: Verify local catalog creation on device**

In the running app:

1. Open **工具**.
2. Tap **新建目录**.
3. Enter:
   - `目录 ID`: `comic-world`
   - `名称`: `漫画世界`
   - `总期数`: `12`
   - `期号补零位数`: `3`
   - `封面 URL 规则`: `https://img.example.test/comic-world/{padded}.webp`
4. Save.

Expected:
- The catalog switcher shows `漫画世界` or its short name.
- Selecting it shows 12 generated issues.
- The first issue uses key `comic-world:1` internally and renders a remote cover URL.

- [ ] **Step 4: Verify catalog import and export on device**

In the running app:

1. Open **工具**.
2. Tap **导出目录** while the local catalog is selected.
3. Confirm JSON appears in the text box.
4. Copy the JSON, change the ID to `comic-world-copy`, and paste it back.
5. Tap **导入目录**.

Expected:
- A second local catalog is added.
- The existing catalog is not overwritten.

- [ ] **Step 5: Verify collection backup still works**

In the running app:

1. Mark an issue as **已有**.
2. Open **工具**.
3. Tap **导出收藏**.
4. Confirm the JSON includes `records`.

Expected:
- Existing collection backup behavior still works.

- [ ] **Step 6: Stop Expo and check git status**

Stop Expo with `Ctrl+C`, then run:

```bash
git status --short
```

Expected: clean working tree, except for unrelated user changes that were
already present before implementation.

- [ ] **Step 7: Final report**

Report:

- Automated check results.
- Desktop preview result.
- Phone preview result.
- Any remaining unrelated working-tree changes.

---

## Plan Self-Review

Spec coverage:

- General catalogs beyond `知音漫客`: Tasks 1, 2, 4, and 5.
- Local catalog creation with name, kind, issue count, padding, and cover pattern:
  Tasks 1, 2, and 5.
- Catalog import and export: Tasks 2 and 5.
- Public catalog source fallback: Task 3.
- Update center and future store handoff: Task 6.
- Documentation updates: Task 7.
- Desktop and phone preview requirements: Task 8.

Placeholder scan: no unresolved placeholder markers, deferred implementation
notes, or missing test commands remain in this plan.

Type consistency:

- Local catalogs use `StoredComicCatalogDefinition`.
- Local catalog sources carry the original definition through
  `ComicCatalogSource` so catalog export preserves `coverPattern`.
- Public catalog source fallback uses `CatalogSourceConfig`.
- Update manifest source fallback uses `AppUpdateManifestSource`.
