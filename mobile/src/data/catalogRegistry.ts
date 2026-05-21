import Constants from 'expo-constants';
import {
  comicCatalogs,
  createNumberedComicIssues,
  DEFAULT_CATALOG_NUMBER_PADDING,
  formatIssueNumber,
  makeIssueKey,
} from './catalogs';
import type {
  ComicCatalog,
  ComicCatalogKind,
  ComicIssue,
  RemoteComicCatalogManifest,
  RemoteComicCatalogRegistry,
  RemoteComicCatalogRegistryEntry,
  RemoteComicIssue,
} from '../types';

const MAX_REGISTRY_REDIRECTS = 3;

type AppExtra = {
  catalogRegistryUrl?: string;
};

const catalogKinds: ComicCatalogKind[] = ['magazine', 'series', 'one-shot', 'artbook', 'special'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isCatalogKind(value: unknown): value is ComicCatalogKind {
  return typeof value === 'string' && catalogKinds.includes(value as ComicCatalogKind);
}

function isRemoteIssue(value: unknown): value is RemoteComicIssue {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.number === 'number' && Number.isInteger(value.number) && value.number > 0;
}

function isRegistryEntry(value: unknown): value is RemoteComicCatalogRegistryEntry {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    typeof value.name === 'string' &&
    value.name.trim().length > 0 &&
    isCatalogKind(value.kind) &&
    typeof value.manifestUrl === 'string' &&
    value.manifestUrl.trim().length > 0
  );
}

export function isRemoteCatalogRegistry(value: unknown): value is RemoteComicCatalogRegistry {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.schemaVersion === 1 &&
    (!('redirectUrl' in value) || typeof value.redirectUrl === 'string') &&
    Array.isArray(value.catalogs) &&
    value.catalogs.every(isRegistryEntry)
  );
}

export function isRemoteCatalogManifest(value: unknown): value is RemoteComicCatalogManifest {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.schemaVersion === 1 &&
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    typeof value.name === 'string' &&
    value.name.trim().length > 0 &&
    isCatalogKind(value.kind) &&
    typeof value.issueCount === 'number' &&
    Number.isInteger(value.issueCount) &&
    value.issueCount > 0 &&
    (!('issues' in value) || (Array.isArray(value.issues) && value.issues.every(isRemoteIssue)))
  );
}

export function getBundledCatalogRegistryUrl() {
  const extra = Constants.expoConfig?.extra as AppExtra | undefined;
  return extra?.catalogRegistryUrl?.trim() ?? '';
}

export function getCatalogRegistryUrl() {
  return getBundledCatalogRegistryUrl();
}

export function resolveRemoteUrl(url: string, baseUrl: string) {
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    throw new Error(`远程地址无效：${url}`);
  }
}

export async function fetchCatalogRegistry(registryUrl: string, redirectCount = 0): Promise<RemoteComicCatalogRegistry> {
  validateUrl(registryUrl);
  const data = await fetchJson(registryUrl);
  if (!isRemoteCatalogRegistry(data)) {
    throw new Error('漫画目录注册表格式无效。');
  }

  const redirectUrl = data.redirectUrl?.trim();
  if (redirectUrl) {
    if (redirectCount >= MAX_REGISTRY_REDIRECTS) {
      throw new Error('漫画目录注册表重定向次数过多。');
    }
    return fetchCatalogRegistry(resolveRemoteUrl(redirectUrl, registryUrl), redirectCount + 1);
  }

  return normalizeRegistry(data, registryUrl);
}

export async function fetchRemoteCatalog(entry: RemoteComicCatalogRegistryEntry, registryUrl: string) {
  const manifestUrl = resolveRemoteUrl(entry.manifestUrl, registryUrl);
  const data = await fetchJson(manifestUrl);
  if (!isRemoteCatalogManifest(data)) {
    throw new Error(`漫画目录格式无效：${entry.name}`);
  }
  return remoteManifestToCatalog(data, manifestUrl);
}

export async function fetchRemoteCatalogs(registryUrl: string) {
  const registry = await fetchCatalogRegistry(registryUrl);
  return Promise.all(registry.catalogs.map((entry) => fetchRemoteCatalog(entry, registryUrl)));
}

export async function loadConfiguredCatalogs(options: { fallbackToBundled?: boolean } = {}) {
  const registryUrl = getCatalogRegistryUrl();
  const fallbackToBundled = options.fallbackToBundled ?? true;

  if (!registryUrl) {
    return fallbackToBundled ? comicCatalogs : [];
  }

  try {
    const remoteCatalogs = await fetchRemoteCatalogs(registryUrl);
    return remoteCatalogs.length > 0 || !fallbackToBundled ? remoteCatalogs : comicCatalogs;
  } catch (error) {
    if (fallbackToBundled) {
      return comicCatalogs;
    }
    throw error;
  }
}

export function remoteManifestToCatalog(manifest: RemoteComicCatalogManifest, manifestUrl: string): ComicCatalog {
  const numberPadding = manifest.numberPadding ?? DEFAULT_CATALOG_NUMBER_PADDING;
  const explicitIssueMap = new Map((manifest.issues ?? []).map((issue) => [issue.number, issue]));
  const issues = createNumberedComicIssues({
    catalogId: manifest.id,
    catalogName: manifest.name,
    issueCount: manifest.issueCount,
    numberPadding,
    coverUrlForIssue: (issueNumber, paddedIssueNumber) => {
      const explicitIssue = explicitIssueMap.get(issueNumber);
      if (explicitIssue?.coverUrl) {
        return resolveCoverUrl(explicitIssue.coverUrl, manifest.coverBaseUrl ?? manifestUrl);
      }

      if (!manifest.coverPattern) {
        return undefined;
      }

      const patternedPath = manifest.coverPattern
        .split('{number}')
        .join(String(issueNumber))
        .split('{padded}')
        .join(paddedIssueNumber);
      return resolveCoverUrl(patternedPath, manifest.coverBaseUrl ?? manifestUrl);
    },
  }).map((issue) => applyRemoteIssueOverrides(issue, explicitIssueMap.get(issue.number), manifest.name, numberPadding));

  return {
    id: manifest.id,
    name: manifest.name,
    shortName: manifest.shortName ?? manifest.name,
    kind: manifest.kind,
    description: manifest.description,
    issueCount: manifest.issueCount,
    numberPadding,
    source: {
      type: 'remote',
      manifestUrl,
    },
    issues,
  };
}

function applyRemoteIssueOverrides(
  issue: ComicIssue,
  remoteIssue: RemoteComicIssue | undefined,
  catalogName: string,
  numberPadding: number,
): ComicIssue {
  if (!remoteIssue) {
    return issue;
  }

  const padded = formatIssueNumber(remoteIssue.number, numberPadding);
  return {
    ...issue,
    key: makeIssueKey(issue.catalogId, remoteIssue.number),
    number: remoteIssue.number,
    sortNumber: remoteIssue.sortNumber ?? remoteIssue.number,
    label: remoteIssue.label ?? `第${padded}期`,
    displayTitle: remoteIssue.displayTitle ?? `${catalogName} ${padded}`,
  };
}

function normalizeRegistry(registry: RemoteComicCatalogRegistry, registryUrl: string): RemoteComicCatalogRegistry {
  return {
    ...registry,
    catalogs: registry.catalogs.map((entry) => ({
      ...entry,
      id: entry.id.trim(),
      name: entry.name.trim(),
      shortName: entry.shortName?.trim(),
      description: entry.description?.trim(),
      manifestUrl: resolveRemoteUrl(entry.manifestUrl.trim(), registryUrl),
    })),
  };
}

function resolveCoverUrl(coverUrl: string, baseUrl: string) {
  return resolveRemoteUrl(coverUrl.trim(), baseUrl);
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`远程数据请求失败：${response.status}`);
  }

  return response.json() as Promise<unknown>;
}

function validateUrl(url: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('远程数据地址必须是 HTTP 或 HTTPS 地址。');
  }
}
