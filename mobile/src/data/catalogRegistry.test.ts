import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CatalogSourceConfig } from '../types';
import {
  fetchRemoteCatalog,
  fetchRemoteCatalogsFromSources,
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

  it('rejects catalog entries with unsafe IDs', () => {
    for (const id of ['foo:bar', 'foo/bar', 'foo bar']) {
      assert.equal(
        isRemoteCatalogRegistry({
          schemaVersion: 1,
          catalogs: [
            {
              id,
              name: 'Bad',
              kind: 'magazine',
              manifestUrl: 'https://example.com/catalogs/bad/manifest.v1.json',
            },
          ],
        }),
        false,
      );
    }
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

  it('rejects manifests with unsafe IDs', () => {
    for (const id of ['foo:bar', 'foo/bar', 'foo bar']) {
      assert.equal(
        isRemoteCatalogManifest({
          schemaVersion: 1,
          id,
          name: 'Bad',
          kind: 'series',
          issueCount: 1,
        }),
        false,
      );
    }
  });

  it('rejects non-HTTP manifest URLs after registry resolution', async () => {
    for (const manifestUrl of ['file:///tmp/manifest.v1.json', 'javascript:alert(1)']) {
      await assert.rejects(
        () =>
          fetchRemoteCatalog(
            {
              id: 'demo-comic',
              name: 'Demo',
              kind: 'series',
              manifestUrl,
            },
            'https://example.com/registry/index.v1.json',
          ),
        /HTTP/,
      );
    }
  });

  it('rejects non-HTTP cover URLs after manifest resolution', () => {
    for (const coverUrl of ['file:///tmp/cover.webp', 'javascript:alert(1)']) {
      assert.throws(
        () =>
          remoteManifestToCatalog(
            {
              schemaVersion: 1,
              id: 'demo-comic',
              name: '测试漫画',
              kind: 'series',
              issueCount: 1,
              issues: [
                {
                  number: 1,
                  coverUrl,
                },
              ],
            },
            'https://example.com/catalogs/demo-comic/manifest.v1.json',
          ),
        /HTTP/,
      );
    }
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

describe('remote catalog source fallback', () => {
  it('loads catalogs from the first available source by priority', async () => {
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
      const url = input.toString();

      if (url === 'https://bad.example.test/registry/index.v1.json') {
        return new Response('not found', { status: 404 });
      }

      if (url === 'https://good.example.test/registry/index.v1.json') {
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

      if (url === 'https://good.example.test/catalogs/demo-comic/manifest.v1.json') {
        return Response.json({
          schemaVersion: 1,
          id: 'demo-comic',
          name: '测试漫画',
          kind: 'series',
          issueCount: 1,
        });
      }

      return new Response('not found', { status: 404 });
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
