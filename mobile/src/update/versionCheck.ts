export type AppUpdateManifest = {
  latestVersion: string;
  minimumVersion?: string;
  title?: string;
  message?: string;
  updatePageUrl?: string;
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
  iosUrl?: string;
  androidUrl?: string;
  downloadUrl?: string;
  releaseNotesUrl?: string;
};

export type AppUpdateManifestSource = {
  id: string;
  manifestUrl: string;
  priority?: number;
};

export type AppUpdateInfo = AppUpdateManifest & {
  currentVersion: string;
  forceUpdate: boolean;
  sourceId?: string;
};

type AppExtra = {
  updateManifestUrl?: string;
  updateManifestSources?: AppUpdateManifestSource[];
};

type ExpoConfig = {
  version?: string;
  extra?: unknown;
};

type ExpoConstantsModule = {
  default?: {
    expoConfig?: ExpoConfig;
  };
  expoConfig?: ExpoConfig;
};

declare const require: undefined | ((moduleId: string) => ExpoConstantsModule);

let expoConfigOverride: ExpoConfig | null | undefined;

export function setUpdateExpoConfigForTests(config: ExpoConfig | null) {
  expoConfigOverride = config;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeVersion(version: string) {
  return version
    .split('.')
    .map((part) => Number.parseInt(part.replace(/[^\d].*$/, ''), 10))
    .map((part) => (Number.isFinite(part) ? part : 0));
}

export function compareVersions(left: string, right: string) {
  const leftParts = normalizeVersion(left);
  const rightParts = normalizeVersion(right);
  const maxLength = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftPart = leftParts[index] ?? 0;
    const rightPart = rightParts[index] ?? 0;
    if (leftPart > rightPart) {
      return 1;
    }
    if (leftPart < rightPart) {
      return -1;
    }
  }

  return 0;
}

export function getCurrentAppVersion() {
  return getExpoConfig()?.version ?? '1.0.0';
}

export function getUpdateManifestUrl() {
  const extra = getExpoConfig()?.extra as AppExtra | undefined;
  return extra?.updateManifestUrl?.trim() ?? '';
}

export function isPlaceholderUpdateManifestUrl(url: string) {
  const normalizedUrl = url.trim();
  if (normalizedUrl.length === 0) {
    return true;
  }

  const lowerUrl = normalizedUrl.toLowerCase();
  return (
    lowerUrl.includes('your_name') ||
    lowerUrl.includes('your-name') ||
    lowerUrl.includes('your_repo') ||
    lowerUrl.includes('your-repo') ||
    lowerUrl.includes('example.com')
  );
}

function normalizeManifestUrl(url: string) {
  const trimmedUrl = url.trim();
  if (isPlaceholderUpdateManifestUrl(trimmedUrl)) {
    return '';
  }

  try {
    const parsedUrl = new URL(trimmedUrl);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:' ? parsedUrl.toString() : '';
  } catch {
    return '';
  }
}

export function getUpdateManifestSources() {
  const extra = getExpoConfig()?.extra as AppExtra | undefined;
  const sources = Array.isArray(extra?.updateManifestSources) ? extra.updateManifestSources : [];
  const validSources = sources
    .filter((source): source is AppUpdateManifestSource => {
      if (!isRecord(source)) {
        return false;
      }

      return (
        typeof source.id === 'string' &&
        source.id.trim().length > 0 &&
        typeof source.manifestUrl === 'string' &&
        normalizeManifestUrl(source.manifestUrl).length > 0 &&
        (!('priority' in source) || typeof source.priority === 'number')
      );
    })
    .map((source, index) => ({
      id: source.id.trim(),
      manifestUrl: normalizeManifestUrl(source.manifestUrl),
      priority: source.priority,
      index,
    }))
    .sort((first, second) => (first.priority ?? Number.MAX_SAFE_INTEGER) - (second.priority ?? Number.MAX_SAFE_INTEGER) || first.index - second.index)
    .map(({ id, manifestUrl, priority }) => ({ id, manifestUrl, priority }));

  if (validSources.length > 0) {
    return validSources;
  }

  const legacyUrl = normalizeManifestUrl(getUpdateManifestUrl());
  return legacyUrl ? [{ id: 'legacy', manifestUrl: legacyUrl, priority: 1 }] : [];
}

function getExpoConfig() {
  if (expoConfigOverride !== undefined) {
    return expoConfigOverride ?? undefined;
  }

  try {
    if (typeof require !== 'function') {
      return undefined;
    }

    const constantsModule = require('expo-constants');
    return constantsModule.default?.expoConfig ?? constantsModule.expoConfig;
  } catch {
    return undefined;
  }
}

export function isAppUpdateManifest(value: unknown): value is AppUpdateManifest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const manifest = value as Partial<AppUpdateManifest>;
  return (
    typeof manifest.latestVersion === 'string' &&
    manifest.latestVersion.trim().length > 0 &&
    (!('updatePageUrl' in manifest) || typeof manifest.updatePageUrl === 'string') &&
    (!('platforms' in manifest) || isUpdatePlatformLinks(manifest.platforms))
  );
}

function isUpdatePlatformLinks(value: unknown) {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (!('android' in value) || isAndroidLinks(value.android)) &&
    (!('ios' in value) || isIosLinks(value.ios))
  );
}

function isAndroidLinks(value: unknown) {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (!('apkUrl' in value) || typeof value.apkUrl === 'string') &&
    (!('storeUrl' in value) || typeof value.storeUrl === 'string')
  );
}

function isIosLinks(value: unknown) {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (!('testFlightUrl' in value) || typeof value.testFlightUrl === 'string') &&
    (!('appStoreUrl' in value) || typeof value.appStoreUrl === 'string')
  );
}

export async function fetchUpdateManifest(manifestUrl: string): Promise<AppUpdateManifest> {
  const validManifestUrl = normalizeManifestUrl(manifestUrl);
  if (!validManifestUrl) {
    throw new Error('Version manifest URL is not configured.');
  }

  const response = await fetch(validManifestUrl, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Version manifest request failed: ${response.status}`);
  }

  const data = await response.json();
  if (!isAppUpdateManifest(data)) {
    throw new Error('Version manifest is invalid.');
  }

  return data;
}

export async function fetchUpdateManifestFromSources(
  sources: AppUpdateManifestSource[],
): Promise<{ manifest: AppUpdateManifest; sourceId: string } | null> {
  const prioritizedSources = sources
    .map((source, index) => ({
      id: source.id.trim(),
      manifestUrl: normalizeManifestUrl(source.manifestUrl),
      priority: source.priority,
      index,
    }))
    .filter((source) => source.id.length > 0 && source.manifestUrl.length > 0)
    .sort((first, second) => (first.priority ?? Number.MAX_SAFE_INTEGER) - (second.priority ?? Number.MAX_SAFE_INTEGER) || first.index - second.index);

  for (const source of prioritizedSources) {
    try {
      return {
        manifest: await fetchUpdateManifest(source.manifestUrl),
        sourceId: source.id,
      };
    } catch {
      // Try the next configured source.
    }
  }

  return null;
}

function createUpdateInfo(data: AppUpdateManifest, currentVersion: string, sourceId?: string): AppUpdateInfo | null {
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
    sourceId,
  };
}

export async function checkForAppUpdate(
  manifestUrl?: string,
  currentVersion = getCurrentAppVersion(),
): Promise<AppUpdateInfo | null> {
  const validManifestUrl = manifestUrl === undefined ? '' : normalizeManifestUrl(manifestUrl);
  if (validManifestUrl) {
    return createUpdateInfo(await fetchUpdateManifest(validManifestUrl), currentVersion);
  }

  if (manifestUrl !== undefined) {
    return null;
  }

  const result = await fetchUpdateManifestFromSources(getUpdateManifestSources());
  if (!result) {
    return null;
  }

  return createUpdateInfo(result.manifest, currentVersion, result.sourceId);
}
