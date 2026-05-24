import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';
import type { ComicCatalog, StoredComicCatalogDefinition } from '../types';
import { createNumberedComicIssues } from './catalogHelpers';
import type { loadCatalogStore as loadCatalogStoreType, mergeCatalogLists as mergeCatalogListsType } from './catalogStore';

const require = createRequire(import.meta.url);
require.extensions['.jpg'] = (module) => {
  module.exports = 1;
};
const { mergeCatalogLists } = require('./catalogStore') as {
  mergeCatalogLists: typeof mergeCatalogListsType;
};
const { loadCatalogStore } = require('./catalogStore') as {
  loadCatalogStore: typeof loadCatalogStoreType;
};

const timestamp = '2026-05-23T00:00:00.000Z';

function localDefinition(id: string): StoredComicCatalogDefinition {
  return {
    schemaVersion: 1,
    id,
    name: `${id} local`,
    shortName: id,
    kind: 'magazine',
    issueCount: 1,
    numberPadding: 3,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function catalog(id: string, source: ComicCatalog['source']): ComicCatalog {
  return {
    id,
    name: id,
    shortName: id,
    kind: 'magazine',
    issueCount: 1,
    numberPadding: 3,
    source,
    issues: createNumberedComicIssues({
      catalogId: id,
      catalogName: id,
      issueCount: 1,
      numberPadding: 3,
    }),
  };
}

describe('catalog store aggregation', () => {
  it('keeps local catalogs before public catalogs', () => {
    const catalogs = mergeCatalogLists({
      localCatalogs: [catalog('local-a', { type: 'local', definition: localDefinition('local-a') })],
      publicCatalogs: [catalog('public-a', { type: 'remote', manifestUrl: 'https://example.test/public-a.json' })],
      bundledCatalogs: [],
    });

    assert.deepEqual(
      catalogs.map((item) => item.id),
      ['local-a', 'public-a'],
    );
  });

  it('lets local catalogs override public catalogs with the same ID', () => {
    const catalogs = mergeCatalogLists({
      localCatalogs: [catalog('same-id', { type: 'local', definition: localDefinition('same-id') })],
      publicCatalogs: [catalog('same-id', { type: 'remote', manifestUrl: 'https://example.test/same-id.json' })],
      bundledCatalogs: [],
    });

    assert.equal(catalogs.length, 1);
    assert.equal(catalogs[0].source.type, 'local');
  });

  it('uses bundled catalogs when public and local lists are empty', () => {
    const bundledCatalog = catalog('bundled-a', { type: 'bundled' });
    const catalogs = mergeCatalogLists({
      localCatalogs: [],
      publicCatalogs: [],
      bundledCatalogs: [bundledCatalog],
    });

    assert.deepEqual(
      catalogs.map((item) => item.id),
      [bundledCatalog.id],
    );
  });

  it('still returns public catalogs when local catalog loading fails', async () => {
    const publicCatalog = catalog('public-a', {
      type: 'remote',
      manifestUrl: 'https://example.test/public-a.json',
    });

    const result = await loadCatalogStore({
      loadLocalDefinitions: async () => {
        throw new Error('local storage unavailable');
      },
      loadPublicCatalogs: async () => [publicCatalog],
    });

    assert.equal(result.publicCatalogLoadFailed, false);
    assert.deepEqual(
      result.catalogs.map((item) => item.id),
      ['public-a'],
    );
  });
});
