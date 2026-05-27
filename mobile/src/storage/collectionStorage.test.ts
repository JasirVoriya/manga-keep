import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { exportRecords, normalizeRecordMap, parseImportedRecords } from './collectionStorage';
import type { IssueRecord } from '../types';

const validRecord: IssueRecord = {
  status: 'owned',
  condition: 'good',
  note: 'bagged',
  updatedAt: '2026-05-22T00:00:00.000Z',
};

describe('collection storage record normalization', () => {
  it('rejects legacy numeric record keys instead of migrating them', () => {
    assert.deepEqual(normalizeRecordMap({ 128: validRecord }), {});
  });

  it('preserves already-qualified record keys', () => {
    assert.deepEqual(normalizeRecordMap({ 'zhiyin-manke:128': validRecord }), {
      'zhiyin-manke:128': validRecord,
    });
  });

  it('ignores invalid record values', () => {
    assert.deepEqual(normalizeRecordMap({ 'zhiyin-manke:128': { ...validRecord, updatedAt: null } }), {});
  });

  it('exports MangaKeep backup envelopes', () => {
    const exported = JSON.parse(exportRecords({ 'zhiyin-manke:128': validRecord })) as {
      app: string;
      version: number;
      records: unknown;
    };

    assert.equal(exported.app, 'manga-keep');
    assert.equal(exported.version, 2);
    assert.deepEqual(exported.records, { 'zhiyin-manke:128': validRecord });
  });

  it('imports wrapped MangaKeep records', () => {
    assert.deepEqual(
      parseImportedRecords(JSON.stringify({ app: 'manga-keep', records: { 'zhiyin-manke:1': validRecord } })),
      {
        'zhiyin-manke:1': validRecord,
      },
    );
  });

  it('rejects legacy manga-shelf backup envelopes', () => {
    assert.throws(
      () => parseImportedRecords(JSON.stringify({ app: 'manga-shelf', records: { 'zhiyin-manke:1': validRecord } })),
      /当前版本只接受 manga-keep 格式备份/,
    );
  });
});
