import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  checkForAppUpdate,
  compareVersions,
  fetchUpdateManifestFromSources,
  getUpdateManifestSources,
  isPlaceholderUpdateManifestUrl,
  setUpdateExpoConfigForTests,
  type AppUpdateManifestSource,
} from './versionCheck';

function withFetch<T>(fetchMock: typeof fetch, callback: () => Promise<T>) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchMock;

  return callback().finally(() => {
    globalThis.fetch = originalFetch;
  });
}

function setExpoExtra(extra: unknown) {
  setUpdateExpoConfigForTests({
    extra,
    version: '1.0.0',
  });
}

describe('version comparison', () => {
  it('compares semantic-like versions', () => {
    assert.equal(compareVersions('1.2.0', '1.1.9'), 1);
    assert.equal(compareVersions('1.2.0', '1.2'), 0);
    assert.equal(compareVersions('1.2.0-beta.1', '1.2.1'), -1);
  });
});

describe('update manifest sources', () => {
  it('filters placeholders and sorts configured update manifest sources', () => {
    setExpoExtra({
      updateManifestSources: [
        {
          id: 'placeholder',
          manifestUrl: 'https://raw.githubusercontent.com/YOUR_NAME/YOUR_REPO/main/release/version.json',
          priority: 1,
        },
        {
          id: 'github',
          manifestUrl: 'https://raw.githubusercontent.com/acme/app/main/release/version.json',
          priority: 3,
        },
        {
          id: 'gitee',
          manifestUrl: 'https://gitee.com/acme/app/raw/main/release/version.json',
          priority: 2,
        },
      ],
    });

    assert.deepEqual(getUpdateManifestSources(), [
      {
        id: 'gitee',
        manifestUrl: 'https://gitee.com/acme/app/raw/main/release/version.json',
        priority: 2,
      },
      {
        id: 'github',
        manifestUrl: 'https://raw.githubusercontent.com/acme/app/main/release/version.json',
        priority: 3,
      },
    ]);
    assert.equal(isPlaceholderUpdateManifestUrl('https://example.com/release/version.json'), true);
    assert.equal(isPlaceholderUpdateManifestUrl('https://gitee.com/acme/app/raw/main/release/version.json'), false);
  });

  it('falls back to the legacy single configured URL when sources are absent', () => {
    setExpoExtra({
      updateManifestUrl: 'https://gitee.com/acme/app/raw/main/release/version.json',
    });

    assert.deepEqual(getUpdateManifestSources(), [
      {
        id: 'legacy',
        manifestUrl: 'https://gitee.com/acme/app/raw/main/release/version.json',
        priority: 1,
      },
    ]);
  });

  it('returns no sources when all configured URLs are placeholders', () => {
    setExpoExtra({
      updateManifestSources: [
        {
          id: 'github',
          manifestUrl: 'https://raw.githubusercontent.com/YOUR_NAME/YOUR_REPO/main/release/version.json',
          priority: 1,
        },
      ],
      updateManifestUrl: 'https://gitee.com/YOUR_NAME/manga-keep/raw/master/release/version.json',
    });

    assert.deepEqual(getUpdateManifestSources(), []);
  });
});

describe('update manifest fetching', () => {
  it('checks for updates from a single explicit URL', async () => {
    await withFetch(
      async (input) => {
        assert.equal(input.toString(), 'https://updates.example.test/version.json');
        return Response.json({
          latestVersion: '1.2.0',
          minimumVersion: '1.1.0',
          title: '发现新版本',
          updatePageUrl: 'https://updates.example.test/app',
          platforms: {
            android: {
              apkUrl: 'https://updates.example.test/app.apk',
              storeUrl: 'https://play.google.com/store/apps/details?id=com.example.app',
            },
            ios: {
              testFlightUrl: 'https://testflight.apple.com/join/abc',
              appStoreUrl: 'https://apps.apple.com/app/id123',
            },
          },
        });
      },
      async () => {
        const result = await checkForAppUpdate('https://updates.example.test/version.json', '1.0.0');

        assert.equal(result?.latestVersion, '1.2.0');
        assert.equal(result?.currentVersion, '1.0.0');
        assert.equal(result?.forceUpdate, true);
        assert.equal(result?.updatePageUrl, 'https://updates.example.test/app');
        assert.equal(result?.platforms?.android?.storeUrl, 'https://play.google.com/store/apps/details?id=com.example.app');
        assert.equal(result?.platforms?.ios?.appStoreUrl, 'https://apps.apple.com/app/id123');
        assert.equal(result?.sourceId, undefined);
      },
    );
  });

  it('tries the next source after request or manifest failures', async () => {
    const requestedUrls: string[] = [];
    const sources: AppUpdateManifestSource[] = [
      {
        id: 'offline',
        manifestUrl: 'https://offline.example.test/version.json',
        priority: 1,
      },
      {
        id: 'invalid',
        manifestUrl: 'https://invalid.example.test/version.json',
        priority: 2,
      },
      {
        id: 'good',
        manifestUrl: 'https://updates.example.test/version.json',
        priority: 3,
      },
    ];

    await withFetch(
      async (input) => {
        const url = input.toString();
        requestedUrls.push(url);

        if (url === 'https://offline.example.test/version.json') {
          return new Response('not found', { status: 404 });
        }

        if (url === 'https://invalid.example.test/version.json') {
          return Response.json({ message: 'missing latestVersion' });
        }

        return Response.json({
          latestVersion: '1.3.0',
          minimumVersion: '1.0.0',
          updatePageUrl: 'https://updates.example.test/app',
        });
      },
      async () => {
        const result = await fetchUpdateManifestFromSources(sources);

        assert.equal(result?.sourceId, 'good');
        assert.equal(result?.manifest.latestVersion, '1.3.0');
        assert.deepEqual(requestedUrls, [
          'https://offline.example.test/version.json',
          'https://invalid.example.test/version.json',
          'https://updates.example.test/version.json',
        ]);
      },
    );
  });

  it('returns update info from the first configured source that works', async () => {
    setExpoExtra({
      updateManifestSources: [
        {
          id: 'bad',
          manifestUrl: 'https://bad.example.test/version.json',
          priority: 1,
        },
        {
          id: 'good',
          manifestUrl: 'https://updates.example.test/version.json',
          priority: 2,
        },
      ],
    });

    await withFetch(
      async (input) => {
        const url = input.toString();

        if (url === 'https://bad.example.test/version.json') {
          return new Response('not found', { status: 404 });
        }

        return Response.json({
          latestVersion: '1.2.0',
          minimumVersion: '1.1.0',
          updatePageUrl: 'https://updates.example.test/app',
          platforms: {
            android: {
              apkUrl: 'https://updates.example.test/app.apk',
            },
          },
        });
      },
      async () => {
        const result = await checkForAppUpdate(undefined, '1.0.0');

        assert.equal(result?.sourceId, 'good');
        assert.equal(result?.forceUpdate, true);
        assert.equal(result?.updatePageUrl, 'https://updates.example.test/app');
        assert.equal(result?.platforms?.android?.apkUrl, 'https://updates.example.test/app.apk');
      },
    );
  });

  it('returns null when the explicit URL is a placeholder or no sources are configured', async () => {
    setExpoExtra({
      updateManifestSources: [],
      updateManifestUrl: 'https://example.com/version.json',
    });

    const result = await checkForAppUpdate('https://raw.githubusercontent.com/YOUR_NAME/YOUR_REPO/main/version.json', '1.0.0');
    assert.equal(result, null);
    assert.equal(await checkForAppUpdate(undefined, '1.0.0'), null);
  });
});
