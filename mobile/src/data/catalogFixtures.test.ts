import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createNumberedComicIssues, makeIssueKey } from './catalogHelpers';

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
});
