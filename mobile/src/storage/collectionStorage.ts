import AsyncStorage from '@react-native-async-storage/async-storage';
import type { IssueCondition, IssueRecord, IssueRecordMap, OwnershipStatus } from '../types';

const STORAGE_KEY = 'comic-guests.collection.v1';

export const defaultRecord: IssueRecord = {
  status: 'missing',
  condition: 'ungraded',
  note: '',
  updatedAt: '',
};

export async function loadRecords(): Promise<IssueRecordMap> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as IssueRecordMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
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
) {
  const current = records[issueNumber] ?? defaultRecord;
  return {
    ...records,
    [issueNumber]: {
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
      app: 'comic-guests',
      version: 1,
      exportedAt: new Date().toISOString(),
      records,
    },
    null,
    2,
  );
}

export function parseImportedRecords(raw: string): IssueRecordMap {
  const parsed = JSON.parse(raw) as { records?: IssueRecordMap } | IssueRecordMap;
  const records = 'records' in parsed ? parsed.records : parsed;
  if (!records || typeof records !== 'object') {
    throw new Error('导入内容不是有效的收藏记录 JSON。');
  }

  return records;
}

