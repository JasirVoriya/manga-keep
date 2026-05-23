import type { ComicCatalog, ComicIssue, ComicIssueKey, StoredComicCatalogDefinition } from '../types';

export const DEFAULT_CATALOG_NUMBER_PADDING = 3;

export function isSafeCatalogId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]+$/.test(value);
}

export function makeIssueKey(catalogId: string, issueNumber: number): ComicIssueKey {
  return `${catalogId}:${issueNumber}`;
}

export function formatIssueNumber(issueNumber: number, padding = DEFAULT_CATALOG_NUMBER_PADDING) {
  return issueNumber.toString().padStart(padding, '0');
}

export function expandCoverPattern(
  pattern: string,
  issueNumber: number,
  padding = DEFAULT_CATALOG_NUMBER_PADDING
) {
  return pattern
    .replaceAll('{number}', issueNumber.toString())
    .replaceAll('{padded}', formatIssueNumber(issueNumber, padding));
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

export function createCatalogFromDefinition(
  definition: StoredComicCatalogDefinition
): ComicCatalog {
  const coverPattern = definition.coverPattern;

  return {
    id: definition.id,
    name: definition.name,
    shortName: definition.shortName,
    kind: definition.kind,
    description: definition.description,
    issueCount: definition.issueCount,
    numberPadding: definition.numberPadding,
    source: { type: 'local', definition },
    issues: createNumberedComicIssues({
      catalogId: definition.id,
      catalogName: definition.name,
      issueCount: definition.issueCount,
      numberPadding: definition.numberPadding,
      coverUrlForIssue: coverPattern
        ? (issueNumber) =>
            expandCoverPattern(coverPattern, issueNumber, definition.numberPadding)
        : undefined,
    }),
  };
}
