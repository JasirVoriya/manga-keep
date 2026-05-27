import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeIssueKey } from '../data/catalogHelpers';
import type { ComicIssueKey, IssueCondition, IssueRecord, IssueRecordMap, OwnershipStatus } from '../types';

const STORAGE_KEY = 'manga-keep.collection.v1';
const BACKUP_APP_ID = 'manga-keep';

export const defaultRecord: IssueRecord = {
  status: 'missing',
  condition: 'ungraded',
  note: '',
  updatedAt: '',
};

function isIssueRecord(value: unknown): value is IssueRecord {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Partial<IssueRecord>;
  return (
    typeof record.status === 'string' &&
    typeof record.condition === 'string' &&
    typeof record.note === 'string' &&
    typeof record.updatedAt === 'string'
  );
}

function normalizeRecordKey(key: string): ComicIssueKey | null {
  if (/^[^:]+:\d+$/.test(key)) {
    return key as ComicIssueKey;
  }

  return null;
}

export function normalizeRecordMap(rawRecords: unknown): IssueRecordMap {
  if (!rawRecords || typeof rawRecords !== 'object') {
    return {};
  }

  return Object.entries(rawRecords as Record<string, unknown>).reduce<IssueRecordMap>(
    (next, [rawKey, rawRecord]) => {
      const key = normalizeRecordKey(rawKey);
      if (key && isIssueRecord(rawRecord)) {
        next[key] = rawRecord;
      }
      return next;
    },
    {},
  );
}

export async function loadRecords(): Promise<IssueRecordMap> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    return normalizeRecordMap(JSON.parse(raw));
  } catch {
    return {};
  }
}

export async function saveRecords(records: IssueRecordMap) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function mergeRecord(
  records: IssueRecordMap,
  issueNumber: number,
  patch: Partial<Pick<IssueRecord, 'status' | 'condition' | 'note'>>,
  catalogId: string,
) {
  const key = makeIssueKey(catalogId, issueNumber);
  const current = records[key] ?? defaultRecord;
  return {
    ...records,
    [key]: {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    },
  };
}

export function normalizeStatus(status: OwnershipStatus, condition: IssueCondition) {
  if (status === 'owned' && condition === 'ungraded') {
    return 'good';
  }

  if (status !== 'owned' && condition !== 'ungraded') {
    return 'ungraded';
  }

  return condition;
}

export function exportRecords(records: IssueRecordMap) {
  return JSON.stringify(
    {
      app: BACKUP_APP_ID,
      version: 2,
      exportedAt: new Date().toISOString(),
      records,
    },
    null,
    2,
  );
}

function getWrappedRecords(parsed: unknown) {
  if (!parsed || typeof parsed !== 'object' || !('records' in parsed)) {
    return parsed;
  }

  const envelope = parsed as { app?: unknown; records?: unknown };
  if (envelope.app !== BACKUP_APP_ID) {
    throw new Error(`当前版本只接受 ${BACKUP_APP_ID} 格式备份。`);
  }

  return envelope.records;
}

export function parseImportedRecords(raw: string): IssueRecordMap {
  const parsed = JSON.parse(raw) as unknown;
  const records = getWrappedRecords(parsed);
  const normalized = normalizeRecordMap(records);
  if (
    Object.keys(normalized).length === 0 &&
    records &&
    typeof records === 'object' &&
    Object.keys(records).length > 0
  ) {
    throw new Error('导入内容不是有效的收藏记录 JSON。');
  }

  return normalized;
}
