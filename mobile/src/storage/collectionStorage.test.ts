import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeRecordMap, parseImportedRecords } from './collectionStorage';
import type { IssueRecord } from '../types';

const validRecord: IssueRecord = {
  status: 'owned',
  condition: 'good',
  note: 'bagged',
  updatedAt: '2026-05-22T00:00:00.000Z',
};

describe('collection storage record normalization', () => {
  it('migrates legacy numeric record keys to the default catalog', () => {
    assert.deepEqual(normalizeRecordMap({ 128: validRecord }), {
      'zhiyin-manke:128': validRecord,
    });
  });

  it('preserves already-qualified record keys', () => {
    assert.deepEqual(normalizeRecordMap({ 'zhiyin-manke:128': validRecord }), {
      'zhiyin-manke:128': validRecord,
    });
  });

  it('ignores invalid record values', () => {
    assert.deepEqual(normalizeRecordMap({ 128: { ...validRecord, updatedAt: null } }), {});
  });

  it('migrates imported wrapped legacy records', () => {
    assert.deepEqual(parseImportedRecords(JSON.stringify({ records: { 1: validRecord } })), {
      'zhiyin-manke:1': validRecord,
    });
  });
});
