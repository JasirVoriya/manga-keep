import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSafeCatalogId } from '../data/catalogHelpers';
import type { ComicCatalogKind, StoredComicCatalogDefinition } from '../types';

const LOCAL_CATALOGS_STORAGE_KEY = 'manga-keep.local-catalogs.v1';
const BACKUP_APP_ID = 'manga-keep';

export type LocalCatalogInput = {
  id: string;
  name: string;
  shortName: string;
  kind: ComicCatalogKind;
  issueCount: string | number;
  numberPadding: string | number;
  coverPattern: string;
};

const catalogKinds: ComicCatalogKind[] = ['magazine', 'series', 'one-shot', 'artbook', 'special'];

function parsePositiveInteger(value: string | number) {
  const parsed = typeof value === 'number' ? value : Number(value.trim());
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function isStoredCatalogDefinition(value: unknown): value is StoredComicCatalogDefinition {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const catalog = value as Partial<StoredComicCatalogDefinition>;
  const hasValidCoverPattern =
    catalog.coverPattern === undefined ||
    (typeof catalog.coverPattern === 'string' &&
      (catalog.coverPattern.includes('{number}') || catalog.coverPattern.includes('{padded}')));
  const hasValidDescription =
    catalog.description === undefined || typeof catalog.description === 'string';

  return (
    catalog.schemaVersion === 1 &&
    isSafeCatalogId(catalog.id) &&
    typeof catalog.name === 'string' &&
    catalog.name.trim().length > 0 &&
    typeof catalog.shortName === 'string' &&
    catalog.shortName.trim().length > 0 &&
    catalogKinds.includes(catalog.kind as ComicCatalogKind) &&
    Number.isInteger(catalog.issueCount) &&
    Number(catalog.issueCount) > 0 &&
    Number.isInteger(catalog.numberPadding) &&
    Number(catalog.numberPadding) > 0 &&
    hasValidDescription &&
    hasValidCoverPattern &&
    typeof catalog.createdAt === 'string' &&
    typeof catalog.updatedAt === 'string'
  );
}

export function normalizeCatalogDefinitions(value: unknown): StoredComicCatalogDefinition[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isStoredCatalogDefinition);
}

export function catalogDefinitionFromInput(
  input: LocalCatalogInput,
  now = new Date().toISOString(),
): StoredComicCatalogDefinition {
  const id = input.id.trim();
  const name = input.name.trim();
  const shortName = input.shortName.trim() || name.slice(0, 3);
  const issueCount = parsePositiveInteger(input.issueCount);
  const numberPadding = parsePositiveInteger(input.numberPadding);
  const coverPattern = input.coverPattern.trim();

  if (!isSafeCatalogId(id)) {
    throw new Error('目录 ID 只能包含字母、数字、下划线和短横线。');
  }

  if (!name) {
    throw new Error('目录名称不能为空。');
  }

  if (!issueCount) {
    throw new Error('总期数必须是大于 0 的整数。');
  }

  if (!numberPadding) {
    throw new Error('期号补零位数必须是大于 0 的整数。');
  }

  if (coverPattern && !coverPattern.includes('{number}') && !coverPattern.includes('{padded}')) {
    throw new Error('封面 URL 规则必须包含 {number} 或 {padded}。');
  }

  return {
    schemaVersion: 1,
    id,
    name,
    shortName,
    kind: input.kind,
    issueCount,
    numberPadding,
    coverPattern: coverPattern || undefined,
    createdAt: now,
    updatedAt: now,
  };
}

export function exportCatalogDefinition(definition: StoredComicCatalogDefinition) {
  return JSON.stringify(
    {
      app: BACKUP_APP_ID,
      type: 'catalog-definition',
      version: 1,
      exportedAt: new Date().toISOString(),
      catalog: definition,
    },
    null,
    2,
  );
}

function getCatalogImportPayload(parsed: unknown) {
  if (isStoredCatalogDefinition(parsed)) {
    return parsed;
  }

  if (!parsed || typeof parsed !== 'object') {
    return parsed;
  }

  const envelope = parsed as { app?: unknown; type?: unknown; version?: unknown; catalog?: unknown };
  if (envelope.type === 'catalog-definition' && envelope.version === 1 && 'catalog' in envelope) {
    if (envelope.app !== BACKUP_APP_ID) {
      throw new Error(`当前版本只接受 ${BACKUP_APP_ID} 格式目录备份。`);
    }

    return envelope.catalog;
  }

  return parsed;
}

export function parseImportedCatalogDefinition(raw: string): StoredComicCatalogDefinition {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error('导入内容不是有效的目录定义 JSON。');
  }

  const catalog = getCatalogImportPayload(parsed);
  if (isStoredCatalogDefinition(catalog)) {
    return catalog;
  }

  throw new Error('导入内容不是有效的目录定义 JSON。');
}

export function findCatalogConflict(
  catalogs: StoredComicCatalogDefinition[],
  catalogId: string,
): StoredComicCatalogDefinition | null {
  return catalogs.find((catalog) => catalog.id === catalogId) ?? null;
}

export async function loadLocalCatalogDefinitions(): Promise<StoredComicCatalogDefinition[]> {
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

export async function upsertLocalCatalogDefinition(
  definition: StoredComicCatalogDefinition,
): Promise<StoredComicCatalogDefinition[]> {
  const current = await loadLocalCatalogDefinitions();
  const nextDefinition = { ...definition, updatedAt: new Date().toISOString() };
  const conflictIndex = current.findIndex((catalog) => catalog.id === definition.id);
  const next =
    conflictIndex >= 0
      ? current.map((catalog, index) => (index === conflictIndex ? nextDefinition : catalog))
      : [...current, nextDefinition];

  await saveLocalCatalogDefinitions(next);
  return next;
}
