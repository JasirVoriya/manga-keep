import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

declare const require: {
  extensions: Record<string, (module: { exports: unknown }) => void>;
};

require.extensions['.jpg'] = (module) => {
  module.exports = 'test-image';
};

describe('catalog helpers', () => {
  it('creates stable issue keys', async () => {
    const { createNumberedComicIssues, makeIssueKey } = await import('./catalogs');
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
