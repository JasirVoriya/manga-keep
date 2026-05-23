import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { StoredComicCatalogDefinition } from '../types';
import {
  createCatalogFromDefinition,
  createNumberedComicIssues,
  expandCoverPattern,
  isSafeCatalogId,
  makeIssueKey,
} from './catalogHelpers';

describe('catalog helpers', () => {
  it('creates stable issue keys', () => {
    const issues = createNumberedComicIssues({
      catalogId: 'demo',
      catalogName: '测试漫画',
      issueCount: 3,
      numberPadding: 2,
    });

    assert.equal(makeIssueKey('demo', 1), 'demo:1');
    assert.equal(issues[0].key, makeIssueKey('demo', 1));
    assert.equal(issues[0].label, '第01期');
    assert.equal(issues[2].displayTitle, '测试漫画 03');
  });

  it('validates catalog IDs safe for storage keys', () => {
    for (const id of ['zhiyin-manke', 'Demo_2026', 'ABC-123']) {
      assert.equal(isSafeCatalogId(id), true);
    }

    for (const id of ['', 'foo:bar', 'foo/bar', 'foo bar']) {
      assert.equal(isSafeCatalogId(id), false);
    }
  });

  it('expands cover URL patterns with raw and padded issue numbers', () => {
    assert.equal(
      expandCoverPattern('https://img.example.test/{padded}.webp', 7, 3),
      'https://img.example.test/007.webp'
    );
    assert.equal(
      expandCoverPattern('https://img.example.test/issue-{number}.webp', 7, 3),
      'https://img.example.test/issue-7.webp'
    );
  });

  it('creates catalogs from local stored definitions', () => {
    const definition: StoredComicCatalogDefinition = {
      schemaVersion: 1,
      id: 'comic-world',
      name: '漫画世界',
      shortName: '漫世',
      kind: 'magazine',
      issueCount: 2,
      numberPadding: 3,
      coverPattern: 'https://img.example.test/comic-world/{padded}.webp',
      createdAt: '2026-05-23T00:00:00.000Z',
      updatedAt: '2026-05-23T00:00:00.000Z',
    };

    const catalog = createCatalogFromDefinition(definition);

    assert.equal(catalog.source.type, 'local');
    assert.equal(catalog.issues.length, 2);
    assert.equal(catalog.issues[0].coverUrl, 'https://img.example.test/comic-world/001.webp');
    assert.equal(catalog.issues[1].displayTitle, '漫画世界 002');
  });
});
