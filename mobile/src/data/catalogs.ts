import type { ComicCatalog } from '../types';
import { createNumberedComicIssues, DEFAULT_CATALOG_NUMBER_PADDING } from './catalogHelpers';
import { coverSources } from './coverSources.generated';
import { DEFAULT_CATALOG_ID, DEFAULT_CATALOG_ISSUE_COUNT, DEFAULT_CATALOG_NAME } from './defaultCatalogConstants';

export { createNumberedComicIssues, DEFAULT_CATALOG_NUMBER_PADDING, formatIssueNumber, makeIssueKey } from './catalogHelpers';
export { DEFAULT_CATALOG_ID, DEFAULT_CATALOG_ISSUE_COUNT, DEFAULT_CATALOG_NAME } from './defaultCatalogConstants';

export const defaultCatalog: ComicCatalog = {
  id: DEFAULT_CATALOG_ID,
  name: DEFAULT_CATALOG_NAME,
  shortName: '漫客',
  kind: 'magazine',
  description: '默认内置的漫画杂志目录，后续可迁移为远程订阅源。',
  issueCount: DEFAULT_CATALOG_ISSUE_COUNT,
  numberPadding: DEFAULT_CATALOG_NUMBER_PADDING,
  source: {
    type: 'bundled',
  },
  issues: createNumberedComicIssues({
    catalogId: DEFAULT_CATALOG_ID,
    catalogName: DEFAULT_CATALOG_NAME,
    issueCount: DEFAULT_CATALOG_ISSUE_COUNT,
    numberPadding: DEFAULT_CATALOG_NUMBER_PADDING,
    covers: coverSources,
  }),
};

export const comicCatalogs: ComicCatalog[] = [defaultCatalog];

export function findCatalogById(catalogId: string) {
  return comicCatalogs.find((catalog) => catalog.id === catalogId);
}
