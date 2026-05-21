import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isRemoteCatalogManifest,
  isRemoteCatalogRegistry,
  isPlaceholderCatalogRegistryUrl,
  remoteManifestToCatalog,
  resolveRemoteUrl,
} from './catalogRegistry';

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

  it('rejects catalog entries with invalid optional fields', () => {
    assert.equal(
      isRemoteCatalogRegistry({
        schemaVersion: 1,
        catalogs: [
          {
            id: 'bad',
            name: 'Bad',
            shortName: 123,
            kind: 'magazine',
            description: false,
            manifestUrl: 'https://example.com/catalogs/bad/manifest.v1.json',
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

  it('resolves explicit issue cover URLs from the cover base URL', () => {
    const catalog = remoteManifestToCatalog(
      {
        schemaVersion: 1,
        id: 'demo-comic',
        name: '测试漫画',
        kind: 'series',
        issueCount: 1,
        coverBaseUrl: '../covers/demo-comic/',
        issues: [
          {
            number: 1,
            coverUrl: 'special/issue-1.webp',
          },
        ],
      },
      'https://example.com/catalogs/demo-comic/manifest.v1.json',
    );

    assert.equal(catalog.issues[0].coverUrl, 'https://example.com/catalogs/covers/demo-comic/special/issue-1.webp');
  });

  it('rejects manifests with invalid optional manifest fields', () => {
    assert.equal(
      isRemoteCatalogManifest({
        schemaVersion: 1,
        id: 'demo-comic',
        name: '测试漫画',
        shortName: 123,
        kind: 'series',
        issueCount: 1,
      }),
      false,
    );

    assert.equal(
      isRemoteCatalogManifest({
        schemaVersion: 1,
        id: 'demo-comic',
        name: '测试漫画',
        kind: 'series',
        issueCount: 1,
        coverPattern: false,
      }),
      false,
    );

    assert.equal(
      isRemoteCatalogManifest({
        schemaVersion: 1,
        id: 'demo-comic',
        name: '测试漫画',
        kind: 'series',
        issueCount: 1,
        numberPadding: 0,
      }),
      false,
    );
  });

  it('rejects manifests with invalid optional issue fields', () => {
    assert.equal(
      isRemoteCatalogManifest({
        schemaVersion: 1,
        id: 'demo-comic',
        name: '测试漫画',
        kind: 'series',
        issueCount: 1,
        issues: [
          {
            number: 1,
            label: 5,
          },
        ],
      }),
      false,
    );

    assert.equal(
      isRemoteCatalogManifest({
        schemaVersion: 1,
        id: 'demo-comic',
        name: '测试漫画',
        kind: 'series',
        issueCount: 1,
        issues: [
          {
            number: 1,
            sortNumber: 0,
          },
        ],
      }),
      false,
    );
  });

  it('resolves relative URLs from the current document URL', () => {
    assert.equal(
      resolveRemoteUrl('../catalogs/demo/manifest.v1.json', 'https://example.com/registry/index.v1.json'),
      'https://example.com/catalogs/demo/manifest.v1.json',
    );
  });

  it('treats obvious registry URL placeholders as unconfigured', () => {
    assert.equal(isPlaceholderCatalogRegistryUrl(''), true);
    assert.equal(isPlaceholderCatalogRegistryUrl('   '), true);
    assert.equal(isPlaceholderCatalogRegistryUrl('https://raw.githubusercontent.com/YOUR_NAME/catalogs/main/index.json'), true);
    assert.equal(isPlaceholderCatalogRegistryUrl('https://example.com/catalogs/index.json'), false);
  });
});
