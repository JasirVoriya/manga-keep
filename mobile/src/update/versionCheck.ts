import Constants from 'expo-constants';

export type AppUpdateManifest = {
  latestVersion: string;
  minimumVersion?: string;
  title?: string;
  message?: string;
  iosUrl?: string;
  androidUrl?: string;
  downloadUrl?: string;
  releaseNotesUrl?: string;
};

export type AppUpdateInfo = AppUpdateManifest & {
  currentVersion: string;
  forceUpdate: boolean;
};

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
  return Constants.expoConfig?.version ?? '1.0.0';
}

export function getUpdateManifestUrl() {
  const extra = Constants.expoConfig?.extra as { updateManifestUrl?: string } | undefined;
  return extra?.updateManifestUrl?.trim() ?? '';
}

function isManifest(value: unknown): value is AppUpdateManifest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const manifest = value as Partial<AppUpdateManifest>;
  return typeof manifest.latestVersion === 'string' && manifest.latestVersion.trim().length > 0;
}

export async function checkForAppUpdate(manifestUrl = getUpdateManifestUrl()): Promise<AppUpdateInfo | null> {
  if (!manifestUrl) {
    return null;
  }

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

  const currentVersion = getCurrentAppVersion();
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
  };
}
