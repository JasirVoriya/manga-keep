import { coverSources } from './coverSources.generated';
import type { ComicCatalog, ComicIssue, ComicIssueKey } from '../types';

export const DEFAULT_CATALOG_ID = 'zhiyin-manke';
export const DEFAULT_CATALOG_NAME = '知音漫客';
export const DEFAULT_CATALOG_ISSUE_COUNT = 704;
export const DEFAULT_CATALOG_NUMBER_PADDING = 3;

export function makeIssueKey(catalogId: string, issueNumber: number): ComicIssueKey {
  return `${catalogId}:${issueNumber}`;
}

export function formatIssueNumber(issueNumber: number, padding = DEFAULT_CATALOG_NUMBER_PADDING) {
  return issueNumber.toString().padStart(padding, '0');
}

export function createNumberedComicIssues(options: {
  catalogId: string;
  catalogName: string;
  issueCount: number;
  numberPadding?: number;
  covers?: Record<number, ComicIssue['cover']>;
  coverUrlForIssue?: (issueNumber: number, paddedIssueNumber: string) => string | undefined;
}) {
  const padding = options.numberPadding ?? DEFAULT_CATALOG_NUMBER_PADDING;

  return Array.from({ length: options.issueCount }, (_, index): ComicIssue => {
    const number = index + 1;
    const padded = formatIssueNumber(number, padding);

    return {
      key: makeIssueKey(options.catalogId, number),
      catalogId: options.catalogId,
      number,
      sortNumber: number,
      label: `第${padded}期`,
      displayTitle: `${options.catalogName} ${padded}`,
      coverUrl: options.coverUrlForIssue?.(number, padded),
      cover: options.covers?.[number],
    };
  });
}

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
