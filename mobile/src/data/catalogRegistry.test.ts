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
