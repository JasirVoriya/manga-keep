import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createNumberedComicIssues, isSafeCatalogId, makeIssueKey } from './catalogHelpers';

describe('catalog helpers', () => {
  it('creates stable issue keys', () => {
    const issues = createNumberedComicIssues({
      catalogId: 'demo',
      catalogName: '测试漫画',
      issueCount: 3,
      numberPadding: 2,
    });

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
});
